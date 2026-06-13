import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { passesSanityCheck, resolveSanityMetric } from '../_shared/sanity-check.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runDailyLaborAlerts } from "../_shared/labor-compliance-alerts.ts";
import { upsertDeterministicAction } from "../_shared/deterministic-actions.ts";
import { runDailyLeadRatingAlerts } from "../_shared/lead-rating-detector.ts";
import { buildResolveContext, resolveSourceLogId, SOURCE_UUID_RE, type CandidateLog } from "../_shared/source-attribution.ts";
import { shouldShowInFeed } from "../_shared/insight-visibility.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// (Anthropic API removed — all AI calls now go through Lovable AI Gateway)

// ── Types ────────────────────────────────────────────────────────────

interface DailyMetrics {
  net_sales: number | null;
  gross_sales: number | null;
  labor_pct: number | null;
  labor_cost: number | null;
  labor_hours: number | null;
  splh: number | null;
  tip_pct: number | null;
  comps_pct: number | null;
  comps: number | null;
  void_pct: number | null;
  voids: number | null;
  avg_check: number | null;
  orders_count: number | null;
  guests: number | null;
  overtime_pct: number | null;
  overtime_hours: number | null;
  discount_pct: number | null;
  discounts: number | null;
  refund_pct: number | null;
  food_sales: number | null;
  bev_sales: number | null;
  scheduled_hours: number | null;
  scheduled_cost: number | null;
  worked_hours: number | null;
  schedule_variance_hours: number | null;
}

interface PeriodTargets {
  weekly_net_sales_target: number | null;
  labor_pct_target: number | null;
  splh_target: number | null;
  tip_pct_target: number | null;
  void_rate_target: number | null;
  discount_pct_target: number | null;
  overtime_rate_target: number | null;
  weekly_aov_target: number | null;
  weekly_guests_target: number | null;
}

interface AIInsight {
  pillar: string;
  insight_type: string;
  severity: string;
  title: string;
  summary: string;
  detail: string;
  source_type: string;
  source_date: string;
  source_metric: string | null;
  source_value: string | null;
  source_context: string | null;
  source_log_type: string | null;
  source_log_id: string | null;
  employee_name: string | null;
  estimated_impact: string | null;
  suggested_action: {
    title: string;
    detail: string;
    estimated_minutes?: number;
    priority?: string;
    suggested_assignee?: string;
    description?: string;
  } | string | null | undefined;
  // Legacy / alternate field aliases tolerated from upstream AI responses.
  [extra: string]: any;
}

// ── 7shifts API helpers ──────────────────────────────────────────────

const SEVEN_SHIFTS_BASE = "https://api.7shifts.com/v2";

async function sevenShiftsFetch(path: string, token: string) {
  const res = await fetch(`${SEVEN_SHIFTS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`7shifts API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function get7shiftsCompanyId(token: string): Promise<number> {
  const data = await sevenShiftsFetch("/whoami", token);
  const activeUser = data.data?.users?.find((u: { active: boolean }) => u.active);
  if (activeUser) return activeUser.company_id;
  return data.data?.company_id;
}

// ── 7shifts context builders ────────────────────────────────────────



function build7shiftsTaskContext(taskLists: Record<string, unknown>[], detailedLists?: Record<string, unknown>[]): string {
  const lines: string[] = ['## 7SHIFTS TASKS (SOURCE: 7shifts Task Summary)'];

  // If we have detailed task lists (with individual task items), use those
  if (detailedLists && detailedLists.length > 0) {
    for (const list of detailedLists) {
      const listTitle = list.title || list.name || 'Untitled List';
      const totalTasks = Number(list.total_tasks) || 0;
      const completedCount = Number(list.total_tasks_completed) || 0;
      const completionPct = Number(list.completion_percentage) || 0;
      
      lines.push(`### (SOURCE: 7shifts Task Summary) ${listTitle} (${completedCount}/${totalTasks} complete — ${completionPct}%)`);
      
      const tasks = (list.tasks || list.task_list_items || []) as Record<string, unknown>[];
      const incompleteTasks = tasks.filter(t => !t.completed && t.status !== 'completed');
      if (incompleteTasks.length > 0) {
        lines.push('Incomplete tasks:');
        for (const task of incompleteTasks) {
          const title = task.title || task.description || task.content || 'Untitled';
          const assigneeName = task.assignee_name || task.assigned_to || '';
          const assigneeFirst = task.assignee_first_name || '';
          const assigneeLast = task.assignee_last_name || '';
          const assignee = assigneeName || (assigneeFirst ? `${assigneeFirst} ${assigneeLast}`.trim() : 'Unassigned');
          lines.push(`- ❌ ${title} (Responsible: ${assignee})`);
        }
      }
    }
  } else {
    // Fallback: summary-level task lists
    for (const list of taskLists) {
      const listTitle = list.title || list.name || 'Untitled List';
      const tasks = (list.tasks || []) as Record<string, unknown>[];
      const incompleteTasks = tasks.filter(t => !t.completed && t.status !== 'completed');
      if (incompleteTasks.length === 0) continue;
      lines.push(`### ${listTitle}`);
      for (const task of incompleteTasks) {
        const title = task.title || task.description || 'Untitled';
        const assignee = task.assignee_name || task.assigned_to || 'Unassigned';
        const dueDate = task.due_date || '';
        const isOverdue = dueDate && new Date(dueDate as string) < new Date();
        lines.push(`- ${isOverdue ? '⚠️ OVERDUE: ' : ''}${title} (Assigned: ${assignee}${dueDate ? `, Due: ${dueDate}` : ''})`);
      }
    }
  }
  return lines.length > 1 ? lines.join('\n') : '';
}

function build7shiftsShiftFeedbackContext(feedbackEntries: { rating: number; comment: string; employee_name: string; shift_start: string; shift_end: string }[]): string {
  const lowRated = feedbackEntries.filter(f => f.rating <= 3);
  if (lowRated.length === 0) return '';

  const lines: string[] = ['## 7SHIFTS SHIFT FEEDBACK — LOW RATINGS (≤ 3/5)'];
  for (const f of lowRated) {
    const shiftStart = f.shift_start ? new Date(f.shift_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
    const shiftEnd = f.shift_end ? new Date(f.shift_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
    lines.push(`- ⭐ ${f.rating}/5 — ${f.employee_name} (shift ${shiftStart}–${shiftEnd}): "${f.comment || 'No comment provided'}"`);
  }
  lines.push('');
  lines.push('INSTRUCTION: Generate a warning insight for EACH entry above. The insight title MUST include the employee name and their rating. The summary MUST state which shift (start–end time) received the low score and any comment provided.');
  return lines.join('\n');
}

// ── Inventory context builder ────────────────────────────────────────

// Compute overlap days between two date ranges (inclusive). Returns 0 if no overlap.
function computeOverlapDays(
  aStart: string, aEnd: string, bStart: string, bEnd: string
): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  const s = new Date(start + 'T12:00:00Z').getTime();
  const e = new Date(end + 'T12:00:00Z').getTime();
  return Math.round((e - s) / 86400000) + 1;
}

// Get top-N item names (by dollar loss) from one report's items
function topLossItemNames(items: Record<string, unknown>[], n = 10): string[] {
  return items
    .filter((i: any) => !i.is_category_total && i.missing_cost != null && i.missing_cost < 0)
    .sort((a: any, b: any) => (a.missing_cost ?? 0) - (b.missing_cost ?? 0))
    .slice(0, n)
    .map((i: any) => String(i.item_name));
}

function buildSingleReportSection(
  report: Record<string, unknown>,
  items: Record<string, unknown>[],
  scoringWeekStart?: string,
  scoringWeekEnd?: string
): string {
  const lines: string[] = [];
  const periodStart = String(report.period_start);
  const periodEnd = String(report.period_end);

  let header = `## SCULPTURE HOSPITALITY INVENTORY — Period ${periodStart} to ${periodEnd}`;
  if (scoringWeekStart && scoringWeekEnd) {
    const overlap = computeOverlapDays(periodStart, periodEnd, scoringWeekStart, scoringWeekEnd);
    const misaligned = overlap < 5;
    header += `\nScoring week: ${scoringWeekStart} to ${scoringWeekEnd}`;
    header += `\nOverlap with scoring week: ${overlap} day${overlap === 1 ? '' : 's'}${misaligned ? ' (PERIOD MISALIGNED — do NOT correlate inventory variance with this week\'s sales/labor)' : ''}`;
  }
  lines.push(header);

  if (report.sculpture_rating) lines.push(`Sculpture Rating: ${report.sculpture_rating}%`);
  if (report.total_missing_cost != null) lines.push(`Total Variance Cost: $${report.total_missing_cost}`);
  lines.push('');

  // Category summaries (is_category_total rows)
  const categoryTotals = items.filter((i: any) => i.is_category_total);
  if (categoryTotals.length > 0) {
    lines.push('### Category Summary');
    for (const cat of categoryTotals) {
      const parts: string[] = [`- ${cat.category || cat.item_name}:`];
      if (cat.used != null) parts.push(`Used ${cat.used}`);
      if (cat.sold != null) parts.push(`Sold ${cat.sold}`);
      if (cat.missing != null && cat.missing_pct != null) parts.push(`Missing ${cat.missing} (${cat.missing_pct}%)`);
      if (cat.missing_cost != null) parts.push(`Cost $${cat.missing_cost}`);
      if (cat.pour_cost != null && cat.ideal_pour_cost != null) parts.push(`Pour Cost ${cat.pour_cost}% vs ${cat.ideal_pour_cost}% ideal`);
      if (cat.sculpture_rating != null) parts.push(`Rating ${cat.sculpture_rating}%`);
      lines.push(parts.join(', '));
    }
    lines.push('');
  }

  // Top variances (items losing most money)
  const topVariances = items
    .filter((i: any) => !i.is_category_total && i.missing_cost != null && i.missing_cost < 0)
    .sort((a: any, b: any) => (a.missing_cost ?? 0) - (b.missing_cost ?? 0))
    .slice(0, 10);

  if (topVariances.length > 0) {
    lines.push('### Top Variances (items losing most money)');
    topVariances.forEach((item: any, idx: number) => {
      const parts: string[] = [`${idx + 1}. ${item.item_name}`];
      if (item.missing != null && item.missing_pct != null) parts.push(`${item.missing} (${item.missing_pct}%)`);
      if (item.missing_cost != null) parts.push(`$${item.missing_cost}`);
      lines.push(parts.join(', '));
    });
  }

  return lines.join('\n');
}

function buildInventoryContext(
  reports: { report: Record<string, unknown>; items: Record<string, unknown>[] }[],
  scoringWeekStart?: string,
  scoringWeekEnd?: string
): string {
  if (reports.length === 0) return '';

  const sections: string[] = [];

  // Current (most recent) report
  const current = reports[0];
  sections.push(buildSingleReportSection(current.report, current.items, scoringWeekStart, scoringWeekEnd));

  // Trailing analysis: items in top-10 of >=2 of the (up to 4) reports
  if (reports.length >= 2) {
    const appearanceMap = new Map<string, { appearances: number; totalLoss: number; periods: string[] }>();
    for (const r of reports) {
      const top = r.items
        .filter((i: any) => !i.is_category_total && i.missing_cost != null && i.missing_cost < 0)
        .sort((a: any, b: any) => (a.missing_cost ?? 0) - (b.missing_cost ?? 0))
        .slice(0, 10);
      const periodLabel = `${r.report.period_start}→${r.report.period_end}`;
      for (const it of top) {
        const name = String((it as any).item_name);
        const loss = Math.abs(Number((it as any).missing_cost) || 0);
        const existing = appearanceMap.get(name);
        if (existing) {
          existing.appearances += 1;
          existing.totalLoss += loss;
          existing.periods.push(periodLabel);
        } else {
          appearanceMap.set(name, { appearances: 1, totalLoss: loss, periods: [periodLabel] });
        }
      }
    }

    const recurring = Array.from(appearanceMap.entries())
      .filter(([, v]) => v.appearances >= 2)
      .sort((a, b) => b[1].totalLoss - a[1].totalLoss)
      .slice(0, 10);

    if (recurring.length > 0) {
      const trailingLines: string[] = [
        '',
        `### RECURRING SHRINKAGE (items in top-10 dollar-loss across ${reports.length} consecutive Sculpture counts)`,
        'These items have appeared as top losses in multiple consecutive inventory counts — this indicates SYSTEMIC loss (over-pouring, theft, miscount methodology), NOT a one-off event. Prioritize these in recommendations.',
      ];
      recurring.forEach(([name, v], idx) => {
        trailingLines.push(`${idx + 1}. ${name} — appeared in ${v.appearances}/${reports.length} counts, cumulative loss $${v.totalLoss.toFixed(2)} (periods: ${v.periods.join(', ')})`);
      });
      sections.push(trailingLines.join('\n'));
    }
  }

  return sections.join('\n\n');
}

// ── Sculpture extended-source context builders (weekly mode) ─────────
// These are additive: they surface the four extra Sculpture data sources
// (Drink Mix, Summary Variance, InteliPar, Cost Fluctuation, Station Stock)
// to the AI without altering the existing inventory_reports/items pipeline.

function scNum(v: unknown, digits = 0): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!isFinite(n)) return 'N/A';
  return n.toFixed(digits);
}
function scPct(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!isFinite(n)) return 'N/A';
  return `${n.toFixed(1)}%`;
}

function buildDrinkMixContext(rows: Record<string, unknown>[], periodLabel: string): string {
  if (!rows || rows.length === 0) return '';
  const top = rows
    .filter((r: any) => Number(r.qty_sold) > 0)
    .sort((a: any, b: any) => (Number(b.qty_sold) || 0) - (Number(a.qty_sold) || 0))
    .slice(0, 50);
  if (top.length === 0) return '';

  const lines: string[] = [
    `## SCULPTURE — DRINK MIX (cocktail-level sales & recipe economics, ${periodLabel})`,
    'Top recipes by qty sold. Pour cost % is theoretical recipe cost; large gaps vs sales price = margin opportunity.',
    '',
  ];
  top.forEach((r: any, idx: number) => {
    const parts: string[] = [`${idx + 1}. ${r.recipe_name || r.plu || 'Unknown'}`];
    parts.push(`qty ${scNum(r.qty_sold)}`);
    if (r.regular_price != null) parts.push(`price $${scNum(r.regular_price, 2)}`);
    if (r.regular_pour_cost_pct != null) parts.push(`pour ${scPct(r.regular_pour_cost_pct)}`);
    if (r.regular_total_profit != null) parts.push(`profit $${scNum(r.regular_total_profit, 0)}`);
    if (r.regular_theoretical_profit != null && r.regular_total_profit != null) {
      const gap = Number(r.regular_theoretical_profit) - Number(r.regular_total_profit);
      if (isFinite(gap) && Math.abs(gap) >= 25) parts.push(`vs theoretical $${scNum(r.regular_theoretical_profit, 0)} (gap $${scNum(gap, 0)})`);
    }
    if (Number(r.spill_qty) > 0) parts.push(`spill qty ${scNum(r.spill_qty)}`);
    if (Number(r.comp_qty) > 0) parts.push(`comp qty ${scNum(r.comp_qty)}`);
    lines.push(`- ${parts.join(', ')}`);
  });
  return lines.join('\n');
}

function buildSummaryVarianceContext(rows: Record<string, unknown>[], periodLabel: string): string {
  if (!rows || rows.length === 0) return '';
  const grand = rows.find((r: any) => r.is_grand_total === true);
  const cats = rows.filter((r: any) => r.is_grand_total !== true);
  if (cats.length === 0 && !grand) return '';

  const lines: string[] = [
    `## SCULPTURE — SUMMARY VARIANCE (category-level pour cost & Sculpture Rating, ${periodLabel})`,
  ];
  if (grand) {
    const g: any = grand;
    const parts: string[] = ['### Overall:'];
    if (g.pour_cost_pct != null) parts.push(`Pour Cost ${scPct(g.pour_cost_pct)}`);
    if (g.ideal_pour_cost_pct != null) parts.push(`vs ideal ${scPct(g.ideal_pour_cost_pct)}`);
    if (g.sculpture_rating_pct != null) parts.push(`Sculpture Rating ${scPct(g.sculpture_rating_pct)}`);
    if (g.missing_cost != null) parts.push(`Missing $${scNum(g.missing_cost, 0)}`);
    if (g.revenue_potential != null) parts.push(`Revenue Potential $${scNum(g.revenue_potential, 0)}`);
    lines.push(parts.join(' '));
  }
  if (cats.length > 0) {
    lines.push('### Categories:');
    cats.forEach((c: any) => {
      const parts: string[] = [`- ${c.category_name}:`];
      if (c.pour_cost_pct != null) parts.push(`pour ${scPct(c.pour_cost_pct)}`);
      if (c.ideal_pour_cost_pct != null) parts.push(`(ideal ${scPct(c.ideal_pour_cost_pct)})`);
      if (c.sculpture_rating_pct != null) parts.push(`rating ${scPct(c.sculpture_rating_pct)}`);
      if (c.missing_cost != null) parts.push(`missing $${scNum(c.missing_cost, 0)}`);
      if (c.spillage_cost != null && Number(c.spillage_cost) > 0) parts.push(`spill $${scNum(c.spillage_cost, 0)}`);
      lines.push(parts.join(' '));
    });
  }
  return lines.join('\n');
}

function buildInteliparContext(rows: Record<string, unknown>[], periodLabel: string): string {
  if (!rows || rows.length === 0) return '';
  // Actionable: run-out risk (days_remaining < 30) OR excess stock (excess_stock_onhand > 100)
  const actionable = rows.filter((r: any) => {
    const dr = parseFloat(String(r.days_remaining ?? ''));
    const excess = Number(r.excess_stock_onhand);
    return (isFinite(dr) && dr < 30) || (isFinite(excess) && excess > 100);
  }).slice(0, 50);
  if (actionable.length === 0) return '';

  const runOut = actionable.filter((r: any) => {
    const dr = parseFloat(String(r.days_remaining ?? ''));
    return isFinite(dr) && dr < 30;
  }).sort((a: any, b: any) => parseFloat(String(a.days_remaining)) - parseFloat(String(b.days_remaining)));
  const excess = actionable.filter((r: any) => Number(r.excess_stock_onhand) > 100)
    .sort((a: any, b: any) => Number(b.excess_stock_onhand) - Number(a.excess_stock_onhand));

  const lines: string[] = [
    `## SCULPTURE — INTELIPAR (par-level run-out & excess stock, ${periodLabel})`,
  ];
  if (runOut.length > 0) {
    lines.push('### Run-out risk (<30 days remaining):');
    runOut.slice(0, 25).forEach((r: any) => {
      const parts: string[] = [`- ${r.item_name}`];
      if (r.item_size) parts.push(`(${r.item_size})`);
      parts.push(`days remaining ${r.days_remaining}`);
      if (r.on_hand_qty != null) parts.push(`on hand ${scNum(r.on_hand_qty, 1)}`);
      if (r.par != null) parts.push(`par ${scNum(r.par, 1)}`);
      if (r.vendor) parts.push(`vendor ${r.vendor}`);
      lines.push(parts.join(' '));
    });
  }
  if (excess.length > 0) {
    lines.push('### Excess stock (>100 over par):');
    excess.slice(0, 25).forEach((r: any) => {
      const parts: string[] = [`- ${r.item_name}`];
      if (r.item_size) parts.push(`(${r.item_size})`);
      parts.push(`excess ${scNum(r.excess_stock_onhand, 1)}`);
      if (r.on_hand_cost != null) parts.push(`on-hand cost $${scNum(r.on_hand_cost, 0)}`);
      if (r.vendor) parts.push(`vendor ${r.vendor}`);
      lines.push(parts.join(' '));
    });
  }
  return lines.join('\n');
}

function buildCostFluctuationContext(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return '';
  // Group by product_name; require ≥2 invoices; surface latest row where |difference_pct| >= 5
  const byProduct = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const key = String((r as any).product_name || '').trim();
    if (!key) continue;
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key)!.push(r);
  }
  const candidates: { product: string; latest: any; invoices: number }[] = [];
  for (const [product, list] of byProduct) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a: any, b: any) => String(b.invoice_date).localeCompare(String(a.invoice_date)));
    const latest = sorted[0] as any;
    const diffPct = Number(latest.difference_pct);
    if (isFinite(diffPct) && Math.abs(diffPct) >= 5) {
      candidates.push({ product, latest, invoices: list.length });
    }
  }
  if (candidates.length === 0) return '';
  candidates.sort((a, b) => Math.abs(Number(b.latest.difference_pct)) - Math.abs(Number(a.latest.difference_pct)));
  const top = candidates.slice(0, 30);

  const lines: string[] = [
    '## SCULPTURE — COST FLUCTUATION (supplier price changes, last 90 days)',
    'Products with ≥2 invoices and a latest price change ≥5% vs prior. Sorted by magnitude.',
    '',
  ];
  top.forEach((c, idx) => {
    const r = c.latest;
    const parts: string[] = [`${idx + 1}. ${c.product}`];
    if (r.vendor) parts.push(`vendor ${r.vendor}`);
    if (r.invoice_date) parts.push(`as of ${r.invoice_date}`);
    if (r.price != null) parts.push(`now $${scNum(r.price, 2)}`);
    if (r.price_difference != null) parts.push(`Δ $${scNum(r.price_difference, 2)}`);
    if (r.difference_pct != null) parts.push(`(${Number(r.difference_pct) > 0 ? '+' : ''}${scPct(r.difference_pct)})`);
    parts.push(`across ${c.invoices} invoices`);
    lines.push(`- ${parts.join(' ')}`);
  });
  return lines.join('\n');
}

function buildStationStockContext(rows: Record<string, unknown>[], periodLabel: string): string {
  if (!rows || rows.length === 0) return '';
  const stations = new Set<string>();
  for (const r of rows) {
    const s = String((r as any).station || '').trim();
    if (s) stations.add(s);
  }
  if (stations.size < 2) return ''; // single-station venue → skip per spec

  // Aggregate per-station item count + top 5 highest-qty items per station (cap output)
  const byStation = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const s = String((r as any).station || '').trim();
    if (!s) continue;
    if (!byStation.has(s)) byStation.set(s, []);
    byStation.get(s)!.push(r);
  }

  const lines: string[] = [
    `## SCULPTURE — STATION STOCK (per-station physical counts, ${periodLabel})`,
    `${stations.size} stations counted.`,
  ];
  for (const [station, items] of byStation) {
    lines.push(`### ${station} (${items.length} items)`);
    const top = [...items]
      .filter((i: any) => Number(i.on_hand_qty) > 0)
      .sort((a: any, b: any) => (Number(b.on_hand_qty) || 0) - (Number(a.on_hand_qty) || 0))
      .slice(0, 5);
    top.forEach((i: any) => {
      const parts: string[] = [`- ${i.item_name}`];
      if (i.item_size) parts.push(`(${i.item_size})`);
      parts.push(`${scNum(i.on_hand_qty, 1)}${i.on_hand_uom ? ' ' + i.on_hand_uom : ''}`);
      lines.push(parts.join(' '));
    });
  }
  return lines.join('\n');
}

// ── Helpers ──────────────────────────────────────────────────────────

function yesterday(tz = 'America/Los_Angeles'): string {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', { timeZone: tz });
  const local = new Date(localStr);
  local.setDate(local.getDate() - 1);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function twoDaysAgo(tz = 'America/Los_Angeles'): string {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', { timeZone: tz });
  const local = new Date(localStr);
  local.setDate(local.getDate() - 2);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayInTz(tz = 'America/Los_Angeles'): string {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', { timeZone: tz });
  const local = new Date(localStr);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function effortLevel(mins: number): string {
  if (mins <= 15) return 'Quick';
  if (mins <= 30) return 'Short';
  if (mins <= 60) return 'Long';
  return 'Project';
}

// ── Format helpers for reference table ──────────────────────────────

function fmtDollar(v: number | null): string {
  if (v == null) return 'N/A';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number | null, suffix = '%'): string {
  if (v == null) return 'N/A';
  return `${v}${suffix}`;
}

function fmtNum(v: number | null): string {
  if (v == null) return 'N/A';
  return String(v);
}

// ── Layer 1: Pre-computed reference table ────────────────────────────

function buildReferenceTable(m: DailyMetrics, targetsParam: PeriodTargets | null): string {
  // TEMPORARILY DISABLED: suppress all target comparisons until targets are re-calibrated
  const targets: PeriodTargets | null = null as PeriodTargets | null;
  void targetsParam;

  const lines: string[] = [
    '',
    '## REFERENCE TABLE (use these EXACT values — do not recalculate)',
    '| Metric | Actual | Target | Variance | Status |',
    '|--------|--------|--------|----------|--------|',
  ];

  const dailySalesTarget = targets?.weekly_net_sales_target
    ? +(targets.weekly_net_sales_target / 7).toFixed(2)
    : null;

  const addRow = (
    label: string,
    actual: number | null,
    target: number | null,
    formatFn: (v: number | null) => string,
    isPercentage = false,
    lowerIsBetter = false
  ) => {
    const actualStr = formatFn(actual);
    const targetStr = target != null ? formatFn(target) : 'N/A';
    let varianceStr = 'N/A';
    let status = 'N/A';
    if (actual != null && target != null && target !== 0) {
      const diff = actual - target;
      if (isPercentage) {
        const sign = diff > 0 ? '+' : '';
        varianceStr = `${sign}${diff.toFixed(2)}pp`;
      } else {
        const pctDiff = ((diff / Math.abs(target)) * 100).toFixed(1);
        const sign = diff > 0 ? '+' : '';
        varianceStr = `${sign}${formatFn(diff)} (${sign}${pctDiff}%)`;
      }
      const isOver = diff > 0;
      status = lowerIsBetter ? (isOver ? 'MISS' : 'HIT') : (isOver ? 'HIT' : 'MISS');
      if (Math.abs(diff) < 0.01) status = 'HIT';
    }
    lines.push(`| ${label} | ${actualStr} | ${targetStr} | ${varianceStr} | ${status} |`);
  };

  addRow('Net Sales', m.net_sales, dailySalesTarget, fmtDollar, false, false);
  addRow('Gross Sales', m.gross_sales, null, fmtDollar);
  addRow('Labor %', m.labor_pct, targets?.labor_pct_target != null ? +(targets.labor_pct_target * 100).toFixed(2) : null, v => fmtPct(v), true, true);
  addRow('Labor Cost', m.labor_cost, null, fmtDollar);
  addRow('Labor Hours', m.labor_hours, null, fmtNum);
  addRow('SPLH', m.splh, targets?.splh_target ?? null, fmtDollar, false, false);
  addRow('Tip %', m.tip_pct, targets?.tip_pct_target != null ? +(targets.tip_pct_target * 100).toFixed(2) : null, v => fmtPct(v), true, false);
  addRow('Void %', m.void_pct, targets?.void_rate_target != null ? +(targets.void_rate_target * 100).toFixed(2) : null, v => fmtPct(v), true, true);
  addRow('Voids $', m.voids, null, fmtDollar);
  addRow('Comps %', m.comps_pct, null, v => fmtPct(v), true, true);
  addRow('Comps $', m.comps, null, fmtDollar);
  addRow('Discount %', m.discount_pct, targets?.discount_pct_target != null ? +(targets.discount_pct_target * 100).toFixed(2) : null, v => fmtPct(v), true, true);
  addRow('Discounts $', m.discounts, null, fmtDollar);
  addRow('Overtime %', m.overtime_pct, targets?.overtime_rate_target != null ? +(targets.overtime_rate_target * 100).toFixed(2) : null, v => fmtPct(v), true, true);
  addRow('OT Hours', m.overtime_hours, null, fmtNum);
  addRow('Avg Check', m.avg_check, targets?.weekly_aov_target ?? null, fmtDollar, false, false);
  addRow('Guests', m.guests, targets?.weekly_guests_target != null ? Math.round(targets.weekly_guests_target / 7) : null, fmtNum, false, false);
  addRow('Orders', m.orders_count, null, fmtNum);
  addRow('Food Sales', m.food_sales, null, fmtDollar);
  addRow('Bev Sales', m.bev_sales, null, fmtDollar);
  // Scheduled hours / schedule variance rows REMOVED — 7shifts no longer used for labor data

  return lines.join('\n');
}

// ── Layer 3: Post-processing validation ─────────────────────────────

function validateAndFixSourceData(
  insights: AIInsight[],
  metrics: DailyMetrics,
  targets: PeriodTargets | null,
  date: string
): AIInsight[] {
  const metricMap: Record<string, { value: number | null; format: (v: number | null) => string; label: string; sourceName: string }> = {
    net_sales: { value: metrics.net_sales, format: fmtDollar, label: 'Net Sales', sourceName: 'Toast POS' },
    revenue: { value: metrics.net_sales, format: fmtDollar, label: 'Net Sales', sourceName: 'Toast POS' },
    gross_sales: { value: metrics.gross_sales, format: fmtDollar, label: 'Gross Sales', sourceName: 'Toast POS' },
    labor_pct: { value: metrics.labor_pct, format: v => fmtPct(v), label: 'Labor %', sourceName: 'Toast POS' },
    labor_percentage: { value: metrics.labor_pct, format: v => fmtPct(v), label: 'Labor %', sourceName: 'Toast POS' },
    labor_cost: { value: metrics.labor_cost, format: fmtDollar, label: 'Labor Cost', sourceName: 'Toast POS' },
    labor_hours: { value: metrics.labor_hours, format: fmtNum, label: 'Labor Hours', sourceName: 'Toast POS' },
    splh: { value: metrics.splh, format: fmtDollar, label: 'SPLH', sourceName: 'Toast POS' },
    tip_pct: { value: metrics.tip_pct, format: v => fmtPct(v), label: 'Tip %', sourceName: 'Toast POS' },
    void_pct: { value: metrics.void_pct, format: v => fmtPct(v), label: 'Void %', sourceName: 'Toast POS' },
    voids_pct: { value: metrics.void_pct, format: v => fmtPct(v), label: 'Void %', sourceName: 'Toast POS' },
    voids: { value: metrics.voids, format: fmtDollar, label: 'Voids $', sourceName: 'Toast POS' },
    comps_pct: { value: metrics.comps_pct, format: v => fmtPct(v), label: 'Comps %', sourceName: 'Toast POS' },
    comps: { value: metrics.comps, format: fmtDollar, label: 'Comps $', sourceName: 'Toast POS' },
    discount_pct: { value: metrics.discount_pct, format: v => fmtPct(v), label: 'Discount %', sourceName: 'Toast POS' },
    discounts: { value: metrics.discounts, format: fmtDollar, label: 'Discounts $', sourceName: 'Toast POS' },
    overtime_pct: { value: metrics.overtime_pct, format: v => fmtPct(v), label: 'Overtime %', sourceName: 'Toast POS' },
    overtime: { value: metrics.overtime_pct, format: v => fmtPct(v), label: 'Overtime %', sourceName: 'Toast POS' },
    overtime_hours: { value: metrics.overtime_hours, format: fmtNum, label: 'OT Hours', sourceName: 'Toast POS' },
    avg_check: { value: metrics.avg_check, format: fmtDollar, label: 'Avg Check', sourceName: 'Toast POS' },
    guests: { value: metrics.guests, format: fmtNum, label: 'Guests', sourceName: 'Toast POS' },
    orders_count: { value: metrics.orders_count, format: fmtNum, label: 'Orders', sourceName: 'Toast POS' },
    food_sales: { value: metrics.food_sales, format: fmtDollar, label: 'Food Sales', sourceName: 'Toast POS' },
    bev_sales: { value: metrics.bev_sales, format: fmtDollar, label: 'Bev Sales', sourceName: 'Toast POS' },
    scheduled_hours: { value: metrics.scheduled_hours, format: fmtNum, label: 'Scheduled Hours', sourceName: '7shifts' },
    worked_hours: { value: metrics.worked_hours, format: fmtNum, label: 'Worked Hours', sourceName: '7shifts' },
    schedule_variance_hours: { value: metrics.schedule_variance_hours, format: fmtNum, label: 'Schedule Variance Hours', sourceName: '7shifts' },
    refund_pct: { value: metrics.refund_pct, format: v => fmtPct(v), label: 'Refund %', sourceName: 'Toast POS' },
  };

  const dailySalesTarget = targets?.weekly_net_sales_target
    ? +(targets.weekly_net_sales_target / 7).toFixed(2)
    : null;

  const targetMap: Record<string, { value: number | null; format: (v: number | null) => string }> = {
    net_sales: { value: dailySalesTarget, format: fmtDollar },
    revenue: { value: dailySalesTarget, format: fmtDollar },
    labor_pct: { value: targets?.labor_pct_target != null ? +(targets.labor_pct_target * 100).toFixed(2) : null, format: v => fmtPct(v) },
    labor_percentage: { value: targets?.labor_pct_target != null ? +(targets.labor_pct_target * 100).toFixed(2) : null, format: v => fmtPct(v) },
    splh: { value: targets?.splh_target ?? null, format: fmtDollar },
    tip_pct: { value: targets?.tip_pct_target != null ? +(targets.tip_pct_target * 100).toFixed(2) : null, format: v => fmtPct(v) },
    void_pct: { value: targets?.void_rate_target != null ? +(targets.void_rate_target * 100).toFixed(2) : null, format: v => fmtPct(v) },
    voids_pct: { value: targets?.void_rate_target != null ? +(targets.void_rate_target * 100).toFixed(2) : null, format: v => fmtPct(v) },
    overtime_pct: { value: targets?.overtime_rate_target != null ? +(targets.overtime_rate_target * 100).toFixed(2) : null, format: v => fmtPct(v) },
    overtime: { value: targets?.overtime_rate_target != null ? +(targets.overtime_rate_target * 100).toFixed(2) : null, format: v => fmtPct(v) },
    avg_check: { value: targets?.weekly_aov_target ?? null, format: fmtDollar },
  };

  return insights.map(insight => {
    const metricKey = (insight.source_metric || '').toLowerCase().trim();
    const metricInfo = metricMap[metricKey];

    if (!metricInfo || metricInfo.value == null) {
      return insight;
    }

    const correctedValue = metricInfo.format(metricInfo.value);
    const existingContext = (insight.source_context || '').trim();
    let correctedContext = `${metricInfo.sourceName} | ${metricInfo.label}: ${correctedValue} on ${date}`;
    const targetInfo = targetMap[metricKey];
    if (targetInfo?.value != null) {
      correctedContext += ` (Target: ${targetInfo.format(targetInfo.value)})`;
      const diff = metricInfo.value - targetInfo.value;
      const sign = diff > 0 ? '+' : '';
      correctedContext += ` | Variance: ${sign}${metricInfo.format(diff)}`;
    }
    if (existingContext && !existingContext.includes(`${metricInfo.label}: ${correctedValue}`)) {
      correctedContext = `${metricInfo.sourceName} | ${existingContext} | Verified ${metricInfo.label}: ${correctedValue} on ${date}`;
    }

    return {
      ...insight,
      source_value: correctedValue,
      source_context: correctedContext,
    };
  });
}

// ── Build AI context ─────────────────────────────────────────────────

function buildMetricsContext(m: DailyMetrics, targetsParam: PeriodTargets | null): string {
  // TEMPORARILY DISABLED: suppress target comparisons
  const targets: PeriodTargets | null = null as PeriodTargets | null;
  void targetsParam;
  const lines: string[] = ['## TOAST POS METRICS'];
  const fmt = (v: number | null, prefix = '', suffix = '') =>
    v != null ? `${prefix}${v}${suffix}` : 'N/A';

  lines.push(`Net Sales: ${fmt(m.net_sales, '$')}${targets?.weekly_net_sales_target ? ` (Daily target ~$${Math.round(targets.weekly_net_sales_target / 7)})` : ''}`);
  lines.push(`Gross Sales: ${fmt(m.gross_sales, '$')}`);
  lines.push(`Food Sales: ${fmt(m.food_sales, '$')} | Bev Sales: ${fmt(m.bev_sales, '$')}`);
  lines.push(`Guests: ${fmt(m.guests)} | Orders: ${fmt(m.orders_count)} | Avg Check: ${fmt(m.avg_check, '$')}`);
  lines.push(`Labor %: ${fmt(m.labor_pct, '', '%')}${targets?.labor_pct_target ? ` (Target: ${(targets.labor_pct_target * 100).toFixed(0)}%)` : ''} | Labor Cost: ${fmt(m.labor_cost, '$')} | Hours: ${fmt(m.labor_hours)}`);
  lines.push(`SPLH: ${fmt(m.splh, '$')}${targets?.splh_target ? ` (Target: $${targets.splh_target})` : ''}`);
  lines.push(`Tips %: ${fmt(m.tip_pct, '', '%')}${targets?.tip_pct_target ? ` (Target: ${(targets.tip_pct_target * 100).toFixed(0)}%)` : ''}`);
  lines.push(`Voids %: ${fmt(m.void_pct, '', '%')}${targets?.void_rate_target ? ` (Target: ${(targets.void_rate_target * 100).toFixed(1)}%)` : ''} | Voids: ${fmt(m.voids, '$')}`);
  lines.push(`Comps %: ${fmt(m.comps_pct, '', '%')} | Comps: ${fmt(m.comps, '$')}`);
  lines.push(`Discounts %: ${fmt(m.discount_pct, '', '%')} | Discounts: ${fmt(m.discounts, '$')}`);
  lines.push(`Overtime %: ${fmt(m.overtime_pct, '', '%')} | OT Hours: ${fmt(m.overtime_hours)}`);

  // Schedule variance section REMOVED — 7shifts is no longer used for scheduling/labor data.
  // Toast is the sole source of truth for all financial and labor metrics.

  return lines.join('\n');
}

// Normalize a name for matching: strip diacritics, lowercase, collapse whitespace.
// Used so "María" matches "Maria" and Spanish-language logs match the roster.
function normalizeForMatch(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract per-comment authors embedded in shift_log summaries by sync-asana-logs
// (format: "→ [Author Name] text..." or "Task Author: Name").
function extractEmbeddedAuthors(text: unknown): string[] {
  if (!text || typeof text !== 'string') return [];
  const out = new Set<string>();
  const reBracket = /(?:^|\n|→\s*)\[([^\]\n]{2,60})\]/g;
  const reTaskAuthor = /^Task Author:\s*([^\n]{2,80})$/gm;
  let m: RegExpExecArray | null;
  while ((m = reBracket.exec(text))) out.add(m[1].trim());
  while ((m = reTaskAuthor.exec(text))) out.add(m[1].trim());
  return Array.from(out);
}

// Render the AUTHOR EXCLUSION line for the AI prompt.
function authorExclusionLine(authors: string[]): string {
  const clean = Array.from(new Set(authors.filter(Boolean).map((a) => a.trim()))).filter(Boolean);
  if (clean.length === 0) return '';
  if (clean.length === 1) {
    return `AUTHOR EXCLUSION: This log was authored by ${clean[0]}. Do NOT add the author to employee_mentions unless they are explicitly recognized or named as the subject of an issue separate from the act of writing the log. Authors of shoutouts MAY be tagged with role "recognizer".`;
  }
  return `AUTHOR EXCLUSION: Comments in this log were authored by ${clean.join(', ')}. Do NOT add any of them to employee_mentions unless they are explicitly recognized or named as the subject of an issue separate from authoring the log. Authors of shoutouts MAY be tagged with role "recognizer".`;
}

function buildGmLogContext(log: Record<string, unknown>): string {
  const sourceLabel = (log.asana_source_label as string | undefined)?.trim();
  const heading = sourceLabel ? `## ${sourceLabel.toUpperCase()} (Asana)` : '## GM LOG (Asana Legacy)';
  const lines: string[] = [heading];
  if (log.id) lines.push(`LOG_ID: ${String(log.id)}`);
  if (sourceLabel) lines.push(`Source: ${sourceLabel}`);
  if (log.author_name) lines.push(`Author: ${log.author_name}`);
  // Author-exclusion guardrail (Problem 1): tell AI not to tag the author themselves.
  const gmEmbedded = extractEmbeddedAuthors(log.raw_text);
  const gmAuthors = [log.author_name as string | undefined, ...gmEmbedded].filter(Boolean) as string[];
  const gmExcl = authorExclusionLine(gmAuthors);
  if (gmExcl) lines.push(gmExcl);
  if (log.overall_shift_summary) lines.push(`Summary: ${log.overall_shift_summary}`);
  if (log.pacing) lines.push(`Pacing: ${log.pacing}`);
  if (log.guest_vibe) lines.push(`Guest Vibe: ${log.guest_vibe}`);
  if (log.team_energy) lines.push(`Team Energy: ${log.team_energy}`);
  if (log.staffing_issues) lines.push(`Staffing Issues: ${log.staffing_issues}`);
  if (log.waste_comps) lines.push(`Waste/Comps: ${log.waste_comps}`);
  if (log.prep_issues) lines.push(`Prep Issues: ${log.prep_issues}`);
  if (log.cleanliness_notes) lines.push(`Cleanliness: ${log.cleanliness_notes}`);
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  if (arr(log.staff_highlights)) lines.push(`Staff Highlights: ${JSON.stringify(log.staff_highlights)}`);
  if (arr(log.coaching_corrections)) lines.push(`Coaching: ${JSON.stringify(log.coaching_corrections)}`);
  if (arr(log.items_86d)) lines.push(`86'd Items: ${JSON.stringify(log.items_86d)}`);
  if (arr(log.low_stock_watchlist)) lines.push(`Low Stock: ${JSON.stringify(log.low_stock_watchlist)}`);
  if (arr(log.guest_complaints)) lines.push(`Guest Complaints: ${JSON.stringify(log.guest_complaints)}`);
  if (arr(log.guest_compliments)) lines.push(`Guest Compliments: ${JSON.stringify(log.guest_compliments)}`);
  if (arr(log.safety_concerns)) lines.push(`Safety Concerns: ${JSON.stringify(log.safety_concerns)}`);
  if (arr(log.broken_items)) lines.push(`Broken Items: ${JSON.stringify(log.broken_items)}`);
  if (arr(log.training_needs)) lines.push(`Training Needs: ${JSON.stringify(log.training_needs)}`);
  if (arr(log.vips_regulars)) lines.push(`VIPs/Regulars: ${JSON.stringify(log.vips_regulars)}`);
  return lines.join('\n');
}

function buildLeadLogContext(log: Record<string, unknown>): string {
  const sourceLabel = (log.asana_source_label as string | undefined)?.trim();
  const heading = sourceLabel
    ? `## ${sourceLabel.toUpperCase()} (Asana) - Shift: ${log.shift || 'Unknown'}`
    : `## LEAD LOG (Asana Legacy) - Shift: ${log.shift || 'Unknown'}`;
  const lines: string[] = [heading];
  if (log.id) lines.push(`LOG_ID: ${String(log.id)}`);
  if (sourceLabel) lines.push(`Source: ${sourceLabel}`);
  if (log.author_name) lines.push(`Author: ${log.author_name}`);
  {
    const ll = authorExclusionLine([
      log.author_name as string | undefined,
      ...extractEmbeddedAuthors(log.raw_text),
    ].filter(Boolean) as string[]);
    if (ll) lines.push(ll);
  }
  if (log.business_flow) lines.push(`Business Flow: ${log.business_flow}`);
  if (log.cleaning_issues) lines.push(`Cleaning Issues: ${log.cleaning_issues}`);
  if (log.staffing_levels) lines.push(`Staffing: ${log.staffing_levels}`);
  if (log.customer_issues) lines.push(`Customer Issues: ${log.customer_issues}`);
  if (log.toast_computer_issues) lines.push(`Toast/Computer Issues: ${log.toast_computer_issues}`);
  if (log.improvement_suggestions) lines.push(`Improvement Suggestions: ${log.improvement_suggestions}`);
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  if (arr(log.new_customers)) lines.push(`New Customers: ${JSON.stringify(log.new_customers)}`);
  if (arr(log.items_out)) lines.push(`Items Out: ${JSON.stringify(log.items_out)}`);
  if (arr(log.shoutouts)) lines.push(`Shoutouts: ${JSON.stringify(log.shoutouts)}`);
  if (arr(log.issues)) lines.push(`Issues: ${JSON.stringify(log.issues)}`);
  return lines.join('\n');
}

function buildShiftLogContext(log: Record<string, unknown>): string {
  const sourceLabel = (log.asana_source_label as string | undefined)?.trim();
  const heading = sourceLabel
    ? `## ${sourceLabel.toUpperCase()} (Asana) - ${log.shift || 'Unknown'} shift`
    : `## SHIFT LOG (Native BarPulse) - ${log.shift || 'Unknown'} shift`;
  const lines: string[] = [heading];
  if (log.id) lines.push(`LOG_ID: ${String(log.id)}`);
  if (sourceLabel) lines.push(`Source: ${sourceLabel}`);
  if (log.author_name) lines.push(`Author: ${log.author_name}`);
  {
    const sl = authorExclusionLine([
      log.author_name as string | undefined,
      ...extractEmbeddedAuthors(log.shift_summary),
      ...extractEmbeddedAuthors(log.raw_text),
    ].filter(Boolean) as string[]);
    if (sl) lines.push(sl);
  }
  if (log.shift_summary) lines.push(`Summary: ${log.shift_summary}`);
  if (log.raw_text && log.raw_text !== log.shift_summary) lines.push(String(log.raw_text));
  if (log.pacing) lines.push(`Pacing: ${log.pacing}`);
  if (log.guest_vibe) lines.push(`Guest Vibe: ${log.guest_vibe}`);
  if (log.team_energy) lines.push(`Team Energy: ${log.team_energy}`);
  if (log.staffing_notes) lines.push(`Staffing: ${log.staffing_notes}`);
  if (log.improvement_suggestions) lines.push(`Improvements: ${log.improvement_suggestions}`);
  if (log.foh_rating) lines.push(`FOH Rating: ${log.foh_rating}/10`);
  if (log.boh_rating) lines.push(`BOH Rating: ${log.boh_rating}/10`);
  if (log.product_rating) lines.push(`Product Rating: ${log.product_rating}/10`);
  if (log.hospitality_rating) lines.push(`Hospitality Rating: ${log.hospitality_rating}/10`);
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  if (arr(log.staff_highlights)) lines.push(`Staff Highlights: ${JSON.stringify(log.staff_highlights)}`);
  if (arr(log.coaching_notes)) lines.push(`Coaching: ${JSON.stringify(log.coaching_notes)}`);
  if (arr(log.items_86d)) lines.push(`86'd Items: ${JSON.stringify(log.items_86d)}`);
  if (arr(log.low_stock)) lines.push(`Low Stock: ${JSON.stringify(log.low_stock)}`);
  if (arr(log.guest_complaints)) lines.push(`Guest Complaints: ${JSON.stringify(log.guest_complaints)}`);
  if (arr(log.guest_compliments)) lines.push(`Guest Compliments: ${JSON.stringify(log.guest_compliments)}`);
  if (arr(log.safety_concerns)) lines.push(`Safety Concerns: ${JSON.stringify(log.safety_concerns)}`);
  if (arr(log.maintenance_issues)) lines.push(`Maintenance: ${JSON.stringify(log.maintenance_issues)}`);
  if (arr(log.new_customers)) lines.push(`New Customers: ${JSON.stringify(log.new_customers)}`);
  return lines.join('\n');
}

function buildPersisted7shiftsTaskContext(log: Record<string, unknown>): string {
  const lines: string[] = ['## 7SHIFTS TASKS'];
  if (log.id) lines.push(`LOG_ID: ${String(log.id)}`);
  const baseLen = lines.length;
  if (log.shift_summary) lines.push(String(log.shift_summary));
  else if (log.raw_text) lines.push(String(log.raw_text));
  return lines.length > baseLen ? lines.join('\n') : '';
}

function buildPersisted7shiftsLogbookContext(log: Record<string, unknown>): string {
  const lines: string[] = ['## 7SHIFTS LOG BOOK'];
  if (log.shift_summary) lines.push(String(log.shift_summary));
  else if (log.raw_text) lines.push(String(log.raw_text));
  return lines.length > 1 ? lines.join('\n') : '';
}

function buildPersistedAsanaProjectContext(log: Record<string, unknown>): string {
  const lines: string[] = ['## ASANA PROJECT'];
  if (log.id) lines.push(`LOG_ID: ${String(log.id)}`);
  const baseLen = lines.length;
  if (log.author_name) lines.push(`Author: ${log.author_name}`);
  {
    const apl = authorExclusionLine([
      log.author_name as string | undefined,
      ...extractEmbeddedAuthors(log.shift_summary),
      ...extractEmbeddedAuthors(log.raw_text),
    ].filter(Boolean) as string[]);
    if (apl) lines.push(apl);
  }
  if (log.shift_summary) lines.push(`Summary: ${log.shift_summary}`);
  if (log.raw_text && log.raw_text !== log.shift_summary) lines.push(String(log.raw_text));
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  if (arr(log.issues)) lines.push(`Issues: ${JSON.stringify(log.issues)}`);
  if (arr(log.items_out)) lines.push(`Items Out: ${JSON.stringify(log.items_out)}`);
  if (arr(log.shoutouts)) lines.push(`Shoutouts: ${JSON.stringify(log.shoutouts)}`);
  if (log.improvement_suggestions) lines.push(`Improvements: ${log.improvement_suggestions}`);
  return lines.length > baseLen ? lines.join('\n') : '';
}

// ── Smart merge: classify persisted shift_logs by source ──────────────

function mergeLogSections(
  gmLogs: Record<string, unknown>[],
  leadLogs: Record<string, unknown>[],
  shiftLogs: Record<string, unknown>[]
): { sections: string[]; usedShiftLogIds: string[]; sourcesUsed: string[]; authorNames: string[] } {
  const sections: string[] = [];
  const sourcesUsed = new Set<string>();
  const usedShiftLogIds: string[] = [];
  const authorNames = new Set<string>();
  const collectAuthor = (log: Record<string, unknown>) => {
    if (log.author_name && typeof log.author_name === 'string') authorNames.add(log.author_name.trim());
    extractEmbeddedAuthors(log.shift_summary).forEach((a) => authorNames.add(a));
    extractEmbeddedAuthors(log.raw_text).forEach((a) => authorNames.add(a));
  };

  const nativeShiftLogs = shiftLogs.filter((log) => {
    const source = String(log.source || '');
    return !['7shifts_logbook', '7shifts_tasks', 'asana_project'].includes(source);
  });
  const persisted7shiftsLogbook = shiftLogs.filter((log) => String(log.source || '') === '7shifts_logbook');
  const persisted7shiftsTasks = shiftLogs.filter((log) => String(log.source || '') === '7shifts_tasks');
  const persistedAsanaProject = shiftLogs.filter((log) => String(log.source || '') === 'asana_project');

  if (nativeShiftLogs.length > 0) {
    sourcesUsed.add('shift_log');
    for (const sl of nativeShiftLogs) {
      sections.push(buildShiftLogContext(sl));
      collectAuthor(sl);
      if (sl.id) usedShiftLogIds.push(String(sl.id));
    }
  }

  if (persisted7shiftsLogbook.length > 0) {
    sourcesUsed.add('seven_shifts_logbook');
    for (const log of persisted7shiftsLogbook) {
      const section = buildPersisted7shiftsLogbookContext(log);
      if (section) sections.push(section);
      collectAuthor(log);
      if (log.id) usedShiftLogIds.push(String(log.id));
    }
  }

  if (persisted7shiftsTasks.length > 0) {
    sourcesUsed.add('seven_shifts_tasks');
    for (const log of persisted7shiftsTasks) {
      const section = buildPersisted7shiftsTaskContext(log);
      if (section) sections.push(section);
      collectAuthor(log);
      if (log.id) usedShiftLogIds.push(String(log.id));
    }
  }

  if (persistedAsanaProject.length > 0) {
    sourcesUsed.add('asana_project');
    for (const log of persistedAsanaProject) {
      const section = buildPersistedAsanaProjectContext(log);
      if (section) sections.push(section);
      collectAuthor(log);
      if (log.id) usedShiftLogIds.push(String(log.id));
    }
  }

  // ALWAYS include full GM and lead log content regardless of shift_logs
  if (gmLogs.length > 0) {
    sourcesUsed.add('gm_log');
    for (const gl of gmLogs) {
      sections.push(buildGmLogContext(gl));
      collectAuthor(gl);
    }
  }

  if (leadLogs.length > 0) {
    sourcesUsed.add('lead_log');
    for (const ll of leadLogs) {
      sections.push(buildLeadLogContext(ll));
      collectAuthor(ll);
    }
  }

  return {
    sections,
    usedShiftLogIds,
    sourcesUsed: [...sourcesUsed],
    authorNames: Array.from(authorNames).filter(Boolean),
  };
}

// ── Deterministic Alert Triggers ─────────────────────────────────────

interface DeterministicInsert {
  bar_id: string;
  pillar: string;
  insight_type: string;
  severity: string;
  title: string;
  summary: string;
  detail: string;
  source_type: string;
  source_date: string;
  generated_by: string;
  insight_mode: string;
  status: string;
  week_id: string | null;
  period_start?: string | null;
  period_end?: string | null;
  period_label?: string | null;
}

// Format a date range as a short label, e.g. "Apr 7-13" or "Apr 28 - May 4"
function formatPeriodLabel(periodStart: string, periodEnd: string): string {
  try {
    const s = new Date(periodStart + 'T12:00:00Z');
    const e = new Date(periodEnd + 'T12:00:00Z');
    const sMonth = s.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const eMonth = e.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const sDay = s.getUTCDate();
    const eDay = e.getUTCDate();
    if (sMonth === eMonth) return `${sMonth} ${sDay}-${eDay}`;
    return `${sMonth} ${sDay} - ${eMonth} ${eDay}`;
  } catch {
    return `${periodStart} to ${periodEnd}`;
  }
}

// Standalone inventory trigger — runs independently of weeks rows so Sculpture
// inventory periods (which rarely align with Mon-Sun) always surface as insights.
async function runInventoryTrigger(
  supabase: any,
  barId: string,
  venueName: string,
  date: string,
  mode: 'daily' | 'weekly'
): Promise<{ inserted: number }> {
  let insertedCount = 0;
  try {
    // Fetch BOTH thresholds fresh each invocation — no caching.
    const { data: thresholdRows } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['inventory_loss_threshold_usd', 'inventory_loss_high_severity_usd']);

    const cfg = new Map<string, number>();
    for (const row of (thresholdRows || []) as any[]) {
      const v = row.value;
      const parsed = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(parsed) && parsed > 0) cfg.set(row.key as string, parsed);
    }
    const threshold = cfg.get('inventory_loss_threshold_usd') ?? 200;
    const highSeverityThreshold = cfg.get('inventory_loss_high_severity_usd') ?? 1000;

    // Look back 30 days by period_end so the admin "backfill" button is idempotent
    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 30);
    const lookbackIso = lookback.toISOString().slice(0, 10);

    const { data: recentReports } = await supabase
      .from('inventory_reports')
      .select('id, period_start, period_end, total_missing_cost, sculpture_rating')
      .eq('venue_id', barId)
      .gte('period_end', lookbackIso)
      .order('period_end', { ascending: false });

    if (!recentReports || recentReports.length === 0) {
      return { inserted: 0 };
    }

    // Dedup against existing inventory insights for this bar (by title) — supports re-runs
    const { data: existingDet } = await supabase
      .from('insights')
      .select('title')
      .eq('bar_id', barId)
      .eq('generated_by', 'deterministic_trigger')
      .gte('source_date', lookbackIso);
    const existingTitles = new Set(((existingDet || []) as any[]).map(i => i.title as string));

    for (const report of recentReports as any[]) {
      const lossRaw = report.total_missing_cost;
      const loss = typeof lossRaw === 'number' ? Math.abs(lossRaw) : Math.abs(Number(lossRaw) || 0);
      if (loss < threshold) continue;

      const reportId = report.id as string;
      const periodStart = report.period_start as string;
      const periodEnd = report.period_end as string;
      const periodLabel = formatPeriodLabel(periodStart, periodEnd);
      const title = `Inventory variance $${loss.toFixed(0)} at ${venueName} (${periodLabel}) [r:${reportId.slice(0, 8)}]`;
      if (existingTitles.has(title)) continue;

      const { data: items } = await supabase
        .from('inventory_items')
        .select('item_name, category, missing_cost, is_category_total')
        .eq('report_id', reportId)
        .order('missing_cost', { ascending: true });

      const categoryBreakdown = ((items || []) as any[])
        .filter(i => i.is_category_total && i.missing_cost != null && i.missing_cost < 0)
        .map(c => `${c.category || c.item_name}: $${Math.abs(Number(c.missing_cost)).toFixed(0)}`)
        .slice(0, 6)
        .join(', ');

      const topItems = ((items || []) as any[])
        .filter(i => !i.is_category_total && i.missing_cost != null && i.missing_cost < 0)
        .slice(0, 3)
        .map((i, idx) => `${idx + 1}. ${i.item_name} ($${Math.abs(Number(i.missing_cost)).toFixed(0)})`)
        .join('\n');

      const severity = loss >= highSeverityThreshold ? 'High' : 'Medium';
      const ratingRaw = (report as any).sculpture_rating;
      const ratingNum = ratingRaw == null ? null : Number(ratingRaw);
      const ratingTxt = ratingNum != null && Number.isFinite(ratingNum) ? `${ratingNum}%` : 'not reported';
      const summary = `Sculpture Hospitality flagged $${loss.toFixed(0)} in inventory variance for ${venueName} (${periodLabel}, Sculpture Rating ${ratingTxt}).${categoryBreakdown ? ' Categories: ' + categoryBreakdown + '.' : ''}`;
      const detail = `Sculpture Rating: ${ratingTxt}\nTotal variance cost: $${loss.toFixed(2)}\nThreshold: $${threshold.toFixed(0)} (High at $${highSeverityThreshold.toFixed(0)})\nPeriod: ${periodStart} to ${periodEnd}${categoryBreakdown ? `\nCategory breakdown: ${categoryBreakdown}` : ''}${topItems ? `\n\nTop losses:\n${topItems}` : ''}\n\nNote: Inventory periods often do not align with the Mon-Sun scoring week. Investigate root cause (over-pour, theft, miscount methodology) within the inventory period itself.`;

      const insertRow: any = {
        bar_id: barId, venue_id: barId,
        pillar: 'Operations',
        insight_type: 'Issue',
        severity,
        title,
        summary,
        detail,
        source_type: `Sculpture Hospitality — ${venueName} — ${periodLabel}`,
        source_date: periodEnd,
        generated_by: 'deterministic_trigger',
        insight_mode: mode,
        status: 'New',
        week_id: null,
        period_start: periodStart,
        period_end: periodEnd,
        period_label: periodLabel,
      };

      const { data: insertedRow, error } = await supabase
        .from('insights')
        .insert(insertRow)
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505') {
          console.log(`[INVENTORY-TRIGGER] Skipped duplicate: ${title}`);
        } else {
          console.warn(`[INVENTORY-TRIGGER] Failed to insert: ${title}`, error.message);
        }
      } else {
        insertedCount++;
        existingTitles.add(title);
        console.log(`[INVENTORY-TRIGGER] Inserted: ${title} (severity=${severity})`);
        // Pair with action_items so the UI ACTION block isn't empty.
        try {
          await upsertDeterministicAction(supabase, {
            insight_id: insertedRow.id,
            bar_id: barId,
            venue_id: barId,
            pillar: 'Operations',
            severity,
            source_metric: 'inventory_dollar_loss',
            source_date: periodEnd,
            venue_name: venueName,
            insight_title: title,
            insight_summary: summary,
            problem_detail: detail,
            week_id: null,
          });
        } catch (e: any) {
          console.warn('[INVENTORY-TRIGGER] paired action write failed:', e?.message || e);
        }
      }
    }
  } catch (e) {
    console.warn('[INVENTORY-TRIGGER] Failed:', e);
  }
  return { inserted: insertedCount };
}

async function runDeterministicTriggers(
  supabase: any,
  barId: string,
  barCode: string,
  venueName: string,
  date: string,
  weekId: string | null,
  mode: 'daily' | 'weekly'
): Promise<{ inserted: DeterministicInsert[]; count: number }> {
  const inserts: DeterministicInsert[] = [];

  // Only run deterministic triggers in weekly mode or for the last day of the week
  // For simplicity, run in both modes but scope queries appropriately

  // Resolve current week range
  const { data: weekRow } = weekId
    ? await supabase.from('weeks').select('week_start, week_end').eq('id', weekId).single()
    : { data: null };

  const weekStart = weekRow?.week_start || date;
  const weekEnd = weekRow?.week_end || date;
  const weekRange = `${formatDateShort(weekStart)}-${formatDateShort(weekEnd)}`;

  // Check for existing deterministic insights for this bar+week to avoid duplicates
  const { data: existingDeterministic } = await supabase
    .from('insights')
    .select('title')
    .eq('bar_id', barId)
    .eq('generated_by', 'deterministic_trigger')
    .gte('source_date', weekStart)
    .lte('source_date', weekEnd);

  const existingTitles = new Set((existingDeterministic || []).map((i: any) => i.title));

  // ── Trigger 1: Log Frequency Alert (Monday-gated, last CLOSED week) ──
  // Fires once on Monday for the week that just ended. Resolving the closed
  // week (vs the current weekId) avoids the in-progress-week false positive
  // where partial counts trip the 5+ threshold. Mirrors T2/T2B closed-week
  // pattern (.lt('week_end', todayPT)).
  try {
    const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();
    if (dayOfWeek === 1) {
      const todayPT = todayInTz('America/Los_Angeles');
      const { data: closedWeek } = await supabase
        .from('weeks')
        .select('id, week_start, week_end')
        .eq('bar_id', barId)
        .lt('week_end', todayPT)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (closedWeek) {
        const cwStart = closedWeek.week_start;
        const cwEnd = closedWeek.week_end;
        const cwRange = `${formatDateShort(cwStart)}-${formatDateShort(cwEnd)}`;

        const [gmLogRes, leadLogRes] = await Promise.all([
          supabase.from('gm_logs').select('id', { count: 'exact', head: true })
            .eq('bar_id', barId).gte('date', cwStart).lte('date', cwEnd),
          supabase.from('lead_logs').select('id', { count: 'exact', head: true })
            .eq('bar_id', barId).gte('date', cwStart).lte('date', cwEnd),
        ]);
        const { count: shiftLogCount } = await supabase.from('shift_logs')
          .select('id', { count: 'exact', head: true })
          .eq('bar_id', barId).gte('date', cwStart).lte('date', cwEnd)
          .not('source', 'in', '("7shifts_logbook","7shifts_tasks")');

        const gmCount = gmLogRes.count || 0;
        const leadCount = leadLogRes.count || 0;
        const nativeLogCount = shiftLogCount || 0;
        const totalLogs = gmCount + leadCount + nativeLogCount;

        console.log(`[DET-TRIGGER] Log frequency for ${venueName} (closed week ${cwRange}): GM=${gmCount}, Lead=${leadCount}, Shift=${nativeLogCount}, Total=${totalLogs}`);

        if (totalLogs < 5) {
          const title = `${cwRange}: Only ${totalLogs} daily logs submitted at ${venueName} (expected 5+)`;
          // Scoped dedupe probe against the closed week (not the current week).
          const { data: existingClosed } = await supabase
            .from('insights')
            .select('id')
            .eq('bar_id', barId)
            .eq('generated_by', 'deterministic_trigger')
            .eq('source_metric', 'log_frequency')
            .gte('source_date', cwStart)
            .lte('source_date', cwEnd)
            .limit(1);
          if (!existingClosed || existingClosed.length === 0) {
            inserts.push({
              bar_id: barId, venue_id: barId, pillar: 'Operations', insight_type: 'Issue', severity: 'Medium',
              title,
              summary: `${venueName} submitted only ${totalLogs} daily logs during the week of ${cwRange} (GM + Lead + shift logs). Consistent logging is critical for operational visibility.`,
              detail: `GM logs: ${gmCount}, Lead logs: ${leadCount}, Shift/project logs: ${nativeLogCount}. Target is at least 5 logs per week for complete coverage.`,
              source_type: `BarPulse Logs — ${venueName} — ${cwRange}`,
              source_date: cwEnd, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: closedWeek.id,
              source_metric: 'log_frequency', _venue_name: venueName,
            });
          }
        }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] Log frequency check failed:', e); }

  // ── Trigger 2: Three-Week Sales Decline ──
  // Belt-and-suspenders: only consider FULLY CLOSED weeks (week_end < today PT).
  // This prevents an in-progress week's partial-data weekly_core row from
  // poisoning the trend even if one briefly slips through the compute gate.
  try {
    if (weekId) {
      const todayPT = todayInTz('America/Los_Angeles');
      const { data: recentWeeks } = await supabase
        .from('weeks')
        .select('id, week_start, week_end')
        .eq('bar_id', barId)
        .lt('week_end', todayPT)
        .order('week_start', { ascending: false })
        .limit(3);

      if (recentWeeks && recentWeeks.length === 3) {
        const weekIds = recentWeeks.map((w: any) => w.id);
        const { data: cores } = await supabase
          .from('weekly_core')
          .select('week_id, net_sales')
          .in('week_id', weekIds);

        if (cores && cores.length === 3) {
          const salesByWeek = new Map(cores.map((c: any) => [c.week_id, c.net_sales]));
          const sales = recentWeeks.map((w: any) => salesByWeek.get(w.id) ?? null);
          if (sales.every((s: any) => s != null) && sales[0]! < sales[1]! && sales[1]! < sales[2]!) {
            const dateRange = `${formatDateShort(recentWeeks[2].week_start)}-${formatDateShort(recentWeeks[0].week_end)}`;
            const title = `${dateRange}: Three consecutive weeks of declining sales at ${venueName}`;
            if (!existingTitles.has(title)) {
              inserts.push({
                bar_id: barId, venue_id: barId, pillar: 'Revenue', insight_type: 'Trend', severity: 'High',
                title,
                summary: `Net sales have declined for 3 straight weeks at ${venueName}: ${fmtDollar(sales[2]!)} → ${fmtDollar(sales[1]!)} → ${fmtDollar(sales[0]!)}.`,
                detail: `Week 1 (${recentWeeks[2].week_start}): ${fmtDollar(sales[2]!)}\nWeek 2 (${recentWeeks[1].week_start}): ${fmtDollar(sales[1]!)}\nWeek 3 (${recentWeeks[0].week_start}): ${fmtDollar(sales[0]!)}\nTotal decline: ${fmtDollar(sales[0]! - sales[2]!)} (${(((sales[0]! - sales[2]!) / sales[2]!) * 100).toFixed(1)}%)`,
                source_type: `Toast POS — ${venueName} — ${dateRange}`,
                source_date: date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
                source_metric: 'three_week_sales_decline', _venue_name: venueName,
              });
            }
          }
        }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] 3-week sales decline check failed:', e); }

  // ── Trigger 2B: Three-Week Negative YOY Sales Growth ──
  // Same closed-week filter as Trigger 2.
  try {
    if (weekId) {
      const todayPT = todayInTz('America/Los_Angeles');
      const { data: recentWeeksYoy } = await supabase
        .from('weeks')
        .select('id, week_start, week_end')
        .eq('bar_id', barId)
        .lt('week_end', todayPT)
        .order('week_start', { ascending: false })
        .limit(3);

      if (recentWeeksYoy && recentWeeksYoy.length === 3) {
        const yoyWeekIds = recentWeeksYoy.map((w: any) => w.id);
        const { data: yoyCores } = await supabase
          .from('weekly_core')
          .select('week_id, yoy_change_pct')
          .in('week_id', yoyWeekIds);

        if (yoyCores && yoyCores.length === 3) {
          const yoyByWeek = new Map(yoyCores.map((c: any) => [c.week_id, c.yoy_change_pct]));
          const yoyValues = recentWeeksYoy.map((w: any) => yoyByWeek.get(w.id) ?? null);
          if (yoyValues.every((v: any) => v != null && v < 0)) {
            const dateRange = `${formatDateShort(recentWeeksYoy[2].week_start)}-${formatDateShort(recentWeeksYoy[0].week_end)}`;
            const title = `${dateRange}: 3 consecutive weeks of negative YOY sales growth at ${venueName}`;
            if (!existingTitles.has(title)) {
              const pcts = yoyValues as number[];
              inserts.push({
                bar_id: barId, venue_id: barId, pillar: 'Revenue', insight_type: 'Trend', severity: 'High',
                title,
                summary: `Sales have been below last year for 3 straight weeks at ${venueName}: ${pcts.map(p => `${(p * 100).toFixed(1)}%`).reverse().join(', ')}.`,
                detail: `Week 1 (${recentWeeksYoy[2].week_start}): YOY ${(pcts[2] * 100).toFixed(1)}%\nWeek 2 (${recentWeeksYoy[1].week_start}): YOY ${(pcts[1] * 100).toFixed(1)}%\nWeek 3 (${recentWeeksYoy[0].week_start}): YOY ${(pcts[0] * 100).toFixed(1)}%`,
                source_type: `Toast POS — ${venueName} — ${dateRange}`,
                source_date: date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
                source_metric: 'daily_yoy_drop', _venue_name: venueName, _metric_label: 'Net Sales (YOY)',
              });
            }
          }
        }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] 3-week YOY sales decline check failed:', e); }

  // ── Trigger 3: Single-Day Bad Labor % ──
  try {
    const { data: dailyRows } = await supabase
      .from('daily_metrics')
      .select('date, labor_pct, net_sales, labor_cost_total')
      .eq('bar_id', barCode)
      .gte('date', weekStart)
      .lte('date', weekEnd);

    if (dailyRows) {
      for (const day of dailyRows) {
        const laborPct = day.labor_pct ?? 0;
        if (laborPct > 30) {
          const dayName = new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' });
          const title = `${formatDateShort(day.date)}: Labor % hit ${laborPct.toFixed(0)}% at ${venueName} (${dayName})`;
          if (!existingTitles.has(title)) {
            inserts.push({
              bar_id: barId, venue_id: barId, pillar: 'Labor', insight_type: 'Issue', severity: 'High',
              title,
              summary: `Labor % reached ${laborPct.toFixed(1)}% on ${dayName} at ${venueName}, well above the 30% threshold.`,
              detail: `Date: ${day.date} (${dayName})\nLabor %: ${laborPct.toFixed(1)}%\nNet Sales: ${fmtDollar(day.net_sales)}\nLabor Cost: ${fmtDollar(day.labor_cost_total)}`,
              source_type: `Toast POS — ${venueName} — ${day.date}`,
              source_date: day.date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
              source_metric: 'labor_spike', _venue_name: venueName,
              _current_value: laborPct, _sanity_for_date: day.date,
            });
          }
        }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] Single-day labor % check failed:', e); }

  // ── Trigger 4: Same-Day Three-Week Sales Decline ──
  try {
    const { data: currentWeekDays } = await supabase
      .from('daily_metrics')
      .select('date, net_sales')
      .eq('bar_id', barCode)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date');

    if (currentWeekDays && currentWeekDays.length > 0) {
      for (const day of currentWeekDays) {
        const dayOfWeek = new Date(day.date + 'T12:00:00Z').getDay();
        const dayName = new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' });

        // Get same day-of-week from prior 2 weeks
        const twoWeeksAgo = new Date(new Date(day.date + 'T12:00:00Z').getTime() - 14 * 86400000).toISOString().slice(0, 10);
        const { data: sameDayRows } = await supabase
          .from('daily_metrics')
          .select('date, net_sales')
          .eq('bar_id', barCode)
          .gte('date', twoWeeksAgo)
          .lt('date', day.date)
          .order('date', { ascending: false });

        if (sameDayRows) {
          const sameDayPrior = sameDayRows
            .filter((r: any) => new Date(r.date + 'T12:00:00Z').getDay() === dayOfWeek)
            .slice(0, 2);

          if (sameDayPrior.length === 2) {
            const week3 = day.net_sales ?? 0;
            const week2 = sameDayPrior[0].net_sales ?? 0;
            const week1 = sameDayPrior[1].net_sales ?? 0;

            if (week3 < week2 && week2 < week1 && week1 > 0) {
              const title = `${dayName}s declining 3 weeks running at ${venueName} (${fmtDollarCompact(week1)} → ${fmtDollarCompact(week2)} → ${fmtDollarCompact(week3)})`;
              if (!existingTitles.has(title)) {
                inserts.push({
                  bar_id: barId, venue_id: barId, pillar: 'Revenue', insight_type: 'Trend', severity: 'Medium',
                  title,
                  summary: `${dayName} sales have declined for 3 consecutive weeks at ${venueName}.`,
                  detail: `${sameDayPrior[1].date}: ${fmtDollar(week1)}\n${sameDayPrior[0].date}: ${fmtDollar(week2)}\n${day.date}: ${fmtDollar(week3)}\nTotal decline: ${(((week3 - week1) / week1) * 100).toFixed(1)}%`,
                  source_type: `Toast POS — ${venueName} — ${sameDayPrior[1].date} to ${day.date}`,
                  source_date: date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
                  source_metric: 'three_week_sales_decline', _venue_name: venueName,
                });
              }
            }
          }
        }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] Same-day 3-week decline check failed:', e); }

  // ── Trigger 4B: Same-Day YOY Sales Decline ──
  try {
    const { data: currentWeekDaysYoy } = await supabase
      .from('daily_metrics')
      .select('date, net_sales')
      .eq('bar_id', barCode)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date');

    if (currentWeekDaysYoy && currentWeekDaysYoy.length > 0) {
      for (const day of currentWeekDaysYoy) {
        const dayDate = new Date(day.date + 'T12:00:00Z');
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Get the last 3 instances of this weekday and their YOY counterparts
        const threeWeeksAgo = new Date(dayDate.getTime() - 14 * 86400000).toISOString().slice(0, 10);
        const dayOfWeekNum = dayDate.getDay();

        // Collect 3 recent same-days: current + prior 2 weeks
        const recentDates = [day];
        const { data: priorSameDays } = await supabase
          .from('daily_metrics')
          .select('date, net_sales')
          .eq('bar_id', barCode)
          .gte('date', threeWeeksAgo)
          .lt('date', day.date)
          .order('date', { ascending: false });

        if (priorSameDays) {
          const filtered = priorSameDays.filter((r: any) => new Date(r.date + 'T12:00:00Z').getDay() === dayOfWeekNum).slice(0, 2);
          recentDates.push(...filtered);
        }

        if (recentDates.length === 3) {
          // For each of the 3 recent same-days, look up same day ~52 weeks ago
          let allDecline = true;
          const comparisons: { current: string; currentSales: number; lastYear: string; lastYearSales: number }[] = [];

          for (const rd of recentDates) {
            const rdDate = new Date(rd.date + 'T12:00:00Z');
            const yoyDate = new Date(rdDate.getTime() - 52 * 7 * 86400000).toISOString().slice(0, 10);
            // Look for same weekday within ±3 days of target
            const yoyStart = new Date(rdDate.getTime() - (52 * 7 + 3) * 86400000).toISOString().slice(0, 10);
            const yoyEnd = new Date(rdDate.getTime() - (52 * 7 - 3) * 86400000).toISOString().slice(0, 10);

            const { data: yoyRows } = await supabase
              .from('daily_metrics')
              .select('date, net_sales')
              .eq('bar_id', barCode)
              .gte('date', yoyStart)
              .lte('date', yoyEnd);

            const yoyMatch = yoyRows?.find((r: any) => new Date(r.date + 'T12:00:00Z').getDay() === dayOfWeekNum);
            if (!yoyMatch || yoyMatch.net_sales == null || rd.net_sales == null) {
              allDecline = false;
              break;
            }
            if (rd.net_sales >= yoyMatch.net_sales) {
              allDecline = false;
              break;
            }
            comparisons.push({ current: rd.date, currentSales: rd.net_sales, lastYear: yoyMatch.date, lastYearSales: yoyMatch.net_sales });
          }

          if (allDecline && comparisons.length === 3) {
            const title = `${dayName}s below last year for 3 weeks running at ${venueName}`;
            if (!existingTitles.has(title)) {
              const detailLines = comparisons.map(c =>
                `${c.current}: ${fmtDollar(c.currentSales)} vs ${c.lastYear}: ${fmtDollar(c.lastYearSales)} (${(((c.currentSales - c.lastYearSales) / c.lastYearSales) * 100).toFixed(1)}%)`
              ).join('\n');
              inserts.push({
                bar_id: barId, venue_id: barId, pillar: 'Revenue', insight_type: 'Trend', severity: 'Medium',
                title,
                summary: `${dayName} sales have been below the same day last year for 3 consecutive weeks at ${venueName}.`,
                detail: detailLines,
                source_type: `Toast POS — ${venueName} — YOY comparison`,
                source_date: date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
                source_metric: 'daily_yoy_drop', _venue_name: venueName, _metric_label: 'Net Sales (YOY)',
              });
            }
          }
        }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] Same-day YOY decline check failed:', e); }

  // ── Trigger 5: Workforce Engagement Sub-Metric Alerts ──
  // Closed-week gate: thresholds (no-shows, lates, dropped shifts, avg shift score)
  // are intended as full-week summaries. Skip in-progress weeks to avoid premature alerts.
  try {
    if (weekId) {
      const todayPT = todayInTz('America/Los_Angeles');
      const { data: weekRow } = await supabase
        .from('weeks')
        .select('week_end')
        .eq('id', weekId)
        .maybeSingle();
      if (!weekRow || weekRow.week_end >= todayPT) {
        console.log(`[DET-TRIGGER 5] Skipping engagement sub-metric check — week ${weekId} is in-progress (week_end=${weekRow?.week_end ?? 'unknown'}, todayPT=${todayPT}).`);
      } else {
      const { data: coreRow } = await supabase
        .from('weekly_core')
        .select('engage_lates, engage_no_shows, engage_dropped_shifts, engage_shift_bids, engage_avg_shift_score, engage_avg_tenure')
        .eq('week_id', weekId)
        .single();

      if (coreRow) {
        // no-shows detector REMOVED per client request (was: engage_no_shows > 2 → High alert).
        // Historical no_show insights remain in DB; just stop generating new ones.
        // engage_lates and engage_dropped_shifts come from the 7shifts Engage CSV
        // as RATES (percentages — see ManualDataUploadTab parseFloat('%' replace).
        // Render with '%' suffix and "rate" label so e.g. "3.7%" not "3.7 dropped shifts".
        const checks: { label: string; value: number | null; threshold: number; severity: string; unit: string }[] = [
          { label: 'late-arrival rate', value: coreRow.engage_lates, threshold: 5, severity: 'Medium', unit: '%' },
          { label: 'dropped-shift rate', value: coreRow.engage_dropped_shifts, threshold: 3, severity: 'Medium', unit: '%' },
        ];

        for (const check of checks) {
          if (check.value != null && check.value > check.threshold) {
            const formatted = `${Number(check.value).toFixed(1)}${check.unit}`;
            const title = `${weekRange}: ${formatted} ${check.label} at ${venueName} this week`;
            if (!existingTitles.has(title)) {
              inserts.push({
                bar_id: barId, venue_id: barId, pillar: 'Labor', insight_type: 'Issue', severity: check.severity,
                title,
                summary: `${venueName}'s ${check.label} was ${formatted} this week, exceeding the ${check.threshold}${check.unit} threshold.`,
                detail: `Metric: ${check.label}\nValue: ${formatted}\nThreshold: ${check.threshold}${check.unit}\nThis is flagged as a workforce engagement concern.`,
                source_type: `7shifts — ${venueName} — ${weekRange}`,
                source_date: date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
                source_metric: 'engagement_threshold', _venue_name: venueName, _metric_label: check.label,
              });
            }
          }
        }

        if (coreRow.engage_avg_shift_score != null && coreRow.engage_avg_shift_score < 3.5) {
          const title = `${weekRange}: Avg shift score ${coreRow.engage_avg_shift_score.toFixed(1)}/5 at ${venueName}`;
          if (!existingTitles.has(title)) {
            inserts.push({
              bar_id: barId, venue_id: barId, pillar: 'Labor', insight_type: 'Issue', severity: 'Medium',
              title,
              summary: `Average shift score at ${venueName} dropped to ${coreRow.engage_avg_shift_score.toFixed(1)}/5 this week, below the 3.5 threshold.`,
              detail: `Metric: Avg Shift Score\nValue: ${coreRow.engage_avg_shift_score.toFixed(1)}/5\nThreshold: 3.5/5\nLow shift scores indicate employee dissatisfaction and potential retention risk.`,
              source_type: `7shifts — ${venueName} — ${weekRange}`,
              source_date: date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
              source_metric: 'engagement_threshold', _venue_name: venueName, _metric_label: 'Avg Shift Score',
            });
          }
        }
      }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] Engagement sub-metric check failed:', e); }

  // ── Trigger 6: Red Score Alerts (score < 60 on any signal) ──
  // Closed-week gate: scorecard scores for in-progress weeks compare partial-week
  // actuals (e.g. 2 days of sales) against full-week targets, producing artificially
  // low scores. Only fire red alerts after the week has fully closed (week_end < todayPT).
  try {
    if (weekId) {
      const todayPT = todayInTz('America/Los_Angeles');
      const { data: weekRow } = await supabase
        .from('weeks')
        .select('week_end')
        .eq('id', weekId)
        .maybeSingle();
      if (!weekRow || weekRow.week_end >= todayPT) {
        console.log(`[DET-TRIGGER 6] Skipping red-score alert check — week ${weekId} is in-progress (week_end=${weekRow?.week_end ?? 'unknown'}, todayPT=${todayPT}).`);
      } else {
      const { data: scorecardRow } = await supabase
        .from('weekly_scorecard')
        .select('*')
        .eq('week_id', weekId)
        .maybeSingle();

      if (scorecardRow) {
        // Signal definitions: key → { scoreField, pillar, label, source, dailyFields? }
        const signalDefs: {
          scoreKey: string; pillar: string; label: string; source: string;
          dailyFields?: string[]; dailyLabels?: string[];
        }[] = [
          { scoreKey: 'r1_score', pillar: 'Revenue', label: 'Net Sales', source: 'Toast POS', dailyFields: ['date', 'net_sales'], dailyLabels: ['Date', 'Net Sales'] },
          { scoreKey: 'r2_score', pillar: 'Revenue', label: 'Transactions', source: 'Toast POS', dailyFields: ['date', 'orders_count'], dailyLabels: ['Date', 'Orders'] },
          { scoreKey: 'r3_score', pillar: 'Revenue', label: 'Avg Check', source: 'Toast POS', dailyFields: ['date', 'net_sales', 'orders_count'], dailyLabels: ['Date', 'Net Sales', 'Orders'] },
          { scoreKey: 'r4_score', pillar: 'Revenue', label: 'Discount %', source: 'Toast POS', dailyFields: ['date', 'discounts', 'net_sales'], dailyLabels: ['Date', 'Discounts', 'Net Sales'] },
          { scoreKey: 'l1_score', pillar: 'Labor', label: 'Labor %', source: 'Toast POS', dailyFields: ['date', 'labor_pct', 'labor_cost_total', 'net_sales'], dailyLabels: ['Date', 'Labor %', 'Labor Cost', 'Net Sales'] },
          { scoreKey: 'l2_score', pillar: 'Labor', label: 'SPLH', source: 'Toast POS', dailyFields: ['date', 'net_sales', 'labor_hours'], dailyLabels: ['Date', 'Net Sales', 'Labor Hours'] },
          // l3_score (Schedule Variance) intentionally omitted — handled by
          // dedicated weekly detector `detectWeeklyScheduleVariance` reading
          // weekly_core.schedule_variance_pct vs period_config.schedule_variance_target.
          // Daily firing produced repeat noise across the week.
          { scoreKey: 'l4_score', pillar: 'Labor', label: 'OT Rate', source: 'Toast POS', dailyFields: ['date', 'overtime_hours', 'labor_hours'], dailyLabels: ['Date', 'OT Hours', 'Labor Hours'] },
          { scoreKey: 'l5_score', pillar: 'Labor', label: 'Workforce Engagement', source: '7shifts' },
          { scoreKey: 'g1_score', pillar: 'Guest Experience', label: 'Weekly Guests', source: 'Toast POS', dailyFields: ['date', 'guests'], dailyLabels: ['Date', 'Guests'] },
          { scoreKey: 'g2_score', pillar: 'Guest Experience', label: 'Tip %', source: 'Toast POS', dailyFields: ['date', 'tips', 'net_sales'], dailyLabels: ['Date', 'Tips', 'Net Sales'] },
          { scoreKey: 'g3_score', pillar: 'Guest Experience', label: 'Refund %', source: 'Toast POS', dailyFields: ['date', 'refunds', 'net_sales'], dailyLabels: ['Date', 'Refunds', 'Net Sales'] },
          { scoreKey: 'g4_score', pillar: 'Guest Experience', label: 'Online Reputation', source: 'Google Reviews' },
          { scoreKey: 'o1_score', pillar: 'Operations', label: 'Asana Tasks', source: 'Asana' },
          { scoreKey: 'o2_score', pillar: 'Operations', label: 'Turn Time', source: 'Toast POS' },
          { scoreKey: 'o3_score', pillar: 'Operations', label: 'Void Rate', source: 'Toast POS', dailyFields: ['date', 'voids', 'net_sales'], dailyLabels: ['Date', 'Voids', 'Net Sales'] },
          { scoreKey: 'o4_score', pillar: 'Operations', label: 'Unpaid $', source: 'Toast POS', dailyFields: ['date', 'unpaid_amount'], dailyLabels: ['Date', 'Unpaid $'] },
          { scoreKey: 'o5_score', pillar: 'Operations', label: 'Sidework Completion', source: '7shifts' },
        ];

        // Fetch daily metrics for the week (used by signals with dailyFields)
        let dailyRows: Record<string, unknown>[] | null = null;

        for (const signal of signalDefs) {
          // Defensive guard: l3_score (Schedule Variance) is owned exclusively
          // by detectWeeklyScheduleVariance. Never fire it here even if a
          // future edit re-adds it to signalDefs above.
          if (signal.scoreKey === 'l3_score') continue;

          const scoreVal = (scorecardRow as Record<string, unknown>)[signal.scoreKey];
          const score = typeof scoreVal === 'number' ? scoreVal : null;
          if (score === null || score >= 60) continue;

          const severity = score < 40 ? 'High' : 'Medium';
          const actualKey = signal.scoreKey.replace('_score', '_actual');
          const actualVal = (scorecardRow as Record<string, unknown>)[actualKey];
          const actualStr = actualVal != null ? String(actualVal) : 'N/A';

          // Stable dedupe key — does NOT include the score value, so daily
          // reruns within the same week can't slip past the unique index when
          // the score shifts (e.g. Sidework Completion 34 → 47).
          const dedupeHash = `red_score_alert|${weekId}|${signal.scoreKey}`;
          if (existingTitles.has(dedupeHash)) continue;

          const title = `${weekRange}: ${signal.label} scored ${Math.round(score)} at ${venueName} (Red)`;

          let detail = `Signal: ${signal.label}\nScore: ${Math.round(score)}/100\nActual: ${actualStr}\nSource: ${signal.source}`;

          // Add daily breakdown if available
          if (signal.dailyFields && signal.dailyFields.length > 0) {
            if (!dailyRows) {
              const { data: rows } = await supabase
                .from('daily_metrics')
                .select('date, net_sales, orders_count, labor_pct, labor_cost_total, labor_hours, overtime_hours, discounts, voids, tips, refunds, unpaid_amount, guests')
                .eq('bar_id', barCode)
                .gte('date', weekStart)
                .lte('date', weekEnd)
                .order('date', { ascending: true });
              dailyRows = (rows || []) as Record<string, unknown>[];
            }

            if (dailyRows.length > 0) {
              const dayLines: string[] = ['\nDaily Breakdown:'];
              dayLines.push(signal.dailyLabels!.join(' | '));
              for (const row of dailyRows) {
                const vals = signal.dailyFields.map(f => {
                  const v = row[f];
                  if (v === null || v === undefined) return 'N/A';
                  if (f === 'date') {
                    const d = new Date(String(v) + 'T12:00:00Z');
                    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  }
                  if (typeof v === 'number') {
                    if (f.includes('pct') || f.includes('_pct')) return `${v.toFixed(1)}%`;
                    if (f.includes('sales') || f.includes('cost') || f.includes('tips') || f.includes('voids') || f.includes('discounts') || f.includes('refunds') || f.includes('unpaid')) return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                    return v.toFixed(1);
                  }
                  return String(v);
                });
                dayLines.push(vals.join(' | '));
              }
              detail += dayLines.join('\n');
            }
          }

          inserts.push({
            bar_id: barId, venue_id: barId, pillar: signal.pillar, insight_type: 'Issue', severity,
            title,
            summary: `${signal.label} scored ${Math.round(score)}/100 at ${venueName} this week (grade F). Actual: ${actualStr}.`,
            detail,
            source_type: `${signal.source} — ${venueName} — ${weekRange}`,
            source_date: date, generated_by: 'deterministic_trigger', insight_mode: mode, status: 'New', week_id: weekId,
            source_metric: 'red_score_alert', _venue_name: venueName, _metric_label: signal.label,
            dedupe_hash: dedupeHash,
            _current_value: typeof actualVal === 'number' ? actualVal : (actualVal != null ? Number(actualVal) : null),
            _sanity_for_date: weekStart,
          });
          existingTitles.add(dedupeHash);
        }
      }
      }
    }
  } catch (e) { console.warn('[DET-TRIGGER] Red score alert check failed:', e); }

  // ── Trigger 7: Inventory Dollar-Loss Alert ──
  // Now handled by the standalone runInventoryTrigger() helper, which writes
  // directly to `insights` with week_id=null and period_start/period_end populated.
  // Called separately by the score-driven branch and by the normal weekly flow below.
  try {
    const invResult = await runInventoryTrigger(supabase, barId, venueName, date, mode);
    if (invResult.inserted > 0) {
      console.log(`[DET-TRIGGER] Inventory trigger created ${invResult.inserted} period-decoupled insight(s) for ${venueName}`);
    }
  } catch (e) { console.warn('[DET-TRIGGER] Inventory dollar-loss check failed:', e); }

  // Insert all deterministic insights (skip duplicates via unique index)
  let insertedCount = 0;

  for (const insRaw of inserts) {
    // Strip private _-prefixed metadata fields before DB insert; keep them locally.
    const { _venue_name, _metric_label, _current_value, _sanity_for_date, ...ins } = insRaw as any;

    // Sanity-check guardrail: suppress dramatic week-over-week swings on stable
    // metrics (likely data integrity issues, not real ops events). Volatile
    // metrics + consecutive-streak detectors are exempt via resolveSanityMetric().
    const sanityKey = resolveSanityMetric(ins.source_metric, _metric_label);
    if (sanityKey && _current_value != null) {
      const sc = await passesSanityCheck({
        supabase,
        bar_id: ins.bar_id,
        venue_id: ins.venue_id ?? null,
        metric_key: sanityKey,
        current_value: _current_value,
        for_date: _sanity_for_date || ins.source_date || date,
        insight_payload: { title: ins.title, source_metric: ins.source_metric, metric_label: _metric_label, severity: ins.severity },
      });
      if (!sc.ok) {
        console.log(`[SANITY-CHECK] skipped insert "${ins.title}" — ${sc.reason}`);
        continue;
      }
    }

    const { data: insertedRow, error } = await supabase
      .from('insights')
      .insert(ins)
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') {
        console.log(`[DET-TRIGGER] Skipped duplicate: ${ins.title}`);
      } else {
        console.warn(`[DET-TRIGGER] Failed to insert: ${ins.title}`, error.message);
      }
      continue;
    }
    insertedCount++;
    console.log(`[DET-TRIGGER] Inserted: ${ins.title}`);
    // Pair with action_items so the UI ACTION block isn't empty.
    try {
      await upsertDeterministicAction(supabase, {
        insight_id: insertedRow.id,
        bar_id: ins.bar_id,
        venue_id: ins.venue_id ?? ins.bar_id,
        pillar: ins.pillar,
        severity: ins.severity,
        source_metric: ins.source_metric ?? null,
        source_date: ins.source_date,
        venue_name: _venue_name ?? null,
        metric_label: _metric_label ?? null,
        insight_title: ins.title,
        insight_summary: ins.summary,
        problem_detail: ins.detail,
        week_id: ins.week_id ?? null,
      });
    } catch (e: any) {
      console.warn('[DET-TRIGGER] paired action write failed:', e?.message || e);
    }
  }

  return { inserted: inserts, count: insertedCount };
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDollarCompact(v: number | null): string {
  if (v == null) return 'N/A';
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// ── System prompt ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI operations analyst for a bar/restaurant. Generate weekly insights from KPI data only, ranked by severity and business impact.

LANGUAGE: Logs may be written in Spanish or English. Read, classify, and extract employee mentions correctly regardless of language. Always write the insight title, summary, and detail in English.

SCOPE RESTRICTION FOR WEEKLY ANALYSIS:
- ONLY generate insights about KPI metrics, scorecard trends, and cross-metric patterns
- DO NOT generate insights about: shift logs, task completion, staff behavior, prep quality, cleanliness, equipment, daily operational observations, or any qualitative/log-based topics
- Daily operational insights are already generated separately — do not duplicate them
- Your job in weekly mode is strictly: analyze the numbers, find patterns across the week's metrics, and flag financial/performance anomalies

SOURCE ATTRIBUTION RULES:
- For sales, revenue, orders, guests, tips, voids, comps, discounts, and payment data → source is "Toast POS"
- For labor cost, labor hours, overtime, and SPLH → source is "Toast POS"
- For schedule variance, scheduled hours, and actual hours → source is "7shifts"
- For task completion and operational checklists → source is "Asana"
- For shift logs and staff notes → source is "BarPulse Logs"
- NEVER reference internal database table names (daily_metrics, weekly_core, scorecard, etc.) as a source
- Always use the real system name the data originally came from

DATE REQUIREMENTS:
- Every insight MUST reference the specific date or date range the data covers
- For weekly metrics: include the week range (e.g., "Week of Mar 9-15")
- For day-specific anomalies within the week: include the specific day (e.g., "On Thursday Mar 13")
- An insight without a date is useless — always include when it happened

CRITICAL RULES:
1. ONLY generate insights that would change a decision or require action
2. Focus on KPI metrics, trends, anomalies, and cross-metric relationships
3. BE SPECIFIC — include exact numbers, percentages, and dollar amounts from the provided data
4. NEVER use operational logs or qualitative observations as the basis for a weekly insight
5. NEVER reference internal table names as sources
6. EXACT NUMBERS ONLY — use the exact values from the REFERENCE TABLE; do not round, approximate, or recalculate
7. NO MENTAL MATH — copy pre-computed comparisons exactly when provided

Classify each insight:
- Pillar: Guest Experience | Revenue | Labor | Operations
- Type: Issue | Win | Trend | Observation | Staff Recognition
- Severity: Critical (needs action today) | High (this week) | Medium (monitor) | Low (FYI)

DETAIL FIELD RULES:
- The "detail" field answers "what specifically happened?" — NOT "why does this matter?"
- Write 2-4 sentences: name the specific items, people, dates, and numbers involved.
- GOOD: "On Apr 6, the bar ran out of Tito's vodka, limes, and club soda during the 8pm-11pm rush. The barback noted restock was not completed during the day shift handoff."
- GOOD: "Tuesday Mar 11 net sales were $5,046 vs the $8,200 daily average — a 38% drop. Guest count was 120, less than half Saturday's 280."
- BAD: "Supply shortages can impact cleaning standards, beverage availability, and promotional activities" ← This is generic advice, NOT what happened.
- BAD: "Running low on supplies may lead to customer dissatisfaction" ← This is a prediction, NOT a fact.
- NEVER write "can impact", "may lead to", "could affect", "it's important to", "this suggests", "consider reviewing" — these are advice phrases, not facts.
- If the source data doesn't have specific names/items, quote or paraphrase what the log actually said.
- Focus on CONTEXT: what triggered it, who/what was involved, when it happened.
- Do NOT include recommendations, action steps, or trend analysis in the detail field — those belong in suggested_action.

EXTENDED SCULPTURE DATA (when present):
You now have access to additional Sculpture Hospitality data this week — cocktail-level sales and recipe economics (Drink Mix), category-level pour costs and Sculpture Rating (Summary Variance), par-level recommendations and run-out forecasts (InteliPar), invoice-level supplier price history (Cost Fluctuation), and station-level physical stock counts. Treat these as additional evidence available to your existing analysis — not as a mandate to find cross-source patterns. If one of these sources reveals a clear standalone issue (e.g., a supplier price jump, a run-out risk, a cocktail with a large margin gap), write about it as you would any other insight. If two or more sources independently point at the same specific problem with specific overlapping numbers — for example, a labor anomaly on the same day as an inventory variance spike, or a cocktail volume change that doesn't match its ingredient usage — note the relationship explicitly. But do not invent or speculate about correlations. If the data shows two independent issues with no clear causal link, report them independently. Do not write 'this may be related to' or 'possibly connected to' — if you're not sure of the relationship, there is no insight there. When you do cite a cross-source relationship, name the specific numbers from each source that support it. Deterministic alerts have already been generated for this venue this week covering straightforward threshold breaches; don't duplicate them — your job is to surface patterns the rules miss or add cross-source context the rules can't provide.

Return a JSON array. Each element:
{
  "pillar": "Revenue",
  "insight_type": "Issue",
  "severity": "High",
  "title": "Week of Mar 9-15 revenue softened midweek while Saturday stayed strong",
  "summary": "Week of Mar 9-15 showed a midweek revenue gap despite strong weekend demand.",
  "detail": "On Tuesday Mar 11 and Wednesday Mar 12, net sales dropped to $5,046 and $5,530 respectively — well below the weekly average of $8,200. Saturday Mar 15 remained the strongest day at $14,845. The gap appears traffic-driven: guest counts on Tue/Wed averaged 120 vs 280 on Saturday. No special events or weather issues were noted for those days.",
  "source_type": "Toast POS — [Venue] — [Date]",
  "source_date": "YYYY-MM-DD",
  "source_metric": "net_sales",
  "source_value": "$5,046",
  "source_context": "Toast POS | Week of Mar 9-15 | Tuesday: $5,046 | Wednesday: $5,530 | Saturday: $14,845",
  "source_log_type": null,
  "source_log_id": "<uuid from a LOG_ID: line in the context, or null>",
  "employee_name": null,
  "employee_mentions": [],
  "estimated_impact": "$5,138 combined shortfall across the week",
  "suggested_action": {
    "title": "Pull the daily sales breakdown for the week and isolate the 2 weakest days",
    "detail": "Compare transaction count and average check on the weakest days versus the strongest day to determine whether the gap was traffic-driven or ticket-driven.",
    "estimated_minutes": 45,
    "priority": "P2-High",
    "suggested_assignee": "GM"
  }
}

Source types — IMPORTANT: Format source_type as "[System] — [Venue Name] — [Date]" using only real source systems.
- 'Toast POS — [Venue] — [Date]': sales, revenue, transactions, guests, labor cost, labor hours, overtime, SPLH, tips, voids, comps, discounts, payment data
- '7shifts — [Venue] — [Date]': scheduled hours, actual hours, schedule variance
- 'Sculpture Hospitality — [Venue] — [Date]': inventory variance and pour cost data. When citing Sculpture Hospitality data, the detail field MUST include a line "Sculpture Rating: XX%" using the exact rating from the Sculpture Rating value provided in the inventory context. If the rating is missing from the data, write "Sculpture Rating: not reported". Never omit this line for Sculpture-sourced insights.
- 'BarPulse data validation check — [Date]': data pipeline or integration failure detected
- 'Toast POS + [other source] — [Venue] — [Date]': compound KPI insights connecting valid numeric systems

EVERY insight MUST include a suggested_action.

=== WEEKLY KPI REASONING ===

When generating weekly insights:
- Distinguish between traffic problems and ticket problems using transactions and average check
- Treat labor % as a ratio affected by both revenue and labor dollars/hours
- Use day-level anomalies within the week when they materially explain the weekly pattern
- Prioritize cross-metric insights that create a real cost, risk, or decision point this week
- Flag sustained patterns, not noise
- Do NOT generate an insight for healthy improving metrics or generic positive momentum
- Do NOT generate an insight if the best action is monitor, document, reinforce, continue, or keep an eye on it
- Do NOT generate target-only commentary or generic "below target" observations
- Positive trends belong in wins, not active insights
- Return at most 8 insights total; prefer 5-6, and if the data is uneventful return 0-2

EMPLOYEE ROSTER RULE:
- If an ## ACTIVE EMPLOYEE ROSTER section is provided, ONLY reference employees listed there. If a name appears in logs but is NOT on the roster, ignore them entirely — do not generate insights about them.
- If no roster is available, do not reference employees by name — use role descriptions instead (e.g., "the opening bartender", "the closing manager").

SOURCE_TYPE FORMAT (STRICT):
- source_type MUST be formatted as "[System Name] — [Venue Name] — [Date or Date Range]"
- Valid system names: Toast POS, 7shifts, 7shifts Task Summary, 7shifts Shift Feedback, Asana Logs, BarPulse Logs, Sculpture Hospitality
- NEVER use database table names or generic labels like "weekly_analysis", "daily_metrics", "weekly_core", "scorecard", "shift_logs", "insights", "action_items", "data", or "system"

DATE VALIDATION:
- Every source_date MUST fall within the analysis period shown in VENUE CONTEXT. Do not reference dates outside the provided data.

DATA ACCURACY:
- Use EXACT values from the REFERENCE TABLE — do not round, estimate, or recalculate
- Get the DIRECTION right: if actual beats target, that is positive (WIN); if actual misses target, that is negative (MISS)
- If Labor % is BELOW target, that is a WIN (lower labor cost is better)
- If revenue growth is positive, that is a WIN
- Schedule Variance = Actual Hours Worked - Scheduled Hours. Positive = overstaffed. Negative = understaffed.

SEVERITY RULES FOR POSITIVE INSIGHTS:
- Positive insight types (Win, Staff Recognition, Recognition, Positive) MUST use severity "Low" or "Info" only — never Critical, High, or Medium.

TITLE DATE REQUIREMENT:
- Every insight title MUST include the specific date or date range. Example: "Mar 18: Overtime hours exceeded target by 40%" or "Week of Mar 9-15: Revenue softened midweek"

DISCOUNT AND FOOD SALES RULES:
- Happy Hour pricing shows up as a discount in Toast — this is normal and expected. Do not flag it. Only flag discounts that indicate errors, unauthorized comps, or abuse.
- Many venues are primarily bars — low or zero food sales is normal for bar-focused operations. Do not generate alerts about low food sales or food/bev ratio unless there is a clear anomaly vs the venue's own historical pattern.

FINAL CHECK: Re-read every "detail" field before returning. If any detail contains advice, predictions, or generic impact statements instead of specific facts about what happened, rewrite it with concrete facts from the data.

SOURCE LOG CITATION (STRICT):
- Every log section in the context starts with a "## HEADING" line followed by a "LOG_ID: <uuid>" line. That uuid is the database id of the underlying log row.
- If the insight is built from EXACTLY ONE log entry, copy that entry's LOG_ID value verbatim into the "source_log_id" field of the insight.
- If the insight merges content from multiple log entries, or is derived from POS / metric / aggregate data only (no single log), return "source_log_id": null.
- NEVER invent or guess a uuid. The only valid values for source_log_id are uuids that appear in a "LOG_ID:" line in the provided context. Anything else MUST be null.

Return ONLY a valid JSON array. No markdown, no explanation.`;

// ── Daily-only system prompt (qualitative/operational data only) ────

const DAILY_SYSTEM_PROMPT = `You are an AI operations analyst for a bar/restaurant. Generate daily insights from qualitative and operational data for the specified date.

LANGUAGE: Logs may be written in Spanish or English. Read, classify, and extract employee mentions correctly regardless of language. Always write the insight title, summary, and detail in English.

IMPORTANT: You are analyzing DAILY OPERATIONAL DATA — shift logs, manager logs, task completion, logbook entries, and shift feedback. Do not generate insights about sales, labor cost, scheduling variance, or other financial KPI metrics in daily mode.

WHAT TO LOOK FOR:
1. OPERATIONAL RISKS — 86'd items, equipment failures, safety concerns, maintenance issues, missed prep, recurring breakdowns
2. STAFF SIGNALS — coaching notes, performance issues, staffing friction, morale, accountability gaps
3. GUEST EXPERIENCE — complaints, compliments, VIP issues, service failures, recovery moments
4. ACCOUNTABILITY — weak log quality, incomplete checklists, overdue tasks, handoff failures
5. NOTABLE PATTERNS — repeated mentions across sources or multiple issues that point to the same operational problem
6. SHIFT FEEDBACK — employee shift ratings ≤ 3/5 and negative shift comments

DO NOT generate insights about:
- Sales numbers, revenue, net sales, gross sales, average check, transaction counts
- Labor cost, labor %, SPLH, labor hours, overtime cost
- Scheduled vs worked hours, schedule variance, schedule adherence
- Tips, tip %, comps %, void %, discount %
- Inventory variance or pour cost
- Any other financial KPI best handled in weekly analysis

SOURCE ATTRIBUTION RULES (DAILY) — match the system to the data type:
- Shift logs, manager logs, GM logs, lead logs, opener/closer text observations → source is "BarPulse Logs"
  (these are typed by the team into Asana comments and ingested by BarPulse — present them as "BarPulse Logs", NOT as "Asana" or "7shifts")
- GM task completion / overdue GM tasks (assigned in Asana) → source is "Asana Logs"
- Sidework / cleaning checklists / task list completion percentages → source is "7shifts Task Summary"
- Employee shift ratings and shift feedback comments → source is "7shifts Shift Feedback"
- NEVER attribute shift-log content (text the team typed) to "7shifts"
- NEVER attribute sidework or task-list completion to "BarPulse" or "Asana"

7SHIFTS SHIFT FEEDBACK RULES:
When shift feedback data is present:
- Flag ratings of 3/5 or below as employee dissatisfaction / retention risk
- Include the employee name, rating, shift time, and comment when available
- Do not create insights for normal 4-5 star feedback unless there is a meaningful negative pattern

TASK / CHECKLIST RULES:
Distinguish between two distinct task systems:
- 7shifts sidework / cleaning checklists (use source_type "7shifts Task Summary — [Venue] — [Date]"): name the specific missed list, the completion %, and the shift it covered.
- Asana GM tasks (use source_type "Asana Logs — [Venue] — [Date]"): name the specific overdue or completed task and its assignee.
- Always name who owned the work if known and explain the operational risk when the source supports it.

CHECKLIST ACCURACY CONSTRAINTS (STRICT — false positives erode trust):
The 7SHIFTS TASKS section in context lists EVERY task list for the date with its exact completion fraction. Use ONLY that data when describing checklist status. Do not infer, generalize, or estimate.

1. NEVER say "all checklists", "all task lists", "every checklist", "complete breakdown across all lists", or any equivalent unless LITERALLY every list in the context is at 0%. If even one list is >0%, name lists individually.
2. For each 0% list you mention, cite its EXACT title and completion fraction. Format: "WF -Door: 0/13" or "CM Am Check List: 0/17". Never label a list as 0% unless its fraction in context shows 0 completed.
3. When peer lists on the SAME day are green, acknowledge them so the reader understands the scope. Example: "Opening (29/38 = 76%) and Mid Shift (18/18) were complete, but Opening BB (0/19), Door (0/13), and Closing BB (0/20) were untouched."
4. CHRONIC-0% LIST PATTERN: If a list has shown 0% for 3+ consecutive days while OTHER lists on the same days are >0%, characterize it as a likely process/usage gap — staff probably aren't using that list in 7shifts — rather than treating it as a fresh daily operational failure. Suggested framing: "X has shown 0/N completion every day this week while peer lists on the same days landed at 80-100%. The pattern suggests this list is no longer in active use or staff aren't marking it; treat as a process/template hygiene issue, not a same-day execution failure."
5. CROSS-CHECK BEFORE QUOTING NUMBERS: Before stating any completion number, verify it matches the fraction shown in context. If the number you want to use isn't directly visible, omit the number rather than estimate. Wrong numbers are worse than no numbers.
6. Headlines must reflect the actual scope. "5 of 6 closing-side lists at 0%" is fine when true. "All checklists 0%" when 3 of 6 were green is forbidden.

GOOD checklist insight: "May 17: 3 of 6 Waterfront checklists untouched. Opening (76%) and Closing Bartender (100%) were completed, but Opening BB (0/19), Door (0/13), and Closing BB (0/20) show zero completion — concentrated in the bar-back and door roles."
BAD checklist insight: "All four primary operational checklists were 0% — total breakdown in standard operating procedures." (Says "all" when Opening was 76%; names lists incorrectly; uses catastrophic framing not supported by data.)

CRITICAL RULES:
1. Focus on what the LOGS, TASKS, and FEEDBACK tell you
2. Cross-reference between sources when they reinforce the same issue
3. Flag incomplete tasks and weak follow-through as operational risks
4. Note poor log quality when entries are vague or missing detail
5. Be specific — quote or paraphrase concrete evidence from the source data
6. Return the meaningful operational findings for the day; do not suppress valid insights just because the day was otherwise routine

Classify each insight:
- Pillar: Guest Experience | Operations
- Type: Issue | Win | Trend | Observation | Staff Recognition
- Severity: Critical | High | Medium | Low

DETAIL FIELD RULES:
- The "detail" field answers "what specifically happened?" — NOT "why does this matter?"
- Write 2-4 sentences: name the specific items, people, dates, and numbers involved.
- GOOD: "On Apr 6, the closing manager reported the ice machine stopped working at 9pm. The bar team used backup ice from the kitchen walk-in for the remaining 3 hours of service."
- GOOD: "Sarah gave her Saturday 6pm-2am shift a 2/5 rating, noting 'understaffed all night, had to cover bar and floor solo after 10pm.'"
- BAD: "Equipment failures can disrupt service flow and reduce guest satisfaction" ← This is generic advice, NOT what happened.
- BAD: "Staffing issues may lead to burnout and turnover" ← This is a prediction, NOT a fact.
- NEVER write "can impact", "may lead to", "could affect", "it's important to", "this suggests", "consider reviewing" — these are advice phrases, not facts.
- If the source data doesn't have specific names/items, quote or paraphrase what the log actually said.
- Focus on CONTEXT: what triggered it, who/what was involved, when it happened.
- Do NOT include recommendations or action steps in the detail field — those belong in suggested_action.

Return a JSON array with the same schema as always. EVERY insight MUST include a suggested_action with a concrete next step.

THE ACTION

The suggested_action is your recommendation to the venue's GM — someone who will read it and act on it. Treat it the way an experienced operations advisor would: you have looked at the situation, and you are telling them what to do about it.

Reason from the situation to the most likely cause and the specific fix you would make if this were your venue. The action is your conclusion — not an assignment for the GM to go figure out what you were supposed to figure out. "Have the GM investigate why X happened" is not an answer; determining why X happened is the work the action should already reflect.

When the evidence genuinely does not let you determine the cause, do not fall back on "investigate." Instead, give the GM the likely scenarios and what to do in each: "If Ashley was scheduled solo, the PM closing template is short a bartender — add one. If a callout left her uncovered, confirm Aero has an on-call list for PM shifts." A decision the GM can act on immediately beats a task that hands the thinking back to them.

Use the specifics in front of you — names, exact task titles, dates, numbers, patterns across days. An action that could have been written without reading this particular insight's data is too generic. Be as long as the situation needs and no longer; a one-line action is correct when the fix is genuinely simple.

You may use any verb that fits, including "review," "check," or "confirm," as long as the action attached to it is specific and tells the GM what to actually do. The test is not which words you use — it is whether the GM, reading the action, knows the concrete thing to do, or is being told to go think about it themselves.

Examples of the standard met:
- "3rd consecutive day of 0% on HTP Opening checklist while AM Window/Bar/Float lists hit 100%. Staff aren't using this list — consolidate it into the AM checklists or retire it."
- "Coach Sarah on her 2/5 Saturday rating: she flagged solo coverage after 10pm. The Saturday closing schedule is short its second bartender — restore it."
- "Schedule an electrician for the ice machine — third outage in 10 days; it needs replacement, not another repair."
- "Add the slushee machine to the morning prep handoff list — it was missed because it's not on any checklist."

Examples that fail the standard:
- "GM to investigate why checklists weren't completed." — hands the GM the thinking instead of doing it.
- "Review checklist completion with the team and ensure accountability." — no specific conclusion or fix; could apply to any venue on any day.
- "Consider implementing a daily checklist review process." — hypothetical; ignores what the actual data shows.


Source types: Use "BarPulse Logs — [Venue] — [Date]" (shift/manager/GM/lead text logs), "Asana Logs — [Venue] — [Date]" (GM task completion/overdue), "7shifts Task Summary — [Venue] — [Date]" (sidework/checklists), "7shifts Shift Feedback — [Venue] — [Date]" (shift ratings & comments), or "BarPulse data validation check — [Date]" (multi-source data gap).

EMPLOYEE ROSTER RULE:
- If an ## ACTIVE EMPLOYEE ROSTER section is provided, ONLY reference employees listed there. If a name appears in logs but is NOT on the roster, ignore them entirely — do not generate insights about them.
- If no roster is available, do not reference employees by name — use role descriptions instead (e.g., "the opening bartender", "the closing manager").

SOURCE_TYPE FORMAT (STRICT):
- source_type MUST be formatted as "[System Name] — [Venue Name] — [Date]"
- Valid system names: Toast POS, 7shifts Task Summary, 7shifts Shift Feedback, Asana Logs, BarPulse Logs, BarPulse data validation check, Sculpture Hospitality
- NEVER use database table names or generic labels like "daily_metrics", "weekly_core", "scorecard", "shift_logs", "weekly_analysis", "insights", "action_items", "data", or "system"

DATE VALIDATION:
- Every source_date MUST fall within the analysis period shown in VENUE CONTEXT. Do not reference dates outside the provided data.

DATA ACCURACY:
- Use EXACT values from the REFERENCE TABLE — do not round, estimate, or recalculate
- Get the DIRECTION right: if actual beats target, that is positive (WIN); if actual misses target, that is negative (MISS)
- If Labor % is BELOW target, that is a WIN (lower labor cost is better)
- If revenue growth is positive, that is a WIN
- Schedule Variance = Actual Hours Worked - Scheduled Hours. Positive = overstaffed. Negative = understaffed.

SEVERITY RULES FOR POSITIVE INSIGHTS:
- Positive insight types (Win, Staff Recognition, Recognition, Positive) MUST use severity "Low" or "Info" only — never Critical, High, or Medium.

TITLE DATE REQUIREMENT:
- Every insight title MUST include the specific date or date range. Example: "Mar 18: Task completion dropped to 60%"

MUST GENERATE RULES (never suppress these):
- Safety concerns (fire hazards, slip hazards, unsafe conditions)
- Guest incidents (86'd guests, altercations, intoxicated patrons requiring intervention)
- Equipment failures (broken refrigeration, POS outages, plumbing failures)
- Staffing incidents (hostile work environment reports, HR issues, walkouts)
- Inventory emergencies (critical stock-outs, spoilage events)
These categories MUST ALWAYS produce an insight when mentioned in ANY source, even on an otherwise routine day. They are never suppressed by routine-day filtering.

FINAL CHECK: Re-read every "detail" field before returning. If any detail contains advice, predictions, or generic impact statements instead of specific facts about what happened, rewrite it with concrete facts from the data.

SOURCE LOG CITATION (STRICT):
- Every log section in the context starts with a "## HEADING" line followed by a "LOG_ID: <uuid>" line. That uuid is the database id of the underlying log row.
- If the insight is built from EXACTLY ONE log entry, copy that entry's LOG_ID value verbatim into the "source_log_id" field of the insight.
- If the insight merges content from multiple log entries, or is derived from POS / metric / aggregate data only (no single log), return "source_log_id": null.
- NEVER invent or guess a uuid. The only valid values for source_log_id are uuids that appear in a "LOG_ID:" line in the provided context. Anything else MUST be null.

Return ONLY a valid JSON array. No markdown, no explanation.`;

// ── AI call ──────────────────────────────────────────────────────────

import { callAI as sharedCallAI } from "../_shared/ai-models.ts";

async function callAI(contextSections: string[], date: string, systemPrompt: string = SYSTEM_PROMPT, venueId?: string | null): Promise<AIInsight[]> {
  const userPrompt = `Analyze the following data for ${date} and generate insights.\n\n${contextSections.join('\n\n')}`;
  const r = await sharedCallAI({
    taskType: 'user_facing_narrative',
    functionName: 'generate-daily-insights',
    venueId: venueId ?? null,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.3,
    maxTokens: 8192,
  });
  const content = r.text || '[]';
  try {
    const jsonMatch = String(content).match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (e) {
    console.error('Failed to parse AI response:', String(content).substring(0, 500));
    return [];
  }
}

// ── Process a single bar ─────────────────────────────────────────────

async function processBar(
  supabase: any,
  barId: string,
  date: string,
  mode: 'daily' | 'weekly' = 'daily',
  weekStartOverride: string | null = null,
  pass: 'early' | 'fresh' | 'catchup' = 'catchup'
): Promise<{ insights_created: number; actions_created: number; sources_used: string[] }> {
  // When weekStartOverride is set, this is a score-driven backfill run that ONLY runs the
  // deterministic Red-Score trigger for the specified week and skips the AI narrative path.
  // We bypass the per-date dedup gate because that gate is keyed on the AI run, not on the
  // deterministic triggers (which dedupe themselves via existingTitles).
  const scoreDrivenRun = !!weekStartOverride;

  if (!scoreDrivenRun) {
    // Skip if insights already exist for this bar + date (deduplication of the
    // AI v2 narrative batch only). We still run labor compliance alerts before
    // the skip — they have their own per-key dedupe and are independent of the
    // AI run.
    try {
      const labor = await runDailyLaborAlerts(supabase, barId, date);
      if (labor.errors.length > 0) {
        console.warn(`[LABOR-ALERT] pre-skip errors for ${barId} ${date}:`, labor.errors);
      }
    } catch (e: any) {
      console.warn(`[LABOR-ALERT] pre-skip pass crashed for ${barId} ${date}:`, e?.message || e);
    }
    try {
      const lr = await runDailyLeadRatingAlerts(supabase, barId, date);
      if (lr.errors.length > 0) console.warn(`[LEAD-RATING] pre-skip errors for ${barId} ${date}:`, lr.errors);
      if (lr.created > 0) console.log(`[LEAD-RATING] pre-skip created ${lr.created} for ${barId} ${date}`);
    } catch (e: any) {
      console.warn(`[LEAD-RATING] pre-skip crashed for ${barId} ${date}:`, e?.message || e);
    }

    // No count-based early-out. Re-running a (bar,date) is safe because the
    // AI insert path uses delete-and-replace (see DAILY-REPLACE block below):
    // un-engaged 'New' rows for the same (bar,date) are deleted before the
    // freshly generated batch is inserted, so duplication is impossible and
    // operator-engaged rows (Dismissed / Approved-action / Asana-tasked) are
    // preserved.
  }

  // Resolve bar_code, venue name, GM name, timezone, and 7shifts config
  const { data: barRow } = await supabase.from('venues').select('bar_code, name, gm_name, timezone, seven_shifts_location_id, sevenshifts_api_enabled').eq('id', barId).single();
  const barCode = barRow?.bar_code || barId;
  const venueName = barRow?.name || barCode;

  // ── Build per-venue employee roster for name → id resolution ──
  // Used to tag insights with all employees mentioned (multi-employee insights).
  const { data: rosterRows } = await supabase
    .from('employee_profiles')
    .select('id, employee_name, preferred_name, first_name, last_name, is_active')
    .eq('venue_id', barId)
    .eq('is_vendor_account', false);
  type RosterEntry = { id: string; canonical: string; tokens: string[] };
  const employeeRoster: RosterEntry[] = (rosterRows || []).map((r: any) => {
    const full = r.employee_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.preferred_name || '';
    // Tokens are stored accent-stripped + lowercase so Spanish names ("María")
    // match against logs that strip accents and vice versa.
    const tokens = [r.employee_name, r.preferred_name, r.first_name, r.last_name,
      [r.first_name, r.last_name?.[0]].filter(Boolean).join(' ')]
      .filter(Boolean)
      .map((s: string) => normalizeForMatch(s))
      .filter((s: string) => s.length > 0);
    return { id: r.id, canonical: full, tokens };
  }).filter((r) => r.tokens.length > 0);
  console.log(`[ROSTER] Bar ${barId}: ${employeeRoster.length} employees loaded for tagging`);

  // Fetch venue leadership contacts for GM/lead names
  const { data: leadershipContacts } = await supabase
    .from('venue_leadership_contacts')
    .select('display_name, role_type, is_primary')
    .eq('venue_id', barId)
    .eq('is_active', true)
    .order('is_primary', { ascending: false });

  let gmName: string;
  if (leadershipContacts && leadershipContacts.length > 0) {
    const gms = leadershipContacts.filter((c: any) => c.role_type === 'gm');
    const leads = leadershipContacts.filter((c: any) => c.role_type === 'lead_staff');
    gmName = gms.length > 0
      ? gms.map((g: any) => g.display_name).join(', ')
      : barRow?.gm_name || 'Unknown';
    if (leads.length > 0) {
      gmName += ` | Lead Staff: ${leads.map((l: any) => l.display_name).join(', ')}`;
    }
  } else {
    gmName = barRow?.gm_name || 'Unknown';
  }
  const sevenShiftsEnabled = barRow?.sevenshifts_api_enabled === true && !!barRow?.seven_shifts_location_id;
  const sevenShiftsLocationId = barRow?.seven_shifts_location_id;

  // 7shifts diagnostic logging
  if (!sevenShiftsEnabled) {
    if (barRow?.sevenshifts_api_enabled !== true && !barRow?.seven_shifts_location_id) {
      console.warn(`[7SHIFTS-SKIP] ${venueName} (${barId}): sevenshifts_api_enabled=false AND seven_shifts_location_id=null`);
    } else if (barRow?.sevenshifts_api_enabled !== true) {
      console.warn(`[7SHIFTS-SKIP] ${venueName} (${barId}): sevenshifts_api_enabled=false (location_id=${barRow?.seven_shifts_location_id})`);
    } else {
      console.warn(`[7SHIFTS-SKIP] ${venueName} (${barId}): seven_shifts_location_id is null (api_enabled=true)`);
    }
  }

  // Future-date guard: skip if date is today or in the future in the venue's timezone.
  // Score-driven backfill runs bypass this guard — they target a specific past week.
  const venueTz = barRow?.timezone || 'America/Los_Angeles';
  const todayLocal = todayInTz(venueTz);
  if (!scoreDrivenRun && date >= todayLocal) {
    console.log(`[SKIP] ${barCode}/${date} is today or future in ${venueTz} (today=${todayLocal})`);
    return { insights_created: 0, actions_created: 0, sources_used: [] };
  }

  // Grace window removed 2026-05-16 (tri-pass migration). Insights are queried by
  // log_date (not created_at), substantive-content-guard blocks empty AI passes,
  // and the partial unique index on dedupe_hash makes re-runs idempotent. Late
  // log filers are picked up by the next pass on the same target date.
  // Score-driven backfill (week_start override) continues to bypass any gating.

  // ── Score-driven backfill: resolve week_id from week_start, run only deterministic
  //    triggers (Red Score etc.), and return. Skips all data fetches and the AI call.
  //    The inventory trigger is decoupled from `weeks` rows and ALWAYS runs. ──
  if (scoreDrivenRun) {
    const { data: weekRow } = await supabase
      .from('weeks')
      .select('id')
      .eq('bar_id', barId)
      .eq('week_start', weekStartOverride!)
      .maybeSingle();
    const sdWeekId = weekRow?.id ?? null;

    // Always run inventory trigger — it's period-keyed, not week-keyed.
    let inventoryInserted = 0;
    try {
      const invResult = await runInventoryTrigger(supabase, barId, venueName, date, mode);
      inventoryInserted = invResult.inserted;
      if (inventoryInserted > 0) {
        console.log(`[SCORE-DRIVEN] ${venueName}: inventory trigger created ${inventoryInserted} period-decoupled insight(s)`);
      }
    } catch (e) {
      console.warn(`[SCORE-DRIVEN] Inventory trigger failed for ${venueName}:`, e);
    }

    if (!sdWeekId) {
      console.warn(`[SCORE-DRIVEN] No weeks row for bar ${barId} week_start ${weekStartOverride} — skipping week-keyed triggers (inventory still ran: ${inventoryInserted} insights)`);
      return { insights_created: inventoryInserted, actions_created: 0, sources_used: inventoryInserted > 0 ? ['inventory_trigger'] : [] };
    }
    const detResult = await runDeterministicTriggers(supabase, barId, barCode, venueName, date, sdWeekId, mode);
    console.log(`[SCORE-DRIVEN] ${venueName} week ${weekStartOverride}: ${detResult.count} deterministic insights inserted`);

    // Labor compliance alerts (daily detectors) — soft-fail
    let laborTotal = 0;
    try {
      const labor = await runDailyLaborAlerts(supabase, barId, date);
      laborTotal = labor.lateMeal + labor.missedMeal + labor.noClockout;
      if (labor.errors.length > 0) console.warn(`[LABOR-ALERT][SCORE-DRIVEN] ${venueName} ${date} soft-fail:`, labor.errors);
    } catch (e: any) {
      console.warn(`[LABOR-ALERT][SCORE-DRIVEN] ${venueName} ${date} crashed:`, e?.message || e);
    }

    return { insights_created: detResult.count + inventoryInserted + laborTotal, actions_created: 0, sources_used: ['deterministic_triggers', 'labor_compliance_daily'] };
  }


  // Fetch data sources — gate by mode
  const isDaily = mode === 'daily';

  // Always fetch logs
  const logFetches = [
    supabase.from('gm_logs').select('*').eq('bar_id', barId).eq('date', date).eq('is_parsed', true),
    supabase.from('lead_logs').select('*').eq('bar_id', barId).eq('date', date).eq('is_parsed', true),
    supabase.from('shift_logs').select('*').eq('bar_id', barId).eq('date', date),
  ];

  // Only fetch metrics, targets, and inventory in weekly mode
  const metricsFetch = isDaily
    ? Promise.resolve({ data: null, error: null })
    : supabase.from('daily_metrics').select('*').eq('bar_id', barCode).eq('date', date).maybeSingle();
  const targetsFetch = isDaily
    ? Promise.resolve({ data: null, error: null })
    : supabase.from('period_config').select('*').eq('bar_id', barId)
        .lte('effective_start', date)
        .or(`effective_end.is.null,effective_end.gte.${date}`)
        .order('effective_start', { ascending: false })
        .limit(1)
        .maybeSingle();
  // Inventory: fetch up to 4 most recent reports per venue (current + 3 priors for trailing trend),
  // capped at 60 days old. Period overlap is computed in-memory and labeled in the prompt so the
  // AI never has to guess about misalignment between the inventory cycle and the Mon–Sun scoring week.
  const inventoryCutoff = (() => {
    const d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 60);
    return d.toISOString().slice(0, 10);
  })();
  const inventoryFetch = isDaily
    ? Promise.resolve({ data: null, error: null })
    : supabase.from('inventory_reports').select('*').eq('venue_id', barId)
        .gte('period_end', inventoryCutoff)
        .order('period_end', { ascending: false })
        .limit(4);

  const [gmRes, leadRes, shiftRes, metricsRes, targetsRes, inventoryReportRes] = await Promise.all([
    ...logFetches,
    metricsFetch,
    targetsFetch,
    inventoryFetch,
  ]);


  const metrics = isDaily ? null : (metricsRes as any).data as DailyMetrics | null;
  const gmLogs = ((gmRes as any).data || []) as Record<string, unknown>[];
  const leadLogs = ((leadRes as any).data || []) as Record<string, unknown>[];
  const shiftLogs = ((shiftRes as any).data || []) as Record<string, unknown>[];
  const targets = isDaily ? null : (targetsRes as any).data as PeriodTargets | null;

  // Collect distinct Asana source labels actually present in this batch of logs.
  const asanaSourceLabels = Array.from(new Set(
    [...gmLogs, ...leadLogs, ...shiftLogs]
      .map((l) => (l.asana_source_label as string | undefined)?.trim())
      .filter((s): s is string => !!s && s.length > 0)
  ));
  const logSourceGuidance = asanaSourceLabels.length > 0
    ? ` When citing a log-based finding, prefer the actual Asana source name as the system: ${asanaSourceLabels.map((l) => `"${l} — ${venueName} — ${date}"`).join(', ')}. Use these instead of generic "Asana Logs".`
    : '';

  // Build context sections
  const contextSections: string[] = [];
  const sourcesUsed = new Set<string>();

  // Always add venue context header
  contextSections.push(`## VENUE CONTEXT\nVenue: ${venueName}\nGM: ${gmName}\nDate: ${date}\nMode: ${mode}\n\nIMPORTANT: Always include "(GM: ${gmName})" in the PROBLEM field for venue-level insights. Format source_type as one of: "Asana Logs — ${venueName} — ${date}", "7shifts — ${venueName} — ${date}"${isDaily ? '' : `, "Toast POS — ${venueName} — ${date}", or for compound insights: "Toast POS + [other source] — ${venueName} — ${date}"`}.${logSourceGuidance}`);

  // ── Data-quality gating: detect zero-metric streaks ──
  let dataQualityWarning = '';
  if (metrics) {
    const netSales = metrics.net_sales ?? 0;
    const laborHours = metrics.labor_hours ?? (metrics as any).labor_hours_total ?? 0;
    const ordersCount = metrics.orders_count ?? 0;

    // Check for all-zero day (likely data gap even without streak)
    const isAllZeroToday = netSales === 0 && laborHours === 0 && ordersCount === 0;

    // Query last 3 days of daily_metrics for zero-streak detection
    let zeroStreakDays = 0;
    if (netSales === 0) {
      const { data: recentMetrics } = await supabase
        .from('daily_metrics')
        .select('date, net_sales')
        .eq('bar_id', barCode)
        .lt('date', date)
        .order('date', { ascending: false })
        .limit(3);

      if (recentMetrics && recentMetrics.length > 0) {
        zeroStreakDays = 1; // today is zero
        for (const row of recentMetrics) {
          if ((row.net_sales ?? 0) === 0) {
            zeroStreakDays++;
          } else {
            break;
          }
        }
      }
    }

    const hasDataQualityIssue = zeroStreakDays >= 3 || isAllZeroToday;

    if (hasDataQualityIssue) {
      const reasons: string[] = [];
      if (zeroStreakDays >= 3) {
        reasons.push(`net_sales has been $0 for ${zeroStreakDays} consecutive days`);
      }
      if (isAllZeroToday) {
        reasons.push('today has $0 net sales, 0 labor hours, and 0 orders');
      }

      dataQualityWarning = `\n## ⚠️ DATA-QUALITY WARNING\n\nThis venue has a suspected data pipeline failure:\n- ${reasons.join('\n- ')}\n\nThis pattern almost always indicates a data pipeline or integration failure (e.g., incorrect Toast GUID, API auth failure, sync not running, or missing venue configuration) — NOT a real business closure.\n\n**CRITICAL INSTRUCTIONS FOR THIS VENUE:**\n1. Classify ALL zero-metric findings as \`source_type: 'data_quality'\` with severity 'High' (NEVER 'Critical')\n2. Frame every insight as an integration/data pipeline issue, NOT a business performance problem\n3. Recommend checking the data pipeline, Toast configuration, or 7shifts integration — NOT business operations\n4. Do NOT generate business performance insights (revenue drops, labor issues, etc.) from zero values\n5. Generate exactly 1 data-quality insight for this venue, not multiple\n`;

      console.log(`[DATA-QUALITY] Bar ${barCode} flagged: ${reasons.join('; ')}`);
    }

    // ── Partial-zero guardrails: detect sync gaps for specific metrics ──
    const partialZeroWarnings: string[] = [];
    const scheduledHours = metrics.scheduled_hours ?? 0;
    const foodSales = metrics.food_sales ?? 0;
    const bevSales = metrics.bev_sales ?? 0;

    // Scheduled hours = 0 but labor hours exist → 7shifts sync gap
    if (scheduledHours === 0 && laborHours > 0) {
      partialZeroWarnings.push(
        `SYNC GAP: scheduled_hours is 0 but labor_hours is ${laborHours.toFixed(1)}. This is a 7shifts integration gap, NOT a scheduling failure. Do NOT generate any insights about zero scheduled hours, unscheduled labor, or scheduling system failures for this venue.`
      );
      console.log(`[DATA-QUALITY] Bar ${barCode}: scheduled_hours=0 but labor_hours=${laborHours} — 7shifts sync gap`);
    }

    // Food sales = 0 (or < 1% of net sales) but net sales > $500 → category mapping gap
    if (netSales > 500 && foodSales < netSales * 0.01 && bevSales > 0) {
      partialZeroWarnings.push(
        `SYNC GAP: food_sales is $${foodSales.toFixed(0)} but net_sales is $${netSales.toFixed(0)} and bev_sales is $${bevSales.toFixed(0)}. This is a Toast category mapping issue — food items are being misclassified as beverages. Do NOT generate any insights about zero food sales, kitchen closures, food/beverage ratio, or beverage-only operations for this venue.`
      );
      console.log(`[DATA-QUALITY] Bar ${barCode}: food_sales=$${foodSales} vs net_sales=$${netSales} — category mapping gap`);
    }

    // Food + bev differs from net_sales by > 20% → category mapping unreliable
    const totalFoodBev = foodSales + bevSales;
    if (netSales > 500 && totalFoodBev > 0 && Math.abs(totalFoodBev - netSales) / netSales > 0.20) {
      partialZeroWarnings.push(
        `SYNC GAP: food_sales + bev_sales = $${totalFoodBev.toFixed(0)} but net_sales = $${netSales.toFixed(0)} (${Math.round(Math.abs(totalFoodBev - netSales) / netSales * 100)}% discrepancy). Food/beverage classification is unreliable. Do NOT generate insights based on food vs beverage breakdown for this venue.`
      );
      console.log(`[DATA-QUALITY] Bar ${barCode}: food+bev=$${totalFoodBev} vs net=$${netSales} — classification mismatch`);
    }

    // Cross-source: Toast has sales but labor_hours = 0 → labor sync gap
    if (netSales > 500 && laborHours === 0) {
      partialZeroWarnings.push(
        `SYNC GAP: net_sales is $${netSales.toFixed(0)} but labor_hours is 0. This is a Toast/7shifts labor data sync failure — the venue clearly operated but labor data is missing. Do NOT generate any insights about labor %, SPLH, labor cost, staffing efficiency, or labor-to-sales ratio for this venue.`
      );
      console.log(`[DATA-QUALITY] Bar ${barCode}: net_sales=$${netSales} but labor_hours=0 — labor sync gap`);
    }

    // Bev sales = $0 with meaningful net sales and food sales → bev category mapping gap
    if (netSales > 500 && bevSales === 0 && foodSales > 0) {
      partialZeroWarnings.push(
        `SYNC GAP: bev_sales is $0 but net_sales is $${netSales.toFixed(0)} and food_sales is $${foodSales.toFixed(0)}. This is a Toast category mapping issue — beverage items may be misclassified. Do NOT generate any insights about zero beverage sales, beverage performance, pour cost, drink mix, or food/beverage ratio for this venue.`
      );
      console.log(`[DATA-QUALITY] Bar ${barCode}: bev_sales=$0 vs net_sales=$${netSales} — bev category mapping gap`);
    }

    // Venue context already added above — just add data-quality warnings and metrics

    // Prepend data-quality warning before metrics context if applicable
    if (dataQualityWarning) {
      contextSections.push(dataQualityWarning);
    }
    if (partialZeroWarnings.length > 0) {
      contextSections.push(`\n## ⚠️ PARTIAL DATA SYNC GAPS — CONSERVATIVE GUARDRAIL\n\nThe following metrics have known sync/classification issues. You MUST NOT generate insights about these topics:\n\n${partialZeroWarnings.map(w => `- ${w}`).join('\n')}\n\nAny insight touching these metrics will be incorrect and misleading. Skip them entirely.\n`);
    }
    contextSections.push(buildMetricsContext(metrics, targets));
    contextSections.push(buildReferenceTable(metrics, targets));
    sourcesUsed.add('toast');
  }

  const merged = mergeLogSections(gmLogs, leadLogs, shiftLogs);
  if (isDaily) {
    contextSections.push(...merged.sections);
    merged.sourcesUsed.forEach(s => sourcesUsed.add(s));
  }

  // ── Author exclusion set (Problem 1): resolve every detected log author to a
  // roster employee_id so we can skip them in subject/witness tagging downstream.
  const authorEmployeeIds = new Set<string>();
  for (const rawAuthor of merged.authorNames) {
    const needle = normalizeForMatch(rawAuthor);
    if (!needle) continue;
    let match = employeeRoster.find((e) => e.tokens.some((t) => normalizeForMatch(t) === needle));
    if (!match) {
      const firstTok = needle.split(/\s+/)[0];
      match = employeeRoster.find((e) =>
        e.tokens.some((t) => normalizeForMatch(t).split(/\s+/)[0] === firstTok),
      );
    }
    if (match) authorEmployeeIds.add(match.id);
  }
  if (authorEmployeeIds.size > 0) {
    console.log(`[AUTHOR-EXCLUSION] Bar ${barId}: excluding ${authorEmployeeIds.size} author(s) from subject/witness tagging`);
  }

  // Fetch 7shifts Log Book & Tasks (graceful degradation)
  if (sevenShiftsEnabled) {
    const sevenShiftsToken = Deno.env.get('SEVEN_SHIFTS_ACCESS_TOKEN');
    if (sevenShiftsToken) {
      try {
        const companyId = await get7shiftsCompanyId(sevenShiftsToken);

        const venueTz2 = barRow?.timezone || 'America/Los_Angeles';
        const fetches: Promise<unknown>[] = [
          sevenShiftsFetch(`/company/${companyId}/task_list_daily_summary?location_id=${sevenShiftsLocationId}&date=${date}`, sevenShiftsToken)
            .catch(err => { console.warn('7shifts task_list_daily_summary failed:', err.message); return null; }),
          sevenShiftsFetch(`/company/${companyId}/shift_feedback?location_id=${sevenShiftsLocationId}&start_date=${date}&end_date=${date}`, sevenShiftsToken)
            .catch(err => { console.warn('7shifts shift_feedback failed:', err.message); return null; }),
          sevenShiftsFetch(`/company/${companyId}/users?status=active&location_id=${sevenShiftsLocationId}`, sevenShiftsToken)
            .catch(err => { console.warn('7shifts users fetch failed:', err.message); return null; }),
        ];

        const results = await Promise.allSettled(fetches);
        const taskSummaryResult = results[0];
        const shiftFeedbackResult = results[1];
        const usersResult = results[2];

        const userNameMap = new Map<number, string>();
        if (usersResult.status === 'fulfilled' && usersResult.value) {
          const users = ((usersResult.value as Record<string, unknown>)?.data || []) as Record<string, unknown>[];
          for (const u of users) {
            const uid = u.id as number;
            const firstName = (u.preferred_first_name || u.first_name || '') as string;
            const lastName = (u.preferred_last_name || u.last_name || '') as string;
            if (uid) userNameMap.set(uid, `${firstName} ${lastName}`.trim());
          }
          console.log(`[7SHIFTS] Loaded ${userNameMap.size} user names for name resolution`);

          // Build active employee roster for AI context
          if (userNameMap.size > 0) {
            const rosterLines = ['## ACTIVE EMPLOYEE ROSTER (from 7shifts)'];
            rosterLines.push('The following employees are currently active at this venue:');
            for (const [, name] of userNameMap) {
              rosterLines.push(`- ${name}`);
            }
            rosterLines.push('');
            rosterLines.push('WARNING: If a name appears in log data but is NOT on this roster, that person no longer works here. Do NOT generate insights about them — ignore references to non-roster employees entirely.');
            contextSections.push(rosterLines.join('\n'));
          }
        }

        if (taskSummaryResult.status === 'fulfilled' && taskSummaryResult.value) {
          const summaryData = taskSummaryResult.value as Record<string, unknown>;
          const taskListSummaries = ((summaryData?.data as Record<string, unknown>)?.task_lists || []) as Record<string, unknown>[];

          if (taskListSummaries.length > 0) {
            const incompleteLists = taskListSummaries.filter(
              (l: any) => l.total_tasks > 0 && l.total_tasks_completed < l.total_tasks
            );

            let detailedLists: Record<string, unknown>[] = [];
            if (incompleteLists.length > 0) {
              const detailFetches = incompleteLists.map((list: any) =>
                sevenShiftsFetch(
                  `/company/${companyId}/task_lists/${list.id}?naive_date=${date}&location_timezone=${encodeURIComponent(venueTz2)}`,
                  sevenShiftsToken
                ).catch(err => {
                  console.warn(`7shifts task_list detail ${list.id} failed:`, err.message);
                  return null;
                })
              );
              const detailResults = await Promise.allSettled(detailFetches);
              for (const dr of detailResults) {
                if (dr.status === 'fulfilled' && dr.value) {
                  const listDetail = (dr.value as Record<string, unknown>)?.data as Record<string, unknown>;
                  if (listDetail) detailedLists.push(listDetail);
                }
              }
              console.log(`[7SHIFTS] Fetched ${detailedLists.length} detailed task lists for incomplete checklists`);
            }

            if (isDaily) {
              const taskContext = build7shiftsTaskContext(taskListSummaries, detailedLists.length > 0 ? detailedLists : undefined);
              if (taskContext) {
                contextSections.push(taskContext);
                sourcesUsed.add('seven_shifts_tasks');
              }
            }

            try {
              const taskSummaryText = taskListSummaries.map((list: any) => {
                const total = list.total_tasks || 0;
                const completed = list.total_tasks_completed || 0;
                const pct = list.completion_percentage || 0;
                return `${list.title}: ${completed}/${total} (${pct}%)`;
              }).join('\n');

              if (taskSummaryText) {
                const { error: upsertErr } = await supabase
                  .from('shift_logs')
                  .upsert({
                    bar_id: barId, venue_id: barId,
                    date: date,
                    shift: 'ALL',
                    source: '7shifts_tasks',
                    shift_summary: taskSummaryText,
                    is_processed: false,
                    is_draft: false,
                    raw_text: taskSummaryText,
                  }, { onConflict: 'bar_id,date,source' });

                if (upsertErr) {
                  console.warn(`Failed to persist 7shifts tasks for bar ${barId}:`, upsertErr.message);
                } else {
                  console.log(`Persisted 7shifts task summary for bar ${barId} on ${date}`);
                }
              }
            } catch (persistErr) {
              console.warn('Failed to persist 7shifts tasks (continuing):', persistErr);
            }
          }
        } else if (taskSummaryResult.status === 'rejected') {
          console.warn('7shifts task summary fetch failed:', taskSummaryResult.reason);
        }

        if (shiftFeedbackResult.status === 'fulfilled' && shiftFeedbackResult.value) {
          const feedbackData = shiftFeedbackResult.value as Record<string, unknown>;
          const feedbackEntries = ((feedbackData?.data || []) as Record<string, unknown>[])
            .filter((f: any) => !f.dismissed);

          if (feedbackEntries.length > 0) {
            console.log(`[7SHIFTS] ${feedbackEntries.length} shift feedback entries for ${barCode}/${date}`);

            const mappedFeedback = feedbackEntries.map((f: any) => ({
              rating: f.rating as number,
              comment: (f.comments || '') as string,
              employee_name: userNameMap.get(f.user_id) || `Employee #${f.user_id}`,
              shift_start: (f.start || '') as string,
              shift_end: (f.end || '') as string,
              user_id: f.user_id as number,
              shift_id: f.shift_id as number,
              seven_shifts_id: f.id as number,
              location_id: f.location_id as number,
            }));

            if (isDaily) {
              const feedbackContext = build7shiftsShiftFeedbackContext(mappedFeedback);
              if (feedbackContext) {
                contextSections.push(feedbackContext);
                sourcesUsed.add('seven_shifts_feedback');
              }
            }

            try {
              for (const fb of mappedFeedback) {
                const { error: fbErr } = await supabase
                  .from('shift_feedback')
                  .upsert({
                    bar_id: barId, venue_id: barId,
                    feedback_date: date,
                    employee_name: fb.employee_name,
                    employee_id: fb.user_id,
                    rating: fb.rating,
                    comment: fb.comment || null,
                    shift_id: fb.shift_id,
                    seven_shifts_id: fb.seven_shifts_id,
                    shift_start: fb.shift_start || null,
                    shift_end: fb.shift_end || null,
                    location_id: fb.location_id,
                  }, { onConflict: 'bar_id,seven_shifts_id' });

                if (fbErr) {
                  console.warn(`Failed to persist shift feedback ${fb.seven_shifts_id}:`, fbErr.message);
                }
              }
              console.log(`Persisted ${mappedFeedback.length} shift feedback entries for bar ${barId}`);
            } catch (persistErr) {
              console.warn('Failed to persist shift feedback (continuing):', persistErr);
            }
          }
        } else if (shiftFeedbackResult.status === 'rejected') {
          console.warn('7shifts shift feedback fetch failed:', shiftFeedbackResult.reason);
        }
      } catch (err) {
        console.warn('7shifts data fetch failed (continuing without it):', err instanceof Error ? err.message : err);
      }
    } else {
      console.warn('7shifts enabled for venue but SEVEN_SHIFTS_ACCESS_TOKEN not configured');
    }
  } else {
    const apiEnabled = barRow?.seven_shifts_api_enabled;
    const locationId = barRow?.seven_shifts_location_id;
    console.warn(`[7SHIFTS] Skipped for ${barCode}: api_enabled=${apiEnabled}, location_id=${locationId || 'null'}`);
  }

  // Fetch inventory data (Sculpture Hospitality) — weekly mode only.
  // Decoupled from the scoring week: always grab the freshest count per venue (+3 priors for trailing-trend
  // detection). Period overlap is computed in the context builder so the AI sees explicit alignment data.
  const inventoryReports = !isDaily ? ((inventoryReportRes as any).data as Record<string, unknown>[] | null) : null;
  if (inventoryReports && inventoryReports.length > 0) {
    // Fetch items for all reports in parallel
    const itemFetches = inventoryReports.map(r =>
      supabase.from('inventory_items').select('*').eq('report_id', r.id as string).order('missing_cost', { ascending: true })
    );
    const itemResults = await Promise.all(itemFetches);
    const reportsWithItems = inventoryReports
      .map((report, idx) => ({
        report,
        items: ((itemResults[idx] as any).data || []) as Record<string, unknown>[],
      }))
      .filter(r => r.items.length > 0);

    if (reportsWithItems.length > 0) {
      // In weekly mode, the scoring week is Mon–Sun ending on `date` (which is week_end / Sunday).
      const scoringWeekEnd = date;
      const scoringWeekStart = (() => {
        const d = new Date(date + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() - 6);
        return d.toISOString().slice(0, 10);
      })();
      const ctx = buildInventoryContext(reportsWithItems, scoringWeekStart, scoringWeekEnd);
      if (ctx) {
        contextSections.push(ctx);
        sourcesUsed.add('inventory');
      }
    }
  }

  // ── Extended Sculpture data sources (weekly mode only) ──
  // Drink Mix, Summary Variance, InteliPar, Cost Fluctuation, Station Stock.
  // Fetched per the most recent inventory report's period when one exists,
  // else a 30-day trailing window ending on `date`. All gracefully skip when empty.
  if (!isDaily) {
    let scPeriodStart: string;
    let scPeriodEnd: string;
    if (inventoryReports && inventoryReports.length > 0) {
      scPeriodStart = String((inventoryReports[0] as any).period_start);
      scPeriodEnd = String((inventoryReports[0] as any).period_end);
    } else {
      const d = new Date(date + 'T12:00:00Z');
      const start = new Date(d);
      start.setUTCDate(d.getUTCDate() - 30);
      scPeriodStart = start.toISOString().slice(0, 10);
      scPeriodEnd = date;
    }
    const periodLabel = `${scPeriodStart} to ${scPeriodEnd}`;
    const cost90 = (() => {
      const d = new Date(date + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - 90);
      return d.toISOString().slice(0, 10);
    })();

    const [dmRes, svRes, ipRes, chRes, ssRes] = await Promise.all([
      supabase.from('drink_mix_items').select('*')
        .eq('venue_id', barId).gte('period_start', scPeriodStart).lte('period_end', scPeriodEnd)
        .gt('qty_sold', 0).order('qty_sold', { ascending: false }).limit(200),
      supabase.from('inventory_summary_variance').select('*')
        .eq('venue_id', barId).gte('period_start', scPeriodStart).lte('period_end', scPeriodEnd),
      supabase.from('inventory_intelipar').select('*')
        .eq('venue_id', barId).gte('period_start', scPeriodStart).lte('period_end', scPeriodEnd),
      supabase.from('inventory_cost_history').select('*')
        .eq('venue_id', barId).gte('invoice_date', cost90).order('invoice_date', { ascending: false }),
      supabase.from('inventory_station_stock').select('*')
        .eq('venue_id', barId).gte('period_start', scPeriodStart).lte('period_end', scPeriodEnd),
    ]);

    const dmRows = ((dmRes as any).data || []) as Record<string, unknown>[];
    const svRows = ((svRes as any).data || []) as Record<string, unknown>[];
    const ipRows = ((ipRes as any).data || []) as Record<string, unknown>[];
    const chRows = ((chRes as any).data || []) as Record<string, unknown>[];
    const ssRows = ((ssRes as any).data || []) as Record<string, unknown>[];

    const sections = [
      { key: 'sculpture_summary_variance', text: buildSummaryVarianceContext(svRows, periodLabel) },
      { key: 'sculpture_drink_mix', text: buildDrinkMixContext(dmRows, periodLabel) },
      { key: 'sculpture_intelipar', text: buildInteliparContext(ipRows, periodLabel) },
      { key: 'sculpture_cost_history', text: buildCostFluctuationContext(chRows) },
      { key: 'sculpture_station_stock', text: buildStationStockContext(ssRows, periodLabel) },
    ];

    // Context budget guard — drop lowest-priority sections if combined size exceeds budget.
    // Order = drop priority (last item dropped first per spec: station_stock → cost_history → intelipar → drink_mix; summary_variance kept).
    const dropOrder = ['sculpture_station_stock', 'sculpture_cost_history', 'sculpture_intelipar', 'sculpture_drink_mix'];
    let totalChars = contextSections.reduce((acc, s) => acc + s.length, 0)
      + sections.reduce((acc, s) => acc + s.text.length, 0);
    const BUDGET = 80_000;
    const dropped: string[] = [];
    for (const dropKey of dropOrder) {
      if (totalChars <= BUDGET) break;
      const idx = sections.findIndex(s => s.key === dropKey && s.text);
      if (idx >= 0) {
        totalChars -= sections[idx].text.length;
        dropped.push(dropKey);
        sections[idx].text = '';
      }
    }

    const counts: Record<string, number> = {
      drink_mix: dmRows.length,
      summary_variance: svRows.length,
      intelipar: ipRows.length,
      cost_history: chRows.length,
      station_stock: ssRows.length,
    };
    console.log(`[SCULPTURE-CTX] bar=${barCode} period=${periodLabel} sources=${JSON.stringify(counts)} dropped=${JSON.stringify(dropped)}`);

    for (const s of sections) {
      if (s.text) {
        contextSections.push(s.text);
        sourcesUsed.add(s.key);
      }
    }
  }


  // Substantive-content guard: not just any non-empty section.
  // Skip when no source carries actual operational signal:
  //   - venue header is non-substantive by definition (index 0)
  //   - 7shifts task placeholders (no incomplete tasks listed) are non-substantive
  //   - any section under ~200 chars is treated as filler
  // This closes the loophole where a placeholder 7shifts_tasks row defeats the
  // length>1 check and lets the AI invent a "no operational data" insight.
  const SUBSTANTIVE_MIN_CHARS = 200;
  const substantiveSections = contextSections.filter((s, idx) => {
    if (idx === 0) return false; // venue context header
    if (!s || s.length < SUBSTANTIVE_MIN_CHARS) return false;
    // 7SHIFTS TASKS section: substantive if it contains the live-API ❌ marker,
    // an "Incomplete tasks" callout, OR (persisted shift_logs format) any
    // fraction `\d+/\d+` where numerator < denominator — i.e. a list below
    // 100%. A section where every list is at 100% truly is "nothing wrong".
    if (s.startsWith('## 7SHIFTS TASKS')) {
      if (s.includes('❌') || s.includes('Incomplete tasks')) return true;
      const fractionRe = /(\d+)\s*\/\s*(\d+)/g;
      let m: RegExpExecArray | null;
      while ((m = fractionRe.exec(s)) !== null) {
        const num = Number(m[1]); const den = Number(m[2]);
        if (Number.isFinite(num) && Number.isFinite(den) && den > 0 && num < den) {
          return true;
        }
      }
      return false;
    }
    return true;
  });
  if (substantiveSections.length === 0) {
    console.log(`[SKIP] no substantive sources for ${barId}/${date} (sections=${contextSections.length}, sources=${[...sourcesUsed].join(',')})`);
    return { insights_created: 0, actions_created: 0, sources_used: [...sourcesUsed] };
  }

  // [A12 REMOVED 2026-05-16] 7shifts logbook word-overlap dedup deleted.
  // Was a strict subset of A13 (cross-day semantic Jaccard dedup, below at
  // lines ~3213-3220). The cross-day check now handles repeated logbook
  // narrative across days via title+summary similarity scoring.

  console.log(`[${mode.toUpperCase()}] Bar ${barId} on ${date}: ${contextSections.length} context sections, sources: ${[...sourcesUsed].join(', ')}`);

  // Resolve week_id for this bar/date — create the weeks row if it doesn't exist yet
  let weekId: string | null = null;
  {
    const { data: weekRow } = await supabase
      .from('weeks')
      .select('id')
      .eq('bar_id', barId)
      .lte('week_start', date)
      .gte('week_end', date)
      .maybeSingle();
    if (weekRow) {
      weekId = weekRow.id;
      console.log(`Resolved week_id=${weekId} for bar ${barId} date ${date}`);
    } else {
      // No weeks row yet — create one so insights always have a valid week_id
      const d = new Date(date + 'T12:00:00Z');
      const dayOfWeek = d.getDay(); // 0=Sun
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (dt: Date) => dt.toISOString().slice(0, 10);

      const weekIdText = `${barId.slice(0, 8)}-${fmt(monday)}`;
      const { data: newWeek, error: weekErr } = await supabase
        .from('weeks')
        .upsert(
          { bar_id: barId, week_id: weekIdText, week_start: fmt(monday), week_end: fmt(sunday) },
          { onConflict: 'bar_id,week_start' }
        )
        .select('id')
        .single();
      if (newWeek) {
        weekId = newWeek.id;
        console.log(`Created new weeks row week_id=${weekId} for bar ${barId} (${fmt(monday)} – ${fmt(sunday)})`);
      } else {
        console.warn(`Failed to create weeks row for bar ${barId} date ${date}: ${weekErr?.message}`);
      }
    }
  }

  // ── Run deterministic alert triggers BEFORE AI call ──
  const detResult = await runDeterministicTriggers(supabase, barId, barCode, venueName, date, weekId, mode);

  // Labor compliance alerts already ran in the pre-skip block above for this
  // path — no need to invoke again here. (Score-driven branch invokes them
  // separately because it bypasses the pre-skip gate.)

  if (detResult.count > 0) {
    console.log(`[DET-TRIGGER] Created ${detResult.count} deterministic insights for ${venueName}`);
    // Add context to AI prompt so it doesn't duplicate these alerts
    const detContext = ['## DETERMINISTIC ALERTS ALREADY GENERATED', 'The following alerts have already been created by the system. Do NOT generate duplicate insights for these topics:'];
    for (const ins of detResult.inserted) {
      detContext.push(`- [${ins.pillar}/${ins.severity}] ${ins.title}`);
    }
    contextSections.push(detContext.join('\n'));
  }

  // Call AI with mode-appropriate system prompt
  const systemPrompt = isDaily ? DAILY_SYSTEM_PROMPT : SYSTEM_PROMPT;

  // ── Inject employee roster + tagging instruction so the AI can identify staff ──
  if (employeeRoster.length > 0) {
    const rosterLines = employeeRoster
      .map((e) => `- ${e.canonical}`)
      .slice(0, 200) // safety cap
      .join('\n');
    contextSections.push(
      [
        '## EMPLOYEE ROSTER (for tagging)',
        'When an insight names one or more of these employees (subject of recognition, person who praised, person involved), include them in the `employee_mentions` array of that insight using EXACTLY their name as it appears below.',
        'Format: "employee_mentions": [{ "name": "Rosie", "role": "subject" }, { "name": "Michael Blossom", "role": "subject" }, { "name": "Shannon", "role": "recognizer" }].',
        'Roles: "subject" (the person the insight is about / being recognized / involved in the issue), "recognizer" (the person giving praise), "witness" (incidentally mentioned).',
        'NEVER invent names not in this list. NEVER guess. If unsure, omit. An empty array is acceptable.',
        '',
        rosterLines,
      ].join('\n')
    );
  }

  // Call AI
  let aiInsights = await callAI(contextSections, date, systemPrompt, barId);
  console.log(`AI generated ${aiInsights.length} insights for bar ${barId} (mode=${mode})`);

  // Post-processing — overwrite source_value and preserve readable source_context with verified data
  if (metrics) {
    aiInsights = validateAndFixSourceData(aiInsights, metrics, targets, date);
    console.log('Post-processing: source_value verified and source_context preserved with human-readable sources');
  }

  // Post-processing: fix bad source_type values
  const BAD_SOURCE_TYPES = new Set(['daily_metrics', 'weekly_core', 'scorecard', 'shift_logs', 'weekly_analysis', 'insights', 'action_items', 'data', 'system', 'weekly_core_computed', 'period_config']);
  for (const ins of aiInsights) {
    const st = (ins.source_type || '').toLowerCase().trim();
    if (BAD_SOURCE_TYPES.has(st) || !ins.source_type || ins.source_type.length < 5) {
      const metric = (ins.source_metric || '').toLowerCase();
      let systemName = 'BarPulse Logs';
      if (/sales|revenue|labor|tip|void|comp|discount|splh|overtime|check|guest|order|transaction/.test(metric)) {
        systemName = 'Toast POS';
      } else if (/task|checklist|completion/.test(metric)) {
        systemName = '7shifts Task Summary';
      } else if (/schedule|shift_feedback|feedback/.test(metric)) {
        systemName = '7shifts';
      } else if (/inventory|pour|variance/.test(metric)) {
        systemName = 'Sculpture Hospitality';
      }
      const oldSourceType = ins.source_type;
      ins.source_type = `${systemName} — ${venueName} — ${ins.source_date || date}`;
      if (oldSourceType) console.log(`[SOURCE-FIX] Replaced bad source_type "${oldSourceType}" → "${ins.source_type}"`);
    } else if (ins.source_type && !ins.source_type.includes(venueName)) {
      // Ensure venue name is present
      ins.source_type = `${ins.source_type} — ${venueName}`;
    }
  }

  // Post-processing: validate source_date falls within analysis period
  for (const ins of aiInsights) {
    if (ins.source_date && ins.source_date !== date) {
      // For daily mode, source_date should match the analysis date
      // For weekly mode, allow dates within a reasonable range
      const sourceD = new Date(ins.source_date + 'T00:00:00Z');
      const analysisD = new Date(date + 'T00:00:00Z');
      const diffDays = Math.abs((sourceD.getTime() - analysisD.getTime()) / 86400000);
      if (mode === 'daily' && diffDays > 1) {
        console.warn(`[DATE-FIX] Insight "${ins.title}" had source_date=${ins.source_date} outside daily analysis date ${date} — overwriting`);
        ins.source_date = date;
      } else if (mode === 'weekly' && diffDays > 14) {
        console.warn(`[DATE-FIX] Insight "${ins.title}" had source_date=${ins.source_date} too far from analysis date ${date} — overwriting`);
        ins.source_date = date;
      }
    }
  }

  // Post-processing: force positive insight types to Info severity
  const POSITIVE_TYPES = new Set(['win', 'staff recognition', 'recognition', 'positive']);
  for (const ins of aiInsights) {
    const insType = (ins.insight_type || '').toLowerCase().trim();
    if (POSITIVE_TYPES.has(insType) && ['Critical', 'High', 'Medium'].includes(ins.severity)) {
      console.log(`[SEVERITY-FIX] Insight "${ins.title}" type="${ins.insight_type}" had severity="${ins.severity}" → forcing to "Info"`);
      ins.severity = 'Info';
    }
  }

  let insightsCreated = detResult.count;
  let actionsCreated = 0;

  // A17/G2 passive/soft-movement filters now live in shared/insight-visibility.ts.
  // We call shouldShowInFeed(..., { combinedText, insight_mode: 'weekly' }) below
  // so any future change to the regex bank flows to all surfaces.


  // ── Cross-day semantic dedup: fetch recent active insights for this bar ──
  const DEDUP_STOPWORDS = new Set([
    'the','to','and','a','an','is','was','were','are','be','been','being','in','on',
    'at','for','of','with','by','from','this','that','it','its','has','had','have',
    'not','but','or','so','if','as','up','out','no','do','did','does','vs','than',
    'gm','unknown','during','while','after','before','into','about','over','also',
    'more','very','just','will','can','should','would','could','may','need','new',
    'making','creating','causing','affecting','impacting','resulting','including',
  ]);
  // Domain-specific entity keywords that strongly signal topic identity
  const ENTITY_KEYWORDS = new Set([
    'roach','roaches','pest','rodent','mice','rat',
    'bathroom','restroom','comic','decor',
    'checklist','task','tasks','completion',
    'supply','supplies','shortage','inventory','stock',
    'cash','bank','register','drawer',
    'void','voids','comp','comps','discount',
    'overtime','scheduling','schedule',
    'menu','knowledge','training',
    'maintenance','repair','broken','leak',
  ]);

  function extractWords(text: string): string[] {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter(w => w.length > 2 && !DEDUP_STOPWORDS.has(w));
  }

  function extractEntities(words: string[]): string[] {
    return words.filter(w => ENTITY_KEYWORDS.has(w));
  }

  function jaccardSimilarity(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = a.filter(w => setB.has(w)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  // Dedup thresholds: daily mode is less aggressive to allow recurring topic updates
  const JACCARD_THRESHOLD = isDaily ? 0.65 : 0.45;
  const ENTITY_MATCH_THRESHOLD = isDaily ? 4 : 3;

  function isDuplicate(newWords: string[], existingWords: string[]): boolean {
    // Primary: Jaccard similarity check
    if (jaccardSimilarity(newWords, existingWords) >= JACCARD_THRESHOLD) return true;
    // Secondary: shared entity keywords
    const newEntities = extractEntities(newWords);
    const existingEntities = extractEntities(existingWords);
    if (newEntities.length > 0 && existingEntities.length > 0) {
      const sharedEntities = newEntities.filter(e => existingEntities.includes(e));
      if (sharedEntities.length >= ENTITY_MATCH_THRESHOLD) return true;
    }
    return false;
  }

  // Daily mode: only dedup against last 3 days (not 14) to allow recurring topic updates
  const dedupDays = isDaily ? 3 : 14;
  const dedupCutoff = new Date(Date.now() - dedupDays * 86400000).toISOString().slice(0, 10);
  const { data: recentInsights } = await supabase
    .from('insights')
    .select('title, summary')
    .eq('bar_id', barId)
    .gte('source_date', dedupCutoff)
    .neq('source_date', date) // Don't dedup against same-day insights from deterministic triggers
    .not('status', 'in', '("Consolidated","Dismissed")')
    .limit(200);
  const recentTitleWords = (recentInsights || []).map((r: any) => {
    const combined = `${r.title || ''} ${r.summary || ''}`;
    return extractWords(combined);
  });
  console.log(`[DEDUP] Bar ${barId} mode=${mode}: ${recentTitleWords.length} recent insights loaded for dedup (cutoff=${dedupCutoff}, threshold=${JACCARD_THRESHOLD})`);
  let dedupSkipped = 0;

  // ── Source-log provenance resolver ──
  // Maps an AI-generated insight back to a specific log row id by matching
  // (source_date, source_type family) against the logs we passed into the prompt.
  // Conservative: returns null if zero or multiple candidates match.
  //
  // [A18 EXTRACTED 2026-05-16] resolveSourceLogId + familyForSourceType moved
  // to _shared/source-attribution.ts. Behavior unchanged.
  const allCandidateLogs: CandidateLog[] = [
    ...gmLogs.map((l: any) => ({ id: String(l.id || ''), date: String(l.date || ''), family: 'barpulse' as const })),
    ...leadLogs.map((l: any) => ({ id: String(l.id || ''), date: String(l.date || ''), family: 'barpulse' as const })),
    ...shiftLogs.map((l: any) => {
      const src = String(l.source || '');
      let family: CandidateLog['family'] = 'barpulse';
      if (src === 'asana_project') family = 'asana';
      else if (src === '7shifts_tasks') family = '7shifts_tasks';
      else if (src === '7shifts_logbook') family = '7shifts_logbook';
      return { id: String(l.id || ''), date: String(l.date || ''), family };
    }),
  ].filter((l) => l.id);
  const resolveCtx = buildResolveContext(allCandidateLogs);
  // Lookup sets so we can derive source_log_type from a resolved id (which
  // table the id actually lives in). resolveSourceLogId only returns ids that
  // came from allCandidateLogs, so a hit in one of these sets is guaranteed
  // when resolvedSourceLogId is non-null; we still fall through to null
  // defensively rather than guess a type.
  const gmLogIds = new Set(gmLogs.map((l: any) => String(l.id || '')).filter(Boolean));
  const leadLogIds = new Set(leadLogs.map((l: any) => String(l.id || '')).filter(Boolean));
  const shiftLogIds = new Set(shiftLogs.map((l: any) => String(l.id || '')).filter(Boolean));
  let provenanceResolved = 0;
  let provenanceAiProvided = 0;
  let provenanceTotal = 0;

  // ── DAILY-REPLACE: delete-and-replace existing daily_insights_v2 rows ──
  // AI output is non-deterministic in wording and granularity — title-hash
  // dedupe couldn't cover it. Instead, before inserting the freshly generated
  // batch we delete all prior daily_insights_v2 rows for (barId, date) that
  // are status='New' AND have no operator engagement on their linked action.
  // Preserve: status != 'New' (Dismissed/Acknowledged/Resolved) OR action_item
  // with approval_status IN ('Approved','Rejected') OR status IN ('In Progress',
  // 'Completed') OR asana_task_gid IS NOT NULL.
  // Only runs when AI returned at least one insight — never leaves a venue/day empty.
  if (aiInsights.length > 0) {
    try {
      const { data: existingRows } = await supabase
        .from('insights')
        .select('id, status')
        .eq('bar_id', barId)
        .eq('source_date', date)
        .eq('generated_by', 'daily_insights_v2');
      const existing = existingRows || [];
      if (existing.length > 0) {
        const allIds = existing.map((r: any) => r.id);
        // Find engaged action_items for these insights
        const { data: engagedActs } = await supabase
          .from('action_items')
          .select('insight_id, approval_status, status, asana_task_gid')
          .in('insight_id', allIds);
        const engagedInsightIds = new Set<string>();
        for (const a of (engagedActs || [])) {
          const eng =
            (a.approval_status === 'Approved' || a.approval_status === 'Rejected') ||
            (a.status === 'In Progress' || a.status === 'Completed') ||
            !!a.asana_task_gid;
          if (eng) engagedInsightIds.add(a.insight_id);
        }
        const preserveIds = new Set<string>();
        for (const r of existing) {
          if (r.status !== 'New' || engagedInsightIds.has(r.id)) preserveIds.add(r.id);
        }
        const deleteIds = allIds.filter((id: string) => !preserveIds.has(id));
        if (deleteIds.length > 0) {
          // Delete paired Proposed action_items first (no ON DELETE CASCADE on FK).
          // Engaged actions stay because their insight is in preserveIds.
          const { error: aErr } = await supabase
            .from('action_items')
            .delete()
            .in('insight_id', deleteIds);
          if (aErr) console.warn(`[DAILY-REPLACE] action_items delete warn: ${aErr.message}`);
          // Drop employee tag rows so they don't dangle (no FK cascade).
          await supabase.from('insight_employees').delete().in('insight_id', deleteIds);
          const { error: iErr } = await supabase.from('insights').delete().in('id', deleteIds);
          if (iErr) console.error(`[DAILY-REPLACE] insights delete error: ${iErr.message}`);
        }
        console.log(`[DAILY-REPLACE] bar=${barId} date=${date} existing=${existing.length} preserved=${preserveIds.size} deleted=${deleteIds.length}`);
      } else {
        console.log(`[DAILY-REPLACE] bar=${barId} date=${date} existing=0 (no-op)`);
      }
    } catch (e: any) {
      console.warn(`[DAILY-REPLACE] crashed for ${barId} ${date}: ${e?.message || e}`);
    }
  }

  let filteredCount = 0;
  for (const ins of aiInsights) {
    const sourceDate = mode === 'weekly' ? date : (ins.source_date || ins.date || date);
    const sourceContext = ins.source_context || null;

    // ── Normalize field names for AI format drift ──
    // Title: AI may return "problem" instead of "title"
    if (!ins.title && ins.problem) ins.title = ins.problem;
    // Summary: AI may return "evidence", "detail", or "description" instead of "summary"
    if (!ins.summary && ins.evidence) ins.summary = ins.evidence;
    if (!ins.summary && ins.detail) ins.summary = ins.detail;
    if (!ins.summary && ins.description) ins.summary = ins.description;
    // Detail: fallback from impact
    if (!ins.detail && ins.impact) ins.detail = ins.impact;
    if (!ins.detail && ins.summary) ins.detail = ins.summary;
    // insight_type: AI may return "type"
    if (!ins.insight_type && ins.type) ins.insight_type = ins.type;
    // source_type: AI may return as-is or not at all
    if (!ins.source_type && ins.source) ins.source_type = ins.source;

    // Normalize suggested_action: could be a string, an object, or under alternate keys
    if (!ins.suggested_action && (ins.action || ins.recommended_action)) {
      ins.suggested_action = ins.action || ins.recommended_action;
    }
    // If suggested_action is a plain string, wrap it as {title, detail}
    if (typeof ins.suggested_action === 'string') {
      const actionText = ins.suggested_action;
      // Split on first sentence or use full text as title
      const firstSentence = actionText.match(/^[^.!]+[.!]?\s*/)?.[0]?.trim() || actionText;
      ins.suggested_action = {
        title: firstSentence,
        detail: actionText,
      };
    }

    const sa: any = ins.suggested_action;
    const actionTitle = String(sa?.title || '');
    const actionDetail = String(sa?.detail || sa?.description || '');
    const combined = `${ins.title || ''}\n${ins.summary || ''}\n${ins.detail || ''}\n${actionTitle}\n${actionDetail}`;

    if (!ins.title?.trim() || !ins.summary?.trim()) {
      filteredCount++;
      if (filteredCount === 1) console.warn(`[FILTER] Insight missing title/summary. Keys: ${JSON.stringify(Object.keys(ins))}`);
      continue;
    }
    if (!ins.suggested_action || !actionTitle.trim() || !actionDetail.trim()) {
      filteredCount++;
      if (filteredCount === 1) console.warn(`[FILTER] Insight "${ins.title}" missing action. suggested_action keys: ${JSON.stringify(ins.suggested_action ? Object.keys(ins.suggested_action) : 'null')}, top-level keys: ${JSON.stringify(Object.keys(ins))}`);
      continue;
    }
    if (mode === 'weekly') {
      const vis = shouldShowInFeed(
        { insight_mode: 'weekly', insight_type: ins.insight_type, source_metric: ins.source_metric, pillar: ins.pillar },
        'main_feed',
        { combinedText: combined },
      );
      if (!vis.show && (vis.reason === 'passive_action_text' || vis.reason === 'soft_movement_text')) continue;
    }

    // ── Cross-day semantic dedup ──
    const newWords = extractWords(`${ins.title} ${ins.summary || ''}`);
    const isDupe = recentTitleWords.some((existing: any) => isDuplicate(newWords, existing));
    if (isDupe) {
      dedupSkipped++;
      console.log(`[DEDUP] Skipping near-duplicate insight: "${ins.title}"`);
      continue;
    }

    // ── Resolve source log provenance ──
    // Prefer AI-cited LOG_ID when it's a valid uuid that came from one of the
    // log sections we actually rendered (resolveCtx.knownIds). Fall back to
    // the deterministic (source_date, source_family) resolver otherwise.
    provenanceTotal++;
    const aiCited = (ins as any).source_log_id;
    let resolvedSourceLogId: string | null = null;
    if (typeof aiCited === 'string' && SOURCE_UUID_RE.test(aiCited) && resolveCtx.knownIds.has(aiCited)) {
      resolvedSourceLogId = aiCited;
      provenanceAiProvided++;
    } else {
      resolvedSourceLogId = resolveSourceLogId(resolveCtx, ins, sourceDate);
      if (resolvedSourceLogId) provenanceResolved++;
    }
    let resolvedSourceLogType: 'gm_log' | 'lead_log' | 'shift_log' | null = null;
    if (resolvedSourceLogId) {
      if (gmLogIds.has(resolvedSourceLogId)) resolvedSourceLogType = 'gm_log';
      else if (leadLogIds.has(resolvedSourceLogId)) resolvedSourceLogType = 'lead_log';
      else if (shiftLogIds.has(resolvedSourceLogId)) resolvedSourceLogType = 'shift_log';
    }

    // daily_insights_v2 uses delete-and-replace (see DAILY-REPLACE block) —
    // no dedupe_hash, no title-hash collisions. AI titles are non-deterministic
    // in wording; the partial unique index idx_insights_dedupe_unique_daily_v2
    // has been dropped (see migration). deterministic_trigger inserts still
    // use dedupe_hash + idx_insights_dedupe_unique_deterministic.

    // Insert insight
    const { data: inserted, error } = await supabase
      .from('insights')
      .insert({
        bar_id: barId, venue_id: barId,
        pillar: ins.pillar || 'Operations',
        insight_type: ins.insight_type || 'Issue',
        severity: ins.severity || 'Medium',
        title: ins.title,
        summary: ins.summary,
        detail: ins.detail,
        source_type: ins.source_type,
        source_date: sourceDate,
        source_metric: ins.source_metric,
        source_value: ins.source_value,
        source_context: sourceContext,
        source_log_type: resolvedSourceLogType,
        source_log_id: resolvedSourceLogId,
        employee_name: ins.employee_name,
        estimated_impact: ins.estimated_impact,
        generated_by: 'daily_insights_v2',
        insight_mode: mode,
        status: 'New',
        week_id: weekId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Insert insight error:', error.message);
      continue;
    }
    insightsCreated++;
    // Push into dedup set so within-batch duplicates are caught
    recentTitleWords.push(extractWords(`${ins.title} ${ins.summary || ''}`));

    // ── Tag insight with all mentioned employees (multi-employee support) ──
    if (inserted?.id && employeeRoster.length > 0) {
      try {
        const mentions: { name: string; role: string }[] = [];
        if (Array.isArray(ins.employee_mentions)) {
          for (const m of ins.employee_mentions) {
            if (m && typeof m.name === 'string') {
              mentions.push({ name: m.name, role: typeof m.role === 'string' ? m.role : 'subject' });
            }
          }
        }
        if (typeof ins.employee_name === 'string' && ins.employee_name.trim()) {
          mentions.push({ name: ins.employee_name, role: 'subject' });
        }
        if (mentions.length === 0) {
          // Haystack fallback — accent-normalize so Spanish names match.
          const haystack = normalizeForMatch(`${ins.title || ''} ${ins.summary || ''} ${ins.detail || ''}`);
          for (const e of employeeRoster) {
            // Skip authors entirely in the fallback path — we have no AI signal
            // saying they were recognized vs just credited as the writer.
            if (authorEmployeeIds.has(e.id)) continue;
            for (const tok of e.tokens) {
              const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              if (tok.length >= 3 && new RegExp(`\\b${escaped}\\b`).test(haystack)) {
                mentions.push({ name: e.canonical, role: 'subject' });
                break;
              }
            }
          }
        }

        const seen = new Set<string>();
        const tagRows: { insight_id: string; employee_id: string; role: string; employee_name: string }[] = [];
        for (const m of mentions) {
          const needle = normalizeForMatch(m.name);
          if (!needle) continue;
          let match = employeeRoster.find((e) => e.tokens.includes(needle));
          if (!match) {
            const firstTok = needle.split(/\s+/)[0];
            match = employeeRoster.find((e) => e.tokens.some((t) => t.split(/\s+/)[0] === firstTok));
          }
          if (!match) continue;
          const role = ['subject', 'witness', 'recognizer'].includes(m.role) ? m.role : 'subject';
          // Author guardrail: drop authors tagged as subject/witness. Recognizers
          // are kept (e.g. "Shannon shouted out Rosie" — Shannon is a legit recognizer).
          if (authorEmployeeIds.has(match.id) && role !== 'recognizer') {
            console.log(`[AUTHOR-EXCLUSION] Insight ${inserted.id}: dropped ${match.canonical} (role=${role})`);
            continue;
          }
          const key = `${match.id}|${role}`;
          if (seen.has(key)) continue;
          seen.add(key);
          tagRows.push({ insight_id: inserted.id, employee_id: match.id, role, employee_name: match.canonical });
        }

        if (tagRows.length > 0) {
          const { error: tagErr } = await supabase.from('insight_employees').insert(tagRows);
          if (tagErr) {
            console.warn(`[TAG] Failed insight ${inserted.id}: ${tagErr.message}`);
          } else {
            console.log(`[TAG] Insight ${inserted.id}: ${tagRows.length} tagged — ${tagRows.map((t) => t.employee_name).join(', ')}`);
            const firstSubject = tagRows.find((t) => t.role === 'subject') || tagRows[0];
            if (firstSubject) {
              await supabase.from('insights').update({
                employee_id: firstSubject.employee_id,
                employee_name: firstSubject.employee_name,
              }).eq('id', inserted.id);
            }
          }
        }
      } catch (tagEx: any) {
        console.warn(`[TAG] Exception ${inserted.id}: ${tagEx?.message || tagEx}`);
      }
    }

    if (inserted?.id) {
      const sa = ins.suggested_action;
      const { error: actionErr } = await supabase
        .from('action_items')
        .insert({
          bar_id: barId, venue_id: barId,
          insight_id: inserted.id,
          title: sa.title,
          detail: sa.detail,
          estimated_minutes: sa.estimated_minutes || 30,
          effort_level: effortLevel(sa.estimated_minutes || 30),
          priority: sa.priority || 'P3-Medium',
          suggested_assignee: sa.suggested_assignee,
          status: 'Not Started',
          approval_status: 'Proposed',
          week_id: weekId,
        });

      if (actionErr) {
        console.error('Insert action error:', actionErr.message);
      } else {
        actionsCreated++;
      }
    }
  }

  if (dedupSkipped > 0) {
    console.log(`[DEDUP] Skipped ${dedupSkipped} near-duplicate insights for bar ${barId}`);
  }
  if (aiInsights.length > 0 && insightsCreated === detResult.count) {
    console.warn(`[FILTER-AUDIT] All ${aiInsights.length} AI-generated insights were filtered out (${filteredCount} failed validation, ${dedupSkipped} deduped). First insight structure: ${JSON.stringify(aiInsights[0], null, 2).substring(0, 1000)}`);
  }
  console.log(`[RESULT] Bar ${barId} date=${date}: AI returned ${aiInsights.length}, filtered=${filteredCount}, deduped=${dedupSkipped}, deterministic=${detResult.count}, saved=${insightsCreated}, actions=${actionsCreated}`);
  const provenanceNone = Math.max(0, provenanceTotal - provenanceAiProvided - provenanceResolved);
  console.log(`[PROVENANCE] Bar ${barId} date=${date}: total=${provenanceTotal} ai_cited=${provenanceAiProvided} resolver=${provenanceResolved} none=${provenanceNone}`);

  // Mark shift_logs as processed
  if (merged.usedShiftLogIds.length > 0) {
    await supabase
      .from('shift_logs')
      .update({ is_processed: true, processed_at: new Date().toISOString() })
      .in('id', merged.usedShiftLogIds);
  }

  return { insights_created: insightsCreated, actions_created: actionsCreated, sources_used: [...sourcesUsed] };
}

// ── Main handler ─────────────────────────────────────────────────────

// Helper: process bars with concurrency limit
async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<unknown>
): Promise<{ item: T; result: unknown; error?: string }[]> {
  const results: { item: T; result: unknown; error?: string }[] = [];
  let idx = 0;

  async function next(): Promise<void> {
    const currentIdx = idx++;
    if (currentIdx >= items.length) return;
    const item = items[currentIdx];
    try {
      const result = await fn(item);
      results.push({ item, result });
    } catch (err) {
      results.push({ item, result: null, error: err instanceof Error ? err.message : 'Unknown error' });
    }
    await next();
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auto-clean stuck sync_runs older than 10 minutes
    await supabase
      .from('sync_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Execution timeout (auto-cleaned)',
      })
      .eq('sync_type', 'daily_insights')
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // Parse request
    let barId: string | null = null;
    let dates: string[] = [];
    let insightMode: 'daily' | 'weekly' = 'daily';
    let weekStartOverride: string | null = null;
    let pass: 'early' | 'fresh' | 'catchup' = 'catchup';

    try {
      const body = await req.json();
      if (body.bar_id) barId = body.bar_id;
      if (body.mode === 'weekly') insightMode = 'weekly';
      if (body.start_date && body.end_date) {
        dates = getDateRange(body.start_date, body.end_date);
      } else if (body.date) {
        dates = [body.date];
      }
      if (typeof body.week_start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.week_start)) {
        weekStartOverride = body.week_start;
      }
      if (body.pass === 'early' || body.pass === 'fresh' || body.pass === 'catchup') {
        pass = body.pass;
      }
    } catch {
      // Use defaults
    }

    // Default date target depends on pass (all three target yesterday or 2-days-ago PT):
    //   - early   pass: yesterday()    — cron 11:30 UTC / 04:30 PT (close-of-night logs)
    //   - fresh   pass: yesterday()    — cron 18:00 UTC / 11:00 PT (morning filers)
    //   - catchup pass: twoDaysAgo()   — cron 14:30 UTC / 06:30 PT next day (long-tail)
    // No grace window — substantive-content-guard + dedupe handle idempotency.
    if (dates.length === 0) dates = [pass === 'catchup' ? twoDaysAgo() : yesterday()];

    console.log(`Generating ${insightMode} insights pass=${pass} for dates=${dates.join(',')}, bar_id=${barId || 'all bars'}, week_start=${weekStartOverride || 'auto'}`);

    // ── SINGLE BAR MODE: process directly (called by orchestrator or manually) ──
    if (barId) {
      const allResults: Record<string, unknown> = {};
      let totalInsights = 0;
      let totalActions = 0;

      for (const date of dates) {
        // Create sync_run
        const { data: syncRun } = await supabase
          .from('sync_runs')
          .insert({
            bar_id: barId,
            sync_type: 'daily_insights',
            status: 'running',
          })
          .select('id')
          .single();

        try {
          const result = await processBar(supabase, barId, date, insightMode, weekStartOverride, pass);
          totalInsights += result.insights_created;
          totalActions += result.actions_created;
          allResults[`${barId}_${date}`] = result;

          if (syncRun?.id) {
            await supabase.from('sync_runs').update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              records_created: result.insights_created,
              metadata: {
                insights_created: result.insights_created,
                actions_created: result.actions_created,
                sources_used: result.sources_used,
                date,
              },
            }).eq('id', syncRun.id);
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Error processing bar ${barId} for ${date}:`, errMsg);
          allResults[`${barId}_${date}`] = { error: errMsg };

          if (syncRun?.id) {
            await supabase.from('sync_runs').update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: errMsg,
            }).eq('id', syncRun.id);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        mode: 'single_bar',
        dates,
        bars_processed: 1,
        dates_processed: dates.length,
        total_insights: totalInsights,
        total_actions: totalActions,
        results: allResults,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── FAN-OUT ORCHESTRATOR MODE: use pg_net to dispatch async HTTP calls ──
    const { data: bars } = await supabase
      .from('venues')
      .select('id, name')
      .eq('is_active', true);
    const activeBars = bars || [];

    if (activeBars.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active bars found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Orchestrator: dispatching ${activeBars.length} bars × ${dates.length} dates via pg_net`);

    const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-daily-insights`;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use pg_net http_post to dispatch truly async requests from PostgreSQL
    const dispatched: string[] = [];
    for (const bar of activeBars as { id: string; name: string }[]) {
      for (const date of dates) {
        console.log(`Dispatching via pg_net: ${bar.name} (${bar.id}) for ${date}`);
        const { error: rpcError } = await supabase.rpc('net_http_post' as any, {
          url: fnUrl,
          headers_json: JSON.stringify({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          }),
          body_json: JSON.stringify({
            bar_id: bar.id,
            date,
            mode: insightMode,
            pass,
            ...(weekStartOverride ? { week_start: weekStartOverride } : {}),
          }),
        });
        if (rpcError) {
          console.error(`pg_net dispatch failed for ${bar.name}:`, rpcError.message);
        }
        dispatched.push(`${bar.name} (${date})`);
      }
    }

    console.log(`Orchestrator dispatched ${dispatched.length} jobs via pg_net`);

    return new Response(JSON.stringify({
      success: true,
      mode: 'fan_out',
      dates,
      bars_dispatched: activeBars.length,
      dates_processed: dates.length,
      dispatched,
      message: `Dispatched ${dispatched.length} insight generation jobs via pg_net. Each bar processes independently. Check sync runs for results.`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily insights generation failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
