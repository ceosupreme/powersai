// ============================================================================
// Deterministic action_items builder
// ============================================================================
// Used by deterministic insight generators (labor-compliance-alerts.ts,
// generate-daily-insights/index.ts trend triggers) so every deterministic
// insight gets a paired action_items row with a SPECIFIC title — employee +
// date + violation, or venue + metric + date.
//
// Why specific titles matter:
//   When a user approves an action card, the title becomes the Asana task
//   title. Generic strings like "Review with employee and document corrective
//   action" fill Asana with vague duplicates that look identical across
//   employees and dates. Specific strings ("Verify break with Jake Cline on
//   2026-04-27 …") give Chad an actionable board.
//
// Idempotency:
//   The partial unique index `action_items_insight_id_deterministic_unique`
//   on (insight_id) WHERE source='deterministic_trigger' guarantees one
//   action per insight. Re-runs of detectors swallow 23505 in callers.
// ============================================================================

type SupabaseClient = any;

export type DeterministicSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ActionTemplateInput {
  insight_id: string;
  bar_id: string;
  venue_id?: string | null;
  pillar: string;
  severity: DeterministicSeverity | string;
  source_metric: string | null;
  source_date: string | null;       // YYYY-MM-DD
  employee_id?: string | null;
  employee_name?: string | null;
  venue_name?: string | null;
  iso_week_start?: string | null;
  metric_label?: string | null;     // e.g. "Net Sales", "Labor %"
  insight_title?: string | null;
  insight_summary?: string | null;
  problem_detail?: string | null;
  week_id?: string | null;
}

export interface ActionItemInsert {
  insight_id: string;
  bar_id: string;
  venue_id: string | null;
  week_id: string | null;
  title: string;
  detail: string | null;
  estimated_minutes: number;
  effort_level: string;
  priority: string;
  due_date: string;
  approval_status: 'Pending';
  status: 'Not Started';
  source: 'deterministic_trigger';
  pillar: string;
  insight_title: string | null;
  insight_summary: string | null;
  problem_detail: string | null;
  employee_id: string | null;
  auto_approved: false;
}

const FALLBACK_EMPLOYEE = 'employee';
const FALLBACK_VENUE = 'venue';
const FALLBACK_DATE = 'recent shift';
const FALLBACK_WEEK = 'recent week';
const FALLBACK_METRIC = 'metric';

function pickEmployee(input: ActionTemplateInput): string {
  return (input.employee_name || '').trim() || FALLBACK_EMPLOYEE;
}
function pickVenue(input: ActionTemplateInput): string {
  return (input.venue_name || '').trim() || FALLBACK_VENUE;
}
function pickDate(input: ActionTemplateInput): string {
  return (input.source_date || '').trim() || FALLBACK_DATE;
}
function pickWeek(input: ActionTemplateInput): string {
  return (input.iso_week_start || '').trim() || FALLBACK_WEEK;
}
function pickMetric(input: ActionTemplateInput): string {
  return (input.metric_label || '').trim() || FALLBACK_METRIC;
}

// Title templates keyed by source_metric. Falls back to a generic but
// insight-specific string ("Review and respond: <insight title>") only when
// no template matches — never produces a fully generic phrase.
function buildTitle(input: ActionTemplateInput): string {
  const m = (input.source_metric || '').toLowerCase();
  switch (m) {
    case 'late_meal':
      return `Verify late break with ${pickEmployee(input)} on ${pickDate(input)}; correct in Toast or process §226.7 premium pay`;
    case 'missed_meal':
      return `Verify break with ${pickEmployee(input)} on ${pickDate(input)}; correct in Toast or process §226.7 premium pay`;
    case 'no_clockout':
      return `Verify clockout for ${pickEmployee(input)} on ${pickDate(input)}; correct in Toast`;
    case 'weekly_overtime':
      return `Review OT for ${pickEmployee(input)} week of ${pickWeek(input)}`;
    case 'multi_location':
      return `Confirm cross-venue assignment for ${pickEmployee(input)} week of ${pickWeek(input)}`;
    case 'meal_tracking_gap':
      return `Audit Toast break-tracking config for ${pickVenue(input)}`;
    case 'meal_break_weekly_rollup':
      return `Review meal break violations at ${pickVenue(input)} week of ${pickWeek(input)}`;
    case 'no_clockout_weekly_rollup':
      return `Review no-clockout events at ${pickVenue(input)} week of ${pickWeek(input)}`;
    case 'no_clockout_employee_escalation':
      return `Coach ${pickEmployee(input)} on clockout discipline — week of ${pickWeek(input)}`;
    case 'three_week_sales_decline':
      return `Investigate 3-week sales decline at ${pickVenue(input)} and plan recovery`;
    case 'daily_yoy_drop':
    case 'daily_sales_drop':
      return `Investigate ${pickMetric(input)} dip at ${pickVenue(input)} on ${pickDate(input)}`;
    case 'labor_spike':
    case 'daily_labor_spike':
      return `Review labor spike at ${pickVenue(input)} on ${pickDate(input)}`;
    case 'void_discount_spike':
    case 'voids_spike':
    case 'discounts_spike':
      return `Audit voids/discounts at ${pickVenue(input)} on ${pickDate(input)}`;
    case 'comp_spike':
      return `Audit comps at ${pickVenue(input)} on ${pickDate(input)}`;
    case 'ot_pct_labor':
      return `Review OT as % of labor at ${pickVenue(input)} on ${pickDate(input)}`;
    case 'kds_regression':
    case 'kds_speed_regression':
      return `Investigate KDS speed regression at ${pickVenue(input)}`;
    case 'rating_drop':
    case 'google_rating_drop':
      return `Respond to rating drop at ${pickVenue(input)}`;
    case 'low_ticket_avg':
      return `Investigate low ticket average at ${pickVenue(input)} on ${pickDate(input)}`;
    case 'log_frequency':
    case 'low_log_volume':
      return `Restore daily logging cadence at ${pickVenue(input)}`;
    case 'inventory_dollar_loss':
    case 'inventory_variance':
      return `Investigate inventory variance at ${pickVenue(input)}`;
    case 'engagement_threshold':
      return `Address ${pickMetric(input)} at ${pickVenue(input)} (workforce engagement)`;
    case 'red_score_alert':
      return `Investigate ${pickMetric(input)} red score at ${pickVenue(input)}`;
    default: {
      const t = (input.insight_title || '').trim();
      return t ? `Review and respond: ${t}` : `Review and respond at ${pickVenue(input)}`;
    }
  }
}

const SEVERITY_MINUTES: Record<string, number> = {
  Low: 15,
  Medium: 30,
  High: 30,
  Critical: 60,
};

const SEVERITY_DUE_OFFSET_DAYS: Record<string, number> = {
  Low: 14,
  Medium: 7,
  High: 3,
  Critical: 1,
};

const SEVERITY_PRIORITY: Record<string, string> = {
  Low: 'P4-Low',
  Medium: 'P3-Medium',
  High: 'P2-High',
  Critical: 'P1-Critical',
};

function effortFromMinutes(min: number): string {
  if (min <= 15) return 'Low';
  if (min <= 30) return 'Medium';
  return 'High';
}

function todayPT(): string {
  const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function buildDeterministicActionRow(input: ActionTemplateInput): ActionItemInsert {
  const sev = (input.severity as string) in SEVERITY_MINUTES ? (input.severity as string) : 'Medium';
  const minutes = SEVERITY_MINUTES[sev];
  const offset = SEVERITY_DUE_OFFSET_DAYS[sev];
  const baseDate = (input.source_date && input.source_date.length === 10) ? input.source_date : todayPT();
  const dueDate = addDaysISO(baseDate, offset);

  return {
    insight_id: input.insight_id,
    bar_id: input.bar_id,
    venue_id: input.venue_id ?? null,
    week_id: input.week_id ?? null,
    title: buildTitle(input),
    detail: null, // Phase 1: leave insights.detail as the factual narrative; do not duplicate.
    estimated_minutes: minutes,
    effort_level: effortFromMinutes(minutes),
    priority: SEVERITY_PRIORITY[sev],
    due_date: dueDate,
    approval_status: 'Pending',
    status: 'Not Started',
    source: 'deterministic_trigger',
    pillar: input.pillar,
    insight_title: input.insight_title ?? null,
    insight_summary: input.insight_summary ?? null,
    problem_detail: input.problem_detail ?? null,
    employee_id: input.employee_id ?? null,
    auto_approved: false,
  };
}

// Insert helper: writes the action row, swallows 23505 from the partial
// unique index (re-runs of detectors), and never overwrites an action row
// that has already been approved or rejected by a human.
export async function upsertDeterministicAction(
  supabase: SupabaseClient,
  input: ActionTemplateInput,
): Promise<'inserted' | 'refreshed' | 'skipped' | 'error'> {
  const row = buildDeterministicActionRow(input);
  const { error } = await supabase.from('action_items').insert(row);
  if (!error) return 'inserted';

  if (error.code === '23505') {
    // Existing action row for this insight. Refresh title/due/minutes if still Pending.
    const { data: existing } = await supabase
      .from('action_items')
      .select('id, approval_status')
      .eq('insight_id', row.insight_id)
      .eq('source', 'deterministic_trigger')
      .maybeSingle();
    if (!existing) return 'skipped';
    if (existing.approval_status !== 'Pending') return 'skipped';

    const { error: updErr } = await supabase
      .from('action_items')
      .update({
        title: row.title,
        estimated_minutes: row.estimated_minutes,
        effort_level: row.effort_level,
        priority: row.priority,
        due_date: row.due_date,
        pillar: row.pillar,
        insight_title: row.insight_title,
        insight_summary: row.insight_summary,
        problem_detail: row.problem_detail,
      })
      .eq('id', existing.id);
    if (updErr) {
      console.warn('[DET-ACTION] Failed to refresh existing action row:', updErr.message);
      return 'error';
    }
    return 'refreshed';
  }

  console.warn('[DET-ACTION] Insert failed:', error.message);
  return 'error';
}
