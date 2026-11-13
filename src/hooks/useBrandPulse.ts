import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages, fetchRowsIn, groupBy } from '@/lib/batchFetch';
import { businessPathProgress, type PathStage, type PathStep } from '@/lib/businessPath';
import {
  audienceSeries, moneySplit, moneyWindowStart, outputWeeks, publishedInLast7, publishedPieces, pulseStatus, weeklyTarget, crewFeedRows, crewWorkInLast7,
  type PublishedPiece, type PulseStatus, type CrewRunIn,
} from '@/lib/brandPulse';
import { STM_VENUE_ID } from '@/hooks/useBrandWorkspace';

const DAY = 86_400_000;

export interface PulseChannel { id: string; platform: string; handle: string | null; url: string | null; followers: number | null; cadence_target: number | null; last_post_at: string | null; status: string; latest: number | null; previous: number | null }
export interface PulseFeedItem {
  key: string; at: string; kind: 'task' | 'published' | 'path' | 'crew'; text: string; who: string;
  tried?: string | null; done?: string | null; flagged?: string | null; runStatus?: string;
  url?: string | null; detail?: string | null; why?: string | null; ownerKind?: string | null; minutes?: number | null; pillar?: string | null;
}
export interface BrandPulse {
  projectId: string;
  status: PulseStatus; reason: string;
  done7: number;
  setup: { pct: number | null; inPlace: number; needed: number; gaps: number };
  path: { placed: boolean; stageNumber: number | null; stageCount: number; stageName: string | null; doneWhen: string | null; done: number; total: number; segments: boolean[] };
  output: { published7: number; target: number | null; weeks: { week: string; label: string; count: number }[]; pieces: PublishedPiece[]; scheduled: { key: string; at: string; title: string; where: string | null }[] };
  audience: { total: number | null; change: number | null; points: { date: string; total: number }[]; channels: PulseChannel[] };
  money: ReturnType<typeof moneySplit> & { since: string; rows: { key: string; type: string; amount: number; month: string; note: string | null }[] };
  leads: { last30: number; openProposals: number } | null;
  feed: PulseFeedItem[];
  lastWork: PulseFeedItem | null;
}

const T = (t: string) => (supabase as any).from(t);

export async function fetchBrandPulses(ids: string[], viewerId: string | null, now = Date.now()): Promise<Map<string, BrandPulse>> {
  if (!ids.length) return new Map();
  const since60 = new Date(now - 60 * DAY).toISOString();
  const moneySince = moneyWindowStart(now);
  const isStm = ids.includes(STM_VENUE_ID);
  const since30 = new Date(now - 30 * DAY).toISOString();
  const doneFilter = (q: any) => q.eq('status', 'Done').gte('completed_at', since60);
  const actionCols = 'id,title,detail,insight_summary,problem_detail,estimated_minutes,pillar,completed_at,completed_by,owner_kind,bar_id,venue_id';
  const [byBar, byVenue, placements, items, channels, revenue, pathRows, settings, stagesRes, stepsRes, setupRes, leadsRes, propsRes, ordersRes, crewRuns] = await Promise.all([
    fetchRowsIn<any>('action_items', actionCols, 'bar_id', ids, doneFilter),
    fetchRowsIn<any>('action_items', actionCols, 'venue_id', ids, doneFilter),
    fetchRowsIn<any>('content_placements', 'id,project_id,content_item_id,live_url,verified_at,updated_at,channel,account_label,status,scheduled_for', 'project_id', ids),
    fetchRowsIn<any>('content_items', 'id,project_id,title,published_at,scheduled_at,stage', 'project_id', ids, (q) => q.or('published_at.not.is.null,scheduled_at.not.is.null')),
    fetchRowsIn<any>('brand_channels', 'id,project_id,platform,handle,url,followers,cadence_target,last_post_at,status', 'project_id', ids),
    fetchRowsIn<any>('channel_revenue', 'id,project_id,revenue_type,amount,period_month,source_note', 'project_id', ids, (q) => q.gte('period_month', moneySince)),
    fetchRowsIn<any>('brand_path_step_status', 'id,venue_id,step_key,status,note,evidence_url,updated_at,updated_by', 'venue_id', ids),
    fetchRowsIn<any>('brand_path_settings', '*', 'venue_id', ids, undefined, ['venue_id']),
    T('business_path_stages').select('*').eq('is_active', true),
    T('business_path_steps').select('*').eq('is_active', true).limit(2000),
    (supabase as any).rpc('brand_setup_summaries', { p_venue_ids: ids }),
    isStm ? T('inbound_leads').select('id', { count: 'exact', head: true }).gte('created_at', since30) : Promise.resolve({ count: 0, error: null }),
    isStm ? T('proposals').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'viewed', 'open']) : Promise.resolve({ count: 0, error: null }),
    isStm ? T('site_orders').select('id,amount_cents,status,created_at,product_key').gte('created_at', since30) : Promise.resolve({ data: [], error: null }),
    fetchAllPages<CrewRunIn>(() => T('crew_runs')
      .select('id,crew_key,status,started_at,finished_at,tried,done,flagged,details', { count: 'exact' })
      .or(`finished_at.gte.${since60},and(finished_at.is.null,started_at.gte.${since60})`)
      .or(ids.map((id) => `details->brands.cs.${JSON.stringify([id])}`).join(','))),
  ]);
  for (const r of [stagesRes, stepsRes, setupRes]) if (r.error) throw r.error;
  // Leads, proposals and site orders are extras: if they cannot be read the Money tile still shows revenue.
  const stats = await fetchRowsIn<any>('channel_stats', 'id,channel_id,captured_on,followers', 'channel_id', channels.map((c) => c.id));
  const crewNames = new Map((await fetchRowsIn<{ key: string; name: string }>('crews', 'key,name', 'key', crewRuns.map((r) => r.crew_key), undefined, ['key'])).map((c) => [c.key, c.name]));

  const people = [...new Set([...byBar, ...byVenue].map((a) => a.completed_by).concat(pathRows.map((p) => p.updated_by)).filter(Boolean))] as string[];
  let names = new Map<string, string>();
  try {
    const prof = await fetchRowsIn<any>('profiles', 'id,full_name,email', 'id', people);
    names = new Map(prof.map((p) => [p.id, p.full_name || p.email?.split('@')[0] || 'Team member']));
  } catch { /* names are a nicety */ }
  const personName = (id: string | null | undefined) => (!id ? null : id === viewerId ? 'You' : names.get(id) ?? 'Team member');

  const actionMap = new Map<string, any>();
  for (const a of [...byBar, ...byVenue]) actionMap.set(a.id, a);
  const actionsBy = new Map<string, any[]>();
  for (const a of actionMap.values()) {
    const pid = ids.includes(a.bar_id) ? a.bar_id : a.venue_id;
    actionsBy.set(pid, [...(actionsBy.get(pid) ?? []), a]);
  }
  const placementsBy = groupBy(placements, 'project_id');
  const itemsBy = groupBy(items, 'project_id');
  const channelsBy = groupBy(channels, 'project_id');
  const revenueBy = groupBy(revenue, 'project_id');
  const pathBy = groupBy(pathRows, 'venue_id');
  const settingsBy = new Map(settings.map((s) => [s.venue_id, s]));
  const setupBy = new Map(((setupRes.data ?? []) as any[]).map((r) => [r.venue_id, r]));
  const stages = (stagesRes.data ?? []) as PathStage[];
  const steps = (stepsRes.data ?? []) as PathStep[];
  const stepTitle = new Map(steps.map((s) => [s.key, s.title]));
  const statsByChannel = groupBy(stats, 'channel_id');

  const out = new Map<string, BrandPulse>();
  for (const id of ids) {
    const done = actionsBy.get(id) ?? [];
    const done7 = done.filter((a) => a.completed_at && new Date(a.completed_at).getTime() >= now - 7 * DAY).length + crewWorkInLast7(crewRuns, id, now);
    const pls = placementsBy.get(id) ?? [];
    const its = itemsBy.get(id) ?? [];
    const pieces = publishedPieces(pls, its);
    const published7 = publishedInLast7(pieces, now);
    const su = setupBy.get(id);
    const needed = Number(su?.needed_count ?? 0);
    const inPlace = Number(su?.in_place ?? 0);
    const pct = needed > 0 ? Math.round((inPlace / needed) * 100) : null;
    const { status, reason } = pulseStatus({ published7, done7, setupPct: pct });

    const statusRows = pathBy.get(id) ?? [];
    const prog = businessPathProgress(stages, steps, settingsBy.get(id) ?? null, statusRows as any);
    const cur = prog.current ?? null;

    const chans = channelsBy.get(id) ?? [];
    const aud = audienceSeries(chans, stats.filter((s) => chans.some((c) => c.id === s.channel_id)));
    const pulseChannels: PulseChannel[] = chans.map((c) => {
      const rows = (statsByChannel.get(c.id) ?? []).filter((r) => r.followers != null).sort((a, b) => b.captured_on.localeCompare(a.captured_on));
      return { ...c, latest: rows[0]?.followers ?? c.followers ?? null, previous: rows[1]?.followers ?? null };
    });

    const extras = id === STM_VENUE_ID
      ? ((ordersRes.data ?? []) as any[]).filter((o) => ['paid', 'complete', 'completed', 'succeeded'].includes(String(o.status))).map((o) => ({ type: 'Site orders', amount: Number(o.amount_cents ?? 0) / 100, month: String(o.created_at).slice(0, 7) }))
      : [];
    const rev = revenueBy.get(id) ?? [];
    const money = moneySplit(rev, extras);

    const nowIso = new Date(now).toISOString();
    const scheduled = [
      ...pls.filter((p) => !p.live_url && p.scheduled_for && p.scheduled_for >= nowIso).map((p) => ({ key: `pl-${p.id}`, at: p.scheduled_for, title: its.find((i) => i.id === p.content_item_id)?.title ?? 'Scheduled post', where: p.account_label || p.channel })),
      ...its.filter((i) => !i.published_at && i.scheduled_at && i.scheduled_at >= nowIso && !pls.some((p) => p.content_item_id === i.id && p.scheduled_for)).map((i) => ({ key: `it-${i.id}`, at: i.scheduled_at, title: i.title ?? 'Scheduled post', where: null })),
    ].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 5);

    const feed: PulseFeedItem[] = [
      ...crewFeedRows(crewRuns, id, crewNames),
      ...done.filter((a) => a.completed_at).map((a) => ({
        key: `ac-${a.id}`, at: a.completed_at, kind: 'task' as const, text: a.title ?? 'Task finished',
        who: a.owner_kind === 'claude' ? 'Claude' : a.owner_kind === 'agent' ? 'AI agent' : personName(a.completed_by) ?? (a.owner_kind === 'owner' ? 'Owner' : 'Not recorded'),
        detail: a.detail, why: a.insight_summary || a.problem_detail || null, ownerKind: a.owner_kind, minutes: a.estimated_minutes, pillar: a.pillar,
      })),
      ...pieces.filter((p) => p.url).map((p) => ({ key: `pub-${p.key}-${p.week}`, at: p.at, kind: 'published' as const, text: `Published: ${p.title}${p.where ? ` on ${p.where}` : ''}`, who: 'Not recorded', url: p.url })),
      ...statusRows.filter((r: any) => r.updated_at && r.status !== 'not_started').map((r: any) => ({
        key: `path-${r.id}`, at: r.updated_at, kind: 'path' as const,
        text: `Path step ${r.status === 'done' ? 'done' : r.status === 'not_needed' ? 'marked not needed' : `set to ${String(r.status).replace(/_/g, ' ')}`}: ${stepTitle.get(r.step_key) ?? r.step_key}`,
        who: personName(r.updated_by) ?? 'Not recorded', url: r.evidence_url, detail: r.note,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

    out.set(id, {
      projectId: id, status, reason, done7,
      setup: { pct, inPlace, needed, gaps: Number(su?.gaps ?? 0) },
      path: {
        placed: statusRows.length > 0, stageNumber: cur?.number ?? (prog.stages.length && !cur ? prog.stages.length : null),
        stageCount: prog.stages.length, stageName: cur?.name ?? (cur ? null : prog.stages[prog.stages.length - 1]?.name ?? null),
        doneWhen: (cur as any)?.done_when ?? null, done: prog.done, total: prog.total, segments: prog.stages.map((s) => s.complete),
      },
      output: { published7, target: weeklyTarget(chans), weeks: outputWeeks(pieces, now), pieces, scheduled },
      audience: { total: aud.total, change: aud.change, points: aud.points, channels: pulseChannels },
      money: { ...money, since: moneySince, rows: [
        ...rev.map((r) => ({ key: r.id, type: r.revenue_type || 'Other', amount: Number(r.amount ?? 0), month: r.period_month.slice(0, 7), note: r.source_note })),
        ...extras.map((e, i) => ({ key: `so-${i}`, type: e.type, amount: e.amount, month: e.month, note: null })),
      ] },
      leads: id === STM_VENUE_ID && !leadsRes.error ? { last30: leadsRes.count ?? 0, openProposals: propsRes.error ? 0 : propsRes.count ?? 0 } : null,
      feed, lastWork: feed[0] ?? null,
    });
  }
  return out;
}

export function useBrandPulses(ids: string[], viewerId: string | null | undefined) {
  const key = [...ids].sort().join(',');
  return useQuery({
    queryKey: ['brand-pulse', key, viewerId ?? null],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: () => fetchBrandPulses(ids, viewerId ?? null),
  });
}

export function useBrandPulse(id: string, viewerId: string | null | undefined) {
  const q = useBrandPulses(id ? [id] : [], viewerId);
  return { ...q, data: q.data?.get(id) };
}
