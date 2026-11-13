/**
 * Brand dashboard numbers (status chip, output weeks, audience trend, money split).
 * Pure so the Overview tab and the Portfolio cards share one set of rules.
 */
export type PulseStatus = 'green' | 'amber' | 'red';
export const STATUS_WORD: Record<PulseStatus, string> = { green: 'On track', amber: 'Needs attention', red: 'Gone quiet' };
const DAY = 86_400_000;

/** Pacific calendar date (YYYY-MM-DD) of an instant. */
export function ptDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}
/** Monday (YYYY-MM-DD) of the week holding a YYYY-MM-DD date. */
export function mondayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() - (dow - 1));
  return t.toISOString().slice(0, 10);
}
const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};

export function pulseStatus(x: { published7: number; done7: number; setupPct: number | null }): { status: PulseStatus; reason: string } {
  if (x.published7 === 0 && x.done7 === 0) return { status: 'red', reason: 'Nothing published and no task finished in the last 7 days.' };
  const why: string[] = [];
  if (x.published7 === 0) why.push('Nothing published in the last 7 days');
  if (x.done7 === 0) why.push('no task finished in the last 7 days');
  if (x.setupPct != null && x.setupPct < 50) why.push(`setup is only ${x.setupPct}% done`);
  if (why.length) {
    const s = why.join('; ');
    return { status: 'amber', reason: `${s[0].toUpperCase()}${s.slice(1)}.` };
  }
  return { status: 'green', reason: `${x.published7} published and ${x.done7} task${x.done7 === 1 ? '' : 's'} finished in the last 7 days.` };
}

export const STATUS_RANK: Record<PulseStatus, number> = { red: 0, amber: 1, green: 2 };

export interface PlacementIn { id: string; content_item_id: string | null; live_url: string | null; verified_at: string | null; updated_at: string | null; channel?: string | null; account_label?: string | null }
export interface ItemIn { id: string; title: string | null; published_at: string | null }
export interface PublishedPiece { key: string; at: string; week: string; title: string; url: string | null; where: string | null }

/**
 * One entry per piece per Pacific week. A placement with a live link counts (dated by
 * verified_at, else updated_at); a content item's published_at counts only when no
 * placement already counted that item in the same week.
 */
export function publishedPieces(placements: PlacementIn[], items: ItemIn[]): PublishedPiece[] {
  const titles = new Map(items.map((i) => [i.id, i.title]));
  const seen = new Set<string>();
  const out: PublishedPiece[] = [];
  for (const p of placements) {
    const at = p.verified_at ?? p.updated_at;
    if (!p.live_url || !at) continue;
    const week = mondayOf(ptDate(at));
    const key = p.content_item_id ? `item-${p.content_item_id}` : `pl-${p.id}`;
    if (seen.has(`${key}|${week}`)) continue;
    seen.add(`${key}|${week}`);
    out.push({ key, at, week, title: (p.content_item_id && titles.get(p.content_item_id)) || 'Published post', url: p.live_url, where: p.account_label || p.channel || null });
  }
  for (const i of items) {
    if (!i.published_at) continue;
    const week = mondayOf(ptDate(i.published_at));
    const key = `item-${i.id}`;
    if (seen.has(`${key}|${week}`)) continue;
    seen.add(`${key}|${week}`);
    out.push({ key, at: i.published_at, week, title: i.title || 'Published post', url: null, where: null });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Distinct pieces published in the last 7 days. */
export function publishedInLast7(pieces: PublishedPiece[], now = Date.now()): number {
  return new Set(pieces.filter((p) => new Date(p.at).getTime() >= now - 7 * DAY).map((p) => p.key)).size;
}

/** The last `n` Pacific weeks, oldest first, with pieces published in each. */
export function outputWeeks(pieces: PublishedPiece[], now = Date.now(), n = 8): { week: string; label: string; count: number }[] {
  const thisWeek = mondayOf(ptDate(new Date(now)));
  return Array.from({ length: n }, (_, i) => {
    const week = addDays(thisWeek, -7 * (n - 1 - i));
    const [, m, d] = week.split('-').map(Number);
    return { week, label: `${m}/${d}`, count: pieces.filter((p) => p.week === week).length };
  });
}

/** Weekly target: sum of cadence targets where set; null when none is set. */
export function weeklyTarget(channels: { cadence_target: number | string | null }[]): number | null {
  const set = channels.filter((c) => c.cadence_target != null && Number(c.cadence_target) > 0);
  return set.length ? set.reduce((s, c) => s + Number(c.cadence_target), 0) : null;
}

export interface ChannelIn { id: string; followers: number | null }
export interface StatIn { channel_id: string; captured_on: string; followers: number | null }
/**
 * Total followers over time. Each capture date carries every channel's latest known count
 * forward; channels with no captures add their saved follower count as a constant.
 */
export function audienceSeries(channels: ChannelIn[], stats: StatIn[]) {
  const withStats = new Set(stats.filter((s) => s.followers != null).map((s) => s.channel_id));
  const fallback = channels.filter((c) => !withStats.has(c.id) && c.followers != null).reduce((s, c) => s + Number(c.followers), 0);
  const hasFallback = channels.some((c) => !withStats.has(c.id) && c.followers != null);
  const rows = stats.filter((s) => s.followers != null && channels.some((c) => c.id === s.channel_id))
    .sort((a, b) => a.captured_on.localeCompare(b.captured_on));
  const dates = [...new Set(rows.map((r) => r.captured_on))];
  const latest = new Map<string, number>();
  const points = dates.map((date) => {
    for (const r of rows) if (r.captured_on === date) latest.set(r.channel_id, Number(r.followers));
    return { date, total: [...latest.values()].reduce((s, v) => s + v, 0) + fallback };
  });
  const total = points.length ? points[points.length - 1].total : hasFallback ? fallback : null;
  const change = points.length >= 2 ? points[points.length - 1].total - points[points.length - 2].total : null;
  return { total, change, points };
}

export interface RevenueIn { revenue_type: string | null; amount: number | string | null; period_month: string }
/** Money since the first day of the month 30 days ago, split by type and by month. */
export function moneySplit(rows: RevenueIn[], extra: { type: string; amount: number; month: string }[] = []) {
  const all = [...rows.map((r) => ({ type: r.revenue_type || 'Other', amount: Number(r.amount ?? 0), month: r.period_month.slice(0, 7) })), ...extra];
  const byType = new Map<string, number>();
  const byMonth = new Map<string, Record<string, number>>();
  for (const r of all) {
    byType.set(r.type, (byType.get(r.type) ?? 0) + r.amount);
    const m = byMonth.get(r.month) ?? {};
    m[r.type] = (m[r.type] ?? 0) + r.amount;
    byMonth.set(r.month, m);
  }
  return {
    total: all.length ? all.reduce((s, r) => s + r.amount, 0) : null,
    types: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, amount]) => ({ type, amount })),
    months: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, ...v })),
  };
}
/** First day of the month that holds the date 30 days ago (revenue is entered per month). */
export function moneyWindowStart(now = Date.now()): string {
  return `${ptDate(new Date(now - 30 * DAY)).slice(0, 7)}-01`;
}

export const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
