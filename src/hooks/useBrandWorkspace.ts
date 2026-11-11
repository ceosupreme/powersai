import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';
import { actionRowsFor, fetchActionRowsForProjects, fetchActionStatusMap, fetchInactiveJobIds, fetchNextTenBatch, isSnoozed, priorityRank } from '@/hooks/useNextTen';
import { fetchRowsIn, groupBy } from '@/lib/batchFetch';
import { PRODUCT_STATUSES } from '@/hooks/useChannelProducts';
import { isApprovalReady, isChannelStale, isOwnerVisible, monthBounds } from '@/lib/ownerWork';

// The new tables are typed, but loose access keeps these read helpers short.
const T = (t: string) => (supabase as any).from(t);

export interface WaitingAction {
  id: string;
  title: string;
  priority: string | null;
  priorityRank: number;
  jobId: string | null;
  projectId: string;
}
export interface WaitingContent {
  id: string;
  title: string;
  quality_score: number | null;
  idea_score: number | null;
  projectId: string;
}
export interface BrandWorkSummary {
  projectId: string;
  waitingActions: WaitingAction[];
  waitingContent: WaitingContent[];
  waitingCount: number;
  channelsLive: number;
  channelsTotal: number;
  channelsStale: number;
  followers: number | null;
  productsListed: number;
  productsTotal: number;
  publishedThisMonth: number;
  revenueMonth: number | null;
}

/** What a brand work summary is computed from. Both the single-brand and the many-brand loaders fill this in. */
interface BrandWorkInputs {
  actionRows: any[];
  statusById: Map<string, string | null>;
  inactiveJobIds: Set<string>;
  contentRows: any[];
  channelRows: any[];
  productIds: string[];
  listedProductIds: Set<string>;
  placementCount: number;
  revenueRows: any[];
}

function deriveBrandWorkSummary(projectId: string, x: BrandWorkInputs, now: number): BrandWorkSummary {
  const seen = new Set<string>();
  const waitingActions: WaitingAction[] = x.actionRows
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return (!a.job_id || !x.inactiveJobIds.has(a.job_id))
        && a.status !== 'Done' && a.approval_status === 'Approved'
        && !isSnoozed(a.snoozed_until, now) && isOwnerVisible(a, x.statusById);
    })
    .map((a) => ({
      id: a.id, title: a.title ?? 'Untitled step', priority: a.priority ?? null,
      priorityRank: priorityRank(a.priority), jobId: a.job_id ?? null, projectId,
    }))
    .sort((a, b) => a.priorityRank - b.priorityRank);

  const waitingContent: WaitingContent[] = x.contentRows
    .filter(isApprovalReady)
    .map((c) => ({ id: c.id, title: c.title, quality_score: c.quality_score, idea_score: c.idea_score, projectId }));

  const channels = x.channelRows;
  const followerRows = channels.filter((c) => c.followers != null);
  const productsListed = x.productIds.filter((id) => x.listedProductIds.has(id)).length;
  const revRows = x.revenueRows;

  return {
    projectId,
    waitingActions,
    waitingContent,
    waitingCount: waitingActions.length + waitingContent.length,
    channelsLive: channels.filter((c) => c.status === 'live').length,
    channelsTotal: channels.length,
    channelsStale: channels.filter((c) => isChannelStale(c, now)).length,
    followers: followerRows.length ? followerRows.reduce((s, c) => s + Number(c.followers), 0) : null,
    productsListed,
    productsTotal: x.productIds.length,
    publishedThisMonth: x.placementCount,
    revenueMonth: revRows.length ? revRows.reduce((s, r) => s + Number(r.amount ?? 0), 0) : null,
  };
}

export async function fetchBrandWorkSummary(projectId: string): Promise<BrandWorkSummary> {
  const now = Date.now();
  const { start, next, monthStart } = monthBounds();
  const [actionsRes, contentRes, channelsRes, linksRes, placementsRes, revenueRes] = await Promise.all([
    supabase
      .from('action_items')
      .select('id,title,priority,status,approval_status,snoozed_until,owner_kind,depends_on,job_id,created_at')
      .or(`bar_id.eq.${projectId},venue_id.eq.${projectId}`),
    T('content_items').select('id,title,quality_score,quality_fails,approved_at,idea_score').eq('project_id', projectId),
    T('brand_channels').select('status,cadence_target,last_post_at,followers').eq('project_id', projectId),
    T('channel_product_channels').select('product_id').eq('project_id', projectId),
    T('content_placements').select('id').eq('project_id', projectId).eq('status', 'published').gte('verified_at', start).lt('verified_at', next),
    T('channel_revenue').select('amount').eq('project_id', projectId).eq('period_month', monthStart),
  ]);
  for (const r of [actionsRes, contentRes, channelsRes, linksRes, placementsRes, revenueRes]) if (r.error) throw r.error;

  const actionRows = (actionsRes.data ?? []) as any[];
  const [statusById, inactiveJobIds] = await Promise.all([
    fetchActionStatusMap(actionRows), fetchInactiveJobIds(actionRows),
  ]);
  const productIds = [...new Set(((linksRes.data ?? []) as any[]).map((l) => l.product_id).filter(Boolean))] as string[];
  let listedProductIds = new Set<string>();
  if (productIds.length) {
    const lr = await T('product_listings').select('product_id').in('product_id', productIds).eq('status', 'listed');
    if (lr.error) throw lr.error;
    listedProductIds = new Set(((lr.data ?? []) as any[]).map((l) => l.product_id));
  }
  return deriveBrandWorkSummary(projectId, {
    actionRows,
    statusById,
    inactiveJobIds,
    contentRows: (contentRes.data ?? []) as any[],
    channelRows: (channelsRes.data ?? []) as any[],
    productIds,
    listedProductIds,
    placementCount: (placementsRes.data ?? []).length,
    revenueRows: (revenueRes.data ?? []) as any[],
  }, now);
}

/**
 * Work summaries plus each brand's top Next 10 step, for many brands at once: each table is
 * read once for all of them (about a dozen requests) instead of around thirty per brand.
 */
async function fetchBrandWorkCards(projects: { id: string; name: string }[], weekStart: string): Promise<Map<string, BrandWorkCard>> {
  const now = Date.now();
  const { start, next, monthStart } = monthBounds();
  const ids = projects.map((p) => p.id);
  const [actionRows, contentRows, channelRows, linkRows, placementRows, revenueRows] = await Promise.all([
    fetchActionRowsForProjects(ids),
    fetchRowsIn('content_items', 'project_id,id,title,quality_score,quality_fails,approved_at,idea_score', 'project_id', ids),
    fetchRowsIn('brand_channels', 'project_id,status,cadence_target,last_post_at,followers', 'project_id', ids),
    fetchRowsIn('channel_product_channels', 'project_id,product_id', 'project_id', ids, undefined, ['project_id', 'product_id']),
    fetchRowsIn('content_placements', 'project_id,id', 'project_id', ids,
      (q) => q.eq('status', 'published').gte('verified_at', start).lt('verified_at', next)),
    fetchRowsIn('channel_revenue', 'project_id,amount', 'project_id', ids, (q) => q.eq('period_month', monthStart)),
  ]);
  const [statusById, inactiveJobIds] = await Promise.all([
    fetchActionStatusMap(actionRows), fetchInactiveJobIds(actionRows),
  ]);
  const allProductIds = [...new Set((linkRows as any[]).map((l) => l.product_id).filter(Boolean))] as string[];
  const [listedRows, nextTen] = await Promise.all([
    fetchRowsIn('product_listings', 'product_id', 'product_id', allProductIds, (q) => q.eq('status', 'listed')),
    fetchNextTenBatch(projects, weekStart, { actionRows, statusById, inactiveJobIds, linkRows }),
  ]);
  const listedProductIds = new Set((listedRows as any[]).map((l) => l.product_id));
  const contentBy = groupBy(contentRows as any[], 'project_id');
  const channelsBy = groupBy(channelRows as any[], 'project_id');
  const linksBy = groupBy(linkRows as any[], 'project_id');
  const placementsBy = groupBy(placementRows as any[], 'project_id');
  const revenueBy = groupBy(revenueRows as any[], 'project_id');

  return new Map(
    projects.map((p) => {
      const productIds = [...new Set((linksBy.get(p.id) ?? []).map((l) => l.product_id).filter(Boolean))] as string[];
      const summary = deriveBrandWorkSummary(p.id, {
        actionRows: actionRowsFor(actionRows, p.id),
        statusById,
        inactiveJobIds,
        contentRows: contentBy.get(p.id) ?? [],
        channelRows: channelsBy.get(p.id) ?? [],
        productIds,
        listedProductIds,
        placementCount: (placementsBy.get(p.id) ?? []).length,
        revenueRows: revenueBy.get(p.id) ?? [],
      }, now);
      return [p.id, { ...summary, nextMove: nextTen.get(p.id)?.rows[0]?.step ?? null }];
    }),
  );
}

export function useBrandWorkSummary(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-work-summary', projectId],
    enabled: !!projectId,
    queryFn: () => fetchBrandWorkSummary(projectId!),
  });
}

/** Portfolio: one summary plus the top Next 10 step per brand. */
export function useBrandWorkSummaries(projects: { id: string; name: string }[]) {
  const weekStart = currentWeekRange().week_start;
  return useQuery({
    queryKey: ['brand-work-summary', 'many', projects.map((p) => p.id).join(','), weekStart],
    enabled: projects.length > 0,
    staleTime: 60_000,
    queryFn: () => fetchBrandWorkCards(projects, weekStart),
  });
}

export type BrandWorkCard = BrandWorkSummary & { nextMove: string | null };

// ---------- Channels ----------
export interface BrandChannel {
  id: string; project_id: string; platform: string; handle: string | null; url: string | null;
  account_label: string | null; status: string; content_level: number | null; cadence_target: number | null;
  last_post_at: string | null; followers: number | null; follower_date: string | null; scheduler: string | null;
  destination_method_id: string | null; notes: string | null;
}
export const CHANNEL_STATUSES = ['live', 'dormant', 'empty', 'planned', 'needs_access'] as const;

export function useBrandChannels(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-workspace', 'channels', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<BrandChannel[]> => {
      const { data, error } = await T('brand_channels').select('*').eq('project_id', projectId).order('platform');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateBrandChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BrandChannel> }) => {
      const { error } = await T('brand_channels').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-workspace'] });
      qc.invalidateQueries({ queryKey: ['brand-work-summary'] });
    },
  });
}

// ---------- Playbook library ----------
export interface KnowledgeRow {
  id: string; venue_id: string | null; subcategory: string | null; title: string; version: string | null;
  summary: string | null; key_points: string | null; expiry_date: string | null; external_url: string | null;
  attachment_url: string | null; status: string | null; description: string | null; tags?: string[] | null;
}
const KB_COLS = 'id,venue_id,subcategory,title,version,summary,key_points,expiry_date,external_url,attachment_url,status,description,tags';

export function useKnowledgeRows(ids: (string | null | undefined)[]) {
  const list = [...new Set(ids.filter((i): i is string => !!i))].sort();
  return useQuery({
    queryKey: ['brand-workspace', 'kb', list.join(',')],
    enabled: list.length > 0,
    queryFn: async (): Promise<Map<string, KnowledgeRow>> => {
      const { data, error } = await T('knowledge_base').select(KB_COLS).in('id', list);
      if (error) throw error;
      return new Map(((data ?? []) as KnowledgeRow[]).map((r) => [r.id, r]));
    },
  });
}

export function useProjectDocuments(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-workspace', 'docs', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [own, shared] = await Promise.all([
        T('knowledge_base').select(KB_COLS).eq('venue_id', projectId).in('subcategory', ['brand_rules', 'document']).order('title'),
        T('knowledge_base').select(KB_COLS).is('venue_id', null).eq('subcategory', 'document').order('title'),
      ]);
      if (own.error) throw own.error;
      if (shared.error) throw shared.error;
      return { own: (own.data ?? []) as KnowledgeRow[], shared: (shared.data ?? []) as KnowledgeRow[] };
    },
  });
}

// ---------- Jobs ----------
export interface ProductionJob {
  id: string; project_id: string; kind: string; title: string; target_type: string | null; target_id: string | null;
  recipe: { id: string; key: string; title: string; version: string; status: string }[] | null;
  level: number | null; status: string; money_destination: string | null;
  goal_text: string | null; goal_pillar_key: string | null; goal_kpi_key: string | null;
  owner_minutes_est: number | null;
  owner_minutes_actual: number | null; current_step: number | null; result_links: { label: string; url: string }[] | null;
  created_at: string;
}

export function useProjectJobs(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-workspace', 'jobs', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProductionJob[]> => {
      const { data, error } = await T('production_jobs').select('*').eq('project_id', projectId).neq('kind', 'playbook').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** target id -> job id, for Pipeline buttons. */
export function jobByTarget(jobs: ProductionJob[], targetType: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const j of jobs) if (j.target_type === targetType && j.target_id && !m.has(j.target_id)) m.set(j.target_id, j.id);
  return m;
}

// ---------- Products ----------
export function useProjectProducts(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-workspace', 'products', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const links = await T('channel_product_channels').select('product_id').eq('project_id', projectId);
      if (links.error) throw links.error;
      const ids = [...new Set(((links.data ?? []) as any[]).map((l) => l.product_id).filter(Boolean))];
      if (!ids.length) return [];
      const [prods, listings] = await Promise.all([
        T('channel_products').select('id,name,status,funnel_stage,price,monthly_sales').in('id', ids),
        T('product_listings').select('id,product_id,outlet,status,url').in('product_id', ids).order('outlet'),
      ]);
      if (prods.error) throw prods.error;
      if (listings.error) throw listings.error;
      const order = PRODUCT_STATUSES as readonly string[];
      const rank = (s: string | null) => { const i = order.indexOf(s ?? ''); return i === -1 ? 99 : i; };
      return ((prods.data ?? []) as any[])
        .map((p) => ({ ...p, listings: ((listings.data ?? []) as any[]).filter((l) => l.product_id === p.id) }))
        .sort((a, b) => rank(a.status) - rank(b.status) || String(a.name).localeCompare(String(b.name)));
    },
  });
}

// ---------- Intel ----------
export const STM_VENUE_ID = '34cb1836-6ead-4478-915c-0a9dc552a554';

export function useBrandIntel(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-workspace', 'intel', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [niche, pains, briefs, dims] = await Promise.all([
        T('content_sources').select('id,title,summary,updated_at').eq('project_id', projectId).eq('source_type', 'niche_profile').order('updated_at', { ascending: false }),
        T('audience_pains').select('id,pain_text,source_count,product_flag,pain_score').eq('project_id', projectId).order('pain_score', { ascending: false, nullsFirst: false }).limit(8),
        T('content_items').select('id,title,format,idea_score,purpose_type').eq('project_id', projectId).eq('stage', 'idea').not('idea_score', 'is', null).order('idea_score', { ascending: false }),
        T('content_sources').select('id,title').eq('project_id', STM_VENUE_ID).eq('source_type', 'radar_dimension').order('title'),
      ]);
      for (const r of [niche, pains, briefs, dims]) if (r.error) throw r.error;
      return { niche: (niche.data ?? []) as any[], pains: (pains.data ?? []) as any[], briefs: (briefs.data ?? []) as any[], dims: (dims.data ?? []) as any[] };
    },
  });
}

// ---------- Activity ----------
export interface ActivityEvent { key: string; at: string; text: string }

export function useBrandActivity(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-workspace', 'activity', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ActivityEvent[]> => {
      const links = await T('channel_product_channels').select('product_id').eq('project_id', projectId);
      if (links.error) throw links.error;
      const productIds = [...new Set(((links.data ?? []) as any[]).map((l) => l.product_id))];
      const [runs, placements, listings, actions, jobs] = await Promise.all([
        T('context_source_runs').select('id,source_type,completed_at,started_at,items_fetched,status').eq('venue_id', projectId).order('started_at', { ascending: false }).limit(10),
        T('content_placements').select('id,channel,account_label,verified_at,content_item_id').eq('project_id', projectId).eq('status', 'published').not('verified_at', 'is', null).order('verified_at', { ascending: false }).limit(10),
        productIds.length
          ? T('product_listings').select('id,outlet,listed_at,product_id').in('product_id', productIds).eq('status', 'listed').not('listed_at', 'is', null).order('listed_at', { ascending: false }).limit(10)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('action_items').select('id,title,completed_at').or(`bar_id.eq.${projectId},venue_id.eq.${projectId}`).eq('status', 'Done').not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(10),
        T('production_jobs').select('id,title,created_at').eq('project_id', projectId).neq('kind', 'playbook').order('created_at', { ascending: false }).limit(10),
      ]);
      for (const r of [runs, placements, listings, actions, jobs] as any[]) if (r.error) throw r.error;
      const ev: ActivityEvent[] = [
        ...((runs.data ?? []) as any[]).map((r) => ({
          key: `run-${r.id}`, at: r.completed_at ?? r.started_at,
          text: `${r.source_type === 'winner_radar' ? 'Radar run' : `${String(r.source_type).replace(/_/g, ' ')} run`} ${r.status ?? ''}${r.items_fetched != null ? ` · ${r.items_fetched} items` : ''}`,
        })),
        ...((placements.data ?? []) as any[]).map((p) => ({ key: `pl-${p.id}`, at: p.verified_at, text: `Published on ${p.account_label || p.channel}` })),
        ...((listings.data ?? []) as any[]).map((l) => ({ key: `li-${l.id}`, at: l.listed_at, text: `Listed on ${l.outlet}` })),
        ...((actions.data ?? []) as any[]).map((a) => ({ key: `ac-${a.id}`, at: a.completed_at, text: `Done: ${a.title}` })),
        ...((jobs.data ?? []) as any[]).map((j) => ({ key: `job-${j.id}`, at: j.created_at, text: `Job created: ${j.title}` })),
      ].filter((e) => !!e.at);
      return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
    },
  });
}

// ---------- Assets ----------
export function useBrandKitAssetsView(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['brand-workspace', 'assets', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const kit = await T('brand_kits').select('id,content_mode,bio_short,brand_voice').eq('project_id', projectId).eq('archived', false).maybeSingle();
      if (kit.error) throw kit.error;
      if (!kit.data) return { kit: null, assets: [] as any[], links: [] as any[] };
      const [assets, links] = await Promise.all([
        T('brand_kit_assets').select('id,file_name,storage_path,mime_type,asset_type,description').eq('kit_id', kit.data.id).order('uploaded_at', { ascending: false }),
        T('brand_kit_links').select('id,label,url,category,sort_order').eq('kit_id', kit.data.id).order('sort_order'),
      ]);
      if (assets.error) throw assets.error;
      if (links.error) throw links.error;
      return { kit: kit.data as { id: string; content_mode: string | null; bio_short: string | null; brand_voice: string | null }, assets: assets.data ?? [], links: links.data ?? [] };
    },
  });
}
