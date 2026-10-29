import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchEffectiveFoundationItems, laneScore } from '@/lib/effectiveFoundation';
import { PRODUCT_STATUSES } from '@/hooks/useChannelProducts';
import { foundationStatusKey } from '@/components/foundation-audit/useFoundationScores';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';

export type NextTenSource = 'Action' | 'Lane' | 'Product' | 'KPI';

export interface NextTenRow {
  key: string;
  source: NextTenSource;
  step: string;
  projectId: string;
  projectName: string;
  /** Underlying record id (action item, product) or item/kpi key. */
  refId: string;
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

export async function fetchNextTenForProject(
  projectId: string,
  projectName: string,
  weekStart: string,
): Promise<NextTenResult> {
  const now = Date.now();
  const rows: NextTenRow[] = [];
  const unavailable: string[] = [];

  // (a) action items — rows may be keyed on bar_id or venue_id. Every open,
  // non-rejected, non-snoozed item counts, whatever its approval state;
  // approval only affects the ranking (approved items get a small bonus).
  try {
    const actionsRes = await supabase
      .from('action_items')
      .select('id,title,due_date,approval_status,status,created_at,priority,snoozed_until')
      .or(`bar_id.eq.${projectId},venue_id.eq.${projectId}`);
    if (actionsRes.error) throw actionsRes.error;
    const seen = new Set<string>();
    for (const a of (actionsRes.data ?? []) as any[]) {
      if (a.status === 'Done' || a.approval_status === 'Rejected') continue;
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      if (isSnoozed(a.snoozed_until, now)) continue;
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
      const statusByKey = new Map(
        ((statusesRes.data ?? []) as any[]).map((s) => [s.item_key, s.status as string]),
      );
      items
        .filter((i) => {
          const st = statusByKey.get(i.item_key) ?? 'missing';
          return st === 'missing' && (i.severity === 'critical' || i.severity === 'high');
        })
        .forEach((i) => {
          const score = laneScore(i);
          rows.push(
            withRank(
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
            ),
          );
        });
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
      ((prodsRes.data ?? []) as any[])
        .filter((p) => PRODUCT_ADVANCE_FROM.includes(p.status))
        .forEach((p) => {
          const next = nextProductStage(p.status);
          rows.push(
            withRank(
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
            ),
          );
        });
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
    const haveActual = new Set(
      ((valuesRes.data ?? []) as any[])
        .filter((v) => v.actual != null)
        .map((v) => `${v.pillar_key}:${v.kpi_key}`),
    );
    ((defsRes.data ?? []) as any[])
      .filter((d) => d.source !== 'auto')
      .filter((d) => !haveActual.has(`${d.pillar_key}:${d.kpi_key}`))
      .forEach((d) =>
        rows.push(
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
        ),
      );
  } catch {
    unavailable.push('KPIs');
  }

  return { rows: rows.sort(compareRows), unavailable, checkedSources: 4 - unavailable.length };
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
      const lists = await Promise.all(
        projects.map((p) => fetchNextTenForProject(p.id, p.name, weekStart)),
      );
      return mergeNextTenResults(lists);
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
    },
  });
}
