import { ExternalLink, ChevronDown, ChevronRight, Database, FileSearch } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ToolCallRecord {
  name: string;
  input: any;
  result: any;
}

interface Props {
  evidence: ToolCallRecord[];
  className?: string;
}

const TOOL_LABELS: Record<string, string> = {
  get_insight_source_logs: 'Source log',
  get_daily_metrics: 'Daily metrics',
  get_metric_range: 'Metric range',
  get_weekly_scorecard: 'Weekly scorecard',
  get_labor_for_day: 'Labor (time entries)',
  get_employee_prior_insights: 'Prior insights for employee',
};

const fmt = (v: any): string => {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toString() : v.toFixed(2);
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
};

export const ToolEvidence = ({ evidence, className }: Props) => {
  if (!evidence?.length) return null;
  return (
    <div className={cn('space-y-2 mt-3', className)}>
      {evidence.map((ev, i) => (
        <EvidenceCard key={i} ev={ev} />
      ))}
    </div>
  );
};

const EvidenceCard = ({ ev }: { ev: ToolCallRecord }) => {
  const [open, setOpen] = useState(false);
  const label = TOOL_LABELS[ev.name] || ev.name;
  const res = ev.result ?? {};

  return (
    <div className="rounded-md border border-border/50 bg-muted/30 text-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {ev.name === 'get_insight_source_logs' ? (
            <FileSearch className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Database className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="font-medium text-foreground/90">{label}</span>
          <span className="text-xs text-muted-foreground">{summarizeInput(ev.input)}</span>
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border/40">
          {renderResult(ev.name, res)}
        </div>
      )}
    </div>
  );
};

const summarizeInput = (input: any): string => {
  if (!input || typeof input !== 'object') return '';
  const parts: string[] = [];
  if (input.date) parts.push(input.date);
  if (input.start_date && input.end_date) parts.push(`${input.start_date} → ${input.end_date}`);
  if (input.week_start) parts.push(`week of ${input.week_start}`);
  if (input.metric) parts.push(input.metric);
  if (input.employee_id) parts.push('employee');
  return parts.join(' • ');
};

const renderResult = (name: string, res: any) => {
  if (res?.error) return <p className="text-xs text-destructive">Error: {String(res.error)}</p>;

  if (name === 'get_insight_source_logs') {
    const src = res?.source;
    if (!src) {
      return (
        <div className="text-xs text-muted-foreground">
          <p>No source log resolved.</p>
          {res?.note && <p className="mt-1">Reason: {res.note}</p>}
          {res?.candidates?.length > 0 && (
            <p className="mt-1">{res.candidates.length} candidate log(s) on date.</p>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{src.log_type}</span>
          {src.asana_url ? (
            <a
              href={src.asana_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open in Asana <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-muted-foreground italic">no Asana link</span>
          )}
        </div>
        {src.log && <KeyValueGrid obj={pickLogFields(src.log)} />}
      </div>
    );
  }

  if (name === 'get_metric_range') {
    const rows = res?.rows || [];
    if (!rows.length) return <p className="text-xs text-muted-foreground">No data in range.</p>;
    return <SimpleTable rows={rows} max={20} />;
  }

  if (name === 'get_daily_metrics') {
    if (res?.missing) return <p className="text-xs text-muted-foreground">No metrics for {res.date}.</p>;
    return <KeyValueGrid obj={res} skip={['venue']} />;
  }

  if (name === 'get_weekly_scorecard') {
    return (
      <div className="space-y-2 text-xs">
        {res.scorecard && (
          <div>
            <div className="text-muted-foreground mb-1">Scorecard</div>
            <KeyValueGrid obj={res.scorecard} />
          </div>
        )}
        {res.core && (
          <div>
            <div className="text-muted-foreground mb-1">Core metrics</div>
            <KeyValueGrid obj={res.core} />
          </div>
        )}
      </div>
    );
  }

  if (name === 'get_labor_for_day') {
    const rows = res?.rows || [];
    if (!rows.length) return <p className="text-xs text-muted-foreground">No time entries.</p>;
    return (
      <SimpleTable
        rows={rows.map((r: any) => ({
          job: r.toast_job_title,
          in: r.in_date?.slice(11, 16),
          out: r.out_date?.slice(11, 16) || '—',
          reg_hrs: r.regular_hours,
          ot_hrs: r.overtime_hours,
          auto_out: r.auto_clocked_out ? 'yes' : '',
        }))}
        max={50}
      />
    );
  }

  if (name === 'get_employee_prior_insights') {
    const rows = res?.rows || [];
    if (!rows.length) return <p className="text-xs text-muted-foreground">No prior insights.</p>;
    return (
      <SimpleTable
        rows={rows.map((r: any) => ({
          date: r.source_date,
          severity: r.severity,
          pillar: r.pillar,
          title: r.title,
        }))}
        max={20}
      />
    );
  }

  return <pre className="text-[10px] overflow-x-auto">{JSON.stringify(res, null, 2)}</pre>;
};

const pickLogFields = (log: any): Record<string, any> => {
  if (!log) return {};
  const keys = [
    'date', 'author_name', 'gm_on_duty', 'shift', 'overall_shift_summary',
    'pacing', 'staffing_issues', 'guest_vibe', 'wins', 'incidents',
    'summary_notes', 'staff_performance_notes',
  ];
  const out: Record<string, any> = {};
  for (const k of keys) {
    if (log[k] != null && log[k] !== '') out[k] = log[k];
  }
  return out;
};

const KeyValueGrid = ({ obj, skip = [] }: { obj: Record<string, any>; skip?: string[] }) => {
  const entries = Object.entries(obj).filter(([k, v]) => !skip.includes(k) && v != null && v !== '');
  if (!entries.length) return <p className="text-xs text-muted-foreground">—</p>;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-border/20 py-0.5">
          <span className="text-muted-foreground">{k}</span>
          <span className="text-foreground font-mono text-right truncate">{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
};

const SimpleTable = ({ rows, max = 20 }: { rows: any[]; max?: number }) => {
  const shown = rows.slice(0, max);
  const cols = Object.keys(shown[0] || {});
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr className="text-muted-foreground border-b border-border/40">
            {cols.map(c => <th key={c} className="text-left font-medium py-1 pr-2">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i} className="border-b border-border/20">
              {cols.map(c => <td key={c} className="py-0.5 pr-2 font-mono">{fmt(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > max && (
        <p className="text-[10px] text-muted-foreground mt-1">+{rows.length - max} more rows</p>
      )}
    </div>
  );
};
