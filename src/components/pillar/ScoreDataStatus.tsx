import { cn } from '@/lib/utils';
import type { ScoreCoverage } from '@/lib/scoreCoverage';

export function ScoreDataStatus({ coverage, isLoading = false, className }: {
  coverage: ScoreCoverage;
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading) return <p className={cn('text-[11px] text-muted-foreground', className)}>Checking data coverage…</p>;
  if (coverage.unavailable) {
    return <p role="status" className={cn('text-[11px] text-amber-600', className)}>Data coverage unavailable — the score may be incomplete.</p>;
  }
  const asOf = coverage.asOf ? new Date(coverage.asOf) : null;
  const ageDays = asOf ? Math.max(0, Math.floor((Date.now() - asOf.getTime()) / 86400_000)) : null;
  const week = coverage.weekStart ? new Date(`${coverage.weekStart}T00:00:00`) : null;
  const periodAgeDays = week ? Math.max(0, (Date.now() - week.getTime()) / 86400_000 - 7) : null;
  const stale = (ageDays != null && ageDays >= 8) || (periodAgeDays != null && periodAgeDays >= 8);
  const weekLabel = week?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const when = asOf?.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div className={cn('text-[11px] text-muted-foreground space-y-0.5', className)}>
      <p>{coverage.measured} of {coverage.total} {coverage.unit} measured{weekLabel ? ` · week of ${weekLabel}` : ''}</p>
      {coverage.scored < coverage.measured && <p>{coverage.measured - coverage.scored} measured without a target</p>}
      {coverage.snapshots > 0 && <p>{coverage.snapshots} {coverage.snapshots === 1 ? 'snapshot' : 'snapshots'} dated when observed{coverage.flows > 0 ? ` · ${coverage.flows} measured over a reporting window` : ''}</p>}
      <p className={cn(stale && 'text-amber-600')} title="The age of the oldest dated input; missing inputs and timestamps are counted separately.">
        {when ? `As of ${when}${stale ? ' · stale' : ''}` : coverage.measured ? 'No measurement timestamp available' : 'Awaiting measurements for this reporting week'}
      </p>
      {coverage.missingTimestamps > 0 && when && <p>{coverage.missingTimestamps} measured with unknown data age</p>}
    </div>
  );
}
