import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, Settings2 } from 'lucide-react';
import { useAssetMap, useOpenSetupJobs, startSetup, useSetupRefresh } from '@/hooks/useBrandSetup';
import { byPriority, isFoundation, minutesText, whyLine } from '@/lib/brandSetup';
import { pipelineHref } from '@/lib/ownerWork';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

/**
 * Brand-only setup inside the guided My Plan view. Creates real pipeline jobs
 * and opens the first step, never silently toggles a channel or account "on".
 */
export function BrandAccountSetup({ projectId }: { projectId: string }) {
  const map = useAssetMap(projectId);
  const jobs = useOpenSetupJobs(projectId);
  const refresh = useSetupRefresh(projectId);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const needed = useMemo(() =>
    (map.data ?? []).filter(r =>
      r.needed && r.state !== 'on_file' && r.state !== 'skipped'
    ).sort(byPriority), [map.data]
  );
  const ready = needed.filter(r => !isFoundation(r));
  const running = ready.filter(r => r.channel_id && jobs.data?.has(r.channel_id));
  const shown = all ? ready : ready.slice(0, 5);
  const begin = async (row: (typeof ready)[number]) => {
    if (busyKey) return;
    const existingId = row.channel_id && jobs.data?.get(row.channel_id);
    if (existingId) { navigate(pipelineHref(projectId, existingId)); return; }
    setBusyKey(row.asset_key);
    try {
      const jobId = await startSetup(projectId, row);
      await refresh();
      toast.success('Setup plan saved. Opening the first step.');
      navigate(pipelineHref(projectId, jobId));
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not start setup for this account.');
    } finally { setBusyKey(null); }
  };

  return <Card><CardContent className="p-4">
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left flex items-center justify-between gap-3">
        <span className="flex gap-2 items-start">
          <Settings2 className="h-5 w-5 text-primary shrink-0"/>
          <span><strong className="block">Accounts and profiles to set up</strong>
            <span className="block text-xs text-muted-foreground">Find what's missing and open the exact steps to set it up. Starting a plan doesn't activate an account.</span>
          </span>
        </span>
        <ChevronDown className={'h-4 w-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}/>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-3">
        {map.isLoading || jobs.isLoading ? <p className="text-sm text-muted-foreground">Loading your setup checklist…</p> :
        map.isError || jobs.isError ? <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">Setup information is unavailable.</p>
          <Button size="sm" variant="outline" onClick={() => {void map.refetch(); void jobs.refetch();}}>Try again</Button>
        </div> :
        <>
          <p className="text-sm text-muted-foreground">
            {ready.length} accounts still need attention. {running.length} have a setup plan in progress.
          </p>
          {(map.data ?? []).some(isFoundation) && <p className="text-xs text-muted-foreground">
            Need brand colors, logos or fonts? <Link to="/brand-kit" className="text-primary underline">Open your brand kit</Link>.
          </p>}
          {!ready.length ? <p className="text-sm text-muted-foreground">All required accounts and profiles are on file, or there are no required account steps.</p> :
          <div className="space-y-2">
            {shown.map(row => {
              const existing = row.channel_id ? jobs.data?.get(row.channel_id) : undefined;
              return <div key={row.asset_key} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{row.label}</p>
                  <span className="text-xs text-muted-foreground capitalize">{row.state.replace(/_/g, ' ')}</span>
                </div>
                {whyLine(row) && <p className="text-sm text-muted-foreground">{whyLine(row)}</p>}
                {row.unlocks && <p className="text-sm">When ready: {row.unlocks}</p>}
                <p className="text-xs text-muted-foreground">{minutesText(row.setup_minutes)}</p>
                <Button size="sm" disabled={busyKey !== null} onClick={() => begin(row)}>
                  {existing ? 'Resume setup plan' : 'Make setup plan and open first step'}
                </Button>
              </div>;
            })}
          </div>}
          {ready.length > 5 && <Button size="sm" variant="ghost" onClick={() => setAll(v => !v)}>
            {all ? 'Show highest priorities' : 'Show all ' + ready.length + ' setup items'}
          </Button>}
        </>}
      </CollapsibleContent>
    </Collapsible>
  </Card>;
}
