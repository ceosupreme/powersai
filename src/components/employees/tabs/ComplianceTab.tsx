import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import type { ComplianceInsight } from '@/hooks/useEmployeeCompliance';
import type { EmployeeProfile } from '@/hooks/useEmployeeDetail';
import type { TimeEntryRow } from '@/hooks/useEmployeeTimeEntries';
import { METRIC_LABELS, REPEAT_PATTERN_WINDOW_DAYS, COMPLIANCE_WINDOW_DAYS } from '@/components/employees/constants';
import { ComplianceTrendChart } from '@/components/employees/charts/ComplianceTrendChart';

interface Props {
  compliance: ComplianceInsight[];
  profile: EmployeeProfile;
  timeEntries?: TimeEntryRow[];
}

const severityClass = (s: string | null) => {
  switch (s) {
    case 'Critical': return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'High': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'Medium': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
};

const statusClass = (s: string | null) => {
  switch (s) {
    case 'Resolved': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'Dismissed': return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    case 'In Progress': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    default: return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
};

const daysBetweenISO = (a: string, b: string) => {
  const [ay, am, ad] = a.slice(0, 10).split('-').map(Number);
  const [by, bm, bd] = b.slice(0, 10).split('-').map(Number);
  return Math.floor(
    (Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000
  );
};

export const ComplianceTab = ({ compliance: complianceFull, profile, timeEntries = [] }: Props) => {
  // The page now fetches 180d for the trend chart. The list / exposure stay scoped to last 90d.
  const compliance = useMemo(() => {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - COMPLIANCE_WINDOW_DAYS);
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    return complianceFull.filter(c => (c.source_date || '') >= cutoffISO);
  }, [complianceFull]);

  // Premium pay exposure: ONLY missed_meal alerts (CA Labor Code §226.7).
  // Late meals are a compliance issue but do NOT trigger the 1-hour penalty.
  const exposure = useMemo(() => {
    const missedActive = compliance.filter(
      c =>
        c.source_metric === 'missed_meal' &&
        c.status !== 'Dismissed' &&
        c.status !== 'Resolved',
    );
    const wage = profile.hourly_wage;
    if (wage !== null && wage !== undefined) {
      const total = missedActive.length * Number(wage);
      return {
        countActive: missedActive.length,
        nullWageCount: 0,
        total,
        wageKnown: true,
      };
    }
    return {
      countActive: missedActive.length,
      nullWageCount: missedActive.length,
      total: 0,
      wageKnown: false,
    };
  }, [compliance, profile.hourly_wage]);

  // Repeat-pattern: rolling 30-day count (ending at row's source_date)
  // of same source_metric for this employee. Returns Nth label when >= 2.
  const repeatLabel = (idx: number): string | null => {
    const row = compliance[idx];
    if (!row.source_date || !row.source_metric) return null;
    let count = 0;
    for (const other of compliance) {
      if (other.source_metric !== row.source_metric || !other.source_date) continue;
      const diff = daysBetweenISO(row.source_date, other.source_date);
      if (diff >= 0 && diff <= REPEAT_PATTERN_WINDOW_DAYS) count++;
    }
    if (count < 2) return null;
    const ord = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd']; const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return `${ord(count)} ${(METRIC_LABELS[row.source_metric] || row.source_metric).toLowerCase()} in 30 days`;
  };

  // ── Overtime tracking (CA: daily OT >8h, weekly OT >40h regular hours) ──
  const otStats = useMemo(() => {
    const tParts = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }).split('-');
    const todayPT = new Date(+tParts[0], +tParts[1] - 1, +tParts[2]);
    const day = todayPT.getDay();
    const off = day === 0 ? -6 : 1 - day;
    const thisMon = new Date(todayPT); thisMon.setDate(todayPT.getDate() + off);
    const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const weekKeys: string[] = [];
    for (let i = 0; i < 4; i++) {
      const m = new Date(thisMon); m.setDate(thisMon.getDate() - 7 * i);
      weekKeys.push(isoOf(m));
    }
    const cutoff = weekKeys[weekKeys.length - 1];
    const weekly = new Map<string, { reg: number; ot: number }>();
    for (const k of weekKeys) weekly.set(k, { reg: 0, ot: 0 });
    let dailyOtViolations = 0;
    const dailyByDate = new Map<string, number>();

    for (const e of timeEntries) {
      if (!e.business_date || e.business_date < cutoff) continue;
      const [y, mo, da] = e.business_date.split('-').map(Number);
      const d = new Date(y, mo - 1, da);
      const dDay = d.getDay();
      const dOff = dDay === 0 ? -6 : 1 - dDay;
      const m = new Date(d); m.setDate(d.getDate() + dOff);
      const wk = isoOf(m);
      const bucket = weekly.get(wk);
      if (!bucket) continue;
      const reg = Number(e.regular_hours) || 0;
      const ot = Number(e.overtime_hours) || 0;
      bucket.reg += reg;
      bucket.ot += ot;
      const total = (dailyByDate.get(e.business_date) || 0) + reg + ot;
      dailyByDate.set(e.business_date, total);
    }
    for (const total of dailyByDate.values()) {
      if (total > 8) dailyOtViolations++;
    }

    const thisWk = weekly.get(weekKeys[0]) || { reg: 0, ot: 0 };
    const trailing4 = weekKeys.reduce((s, k) => s + (weekly.get(k)?.ot || 0), 0);
    const weeklyOver40 = weekKeys.filter(k => {
      const b = weekly.get(k); return b ? (b.reg + b.ot) > 40 : false;
    }).length;

    return {
      thisWeekOt: thisWk.ot,
      trailing4Ot: trailing4,
      dailyOtViolations,
      weeklyOver40,
      hasData: timeEntries.length > 0,
    };
  }, [timeEntries]);

  return (
    <div className="space-y-4">
      {/* 6-month trend chart (always rendered; uses full 180d dataset) */}
      <ComplianceTrendChart compliance={complianceFull} />

      {/* Overtime tracking */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase text-muted-foreground tracking-wider">
            Overtime tracking
          </div>
          <span className="text-[10px] text-muted-foreground/70">CA: &gt;8h/day or &gt;40h/week</span>
        </div>
        {!otStats.hasData ? (
          <div className="text-sm text-muted-foreground">No time entries on record.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">OT this week</div>
              <div className="text-2xl font-bold">{otStats.thisWeekOt.toFixed(1)}<span className="text-sm font-normal text-muted-foreground"> h</span></div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">OT trailing 4 weeks</div>
              <div className="text-2xl font-bold">{otStats.trailing4Ot.toFixed(1)}<span className="text-sm font-normal text-muted-foreground"> h</span></div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Days &gt; 8h (4w)</div>
              <div className={`text-2xl font-bold ${otStats.dailyOtViolations > 0 ? 'text-orange-400' : ''}`}>{otStats.dailyOtViolations}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Weeks &gt; 40h (4w)</div>
              <div className={`text-2xl font-bold ${otStats.weeklyOver40 > 0 ? 'text-orange-400' : ''}`}>{otStats.weeklyOver40}</div>
            </div>
          </div>
        )}
      </div>

      {compliance.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          No compliance alerts in the last 90 days. <span className="text-emerald-400 font-medium">Clean record.</span>
        </div>
      ) : (
        <>
      {/* Exposure summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs uppercase text-muted-foreground tracking-wider">
          Estimated premium pay exposure
        </div>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          {exposure.countActive === 0 ? (
            <>
              <span className="text-2xl font-bold">$0.00</span>
              <span className="text-sm text-emerald-400">— no active missed meal alerts</span>
            </>
          ) : exposure.wageKnown ? (
            <>
              <span className="text-2xl font-bold">${exposure.total.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">
                ({exposure.countActive} active missed meal × ${Number(profile.hourly_wage).toFixed(2)}/hr)
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold">≥ $0.00</span>
              <span className="text-sm text-orange-400">
                ({exposure.nullWageCount} alerts missing wage on file)
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          1 hr at regular rate per active missed meal break (CA Labor Code §226.7).
          Late meals excluded — they don't trigger the premium.
        </p>
      </div>

      {/* List */}
      <div className="space-y-2">
        {compliance.map((c, idx) => {
          const repeat = repeatLabel(idx);
          return (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${severityClass(c.severity)}`}>
                      {c.severity || '—'}
                    </span>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${statusClass(c.status)}`}>
                      {c.status || 'New'}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.source_date}</span>
                    {repeat && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        {repeat}
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-foreground mt-1.5">{c.title}</div>
                  {c.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Type: <span className="text-foreground">{METRIC_LABELS[c.source_metric || ''] || c.source_metric || '—'}</span></span>
                    {c.source_log_id && (
                      <span className="text-muted-foreground/70">Time entry: <code className="text-[10px]">{c.source_log_id.slice(0, 8)}</code></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
};
