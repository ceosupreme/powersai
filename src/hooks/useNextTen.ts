import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchEffectiveFoundationBatch, fetchEffectiveFoundationItems, laneScore, type EffectiveFoundationItem } from '@/lib/effectiveFoundation';
import { fetchAllPages, fetchRowsIn, groupBy } from '@/lib/batchFetch';
import { PRODUCT_STATUSES } from '@/hooks/useChannelProducts';
import { foundationStatusKey } from '@/components/foundation-audit/useFoundationScores';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';
import { isOwnerVisible, missingDependencyIds } from '@/lib/ownerWork';

export type NextTenSource = 'Action' | 'Lane' | 'Product' | 'KPI';

export interface NextTenRow {
  key: string;
  source: NextTenSource;
  step: string;
  projectId: string;
  projectName: string;
  /** Underlying record id (action item, product) or item/kpi key. */
  refId: string;
  /** Action rows that belong to a production job link to its pipeline page. */
  jobId?: string | null;
  /** Extra context needed to apply the check. */
  pillarKey?: string;
  kpiKey?: string;
  productStatus?: string;
  /** Small supporting text, e.g. a lane's value per hour or "P1 · due Oct 1". */
  note?: string;
  /** Lane ranking score (dollars per hour) when all four numbers exist. */
  laneValue?: number | null;
  /** Action rows only: 0 = approved, 1 = proposed/unreviewed/pending. */
  approvalRank?: number;
  /** Action rows only: 1 = critical … 4 = low, 5 = unset. */
  priorityRank?: number;
  /** Action rows only: ISO due date, used as the tiebreaker after priority. */
  dueDate?: string | null;
  /** Action rows only: ISO created_at, the final tiebreaker. */
  createdAt?: string | null;
  /**
   * One ranking score shared by every source so a valuable money lane can
   * outrank a low-priority action. Higher is sooner. See rankScore().
   */
  rank: number;
}

/** What a Next 10 query returns: the ranked rows plus any source that could not be checked. */
export interface NextTenResult {
  rows: NextTenRow[];
  /** Human labels of sources whose query failed ("action items", "money lanes"…). */
  unavailable: string[];
  /** Successful project/source checks, including sources with zero open rows. */
  checkedSources: number;
}

export function nextTenEmptyMessage(result: NextTenResult | undefined): string {
  if (result?.unavailable.length) {
    return result.checkedSources === 0
      ? 'No sources could be checked. Try again to see what needs attention.'
      : 'No open steps in the sources checked. Other sources are unavailable.';
  }
  return 'Nothing outstanding right now — add an action, a KPI target or a money lane.';
}

/** Shared products/actions appear once across brands because they complete once. */
export function mergeNextTenResults(lists: NextTenResult[]): NextTenResult {
  const seen = new Set<string>();
  const rows = lists.flatMap((list) => list.rows).sort(compareRows).filter((row) => {
    if (seen.has(row.key)) return false;
    seen.add(row.key);
    return true;
  }).slice(0, 10);
  return {
    rows,
    unavailable: [...new Set(lists.flatMap(list => list.unavailable))],
    checkedSources: lists.reduce((count, list) => count + list.checkedSources, 0),
  };
}

const PRODUCT_ADVANCE_FROM = ['needs cover', 'proof ordered', 'ready to upload'];

/** Approval states that mean "still needs a decision". A missing value counts as proposed. */
const DECISION_STATES = ['Proposed', 'Unreviewed', 'Pending'];

export function needsDecision(approvalStatus: string | null | undefined): boolean {
  if (!approvalStatus) return true;
  return DECISION_STATES.includes(approvalStatus);
}

/** True when a row is snoozed into the future. */
export function isSnoozed(snoozedUntil: string | null | undefined, now = Date.now()): boolean {
  if (!snoozedUntil) return false;
  const t = new Date(snoozedUntil).getTime();
  return Number.isFinite(t) && t > now;
}

/**
 * Rank an action item's priority label so the Next 10 can sort by it.
 * Handles the HQ labels (P1-Critical … P4-Low) and the older bare words
 * (critical, high, medium, low). Anything unrecognised sorts last.
 */
export function priorityRank(priority: string | null | undefined): number {
  const p = (priority ?? '').trim().toLowerCase();
  if (!p) return 5;
  const m = p.match(/^p([1-4])\b/);
  if (m) return Number(m[1]);
  if (p.startsWith('critical') || p.startsWith('urgent')) return 1;
  if (p.startsWith('high')) return 2;
  if (p.startsWith('medium') || p.startsWith('normal')) return 3;
  if (p.startsWith('low')) return 4;
  return 5;
}

/** Short label for a priority rank, for badges. */
export function priorityLabel(rank: number): string {
  return rank === 1 ? 'P1' : rank === 2 ? 'P2' : rank === 3 ? 'P3' : rank === 4 ? 'P4' : '—';
}

const DAY_MS = 86_400_000;

function daysUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  // Due dates are calendar dates, not UTC instants. Count whole calendar days
  // so an item due today does not become overdue at noon or shift at DST.
  const due = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (!Number.isFinite(due.getTime())) return null;
  const today = new Date(now);
  const calendarDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((calendarDay(due) - calendarDay(today)) / DAY_MS);
}

/**
 * One score for every row, so the list is ranked by value rather than by
 * source tier. The bands are deliberately coarse and explainable:
 *
 *   Action   P1 100 · P2 70 · P3 45 · P4 25 · unset 30
 *            +15 when past due, +8 when due within 7 days, +5 when approved
 *   Lane     40 + dollars per hour (capped at 95); lanes with no numbers 40
 *   Product  65 ready to upload · 60 proof ordered · 55 needs cover
 *   KPI      35 (enter this week's number)
 *
 * So a P1 action always leads, a 47 $/hr critical lane (87) beats a P2 action
 * (70), and a P4 proposed action (25) no longer hides every lane and product.
 */
export function rankScore(row: Omit<NextTenRow, 'rank'>, now = Date.now()): number {
  if (row.source === 'Action') {
    const base = { 1: 100, 2: 70, 3: 45, 4: 25, 5: 30 }[row.priorityRank ?? 5] ?? 30;
    const d = daysUntil(row.dueDate, now);
    const dueBonus = d == null ? 0 : d < 0 ? 15 : d <= 7 ? 8 : 0;
    const approvedBonus = row.approvalRank === 0 ? 5 : 0;
    return base + dueBonus + approvedBonus;
  }
  if (row.source === 'Lane') {
    const v = row.laneValue;
    return v == null ? 40 : Math.min(95, 40 + v);
  }
  if (row.source === 'Product') {
    const s = row.productStatus ?? '';
    return s === 'ready to upload' ? 65 : s === 'proof ordered' ? 60 : 55;
  }
  return 35;
}

const SOURCE_ORDER: Record<NextTenSource, number> = { Action: 0, Lane: 1, Product: 2, KPI: 3 };

/** Highest rank first; then source order; then earliest due date; then oldest created. */
export function compareRows(a: NextTenRow, b: NextTenRow): number {
  return (
    b.rank - a.rank ||
    SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source] ||
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  );
}

/** Approved first, then by priority, then earliest due date, then oldest created (used by Waiting on me). */
export function compareActionRows(a: NextTenRow, b: NextTenRow): number {
  return (
    (a.approvalRank ?? 9) - (b.approvalRank ?? 9) ||
    (a.priorityRank ?? 9) - (b.priorityRank ?? 9) ||
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  );
}

const STAGE_ORDER = PRODUCT_STATUSES as readonly string[];

export function nextProductStage(status: string | null): string | null {
  if (!status) return null;
  const i = STAGE_ORDER.indexOf(status);
  if (i === -1 || i >= STAGE_ORDER.indexOf('twin listed')) return null;
  return STAGE_ORDER[i + 1] ?? null;
}

function fmtDue(iso: string | null | undefined, now = Date.now()): string | null {
  const d = daysUntil(iso, now);
  if (d == null) return null;
  if (d < -1) return `${-d} days overdue`;
  if (d === -1) return '1 day overdue';
  if (d === 0) return 'due today';
  if (d === 1) return 'due tomorrow';
  return `due in ${d} days`;
}

const withRank = (row: Omit<NextTenRow, 'rank'>, now: number): NextTenRow => ({
  ...row,
  rank: rankScore(row, now),
});

/**
 * Status of every loaded action item plus any depends_on target outside the
 * loaded set, so "waits on a step that is not Done" can be checked.
 */
export async function fetchActionStatusMap(
  rows: { id: string; status?: string | null; depends_on?: string | null }[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>(rows.map((r) => [r.id, r.status ?? null]));
  const missing = missingDependencyIds(rows);
  if (missing.length) {
    const { data, error } = await supabase.from('action_items').select('id,status').in('id', missing);
    if (error) throw error;
    for (const r of (data ?? []) as any[]) map.set(r.id, r.status ?? null);
  }
  return map;
}

type NextTenProject = { projectId: string; projectName: string };

/** (a) Open action items: not done, not rejected, not snoozed, and the owner's turn. */
function actionNextTenRows(
  { projectId, projectName }: NextTenProject,
  actionRows: any[],
  statusById: Map<string, string | null>,
  now: number,
): NextTenRow[] {
  const rows: NextTenRow[] = [];
  const seen = new Set<string>();
  for (const a of actionRows) {
    if (a.status === 'Done' || a.approval_status === 'Rejected') continue;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    if (isSnoozed(a.snoozed_until, now)) continue;
    if (!isOwnerVisible(a, statusById)) continue;
    const approvalRank = a.approval_status === 'Approved' ? 0 : 1;
    const pr = priorityRank(a.priority);
    const bits = [priorityLabel(pr) !== '—' ? priorityLabel(pr) : null, fmtDue(a.due_date, now)].filter(Boolean);
    rows.push(
      withRank(
        {
          key: `action-${a.id}`,
          source: 'Action',
          step: a.title,
          projectId,
          projectName,
          refId: a.id,
          jobId: a.job_id ?? null,
          approvalRank,
          priorityRank: pr,
          dueDate: a.due_date ?? null,
          createdAt: a.created_at ?? null,
          note: bits.length ? bits.join(' · ') : undefined,
        },
        now,
      ),
    );
  }
  return rows;
}

/** (b) Money Lanes that are not on yet (missing), critical and high only. */
function laneNextTenRows(
  { projectId, projectName }: NextTenProject,
  items: EffectiveFoundationItem[],
  statusRows: { item_key: string; status: string }[],
  now: number,
): NextTenRow[] {
  const statusByKey = new Map(statusRows.map((s) => [s.item_key, s.status as string]));
  return items
    .filter((i) => {
      const st = statusByKey.get(i.item_key) ?? 'missing';
      return st === 'missing' && (i.severity === 'critical' || i.severity === 'high');
    })
    .map((i) => {
      const score = laneScore(i);
      return withRank(
        {
          key: `lane-${projectId}-${i.item_key}`,
          source: 'Lane',
          step: i.recommended_fix || i.label,
          projectId,
          projectName,
          refId: i.item_key,
          note: score == null ? undefined : `about $${Math.round(score).toLocaleString()}/hr`,
          laneValue: score,
        },
        now,
      );
    });
}

/** (c) Linked products mid-production. */
function productNextTenRows(
  { projectId, projectName }: NextTenProject,
  productRows: { id: string; name: string; status: string }[],
  now: number,
): NextTenRow[] {
  return productRows
    .filter((p) => PRODUCT_ADVANCE_FROM.includes(p.status))
    .map((p) => {
      const next = nextProductStage(p.status);
      return withRank(
        {
          key: `product-${p.id}`,
          source: 'Product',
          step: next ? `${p.name}: move to ${next}` : `${p.name}: advance stage`,
          projectId,
          projectName,
          refId: p.id,
          productStatus: p.status,
        },
        now,
      );
    });
}

/** (d) KPIs with a target but no actual this week. */
function kpiNextTenRows(
  { projectId, projectName }: NextTenProject,
  definitions: any[],
  values: any[],
  now: number,
): NextTenRow[] {
  const haveActual = new Set(values.filter((v) => v.actual != null).map((v) => `${v.pillar_key}:${v.kpi_key}`));
  return definitions
    .filter((d) => d.source !== 'auto')
    .filter((d) => !haveActual.has(`${d.pillar_key}:${d.kpi_key}`))
    .map((d) =>
      withRank(
        {
          key: `kpi-${projectId}-${d.pillar_key}-${d.kpi_key}`,
          source: 'KPI',
          step: `${d.kpi_label}: enter this week's number`,
          projectId,
          projectName,
          refId: d.kpi_key,
          pillarKey: d.pillar_key,
          kpiKey: d.kpi_key,
        },
        now,
      ),
    );
}

export async function fetchNextTenForProject(
  projectId: string,
  projectName: string,
  weekStart: string,
): Promise<NextTenResult> {
  const now = Date.now();
  const project = { projectId, projectName };
  const rows: NextTenRow[] = [];
  const unavailable: string[] = [];

  // (a) action items — rows may be keyed on bar_id or venue_id. Every open,
  // non-rejected, non-snoozed item counts, whatever its approval state;
  // approval only affects the ranking (approved items get a small bonus).
  try {
    const actionsRes = await supabase
      .from('action_items')
      .select('id,title,due_date,approval_status,status,created_at,priority,snoozed_until,owner_kind,depends_on,job_id')
      .or(`bar_id.eq.${projectId},venue_id.eq.${projectId}`);
    if (actionsRes.error) throw actionsRes.error;
    const actionRows = (actionsRes.data ?? []) as any[];
    const statusById = await fetchActionStatusMap(actionRows);
    rows.push(...actionNextTenRows(project, actionRows, statusById, now));
  } catch {
    unavailable.push('action items');
  }

  // (b) Money Lanes — lanes that are not on yet (missing), critical and high only.
  try {
    const venueRes = await supabase
      .from('venues')
      .select('project_type')
      .eq('id', projectId)
      .maybeSingle();
    if (venueRes.error) throw venueRes.error;
    if (venueRes.data?.project_type) {
      const [items, statusesRes] = await Promise.all([
        fetchEffectiveFoundationItems(projectId, venueRes.data.project_type),
        supabase
          .from('venue_foundation_item_status')
          .select('item_key,status')
          .eq('venue_id', projectId),
      ]);
      if (statusesRes.error) throw statusesRes.error;
      rows.push(...laneNextTenRows(project, items, (statusesRes.data ?? []) as any[], now));
    }
  } catch {
    unavailable.push('money lanes');
  }

  // (c) linked products mid-production
  try {
    const linksRes = await supabase
      .from('channel_product_channels')
      .select('product_id')
      .eq('project_id', projectId);
    if (linksRes.error) throw linksRes.error;
    const productIds = [...new Set(((linksRes.data ?? []) as any[]).map((l) => l.product_id))].filter(Boolean);
    if (productIds.length) {
      const prodsRes = await supabase
        .from('channel_products')
        .select('id,name,status')
        .in('id', productIds);
      if (prodsRes.error) throw prodsRes.error;
      rows.push(...productNextTenRows(project, (prodsRes.data ?? []) as any[], now));
    }
  } catch {
    unavailable.push('products');
  }

  // (d) KPIs with a target but no actual this week
  try {
    const [defsRes, valuesRes] = await Promise.all([
      supabase
        .from('project_kpis')
        .select('pillar_key,kpi_key,kpi_label,target,sort_order,source')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .not('target', 'is', null),
      supabase
        .from('project_kpi_values')
        .select('pillar_key,kpi_key,actual')
        .eq('project_id', projectId)
        .eq('week_start', weekStart),
    ]);
    if (defsRes.error) throw defsRes.error;
    if (valuesRes.error) throw valuesRes.error;
    rows.push(...kpiNextTenRows(project, (defsRes.data ?? []) as any[], (valuesRes.data ?? []) as any[], now));
  } catch {
    unavailable.push('KPIs');
  }

  return { rows: rows.sort(compareRows), unavailable, checkedSources: 4 - unavailable.length };
}

/** Action item columns the Next 10 and the brand work summaries both read, plus the two project keys. */
const ACTION_BATCH_COLUMNS =
  'id,title,priority,status,approval_status,snoozed_until,owner_kind,depends_on,job_id,created_at,due_date,bar_id,venue_id';

/** Action items for many projects at once. A row belongs to a project through bar_id or venue_id. */
export async function fetchActionRowsForProjects(projectIds: string[]): Promise<any[]> {
  const unique = [...new Set(projectIds.filter(Boolean))];
  const byId = new Map<string, any>();
  for (let i = 0; i < unique.length; i += 150) {
    const list = unique.slice(i, i + 150).join(',');
    const rows = await fetchAllPages<any>(() =>
      supabase.from('action_items').select(ACTION_BATCH_COLUMNS, { count: 'exact' }).or(`bar_id.in.(${list}),venue_id.in.(${list})`),
    );
    for (const r of rows) byId.set(r.id, r);
  }
  return [...byId.values()];
}

/** The action items of one project, as the single-project query `bar_id = id or venue_id = id` returns them. */
export function actionRowsFor(rows: any[], projectId: string): any[] {
  return rows.filter((r) => r.bar_id === projectId || r.venue_id === projectId);
}

/**
 * fetchNextTenForProject for many projects at once: each source is read once for all of them.
 * A source that cannot be read is listed as unavailable for every project, as it would be for
 * each project one by one. `shared` lets a caller that already loaded the action items or
 * product links pass them in.
 */
export async function fetchNextTenBatch(
  projects: { id: string; name: string }[],
  weekStart: string,
  shared: { actionRows?: any[]; statusById?: Map<string, string | null>; linkRows?: any[] } = {},
): Promise<Map<string, NextTenResult>> {
  const now = Date.now();
  const ids = projects.map((p) => p.id);

  const [actions, lanes, products, kpis] = await Promise.allSettled([
    (async () => {
      const rows = shared.actionRows ?? (await fetchActionRowsForProjects(ids));
      const statusById = shared.statusById ?? (await fetchActionStatusMap(rows));
      return { rows, statusById };
    })(),
    (async () => {
      const venues = await fetchRowsIn<{ id: string; project_type: string | null }>('venues', 'id,project_type', 'id', ids);
      const typeById = new Map(venues.map((v) => [v.id, v.project_type]));
      const typed = projects
        .filter((p) => typeById.get(p.id))
        .map((p) => ({ id: p.id, project_type: typeById.get(p.id) as string }));
      // Only projects with a type read lanes, so only they can be marked unavailable by a failed read.
      try {
        const [foundation, statuses] = await Promise.all([
          fetchEffectiveFoundationBatch(typed, { items: true }),
          fetchRowsIn('venue_foundation_item_status', 'venue_id,item_key,status', 'venue_id', typed.map((t) => t.id)),
        ]);
        return { typeById, foundation, statusesBy: groupBy(statuses as any[], 'venue_id'), error: null as unknown };
      } catch (error) {
        return { typeById, foundation: null, statusesBy: null, error };
      }
    })(),
    (async () => {
      const links = shared.linkRows ?? (await fetchRowsIn('channel_product_channels', 'project_id,product_id', 'project_id', ids,
        undefined, ['project_id', 'product_id']));
      const productIds = [...new Set((links as any[]).map((l) => l.product_id))].filter(Boolean);
      // Only projects with linked products read them, so only they can be marked unavailable by a failed read.
      try {
        const productRows = await fetchRowsIn<{ id: string; name: string; status: string }>('channel_products', 'id,name,status', 'id', productIds);
        return { linksBy: groupBy(links as any[], 'project_id'), productRows, error: null as unknown };
      } catch (error) {
        return { linksBy: groupBy(links as any[], 'project_id'), productRows: [] as { id: string; name: string; status: string }[], error };
      }
    })(),
    (async () => {
      const [definitions, values] = await Promise.all([
        fetchRowsIn('project_kpis', 'project_id,pillar_key,kpi_key,kpi_label,target,sort_order,source', 'project_id', ids,
          (q) => q.eq('is_active', true).not('target', 'is', null)),
        fetchRowsIn('project_kpi_values', 'project_id,pillar_key,kpi_key,actual', 'project_id', ids,
          (q) => q.eq('week_start', weekStart)),
      ]);
      return { definitionsBy: groupBy(definitions as any[], 'project_id'), valuesBy: groupBy(values as any[], 'project_id') };
    })(),
  ]);

  const out = new Map<string, NextTenResult>();
  for (const p of projects) {
    const project = { projectId: p.id, projectName: p.name };
    const rows: NextTenRow[] = [];
    const unavailable: string[] = [];
    try {
      if (actions.status !== 'fulfilled') throw actions.reason;
      rows.push(...actionNextTenRows(project, actionRowsFor(actions.value.rows, p.id), actions.value.statusById, now));
    } catch {
      unavailable.push('action items');
    }
    try {
      if (lanes.status !== 'fulfilled') throw lanes.reason;
      if (lanes.value.typeById.get(p.id)) {
        if (lanes.value.error) throw lanes.value.error;
        const found = lanes.value.foundation!.get(p.id);
        if (found) rows.push(...laneNextTenRows(project, found.items, lanes.value.statusesBy!.get(p.id) ?? [], now));
      }
    } catch {
      unavailable.push('money lanes');
    }
    try {
      if (products.status !== 'fulfilled') throw products.reason;
      const mine = new Set((products.value.linksBy.get(p.id) ?? []).map((l) => l.product_id).filter(Boolean));
      if (mine.size) {
        if (products.value.error) throw products.value.error;
        rows.push(...productNextTenRows(project, products.value.productRows.filter((r) => mine.has(r.id)), now));
      }
    } catch {
      unavailable.push('products');
    }
    try {
      if (kpis.status !== 'fulfilled') throw kpis.reason;
      rows.push(...kpiNextTenRows(project, kpis.value.definitionsBy.get(p.id) ?? [], kpis.value.valuesBy.get(p.id) ?? [], now));
    } catch {
      unavailable.push('KPIs');
    }
    out.set(p.id, { rows: rows.sort(compareRows), unavailable, checkedSources: 4 - unavailable.length });
  }
  return out;
}

/** Next 10 for a single project. */
export function useNextTen(projectId: string | null | undefined, projectName = '') {
  const weekStart = currentWeekRange().week_start;
  return useQuery({
    queryKey: ['next-ten', projectId, weekStart],
    enabled: !!projectId,
    queryFn: async (): Promise<NextTenResult> => {
      const r = await fetchNextTenForProject(projectId!, projectName, weekStart);
      return { ...r, rows: r.rows.slice(0, 10) };
    },
  });
}

/** Next 10 across a set of projects, ranked by the same score. */
export function useNextTenAcrossProjects(
  projects: { id: string; name: string }[],
) {
  const weekStart = currentWeekRange().week_start;
  const ids = projects.map((p) => p.id).join(',');
  return useQuery({
    queryKey: ['next-ten-all', ids, weekStart],
    enabled: projects.length > 0,
    queryFn: async (): Promise<NextTenResult> => {
      const byProject = await fetchNextTenBatch(projects, weekStart);
      return mergeNextTenResults(projects.map((p) => byProject.get(p.id)!));
    },
  });
}

/** Apply a Next 10 checkbox. KPI rows are handled inline by the UI. */
export function useCompleteNextTenRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: NextTenRow) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (row.source === 'Action') {
        const { error } = await supabase
          .from('action_items')
          .update({
            status: 'Done',
            completed_at: new Date().toISOString(),
            completed_by: user?.id ?? null,
          })
          .eq('id', row.refId);
        if (error) throw error;
        return;
      }
      if (row.source === 'Lane') {
        // "Mark done" on a lane means the lane is switched on.
        const { error } = await supabase.from('venue_foundation_item_status').upsert(
          {
            venue_id: row.projectId,
            item_key: row.refId,
            status: 'satisfied',
            source: 'manual',
            updated_by: user?.id ?? null,
            detected_at: new Date().toISOString(),
          },
          { onConflict: 'venue_id,item_key' },
        );
        if (error) throw error;
        return;
      }
      if (row.source === 'Product') {
        const next = nextProductStage(row.productStatus ?? null);
        if (!next) return;
        const { error } = await supabase
          .from('channel_products')
          .update({ status: next })
          .eq('id', row.refId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, row) => {
      qc.invalidateQueries({ queryKey: ['next-ten'] });
      qc.invalidateQueries({ queryKey: ['next-ten-all'] });
      qc.invalidateQueries({ queryKey: ['waiting-on-me'] });
      qc.invalidateQueries({ queryKey: ['actionItems'] });
      qc.invalidateQueries({ queryKey: ['channel-products'] });
      qc.invalidateQueries({ queryKey: foundationStatusKey(row.projectId) });
      qc.invalidateQueries({ queryKey: ['non-client-portfolio'] });
      qc.invalidateQueries({ queryKey: ['pipeline-job'] });
      qc.invalidateQueries({ queryKey: ['brand-workspace'] });
      qc.invalidateQueries({ queryKey: ['brand-work-summary'] });
    },
  });
}
