// Shared day-of-week baseline computation for soft / strong shift analyzers.
// Granularity: day-of-week only (daily_metrics has no daypart column today;
// see mem://features/growth-audit/shift-analyzer-granularity).
//
// Pulls trailing 12 ISO weeks (84 days) of net_sales for the venue, computes
// per-DOW baseline + last-4-week recent average + delta. Cached per request via
// the supplied Map so two analyzers in the same run share one DB pull.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type DowStats = {
  dow: number;            // 0=Sun, 6=Sat (JS Date.getDay convention)
  baseline: number;       // mean across all weeks
  recent4: number;        // mean across last 4 occurrences
  deltaPct: number;       // (recent4 - baseline) / baseline
  n: number;              // # of data points used
};

export type BaselineSnapshot = {
  weeksAvailable: number; // approx (n_data_days / 7)
  byDow: Record<number, DowStats>;
};

const CACHE = new WeakMap<SupabaseClient, Map<string, BaselineSnapshot>>();

export async function getShiftBaselines(
  supabase: SupabaseClient,
  venueId: string,
): Promise<BaselineSnapshot> {
  let venueCache = CACHE.get(supabase);
  if (!venueCache) { venueCache = new Map(); CACHE.set(supabase, venueCache); }
  const hit = venueCache.get(venueId);
  if (hit) return hit;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 84);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('date, net_sales')
    .eq('venue_id', venueId)
    .gte('date', sinceStr)
    .order('date', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []).filter((r: any) => r.net_sales != null && Number(r.net_sales) > 0);
  const byDow: Record<number, { all: number[]; recent: number[] }> = {};
  for (let i = 0; i < 7; i++) byDow[i] = { all: [], recent: [] };

  // Parse YYYY-MM-DD manually so we don't drift across UTC boundaries.
  for (const r of rows) {
    const [y, m, d] = String(r.date).split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    byDow[dow].all.push(Number(r.net_sales));
  }
  // Last-4 per DOW: the most recent 4 entries (rows are date-ascending).
  for (let i = 0; i < 7; i++) {
    byDow[i].recent = byDow[i].all.slice(-4);
  }

  const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const stats: Record<number, DowStats> = {};
  for (let i = 0; i < 7; i++) {
    const baseline = mean(byDow[i].all);
    const recent4 = mean(byDow[i].recent);
    const deltaPct = baseline > 0 ? (recent4 - baseline) / baseline : 0;
    stats[i] = { dow: i, baseline, recent4, deltaPct, n: byDow[i].all.length };
  }

  const snapshot: BaselineSnapshot = {
    weeksAvailable: Math.floor(rows.length / 7),
    byDow: stats,
  };
  venueCache.set(venueId, snapshot);
  return snapshot;
}

export const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
