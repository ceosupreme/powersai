import type { EmployeeRow } from '@/hooks/useEmployees';
import type { EmployeeProfile } from '@/hooks/useEmployeeDetail';
import type { ComplianceInsight } from '@/hooks/useEmployeeCompliance';
import { classifyVariance, METRIC_LABELS, VARIANCE_THRESHOLDS } from '@/components/employees/constants';
import { HoursTrendChart } from '@/components/employees/charts/HoursTrendChart';
import { EmployeeWinsConcernsPanel } from '@/components/employees/EmployeeWinsConcernsPanel';

interface Props {
  profile: EmployeeProfile;
  row: EmployeeRow | null;
  compliance: ComplianceInsight[];
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="text-xs uppercase text-muted-foreground tracking-wider mb-3">{title}</div>
    {children}
  </div>
);

const varianceClass = (bucket: string) => {
  switch (bucket) {
    case 'Consistent': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'Variable': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    case 'Highly variable': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
};

export const PerformanceTab = ({ profile, row, compliance }: Props) => {
  const tenureDays = row?.tenure_days ?? null;

  const breakdown: Record<string, number> = {};
  for (const c of compliance) {
    const m = c.source_metric || 'unknown';
    breakdown[m] = (breakdown[m] || 0) + 1;
  }

  const variance = classifyVariance(row?.weekly_hours_sd ?? null, row?.weekly_hours.length ?? 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel title="Tenure">
          <div className="text-2xl font-bold">
            {tenureDays === null ? '—' : `${tenureDays} days`}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {profile.hire_date
              ? `Hired ${profile.hire_date}`
              : 'Hire date not on file — derived from first time entry.'}
          </div>
        </Panel>

        <Panel title="Compliance · last 90d">
          <div className="text-2xl font-bold">{compliance.length}</div>
          <div className="text-xs text-muted-foreground mt-1">violations (lower is better)</div>
          {Object.keys(breakdown).length > 0 ? (
            <div className="mt-3 space-y-1">
              {Object.entries(breakdown).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
                <div key={m} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{METRIC_LABELS[m] || m}</span>
                  <span className="font-semibold">{n}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-emerald-400 mt-3">No violations</div>
          )}
        </Panel>

        <Panel title="Reliability · weekly hours">
          <div className="text-2xl font-bold">
            {row?.weekly_hours_mean !== null && row?.weekly_hours_mean !== undefined
              ? `${row.weekly_hours_mean.toFixed(1)} hrs`
              : '—'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            avg/week ({row?.weekly_hours.length ?? 0} weeks observed)
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${varianceClass(variance)}`}>
              {variance}
            </span>
            {row?.weekly_hours_sd !== null && row?.weekly_hours_sd !== undefined && (
              <span className="text-xs text-muted-foreground">
                σ = {row.weekly_hours_sd.toFixed(1)} hrs
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/70 mt-2">
            Bands: ≤{VARIANCE_THRESHOLDS.CONSISTENT_MAX} consistent · {VARIANCE_THRESHOLDS.CONSISTENT_MAX}–{VARIANCE_THRESHOLDS.VARIABLE_MAX} variable · &gt;{VARIANCE_THRESHOLDS.VARIABLE_MAX} highly variable
          </div>
        </Panel>
      </div>

      {/* Wins & Concerns from approved AI insights */}
      <EmployeeWinsConcernsPanel employeeId={profile.id} windowDays={90} />

      {/* Weekly hours trend chart */}
      <HoursTrendChart
        weekKeys={row?.weekly_hours_keys ?? []}
        weekHours={row?.weekly_hours ?? []}
        meanHours={row?.weekly_hours_mean ?? null}
      />
    </div>
  );
};
