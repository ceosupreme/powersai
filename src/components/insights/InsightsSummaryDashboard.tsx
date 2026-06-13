import { useMemo } from 'react';
import { ActionCardWithWeek } from '@/hooks/useActionItems';

interface InsightsSummaryDashboardProps {
  allCards: ActionCardWithWeek[];
}

export const InsightsSummaryDashboard = ({ allCards }: InsightsSummaryDashboardProps) => {
  const stats = useMemo(() => {
    const activeCards = allCards;
    const proposed = activeCards.filter(c => c.approval_status === 'Proposed').length;
    const approved = activeCards.filter(c => c.approval_status === 'Approved').length;
    const autoApproved = activeCards.filter(c => c.approval_status === 'Approved' && c.auto_approved).length;
    const manualApproved = approved - autoApproved;
    const rejected = activeCards.filter(c => c.approval_status === 'Rejected').length;
    const total = activeCards.length;
    const resolved = approved + rejected;
    const resolutionPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const critical = activeCards.filter(c => c.approval_status === 'Proposed' && c.priority === 'Critical').length;
    const high = activeCards.filter(c => c.approval_status === 'Proposed' && c.priority === 'High').length;
    const medium = activeCards.filter(c => c.approval_status === 'Proposed' && c.priority === 'Medium').length;
    const low = activeCards.filter(c => c.approval_status === 'Proposed' && c.priority === 'Low').length;

    return { proposed, approved, autoApproved, manualApproved, rejected, total, resolved, resolutionPct, critical, high, medium, low };
  }, [allCards]);

  const gaugeAngle = (stats.resolutionPct / 100) * 180;
  const isZeroResolution = stats.resolutionPct === 0;

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Severity Breakdown (first position) */}
      <div className="bg-card border border-border rounded-xl p-4">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending by Severity</span>
        <div className="mt-3 space-y-2">
          {[
            { label: 'Critical', count: stats.critical, color: 'bg-destructive' },
            { label: 'High', count: stats.high, color: 'bg-orange' },
            { label: 'Medium', count: stats.medium, color: 'bg-gold' },
            { label: 'Low', count: stats.low, color: 'bg-blue-400' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${row.color} flex-shrink-0`} />
              <span className="text-sm text-foreground flex-1">{row.label}</span>
              <span className="text-sm font-semibold text-foreground">{row.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Bars (second position) */}
      <div className="bg-card border border-border rounded-xl p-4">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status Overview</span>
        <div className="mt-3 space-y-3">
          {[
            { label: 'Proposed', count: stats.proposed, total: stats.total, color: 'bg-primary' },
            { label: 'Approved', count: stats.approved, total: stats.total, color: 'bg-signal-green', detail: stats.autoApproved > 0 ? `${stats.manualApproved} manual, ${stats.autoApproved} auto` : undefined },
            { label: 'Rejected', count: stats.rejected, total: stats.total, color: 'bg-destructive' },
          ].map(row => (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">{row.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{row.count}</span>
                  {'detail' in row && row.detail && (
                    <span className="text-[10px] text-muted-foreground">({row.detail})</span>
                  )}
                </div>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.color} transition-all duration-500`}
                  style={{ width: `${row.total > 0 ? (row.count / row.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Gauge (last position, muted when 0%) */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Resolution Rate</span>
        <div className="relative w-28 h-16 overflow-hidden">
          <svg viewBox="0 0 120 70" className="w-full h-full">
            <path
              d="M 10 65 A 50 50 0 0 1 110 65"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 10 65 A 50 50 0 0 1 110 65"
              fill="none"
              stroke={isZeroResolution ? 'hsl(var(--muted))' : 'hsl(var(--primary))'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(gaugeAngle / 180) * 157} 157`}
            />
          </svg>
          <div className="absolute inset-0 flex items-end justify-center pb-0">
            <span className={`text-2xl font-bold ${isZeroResolution ? 'text-muted-foreground' : 'text-foreground'}`}>
              {stats.resolutionPct}%
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{stats.resolved} of {stats.total} resolved</p>
      </div>
    </div>
  );
};
