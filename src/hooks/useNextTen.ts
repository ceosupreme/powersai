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
  /** Small supporting text, e.g. a lane's value per hour. */
  note?: string;
  /** Lane ranking score (dollars per hour) when all four numbers exist. */
  laneValue?: number | null;
}

const PRODUCT_ADVANCE_FROM = ['needs cover', 'proof ordered', 'ready to upload'];

const STAGE_ORDER = PRODUCT_STATUSES as readonly string[];

export function nextProductStage(status: string | null): string | null {
  if (!status) return null;
  const i = STAGE_ORDER.indexOf(status);
  if (i === -1 || i >= STAGE_ORDER.indexOf('twin listed')) return null;
  return STAGE_ORDER[i + 1] ?? null;
}

async function buildForProject(
  projectId: string,
  projectName: string,
  weekStart: string,
): Promise<NextTenRow[]> {
  const approved: NextTenRow[] = [];
  const proposed: NextTenRow[] = [];
  const lanes: NextTenRow[] = [];
  const products: NextTenRow[] = [];
  const kpis: NextTenRow[] = [];

  // (a)+(b) action items — rows may be keyed on bar_id or venue_id
  const { data: actions } = await supabase
    .from('action_items')
    .select('id,title,due_date,approval_status,status,created_at')
    .or(`bar_id.eq.${projectId},venue_id.eq.${projectId}`)
    .neq('status', 'Done');

  const seenActionIds = new Set<string>();
  const openActions = (actions ?? []).filter((a: any) => {
    if (a.approval_status === 'Rejected') return false;
    if (seenActionIds.has(a.id)) return false;
    seenActionIds.add(a.id);
    return true;
  });
  openActions
    .filter((a: any) => a.approval_status === 'Approved')
    .sort((a: any, b: any) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
    .forEach((a: any) =>
      approved.push({
        key: `action-${a.id}`,
        source: 'Action',
        step: a.title,
        projectId,
        projectName,
        refId: a.id,
      }),
    );
  openActions
    .filter((a: any) => a.approval_status === 'Proposed' || a.approval_status === 'Unreviewed')
    .sort((a: any, b: any) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    .forEach((a: any) =>
      proposed.push({
        key: `action-${a.id}`,
        source: 'Action',
        step: a.title,
        projectId,
        projectName,
        refId: a.id,
      }),
    );

  // (c) Money Lanes — critical then high, lanes that are not on yet (missing)
  const { data: venue } = await supabase
    .from('venues')
    .select('project_type')
    .eq('id', projectId)
    .maybeSingle();
  if (venue?.project_type) {
    const [items, statusesRes] = await Promise.all([
      fetchEffectiveFoundationItems(projectId, venue.project_type),
      supabase
        .from('venue_foundation_item_status')
        .select('item_key,status')
        .eq('venue_id', projectId),
    ]);
    const statusByKey = new Map(
      ((statusesRes.data ?? []) as any[]).map((s) => [s.item_key, s.status as string]),
    );
    const sevRank: Record<string, number> = { critical: 0, high: 1 };
    items
      .filter((i) => {
        const st = statusByKey.get(i.item_key) ?? 'missing';
        return st === 'missing' && (i.severity === 'critical' || i.severity === 'high');
      })
      .sort(
        (a, b) =>
          (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9) ||
          (laneScore(b) ?? -1) - (laneScore(a) ?? -1),
      )
      .forEach((i) => {
        const score = laneScore(i);
        lanes.push({
          key: `lane-${projectId}-${i.item_key}`,
          source: 'Lane',
          step: i.recommended_fix || i.label,
          projectId,
          projectName,
          refId: i.item_key,
          note: score == null ? undefined : `about $${Math.round(score).toLocaleString()}/hr`,
          laneValue: score,
        });
      });
  }

  // (d) linked products mid-production
  const { data: links } = await supabase
    .from('channel_product_channels')
    .select('product_id')
    .eq('project_id', projectId);
  const productIds = [...new Set(((links ?? []) as any[]).map((l) => l.product_id))].filter(Boolean);
  if (productIds.length) {
    const { data: prods } = await supabase
      .from('channel_products')
      .select('id,name,status')
      .in('id', productIds);
    ((prods ?? []) as any[])
      .filter((p) => PRODUCT_ADVANCE_FROM.includes(p.status))
      .forEach((p) => {
        const next = nextProductStage(p.status);
        products.push({
          key: `product-${p.id}`,
          source: 'Product',
          step: next ? `${p.name}: move to ${next}` : `${p.name}: advance stage`,
          projectId,
          projectName,
          refId: p.id,
          productStatus: p.status,
        });
      });
  }

  // (e) KPIs with a target but no actual this week
  const [{ data: defs }, { data: values }] = await Promise.all([
    supabase
      .from('project_kpis')
      .select('pillar_key,kpi_key,kpi_label,target,sort_order')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .not('target', 'is', null),
    supabase
      .from('project_kpi_values')
      .select('pillar_key,kpi_key,actual')
      .eq('project_id', projectId)
      .eq('week_start', weekStart),
  ]);
  const haveActual = new Set(
    ((values ?? []) as any[])
      .filter((v) => v.actual != null)
      .map((v) => `${v.pillar_key}:${v.kpi_key}`),
  );
  ((defs ?? []) as any[])
    .filter((d) => !haveActual.has(`${d.pillar_key}:${d.kpi_key}`))
    .forEach((d) =>
      kpis.push({
        key: `kpi-${projectId}-${d.pillar_key}-${d.kpi_key}`,
        source: 'KPI',
        step: `${d.kpi_label}: enter this week's number`,
        projectId,
        projectName,
        refId: d.kpi_key,
        pillarKey: d.pillar_key,
        kpiKey: d.kpi_key,
      }),
    );

  return [...approved, ...proposed, ...lanes, ...products, ...kpis];
}

/** Next 10 for a single project. */
export function useNextTen(projectId: string | null | undefined, projectName = '') {
  const weekStart = currentWeekRange().week_start;
  return useQuery({
    queryKey: ['next-ten', projectId, weekStart],
    enabled: !!projectId,
    queryFn: async () => (await buildForProject(projectId!, projectName, weekStart)).slice(0, 10),
  });
}

/** Next 10 across a set of projects, ranked with the same order. */
export function useNextTenAcrossProjects(
  projects: { id: string; name: string }[],
) {
  const weekStart = currentWeekRange().week_start;
  const ids = projects.map((p) => p.id).join(',');
  return useQuery({
    queryKey: ['next-ten-all', ids, weekStart],
    enabled: projects.length > 0,
    queryFn: async () => {
      const lists = await Promise.all(
        projects.map((p) => buildForProject(p.id, p.name, weekStart)),
      );
      const order: NextTenSource[] = ['Action', 'Lane', 'Product', 'KPI'];
      const flat = lists.flat();
      // Keep the per-project ranking, interleaved by source tier.
      const ranked = order.flatMap((src) => flat.filter((r) => r.source === src));
      return ranked.slice(0, 10);
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
        const { error } = await supabase.from('venue_foundation_item_status').upsert(
          {
            venue_id: row.projectId,
            item_key: row.refId,
            status: 'partial',
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
      qc.invalidateQueries({ queryKey: ['actionItems'] });
      qc.invalidateQueries({ queryKey: ['channel-products'] });
      qc.invalidateQueries({ queryKey: foundationStatusKey(row.projectId) });
    },
  });
}
