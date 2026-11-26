import { Link } from 'react-router-dom';
import { Bot, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { agentBrandCounts } from '@/lib/agentDesk';

export function AgentsOnBrand({ brandId, counts, loading = false, error = false }: {
  brandId: string; counts?: ReturnType<typeof agentBrandCounts>; loading?: boolean; error?: boolean;
}) {
  return <section className="rounded-lg border border-border bg-card p-4 space-y-3" aria-label="Agents on this brand">
    <h2 className="flex items-center gap-2 text-base font-semibold"><Bot className="h-5 w-5 text-primary" />Agents on this brand</h2>
    {loading ? <p className="text-sm text-muted-foreground">Checking agent work…</p> : error || !counts ? <p role="status" className="text-sm text-destructive">Agent work could not be loaded.</p> :
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {([[counts.open, 'Open'], [counts.stuck, 'Stuck'], [counts.waiting, 'Waiting on the owner'], [counts.madeNotPosted, 'Made, not posted']] as const).map(([n, label]) =>
          <div key={label}><dd className="text-xl font-semibold">{n}</dd><dt className="text-muted-foreground">{label}</dt></div>)}
      </dl>}
    <Button variant="outline" className="min-h-11" asChild><Link to={`/agent-desk?brand=${brandId}`}>Open Agent Desk<ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
  </section>;
}