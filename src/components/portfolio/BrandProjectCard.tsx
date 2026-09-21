import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';
import { formatCurrency } from '@/utils/formatting';
import { cn } from '@/lib/utils';
import type { NonClientCardData } from '@/hooks/usePortfolioData';

/**
 * Overview card for a non-client project (own brand / prospect):
 * weighted current-week overall, one mini bar per effective pillar,
 * week-over-week change, this month's revenue, and Money Lanes Potential.
 */
export function BrandProjectCard({
  data,
  onClick,
}: {
  data: NonClientCardData;
  onClick: () => void;
}) {
  const grade = data.overall != null ? getGradeFromScore(data.overall) : null;
  const gradeColor = grade ? getGradeColor(grade) : undefined;
  const parked = data.focusStatus === 'parked';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left bg-card border border-border rounded-lg p-4 transition-colors hover:border-primary w-full',
        parked && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-foreground truncate">{data.name}</h3>
        {parked && (
          <Badge variant="outline" className="text-[10px] shrink-0">Parked</Badge>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        {data.overall != null ? (
          <>
            <span className="text-3xl font-bold" style={{ color: gradeColor }}>{data.overall}</span>
            {grade && <span className="text-xl font-bold" style={{ color: gradeColor }}>{grade}</span>}
            {data.overallWoW != null && (
              <span
                className={cn(
                  'text-sm',
                  data.overallWoW > 0
                    ? 'text-signal-green'
                    : data.overallWoW < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                )}
              >
                {data.overallWoW > 0 ? '↑' : data.overallWoW < 0 ? '↓' : '—'}
                {data.overallWoW !== 0 && Math.abs(data.overallWoW)} WoW
              </span>
            )}
          </>
        ) : (
          <span className="text-3xl font-bold text-muted-foreground">--</span>
        )}
      </div>

      <div className="mb-3 text-sm">
        <span className="text-foreground">
          {data.monthRevenue != null ? formatCurrency(data.monthRevenue) : '—'}
        </span>
        <span className="text-muted-foreground ml-2">this month</span>
      </div>

      {data.pillars.length > 0 && (
        <div className="flex gap-1 mb-3">
          {data.pillars.map((p) => {
            const g = p.score != null ? getGradeFromScore(p.score) : null;
            const c = g ? getGradeColor(g) : undefined;
            return (
              <div key={p.key} className="flex-1 text-center" title={p.label}>
                <div
                  className={cn(
                    'h-6 rounded text-xs flex items-center justify-center font-medium',
                    !g && 'bg-muted text-muted-foreground',
                  )}
                  style={g ? { backgroundColor: `${c}20`, color: c } : undefined}
                >
                  {g ?? '--'}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">{p.short}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Potential</span>
          <span className="text-foreground font-medium">
            {data.potential == null ? '—' : `${data.potential}%`}
          </span>
        </div>
        <Progress value={data.potential ?? 0} className="h-1.5" />
      </div>

      <div className="mt-3 text-primary text-sm font-medium">View →</div>
    </button>
  );
}
