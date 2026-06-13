import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { EmployeeProfile } from '@/hooks/useEmployeeDetail';
import type { ComplianceInsight } from '@/hooks/useEmployeeCompliance';
import type { EmployeeRow } from '@/hooks/useEmployees';
import { METRIC_LABELS } from '@/components/employees/constants';

interface Props {
  profile: EmployeeProfile;
  row: EmployeeRow | null;
  compliance: ComplianceInsight[];
}

const tenureLabel = (days: number | null): string => {
  if (days === null) return '—';
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} months`;
  return `${(days / 365).toFixed(1)} years`;
};

const complianceStatus = (count: number): { label: string; cls: string } => {
  if (count === 0) return { label: 'Clean', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  if (count <= 2) return { label: 'Some issues', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
  return { label: 'Frequent issues', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
};

export const OverviewTab = ({ profile, row, compliance }: Props) => {
  const violationsCount = compliance.length;
  const status = complianceStatus(violationsCount);

  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of compliance) {
      const m = c.source_metric || 'unknown';
      map[m] = (map[m] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [compliance]);

  const sparkData = (row?.weekly_hours || []).map((h, i) => ({ i, h }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs uppercase text-muted-foreground tracking-wider">Tenure</div>
        <div className="text-2xl font-bold mt-1">
          {profile.hire_date ? tenureLabel(row?.tenure_days ?? null) : (row?.tenure_days != null ? `since first shift` : '—')}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {profile.hire_date
            ? `Hired ${profile.hire_date}`
            : (row?.tenure_days != null
                ? `${row.tenure_days} days since first recorded shift`
                : 'Hire date not on file')}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wider">Hours · last 90d</div>
            <div className="text-2xl font-bold mt-1">{row?.hours_90d ?? 0}</div>
          </div>
          <div className="w-24 h-12">
            {sparkData.length >= 2 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line type="monotone" dataKey="h" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {row?.weekly_hours_mean !== null && row?.weekly_hours_mean !== undefined && (
          <div className="text-xs text-muted-foreground mt-1">
            Avg {row.weekly_hours_mean.toFixed(1)} hrs/wk
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 md:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wider">Violations · last 90d</div>
            <div className="text-2xl font-bold mt-1">{violationsCount}</div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${status.cls}`}>
            {status.label}
          </span>
        </div>
        {breakdown.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {breakdown.map(([metric, count]) => (
              <span key={metric} className="text-xs px-2 py-1 rounded-full bg-muted/50 text-foreground">
                {METRIC_LABELS[metric] || metric}: <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 md:col-span-2">
        <div className="text-xs uppercase text-muted-foreground tracking-wider">Most recent shift</div>
        <div className="text-lg font-semibold mt-1">{profile.last_shift_date || '—'}</div>
      </div>
    </div>
  );
};
