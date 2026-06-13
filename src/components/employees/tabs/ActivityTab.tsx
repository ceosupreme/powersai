import { useMemo } from 'react';
import { Clock, AlertTriangle, UserX, UserCheck, Trophy, AlertCircle } from 'lucide-react';
import type { TimeEntryRow } from '@/hooks/useEmployeeTimeEntries';
import type { ComplianceInsight } from '@/hooks/useEmployeeCompliance';
import type { EmployeeProfile } from '@/hooks/useEmployeeDetail';
import type { SentimentEvent } from '@/hooks/useEmployeeSentimentEvents';
import { Button } from '@/components/ui/button';
import { METRIC_LABELS } from '@/components/employees/constants';

interface Props {
  profile: EmployeeProfile;
  timeEntries: TimeEntryRow[];
  compliance: ComplianceInsight[];
  sentimentEvents: SentimentEvent[];
  windowDays: number;
  onLoadMore: () => void;
  loading?: boolean;
}

type Event =
  | { kind: 'shift'; date: string; te: TimeEntryRow }
  | { kind: 'alert'; date: string; insight: ComplianceInsight }
  | { kind: 'win'; date: string; insight: SentimentEvent }
  | { kind: 'concern'; date: string; insight: SentimentEvent }
  | { kind: 'status'; date: string; label: string; isPositive: boolean };

const fmtTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const ActivityTab = ({ profile, timeEntries, compliance, sentimentEvents, windowDays, onLoadMore, loading }: Props) => {
  const events = useMemo<Event[]>(() => {
    const list: Event[] = [];
    for (const te of timeEntries) list.push({ kind: 'shift', date: te.business_date, te });
    for (const ins of compliance) {
      if (ins.source_date) list.push({ kind: 'alert', date: ins.source_date, insight: ins });
    }
    for (const s of sentimentEvents) {
      if (s.sentiment === 'positive') list.push({ kind: 'win', date: s.source_date, insight: s });
      else list.push({ kind: 'concern', date: s.source_date, insight: s });
    }
    if (profile.hire_date) list.push({ kind: 'status', date: profile.hire_date, label: 'Hired', isPositive: true });
    if ((profile as any).termination_date) {
      list.push({ kind: 'status', date: (profile as any).termination_date, label: 'Terminated', isPositive: false });
    }
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [timeEntries, compliance, sentimentEvents, profile]);

  if (events.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        No activity in the last {windowDays} days.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e, i) => {
        if (e.kind === 'shift') {
          const hours = (Number(e.te.regular_hours) || 0) + (Number(e.te.overtime_hours) || 0);
          return (
            <div key={`s-${e.te.id}`} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-medium text-sm">Shift · {hours.toFixed(1)} hrs{e.te.toast_job_title ? ` · ${e.te.toast_job_title}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{e.date}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtTime(e.te.in_date)} → {fmtTime(e.te.out_date)}
                  {' · '}{e.te.breaks.length} break{e.te.breaks.length === 1 ? '' : 's'}
                  {e.te.auto_clocked_out && (
                    <span className="ml-2 text-orange-400">auto-clocked-out</span>
                  )}
                </div>
              </div>
            </div>
          );
        }
        if (e.kind === 'alert') {
          return (
            <div key={`a-${e.insight.id}`} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/15 text-orange-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-medium text-sm">{METRIC_LABELS[e.insight.source_metric || ''] || e.insight.source_metric || 'Compliance alert'}</div>
                  <div className="text-xs text-muted-foreground">{e.date}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{e.insight.title}</div>
              </div>
            </div>
          );
        }
        if (e.kind === 'win') {
          return (
            <div key={`w-${e.insight.id}`} className="bg-card border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-medium text-sm text-emerald-400">Win{e.insight.pillar ? ` · ${e.insight.pillar}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{e.date}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.insight.title}</div>
              </div>
            </div>
          );
        }
        if (e.kind === 'concern') {
          return (
            <div key={`c-${e.insight.id}`} className="bg-card border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-medium text-sm text-red-400">Concern{e.insight.pillar ? ` · ${e.insight.pillar}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{e.date}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.insight.title}</div>
              </div>
            </div>
          );
        }
        return (
          <div key={`st-${i}`} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${e.isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
              {e.isPositive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-medium text-sm">{e.label}</div>
                <div className="text-xs text-muted-foreground">{e.date}</div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-2 text-center space-y-2">
        <p className="text-xs text-muted-foreground">Compliance, wins, and concerns shown for the last 90 days.</p>
        <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
          {loading ? 'Loading…' : `Load more shifts (older than ${windowDays} days)`}
        </Button>
      </div>
    </div>
  );
};
