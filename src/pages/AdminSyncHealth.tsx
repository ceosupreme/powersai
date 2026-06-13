// Admin-only diagnostics for the insight/sync pipeline.
// Surfaces suppressed metrics (coverage gates), dedup-race counters, and
// recent sanity-check suppressions. Visible only via /admin/sync-health,
// which is wrapped in <ProtectedRoute allowedRoles={['owner']}> in App.tsx.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SuppressedMetricRow {
  id: string;
  bar_id: string | null;
  venue_id: string | null;
  week_start: string;
  metric_key: string;
  gate: string;
  reason: string;
  days_present: number | null;
  valid_days: number | null;
  threshold: number | null;
  created_at: string;
}

interface SuppressedInsightRow {
  id: string;
  bar_id: string | null;
  source_metric: string;
  suspected_reason: string;
  current_value: number | null;
  trailing_mean: number | null;
  would_have_fired_for_date: string | null;
  created_at: string;
}

interface AiTotalsRow {
  calls: number;
  cost_usd: number | string;
  error_rate_pct: number | string;
}

interface AiRollupRow {
  function_name: string;
  provider: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | string;
  avg_latency_ms: number;
  errors: number;
}

interface AiCallRow {
  id: string;
  created_at: string;
  function_name: string;
  provider: string | null;
  model_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | string | null;
  latency_ms: number | null;
  error_state: string | null;
  error_message: string | null;
}

const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd4 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });
const num = new Intl.NumberFormat('en-US');

export default function AdminSyncHealth() {
  const [coverageRows, setCoverageRows] = useState<SuppressedMetricRow[]>([]);
  const [dedupRows, setDedupRows] = useState<SuppressedMetricRow[]>([]);
  const [sanityRows, setSanityRows] = useState<SuppressedInsightRow[]>([]);
  const [aiTotals, setAiTotals] = useState<AiTotalsRow | null>(null);
  const [aiRollup, setAiRollup] = useState<AiRollupRow[]>([]);
  const [aiCalls, setAiCalls] = useState<AiCallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [coverage, dedup, sanity, aiTotalsRes, aiRollupRes, aiCallsRes] = await Promise.all([
        supabase.from('suppressed_metrics')
          .select('*')
          .neq('gate', 'dedup_race')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('suppressed_metrics')
          .select('*')
          .eq('gate', 'dedup_race')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('suppressed_insights')
          .select('id,bar_id,source_metric,suspected_reason,current_value,trailing_mean,would_have_fired_for_date,created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200),
        (supabase as any).from('v_ai_call_log_totals_7d').select('*').maybeSingle(),
        (supabase as any).from('v_ai_call_log_rollup_7d').select('*'),
        (supabase as any).from('ai_call_log')
          .select('id,created_at,function_name,provider,model_id,input_tokens,output_tokens,cost_usd,latency_ms,error_state,error_message')
          .gte('created_at', since24h)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      if (!mounted) return;
      setCoverageRows((coverage.data || []) as SuppressedMetricRow[]);
      setDedupRows((dedup.data || []) as SuppressedMetricRow[]);
      setSanityRows((sanity.data || []) as SuppressedInsightRow[]);
      setAiTotals((aiTotalsRes?.data || null) as AiTotalsRow | null);
      setAiRollup((aiRollupRes?.data || []) as AiRollupRow[]);
      setAiCalls((aiCallsRes?.data || []) as AiCallRow[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-semibold">Sync Health</h1>
        <p className="text-sm text-muted-foreground">
          Defensive-logic observability for the insight pipeline. Trailing 7d.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Coverage-gate suppressions" value={loading ? '—' : coverageRows.length} hint="metric tiles forced to '—'" />
        <StatCard label="Dedup races (23505)" value={loading ? '—' : dedupRows.length} hint="upsert races on dedupe_hash" />
        <StatCard label="Sanity-check suppressions" value={loading ? '—' : sanityRows.length} hint="dramatic-deviation guard" />
      </section>

      <Card>
        <CardHeader><CardTitle>Coverage-gate suppressions</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <Table
              empty="No coverage gates tripped in the last 7 days."
              rows={coverageRows}
              cols={[
                { h: 'When', v: r => fmtTime(r.created_at) },
                { h: 'Bar', v: r => r.bar_id || r.venue_id || '—' },
                { h: 'Week', v: r => r.week_start },
                { h: 'Metric', v: r => <Badge variant="outline">{r.metric_key}</Badge> },
                { h: 'Gate', v: r => r.gate },
                { h: 'Reason', v: r => <span className="text-muted-foreground">{r.reason}</span> },
                { h: 'Coverage', v: r => r.days_present != null && r.valid_days != null ? `${r.days_present}/${r.valid_days}` : '—' },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dedup races</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <Table
              empty="No dedup-hash races caught in the last 7 days."
              rows={dedupRows}
              cols={[
                { h: 'When', v: r => fmtTime(r.created_at) },
                { h: 'Bar', v: r => r.bar_id || r.venue_id || '—' },
                { h: 'Week', v: r => r.week_start },
                { h: 'Metric', v: r => r.metric_key },
                { h: 'Reason', v: r => <span className="text-muted-foreground">{r.reason}</span> },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sanity-check suppressions</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <Table
              empty="No sanity-check suppressions in the last 7 days."
              rows={sanityRows}
              cols={[
                { h: 'When', v: r => fmtTime(r.created_at) },
                { h: 'Bar', v: r => r.bar_id || '—' },
                { h: 'For date', v: r => r.would_have_fired_for_date || '—' },
                { h: 'Metric', v: r => <Badge variant="outline">{r.source_metric}</Badge> },
                { h: 'Current', v: r => r.current_value ?? '—' },
                { h: 'Trailing mean', v: r => r.trailing_mean ?? '—' },
                { h: 'Reason', v: r => <span className="text-muted-foreground">{r.suspected_reason}</span> },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <header className="pt-4">
        <h2 className="text-xl font-semibold">AI calls</h2>
        <p className="text-sm text-muted-foreground">
          AI gateway usage across edge functions. Rollups trailing 7d; per-call table trailing 24h.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Total AI cost (7d)"
          value={loading ? '—' : usd2.format(Number(aiTotals?.cost_usd ?? 0))}
          hint="sum of cost_usd"
        />
        <StatCard
          label="Total calls (7d)"
          value={loading ? '—' : num.format(aiTotals?.calls ?? 0)}
          hint="ai_call_log rows"
        />
        <StatCard
          label="Error rate (7d)"
          value={loading ? '—' : `${Number(aiTotals?.error_rate_pct ?? 0).toFixed(2)}%`}
          hint="error_state not null/ok"
        />
      </section>

      <Card>
        <CardHeader><CardTitle>Cost by function & provider (7d)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <Table
              empty="No AI calls in the last 7 days."
              rows={aiRollup.map((r, i) => ({ ...r, id: `${r.function_name}::${r.provider}::${i}` }))}
              cols={[
                { h: 'Function', v: r => <Badge variant="outline">{r.function_name}</Badge> },
                { h: 'Provider', v: r => r.provider || '—' },
                { h: 'Calls', v: r => num.format(r.calls) },
                { h: 'Input tokens', v: r => num.format(r.input_tokens) },
                { h: 'Output tokens', v: r => num.format(r.output_tokens) },
                { h: 'Cost', v: r => <span className="font-mono">{usd4.format(Number(r.cost_usd))}</span> },
                { h: 'Avg latency', v: r => `${num.format(r.avg_latency_ms)} ms` },
                { h: 'Errors', v: r => r.errors > 0 ? <Badge variant="destructive">{r.errors}</Badge> : '—' },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent AI calls (24h)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <Table
              empty="No AI calls in the last 24 hours."
              rows={aiCalls}
              cols={[
                { h: 'When', v: r => fmtTime(r.created_at) },
                { h: 'Function', v: r => <Badge variant="outline">{r.function_name}</Badge> },
                { h: 'Provider', v: r => r.provider || '—' },
                { h: 'Model', v: r => <span className="text-xs text-muted-foreground">{r.model_id || '—'}</span> },
                { h: 'Tokens (in/out)', v: r => `${r.input_tokens ?? '—'} / ${r.output_tokens ?? '—'}` },
                { h: 'Cost', v: r => r.cost_usd != null ? <span className="font-mono">{usd4.format(Number(r.cost_usd))}</span> : '—' },
                { h: 'Latency', v: r => r.latency_ms != null ? `${num.format(r.latency_ms)} ms` : '—' },
                {
                  h: 'Error',
                  v: r => (!r.error_state || r.error_state === 'ok')
                    ? <span className="text-muted-foreground">—</span>
                    : <Badge variant="destructive" title={r.error_message || undefined}>{r.error_state}</Badge>,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      </CardContent>
    </Card>
  );
}

interface Col<T> { h: string; v: (r: T) => React.ReactNode }
function Table<T extends { id: string }>({ rows, cols, empty }: { rows: T[]; cols: Col<T>[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            {cols.map(c => <th key={c.h} className="py-2 pr-3 font-medium">{c.h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b last:border-0">
              {cols.map(c => <td key={c.h} className="py-2 pr-3 align-top">{c.v(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
