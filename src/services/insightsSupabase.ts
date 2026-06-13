import { supabase } from '@/integrations/supabase/client';
import { ActionCard, ApprovalStatus, Pillar, Priority } from '@/types/venue';
import { shouldShowInFeed } from '@/lib/insightVisibility';

export type InsightTimeFilter = 'last7' | 'lastWeek' | 'last4' | 'last8' | 'all';

const ALL_TIME_ROW_CAP = 5000;

// Compute PT today and PT current-Monday (Mon=0) without UTC shifts.
function getPtAnchors(): { today: Date; currentMonday: Date } {
  const parts = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }).split('-');
  const today = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  const dow = today.getDay(); // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + offset);
  return { today, currentMonday };
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

/**
 * Resolve the active filter to an inclusive [start, end] source_date range
 * in PT, or null for the 'all' branch (no date predicate).
 */
export function resolveInsightDateRange(filter: InsightTimeFilter): { start: string; end: string } | null {
  const { today, currentMonday } = getPtAnchors();
  switch (filter) {
    case 'last7':
      return { start: fmt(addDays(today, -6)), end: fmt(today) };
    case 'lastWeek':
      return { start: fmt(addDays(currentMonday, -7)), end: fmt(addDays(currentMonday, -1)) };
    case 'last4':
      return { start: fmt(addDays(currentMonday, -28)), end: fmt(today) };
    case 'last8':
      return { start: fmt(addDays(currentMonday, -56)), end: fmt(today) };
    case 'all':
    default:
      return null;
  }
}

export type InsightCard = ActionCard & {
  weekId?: string;
  weekStart?: string;
  weekEnd?: string;
  simple_citation?: string;
  source_refs?: unknown[];
  bar_id?: string;
  employee_id?: string;
  employee_name?: string;
  source_log_id?: string | null;
  source_log_asana_url?: string | null;
};

export type InsightCardArray = InsightCard[] & { __capHit?: boolean };

/**
 * Fetch insights + action_items from Supabase and return as ActionCard[] for UI compatibility.
 * Date scoping is applied server-side via source_date to avoid PostgREST's 1000-row cap
 * silently truncating older insights once the table grows past it.
 */
export async function fetchInsightCardsFromSupabase(
  barId?: string,
  options: {
    includeIndividualMealBreaks?: boolean;
    includeIndividualNoClockouts?: boolean;
    timeFilter?: InsightTimeFilter;
  } = {}
): Promise<InsightCardArray> {
  const timeFilter: InsightTimeFilter = options.timeFilter || 'all';
  const range = resolveInsightDateRange(timeFilter);

  // 1. Fetch insights
  // Canonical visibility: status filter at DB layer, all other rules in
  // shouldShowInFeed() applied in-memory after fetch. See
  // mem://architecture/insight-pipeline/feed-visibility.
  let insightQuery = supabase
    .from('insights')
    .select('*')
    .neq('status', 'Consolidated')
    .neq('status', 'Dismissed')
    .order('created_at', { ascending: false });

  if (barId) {
    insightQuery = insightQuery.eq('bar_id', barId);
  }

  if (range) {
    // Bounded windows: rows without source_date (NULL) are excluded — same
    // behavior the prior in-memory branch enforced via `if (!card.weekStart) return false`.
    insightQuery = insightQuery.gte('source_date', range.start).lte('source_date', range.end);
  } else {
    // 'all': cap to prevent runaway payloads; warn when cap is hit so we can
    // add pagination before silent truncation returns.
    insightQuery = insightQuery.limit(ALL_TIME_ROW_CAP);
  }

  // 2. Fetch action_items (small table, no date cap needed; in-memory join
  //    drops actions whose insight isn't in the scoped result).
  let actionQuery = supabase
    .from('action_items')
    .select('*');

  if (barId) {
    actionQuery = actionQuery.eq('bar_id', barId);
  }

  const [insightsResult, actionsResult] = await Promise.all([insightQuery, actionQuery]);

  if (insightsResult.error) {
    console.error('Error fetching insights:', insightsResult.error);
    throw insightsResult.error;
  }
  if (actionsResult.error) {
    console.error('Error fetching action_items:', actionsResult.error);
    throw actionsResult.error;
  }

  // Apply canonical visibility rules in-memory. Audit page can opt back in
  // to individual meal-break / no-clockout rows via the options flags.
  const rawInsights = insightsResult.data || [];
  const insights = rawInsights.filter((ins: any) => {
    if (options.includeIndividualMealBreaks || options.includeIndividualNoClockouts) {
      const metric = String(ins.source_metric || '').toLowerCase();
      if (options.includeIndividualMealBreaks && (metric === 'late_meal' || metric === 'missed_meal')) return true;
      if (options.includeIndividualNoClockouts && metric === 'no_clockout') return true;
    }
    return shouldShowInFeed(ins, 'main_feed').show;
  });
  const actions = actionsResult.data || [];

  // Build a map of insight_id -> action_items[]
  const actionsByInsight = new Map<string, typeof actions>();
  for (const action of actions) {
    if (action.insight_id) {
      const existing = actionsByInsight.get(action.insight_id) || [];
      existing.push(action);
      actionsByInsight.set(action.insight_id, existing);
    }
  }

  // 3. For each insight, pair with its action items (or create a standalone card)
  // Batch-resolve source_log_id -> asana_task_gid for "Source log" link on cards.
  // Typed path: insight has source_log_type -> hit the specific table.
  // Untyped fallback: source_log_type is null (the common case) -> probe all
  // three log tables by id, mirroring the _shared/ai-tools.ts fallback so the
  // card link renders whenever the log is reachable by id.
  const logIdsByType = new Map<string, Set<string>>();
  const untypedIds = new Set<string>();
  for (const ins of insights) {
    const slid = (ins as any).source_log_id as string | null | undefined;
    if (!slid) continue;
    const slt = String((ins as any).source_log_type || '').toLowerCase();
    const table = slt === 'gm_log' ? 'gm_logs' : slt === 'lead_log' ? 'lead_logs' : slt === 'shift_log' ? 'shift_logs' : null;
    if (table) {
      if (!logIdsByType.has(table)) logIdsByType.set(table, new Set());
      logIdsByType.get(table)!.add(slid);
    } else {
      untypedIds.add(slid);
    }
  }
  const gidByLogId = new Map<string, string>();
  const probeTable = async (table: 'gm_logs' | 'lead_logs' | 'shift_logs', ids: string[]) => {
    if (!ids.length) return;
    const { data, error } = await supabase
      .from(table)
      .select('id, asana_task_gid')
      .in('id', ids);
    if (error) {
      console.warn(`[insightsSupabase] gid lookup failed for ${table}:`, error.message);
      return;
    }
    for (const row of data || []) {
      const gid = (row as any).asana_task_gid;
      const id = (row as any).id;
      if (gid && id && !gidByLogId.has(id)) gidByLogId.set(id, String(gid));
    }
  };
  const untypedArr = Array.from(untypedIds);
  await Promise.all([
    ...Array.from(logIdsByType.entries()).map(([table, idSet]) =>
      probeTable(table as 'gm_logs' | 'lead_logs' | 'shift_logs', Array.from(idSet))
    ),
    probeTable('gm_logs', untypedArr),
    probeTable('lead_logs', untypedArr),
    probeTable('shift_logs', untypedArr),
  ]);
  const resolveSourceLogUrl = (ins: any): string | null => {
    const slid = ins.source_log_id as string | null | undefined;
    if (!slid) return null;
    const gid = gidByLogId.get(slid);
    return gid ? `https://app.asana.com/0/0/${gid}` : null;
  };

  const cards: InsightCard[] = [];

  for (const insight of insights) {
    const relatedActions = actionsByInsight.get(insight.id) || [];

    if (relatedActions.length === 0) {
      // Insight with no action items at all – show as standalone
      const standaloneStatus = insight.status === 'Dismissed' ? 'Rejected' : 'Proposed';
      cards.push({
        id: insight.id,
        week: [],
        pillar: insight.pillar as Pillar,
        priority: normalizePriority(insight.severity) as Priority,
        insight_title: insight.title,
        insight_summary: insight.summary || '',
        problem_detail: insight.detail || '',
        action_title: '',
        action_detail: '',
        estimated_minutes: 0,
        effort_level: 'Medium',
        due_date: undefined,
        approval_status: standaloneStatus as ApprovalStatus,
        insightId: insight.id,
        bar_id: insight.bar_id,
        weekId: insight.week_id || undefined,
        weekStart: insight.source_date || undefined,
        weekEnd: undefined,
        simple_citation: buildCitation(insight),
        employee_id: (insight as Record<string, unknown>).employee_id as string | undefined || undefined,
        employee_name: (insight as Record<string, unknown>).employee_name as string | undefined || undefined,
        source_metric: (insight as Record<string, unknown>).source_metric as string | null ?? null,
        generated_by: (insight as Record<string, unknown>).generated_by as string | null ?? null,
        source_log_id: ((insight as any).source_log_id as string | null) ?? null,
        source_log_asana_url: resolveSourceLogUrl(insight),
      });
    } else {
      // One card per action item (including rejected, for accurate counts)
      for (const action of relatedActions) {
        cards.push({
          id: action.id,
          week: [],
          pillar: insight.pillar as Pillar,
          priority: normalizePriority(insight.severity) as Priority,
          insight_title: insight.title,
          insight_summary: insight.summary || '',
          problem_detail: insight.detail || '',
          action_title: action.title,
          action_detail: action.detail || '',
          estimated_minutes: action.estimated_minutes || 0,
          effort_level: action.effort_level || getEffortLevel(action.estimated_minutes),
          due_date: action.due_date || undefined,
          approval_status: (action.approval_status === 'Pending' ? 'Proposed' : action.approval_status) as ApprovalStatus,
          asana_task_gid: action.asana_task_gid || undefined,
          asana_task_url: action.asana_task_url || undefined,
          insightId: insight.id,
          bar_id: insight.bar_id,
          weekId: insight.week_id || undefined,
          weekStart: insight.source_date || undefined,
          weekEnd: undefined,
          simple_citation: buildCitation(insight),
          auto_approved: (action as Record<string, unknown>).auto_approved === true,
          employee_id: (insight as Record<string, unknown>).employee_id as string | undefined || undefined,
          employee_name: (insight as Record<string, unknown>).employee_name as string | undefined || undefined,
          source_metric: (insight as Record<string, unknown>).source_metric as string | null ?? null,
          generated_by: (insight as Record<string, unknown>).generated_by as string | null ?? null,
          source_log_id: ((insight as any).source_log_id as string | null) ?? null,
          source_log_asana_url: resolveSourceLogUrl(insight),
        });
      }
    }
  }

  const out = cards as InsightCardArray;
  if (!range && (insightsResult.data?.length ?? 0) >= ALL_TIME_ROW_CAP) {
    out.__capHit = true;
    console.warn(
      `[insights] "All Time" filter hit ${ALL_TIME_ROW_CAP}-row cap; oldest cards may be hidden. Add pagination soon.`
    );
  }
  return out;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  toast: 'Toast POS',
  seven_shifts: '7shifts',
  '7shifts_logbook': '7shifts Log Book',
  '7shifts_tasks': '7shifts Tasks',
  gm_log: 'Manager Log',
  lead_log: 'Lead Log',
  shift_log: 'Shift Log',
  combined: 'Multiple Sources',
};

const METRIC_LABELS: Record<string, string> = {
  net_sales: 'Net Sales',
  revenue: 'Net Sales',
  labor_percentage: 'Labor %',
  labor_pct: 'Labor %',
  void_pct: 'Void %',
  voids_pct: 'Void %',
  splh: 'SPLH',
  overtime: 'Overtime',
  overtime_pct: 'Overtime',
  actual_vs_scheduled_hours: 'Schedule Variance',
  tip_pct: 'Tip %',
  comps_pct: 'Comps %',
  discount_pct: 'Discount %',
  avg_check: 'Avg Check',
  guests: 'Guest Count',
  labor_hours: 'Labor Hours',
};

function formatShortDate(iso: string): string {
  // Manual parse to avoid UTC shift (memory: date-parsing-convention)
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildCitation(insight: Record<string, unknown>): string | undefined {
  const sourceType = insight.source_type ? String(insight.source_type) : null;
  const sourceMetric = insight.source_metric ? String(insight.source_metric) : null;
  const sourceValue = insight.source_value ? String(insight.source_value) : null;
  const sourceDate = insight.source_date ? String(insight.source_date) : null;
  const sourceContext = insight.source_context ? String(insight.source_context) : null;
  const employeeName = insight.employee_name ? String(insight.employee_name) : null;

  if (!sourceType && !sourceMetric && !sourceValue && !employeeName) return undefined;

  // If source_type already contains a formatted citation (e.g., "Toast POS — Club Marina — Mar 9, 2026"), use it directly
  if (sourceType && sourceType.includes(' — ')) {
    let citation = sourceType;
    // Append employee name (deterministic compliance insights have this)
    if (employeeName) citation += ` · ${employeeName}`;
    // Append source_date if not already in source_type (weekly insights embed range; daily detectors don't)
    if (sourceDate && !/\d{4}-\d{2}-\d{2}|week of|to \d/i.test(sourceType)) {
      citation += ` · ${formatShortDate(sourceDate)}`;
    }
    const metricLabel = sourceMetric ? (METRIC_LABELS[sourceMetric.toLowerCase()] || sourceMetric) : null;
    if (metricLabel && sourceValue) {
      citation += ` | ${metricLabel}: ${sourceValue}`;
    } else if (sourceValue) {
      citation += ` | ${sourceValue}`;
    }
    return citation;
  }

  // Legacy fallback: build citation from raw source_type keys
  let sourceName = SOURCE_TYPE_LABELS[sourceType || ''] || sourceType || 'Data';

  if (sourceType === 'combined' && sourceContext) {
    const mentions: string[] = [];
    if (/toast|net sales|labor %|splh|void|revenue|avg check/i.test(sourceContext)) mentions.push('Toast POS');
    if (/7shifts|schedul/i.test(sourceContext)) mentions.push('7shifts');
    if (/shift log/i.test(sourceContext)) mentions.push('Shift Log');
    if (/gm log|manager log/i.test(sourceContext)) mentions.push('Manager Log');
    if (/lead log/i.test(sourceContext)) mentions.push('Lead Log');
    if (mentions.length > 0) sourceName = mentions.join(' + ');
  }

  let dateStr = '';
  if (sourceDate) {
    const d = new Date(sourceDate + 'T00:00:00');
    dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const metricLabel = sourceMetric ? (METRIC_LABELS[sourceMetric.toLowerCase()] || sourceMetric) : null;

  let citation = sourceName;
  if (dateStr) citation += ` · ${dateStr}`;
  if (metricLabel && sourceValue) {
    citation += ` | ${metricLabel}: ${sourceValue}`;
  } else if (sourceValue) {
    citation += ` | ${sourceValue}`;
  }

  return citation;
}

function normalizePriority(raw: string | null): string {
  if (!raw) return 'Medium';
  const lower = raw.toLowerCase();
  if (lower.includes('critical') || lower.includes('urgent')) return 'Critical';
  if (lower.includes('high')) return 'High';
  if (lower.includes('medium')) return 'Medium';
  if (lower.includes('low') || lower.includes('nice')) return 'Low';
  return 'Medium';
}

function getEffortLevel(minutes: number | null): string {
  if (!minutes) return 'Medium';
  if (minutes <= 15) return 'Low';
  if (minutes <= 45) return 'Medium';
  return 'High';
}

/**
 * Search all insights (including Dismissed/Consolidated) by title/summary text.
 */
export async function searchAllInsights(query: string, barId?: string) {
  const searchPattern = `%${query}%`;

  let insightQuery = supabase
    .from('insights')
    .select('id, title, summary, pillar, severity, status, source_date, bar_id, created_at')
    .or(`title.ilike.${searchPattern},summary.ilike.${searchPattern}`)
    .order('created_at', { ascending: false })
    .limit(30);

  if (barId) {
    insightQuery = insightQuery.eq('bar_id', barId);
  }

  const { data, error } = await insightQuery;
  if (error) {
    console.error('Error searching insights:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update an action item's approval status in Supabase.
 */
export async function updateInsightCardApproval(
  cardId: string,
  updates: {
    approval_status?: ApprovalStatus;
    assignee_id?: string;
    asana_task_gid?: string;
    asana_task_url?: string;
    due_date?: string;
    approved_by_id?: string;
    rejected_by_id?: string;
    rejection_reason?: string;
    mention_gids?: string[];
  }
): Promise<{ success: boolean }> {
  const payload: Record<string, unknown> = {
    approval_status: updates.approval_status,
    asana_task_gid: updates.asana_task_gid,
    asana_task_url: updates.asana_task_url,
  };
  if (updates.due_date !== undefined) {
    payload.due_date = updates.due_date;
  }
  if (updates.mention_gids !== undefined) {
    payload.mention_gids = updates.mention_gids;
  }
  if (updates.approval_status === 'Approved' && updates.approved_by_id) {
    payload.approved_by_id = updates.approved_by_id;
    payload.approved_at = new Date().toISOString();
  }
  if (updates.approval_status === 'Rejected' && updates.rejected_by_id) {
    payload.rejected_by_id = updates.rejected_by_id;
    payload.rejected_at = new Date().toISOString();
    if (updates.rejection_reason !== undefined) {
      payload.rejection_reason = updates.rejection_reason;
    }
  }

  const { data, error } = await supabase
    .from('action_items')
    .update(payload)
    .eq('id', cardId)
    .select('id');

  if (error) {
    console.error('Error updating action item:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Update returned 0 rows — possible permissions issue');
  }

  return { success: true };
}

/**
 * Fetch daily metrics for a bar within a date range.
 */
export async function fetchDailyMetrics(barId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('bar_id', barId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching daily metrics:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch manager logs for a bar within a date range.
 */
export async function fetchManagerLogs(barId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('manager_logs')
    .select('*')
    .eq('bar_id', barId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching manager logs:', error);
    throw error;
  }

  return data || [];
}
