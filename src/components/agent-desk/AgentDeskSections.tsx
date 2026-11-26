import { AlertTriangle, Bot, CheckCircle2, Clock, ExternalLink, Repeat, RotateCcw, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AGENTS, ageWords, agentLabel, formatPacificShort, getProofLinks, isFinishedThisWeek,
  isStandingMissed, isStuck, scheduleTextOf, statusLabel, stuckReason,
  type AgentHandoffRow, type FailureGroup, type NeedsYouItem,
} from '@/lib/agentDesk';

interface NeedsYouProps {
  items: NeedsYouItem[];
  brandNames: Map<string, string>;
  isAdmin: boolean;
  onAnswer: (row: AgentHandoffRow) => void;
  onSelect: (row: AgentHandoffRow) => void;
}

export function NeedsYouStrip({ items, brandNames, isAdmin, onAnswer, onSelect }: NeedsYouProps) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2.5" aria-label="Needs you">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Needs you ({items.length})</h2>
        <span className="text-xs text-muted-foreground">Oldest first</span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => {
          const brands = item.brandIds.map((id) => brandNames.get(id)).filter(Boolean) as string[];
          return (
            <Card key={item.id} className="border-primary/40 bg-primary/5">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <button type="button" onClick={() => onSelect(item.row)} className="text-left min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="default" className="text-xs">Waiting {ageWords(item.createdAt)}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.row.to_agent === 'owner' ? `From ${agentLabel(item.row.from_agent)}` : `${agentLabel(item.row.to_agent)} stopped`}
                    </Badge>
                    {brands.map((b) => <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>)}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{item.row.title}</p>
                  {item.question ? (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-3">
                      <span className="font-medium text-primary">Question: </span>{item.question}
                    </p>
                  ) : item.whatHappened ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      <span className="font-medium text-foreground">What happened: </span>{item.whatHappened}
                    </p>
                  ) : null}
                </button>
                {isAdmin && (
                  <Button size="sm" className="shrink-0" onClick={() => onAnswer(item.row)}>
                    <Send className="h-3.5 w-3.5 mr-1.5" />Answer
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function AgentCardsRow({
  rows, selectedAgent, onPickAgent,
}: { rows: AgentHandoffRow[]; selectedAgent: string; onPickAgent: (a: string) => void }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Agents">
      {AGENTS.map((agent) => {
        const mine = rows.filter((r) => r.to_agent === agent);
        const working = mine.filter((r) => r.status === 'claimed').length;
        const waiting = mine.filter((r) => r.status === 'new').length;
        const stuck = mine.filter((r) => isStuck(r)).length;
        const doneWk = mine.filter((r) => isFinishedThisWeek(r)).length;
        const active = selectedAgent === agent;
        return (
          <button
            key={agent}
            type="button"
            onClick={() => onPickAgent(active ? 'all' : agent)}
            className={cn(
              'text-left rounded-xl border p-3.5 transition-colors bg-card hover:border-primary/50',
              active && 'border-primary ring-1 ring-primary/30'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-primary" />{agentLabel(agent)}
              </span>
              {active && <Badge variant="secondary" className="text-[11px]">Filtered</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <span className="text-muted-foreground">Working on: <strong className="text-foreground">{working}</strong></span>
              <span className="text-muted-foreground">Waiting: <strong className="text-foreground">{waiting}</strong></span>
              <span className="text-muted-foreground">Stuck: <strong className={stuck > 0 ? 'text-destructive' : 'text-foreground'}>{stuck}</strong></span>
              <span className="text-muted-foreground">Done this wk: <strong className="text-foreground">{doneWk}</strong></span>
            </div>
          </button>
        );
      })}
    </section>
  );
}

export function StuckAndLateSection({
  failureGroups, otherStuck, brandNames, isAdmin, retrying, onRetryGroup, onSelect,
}: {
  failureGroups: FailureGroup[];
  otherStuck: AgentHandoffRow[];
  brandNames: Map<string, string>;
  isAdmin: boolean;
  retrying: boolean;
  onRetryGroup: (ids: string[]) => void;
  onSelect: (r: AgentHandoffRow) => void;
}) {
  const total = failureGroups.reduce((s, g) => s + g.rows.length, 0) + otherStuck.length;
  if (total === 0) return null;
  return (
    <section className="space-y-2.5" aria-label="Stuck and late">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />Stuck and late ({total})
      </h2>
      <div className="space-y-2">
        {failureGroups.map((g) => (
          <Card key={g.reason} className="border-destructive/30">
            <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button type="button" onClick={() => onSelect(g.rows[0])} className="text-left min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="destructive" className="text-xs">{g.rows.length} failed</Badge>
                  <span className="text-xs text-muted-foreground">{agentLabel(g.rows[0].to_agent)}</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {g.rows.length > 1 ? `${g.rows.length} tasks: ${g.reason}` : `${g.rows[0].title} — ${g.reason}`}
                </p>
              </button>
              {isAdmin && (
                <Button size="sm" variant="outline" disabled={retrying} onClick={() => onRetryGroup(g.ids)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />{g.rows.length > 1 ? `Retry group (${g.rows.length})` : 'Retry'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {otherStuck.map((r) => {
          const brand = (r.brand_ids ?? []).map((id) => brandNames.get(id)).filter(Boolean).join(', ');
          return (
            <Card key={r.id}>
              <CardContent className="p-3.5">
                <button type="button" onClick={() => onSelect(r)} className="w-full text-left space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />{stuckReason(r)}</Badge>
                    <span className="text-xs text-muted-foreground">{agentLabel(r.to_agent)}</span>
                    {brand && <Badge variant="outline" className="text-xs">{brand}</Badge>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function RepeatingJobsSection({ rows, onSelect }: { rows: AgentHandoffRow[]; onSelect: (r: AgentHandoffRow) => void }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2.5" aria-label="Repeating jobs">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Repeat className="h-4 w-4 text-muted-foreground" />Repeating jobs ({rows.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {rows.map((r) => {
          const missed = isStandingMissed(r);
          return (
            <Card key={r.id} className={missed ? 'border-destructive/40' : undefined}>
              <CardContent className="p-3.5">
                <button type="button" onClick={() => onSelect(r)} className="w-full text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{agentLabel(r.to_agent)} · {scheduleTextOf(r)}</span>
                    {missed && <Badge variant="destructive" className="text-xs">Missed</Badge>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.last_run_at ? `Last ran ${formatPacificShort(r.last_run_at)} (${ageWords(r.last_run_at)} ago)` : 'No run recorded yet'}
                  </p>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function RecentlyFinishedSection({
  rows, brandNames, onSelect,
}: { rows: AgentHandoffRow[]; brandNames: Map<string, string>; onSelect: (r: AgentHandoffRow) => void }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2.5" aria-label="Recently finished">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />Recently finished ({rows.length})
      </h2>
      <div className="space-y-2">
        {rows.slice(0, 20).map((r) => {
          const proofs = getProofLinks(r);
          const brand = (r.brand_ids ?? []).map((id) => brandNames.get(id)).filter(Boolean).join(', ');
          return (
            <Card key={r.id}>
              <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <button type="button" onClick={() => onSelect(r)} className="text-left min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">{statusLabel(r)}</Badge>
                    <span className="text-xs text-muted-foreground">{agentLabel(r.to_agent)}</span>
                    {brand && <Badge variant="outline" className="text-xs">{brand}</Badge>}
                    {r.completed_at && <span className="text-xs text-muted-foreground">{formatPacificShort(r.completed_at)}</span>}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                </button>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {proofs.length > 0 ? proofs.slice(0, 2).map((p) => (
                    <Button key={p.url} size="sm" variant="outline" asChild>
                      <a href={p.url} target="_blank" rel="noreferrer">{p.label}<ExternalLink className="h-3.5 w-3.5 ml-1" /></a>
                    </Button>
                  )) : <span className="text-xs text-muted-foreground">No proof link</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}