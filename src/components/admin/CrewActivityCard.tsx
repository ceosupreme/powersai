import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bot, Database, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type CrewState = 'ok' | 'partial' | 'failed' | 'missed' | 'waiting' | 'paused' | 'unknown';

export interface CrewStatusRow {
  crew_key: string;
  crew_name: string;
  crew_kind: 'claude_task' | 'db_job';
  schedule: string;
  what_it_does: string | null;
  report_to: string | null;
  sort_order: number;
  state: CrewState;
  problem: string | null;
  last_status: string | null;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_tried: string | null;
  last_done: string | null;
  last_flagged: string | null;
  runs_7d: number;
  failures_7d: number;
  due_by: string | null;
}

export const CREW_STATUS_KEY = ['crew-status'] as const;

/** Every crew and background job with its last run (public.crew_status, admin only). */
export function useCrewStatus(enabled = true) {
  return useQuery({
    queryKey: CREW_STATUS_KEY,
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('crew_status');
      if (error) throw error;
      return (data ?? []) as CrewStatusRow[];
    },
  });
}

/** Red: the last run failed, or no run came in within the crew's window. */
export const needsALook = (state: CrewState) => state === 'failed' || state === 'missed';

const STATE_LOOK: Record<CrewState, { label: string; dot: string; chip: string }> = {
  ok: { label: 'Ran fine', dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  partial: { label: 'Partly done', dot: 'bg-gold', chip: 'bg-gold/10 text-gold' },
  failed: { label: 'Failed', dot: 'bg-destructive', chip: 'bg-destructive/10 text-destructive' },
  missed: { label: 'Missed its run', dot: 'bg-destructive', chip: 'bg-destructive/10 text-destructive' },
  waiting: { label: 'No run logged yet', dot: 'bg-muted-foreground/40', chip: 'bg-muted text-muted-foreground' },
  paused: { label: 'Paused', dot: 'bg-muted-foreground/40', chip: 'bg-muted text-muted-foreground' },
  unknown: { label: 'Result not tracked', dot: 'bg-muted-foreground/40', chip: 'bg-muted text-muted-foreground' },
};

const pacific = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function whenText(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${pacific.format(d)} (${formatDistanceToNow(d, { addSuffix: true })})`;
}

function CrewRow({ crew }: { crew: CrewStatusRow }) {
  const look = STATE_LOOK[crew.state] ?? STATE_LOOK.unknown;
  const red = needsALook(crew.state);
  const lastRun = whenText(crew.last_finished_at);
  const showDone = crew.crew_kind === 'claude_task' && crew.last_finished_at && crew.last_done;
  const showFlag = crew.crew_kind === 'claude_task' && crew.last_flagged && !(crew.state === 'failed' && crew.problem?.includes(crew.last_flagged));

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', look.dot)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="font-medium text-foreground">{crew.crew_name}</p>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', look.chip)}>{look.label}</span>
          </div>
          {crew.what_it_does && <p className="text-xs text-muted-foreground">{crew.what_it_does}</p>}
          <p className="text-xs text-muted-foreground">
            Runs {crew.schedule}. {lastRun ? `Last run ${lastRun}.` : 'No run on record yet.'}
            {crew.failures_7d > 0 && ` ${crew.failures_7d} failed in the last 7 days.`}
          </p>
          {crew.problem && (
            <p className={cn('text-sm', red ? 'text-destructive' : 'text-muted-foreground')}>{crew.problem}</p>
          )}
          {showDone && (
            <p className="text-sm text-foreground/80">
              <span className="text-muted-foreground">Got done: </span>
              {crew.last_done}
            </p>
          )}
          {showFlag && (
            <p className="text-sm text-foreground/80">
              <span className="font-medium text-gold">Flagged: </span>
              {crew.last_flagged}
            </p>
          )}
          {crew.crew_kind === 'claude_task' && crew.report_to && (
            <p className="text-xs text-muted-foreground">Reports to you by: {crew.report_to}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function CrewGroup({ title, note, icon: Icon, crews }: { title: string; note: string; icon: typeof Bot; crews: CrewStatusRow[] }) {
  if (!crews.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      </div>
      <ul className="divide-y divide-border/50 rounded-xl border border-border/50 bg-card/50 p-4">
        {crews.map((crew) => (
          <CrewRow key={crew.crew_key} crew={crew} />
        ))}
      </ul>
    </section>
  );
}

export function CrewActivityCard() {
  const { data, isLoading, isFetching, error, refetch } = useCrewStatus();
  const crews = data ?? [];
  const red = crews.filter((c) => needsALook(c.state));
  const untracked = crews.filter((c) => c.state === 'unknown').length;
  const claude = crews.filter((c) => c.crew_kind === 'claude_task');
  const jobs = crews.filter((c) => c.crew_kind !== 'claude_task');

  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle>Crew activity</CardTitle>
            <CardDescription>
              Every scheduled crew and background job, with its last run. Red means it failed or missed its schedule.
              Your morning brief mentions the red ones only.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="shrink-0 gap-2">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Couldn't load crew activity: {(error as Error).message ?? 'unknown error'}. Tap Refresh to try again.
          </p>
        ) : (
          <>
            <div
              className={cn(
                'rounded-xl border p-3 text-sm',
                red.length ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-border/50 bg-muted/30 text-foreground',
              )}
            >
              {red.length
                ? `${red.length} need${red.length === 1 ? 's' : ''} a look: ${red.map((c) => c.crew_name).join(', ')}.`
                : `Nothing failed or missed its schedule. ${crews.length} crews and jobs checked.`}
              {untracked > 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {untracked === 1
                    ? "1 background job starts on schedule, but HQ doesn't record yet whether the work behind it succeeded."
                    : `${untracked} background jobs start on schedule, but HQ doesn't record yet whether the work behind them succeeded.`}
                </span>
              )}
            </div>
            <CrewGroup
              title="Claude crews"
              note="Scheduled tasks in your Claude account. Each one writes a line here when it finishes."
              icon={Bot}
              crews={claude}
            />
            <CrewGroup
              title="HQ background jobs"
              note="Jobs that run inside HQ's database on a fixed clock."
              icon={Database}
              crews={jobs}
            />
            <p className="text-xs text-muted-foreground">
              To pause or change a crew, ask Claude in any chat. More in the guide:{' '}
              <Link to="/guide?a=nightly-crews" className="underline underline-offset-2 hover:text-foreground">
                The crews that run while you sleep
              </Link>
              .
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
