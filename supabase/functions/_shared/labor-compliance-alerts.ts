// ============================================================================
// Labor Compliance Alerts (CA-hardcoded thresholds)
// ============================================================================
// Five deterministic detectors that read time_entries / time_entry_breaks and
// surface compliance issues as rows in public.insights with
// generated_by='deterministic_trigger'. Wired into the existing daily and
// weekly insight cycles (generate-daily-insights, generate-monday-briefing).
//
// Soft-fail policy: each of the 5 detectors is wrapped in its own try/catch
// so one failing pass does not block the others. See
// architecture/employee-matching-merge-order memory for the same pattern.
//
// Dedupe: each insight title is stable for its key, and we rely on the
// existing partial unique index `insights_deterministic_unique` on
// (bar_id, title) WHERE generated_by='deterministic_trigger' AND status<>'Dismissed'.
// On 23505 we silently update the existing row (refresh facts) UNLESS it's
// dismissed — dismissed insights stay dismissed.
//
// Thresholds are CA-hardcoded for now (see plan). When non-CA venues come
// online, lift these into venues.* columns or app_config.
// ============================================================================

const CA_MEAL_BREAK_DEADLINE_HOURS = 5;       // meal break must START before end of 5th hour
// [B3 REMOVED 2026-05-16] CA_MEAL_BREAK_REQUIRED_AFTER_HOURS (=5) constant
// deleted — was a legal-reference-only value with zero call sites. The
// operational thresholds LATE_MEAL_SHIFT_THRESHOLD_HOURS and
// MISSED_MEAL_SHIFT_THRESHOLD_HOURS (both 6h, below) are what the detectors
// actually use.
const LATE_MEAL_SHIFT_THRESHOLD_HOURS = 6;    // we only fire LATE-MEAL on shifts >= 6h
// Operational threshold for the MISSED-MEAL detector. Higher than the legal CA
// reference (5h) above because the 5–6h band produces too many false positives —
// informal break waivers are common there and Toast records them as
// missed=true / waived=false. Aligned with LATE_MEAL_SHIFT_THRESHOLD_HOURS.
const MISSED_MEAL_SHIFT_THRESHOLD_HOURS = 6;
const CA_MEAL_BREAK_MIN_DURATION_MINUTES = 25; // unpaid break of 25+ min counts as a meal
const WEEKLY_OT_ALERT_HOURS = 4;              // sum(overtime_hours) per employee per ISO week
const NO_CLOCKOUT_LOOKBACK_DAYS = 14;

type SupabaseClient = any;

interface InsightRow {
  bar_id: string;
  venue_id: string;
  pillar: string;
  insight_type: string;
  severity: string;
  title: string;
  summary: string;
  detail: string;
  source_type: string;
  source_date: string | null;
  source_metric: string;
  source_value: string;
  source_context: string;
  estimated_impact: string | null;
  metric_name: string;
  metric_value: string;
  threshold: string;
  dedupe_hash: string;
  employee_id: string | null;
  employee_name: string | null;
  status: string;
  generated_by: string;
  insight_mode: string;
  week_id?: string | null;
}

// ---------------------------------------------------------------------------
// Upsert helper — writes the insight, swallows 23505 (dedupe), refreshes
// non-dismissed rows on conflict.
// ---------------------------------------------------------------------------
import { upsertDeterministicAction } from './deterministic-actions.ts';

// Cache of venue_id -> venue_name to avoid N+1 lookups during a sweep.
const venueNameCache = new Map<string, string>();
async function getVenueNameCached(supabase: SupabaseClient, venueId: string): Promise<string> {
  const cached = venueNameCache.get(venueId);
  if (cached) return cached;
  const { data } = await supabase.from('venues').select('name').eq('id', venueId).maybeSingle();
  const name = data?.name || venueId.slice(0, 8);
  venueNameCache.set(venueId, name);
  return name;
}

// For weekly_overtime / multi_location, source_date is already the ISO Monday.
// For other detectors, leave undefined; the template won't reference it.
function isoWeekStartFor(row: InsightRow): string | null {
  if (row.source_metric === 'weekly_overtime' || row.source_metric === 'multi_location') {
    return row.source_date;
  }
  return null;
}

async function writePairedAction(supabase: SupabaseClient, row: InsightRow, insightId: string): Promise<void> {
  try {
    const venueName = await getVenueNameCached(supabase, row.venue_id || row.bar_id);
    await upsertDeterministicAction(supabase, {
      insight_id: insightId,
      bar_id: row.bar_id,
      venue_id: row.venue_id,
      pillar: row.pillar,
      severity: row.severity,
      source_metric: row.source_metric,
      source_date: row.source_date,
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      venue_name: venueName,
      iso_week_start: isoWeekStartFor(row),
      insight_title: row.title,
      insight_summary: row.summary,
      problem_detail: row.detail,
      week_id: row.week_id ?? null,
    });
  } catch (e: any) {
    // Soft-fail: never let an action_items write failure block the insight.
    console.warn('[LABOR-ALERT] paired action write failed:', e?.message || e);
  }
}

async function upsertComplianceInsight(
  supabase: SupabaseClient,
  row: InsightRow
): Promise<'inserted' | 'updated' | 'skipped' | 'error'> {
  const { data: insertedRow, error } = await supabase
    .from('insights')
    .insert(row)
    .select('id')
    .single();
  if (!error && insertedRow?.id) {
    await writePairedAction(supabase, row, insertedRow.id);
    return 'inserted';
  }

  if (error?.code === '23505') {
    // Existing insight with same (bar_id, title) and not Dismissed.
    // Refresh facts so the alert reflects the latest data, but only if not dismissed.
    const { data: existing } = await supabase
      .from('insights')
      .select('id, status')
      .eq('bar_id', row.bar_id)
      .eq('title', row.title)
      .eq('generated_by', 'deterministic_trigger')
      .maybeSingle();

    if (!existing) return 'skipped';
    if (existing.status === 'Dismissed') return 'skipped';

    const { error: updErr } = await supabase
      .from('insights')
      .update({
        severity: row.severity,
        summary: row.summary,
        detail: row.detail,
        source_value: row.source_value,
        source_context: row.source_context,
        estimated_impact: row.estimated_impact,
        metric_value: row.metric_value,
        generated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updErr) {
      console.warn('[LABOR-ALERT] Failed to refresh existing insight:', updErr.message);
      return 'error';
    }
    // Refresh paired action too (no-op if action is no longer Pending).
    await writePairedAction(supabase, row, existing.id);
    // Observability: record the dedup race so the admin sync-health page can
    // surface concurrent-cron collisions. Fire-and-forget; failure is silent.
    try {
      await supabase.from('suppressed_metrics').insert({
        bar_id: typeof row.bar_id === 'string' ? row.bar_id : null,
        venue_id: row.venue_id,
        week_start: new Date().toISOString().slice(0, 10),
        metric_key: row.source_metric || 'unknown',
        gate: 'dedup_race',
        reason: 'upsertComplianceInsight 23505 race',
        details: { title: row.title, generated_by: 'deterministic_trigger' },
      });
    } catch { /* observability is best-effort */ }
    return 'updated';
  }

  console.warn('[LABOR-ALERT] Insert failed:', error?.message, row.title);
  return 'error';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function durationHours(inIso: string | null, outIso: string | null): number | null {
  if (!inIso || !outIso) return null;
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / (1000 * 60 * 60);
}

function fmtHrs(n: number): string {
  return `${n.toFixed(2)}h`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
}

async function resolveEmployeeName(
  supabase: SupabaseClient,
  employeeId: string | null
): Promise<string> {
  if (!employeeId) return 'Unknown employee';
  const { data } = await supabase
    .from('employee_profiles')
    .select('preferred_name, first_name, last_name, employee_name')
    .eq('id', employeeId)
    .maybeSingle();
  if (!data) return 'Unknown employee';
  const display =
    data.preferred_name ||
    [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
    data.employee_name ||
    'Unknown employee';
  return display;
}

// ---------------------------------------------------------------------------
// Exempt / salaried employee filter
// ---------------------------------------------------------------------------
// Compliance detectors must NOT fire on salaried/exempt employees. CA labor
// rules either don't apply or apply differently, and salaried managers
// commonly clock into Toast just to authenticate without intending to track
// time — Toast then auto-clocks-them-out at venue closeout, generating false
// "no clockout" alerts.
//
// Authority order:
//   1. employee_profiles.is_exempt = true            (admin override; canonical)
//   2. role_primary matches manager-class regex     (proxy backup)
//
// Toast labor v1 /employees does not expose FLSA/exempt status — it lives in
// Toast Payroll (separate API). Until that's wired, this proxy + the
// is_exempt admin override is our source of truth.
//
// Note: `is_exempt` may not yet exist in older environments; loadEmployeeProfileMap
// retries without the column and treats missing values as false.
const MANAGER_ROLE_REGEX = /(^|[^a-z])(manager|gm|general manager|owner|director|chef de cuisine|executive chef|operating partner)([^a-z]|$)/i;

export interface ProfileLite {
  id: string;
  display_name: string;
  is_exempt: boolean;
  is_vendor_account: boolean;
  hourly_wage: number | null;
  role_primary: string | null;
}

export function isLikelyExemptEmployee(profile: ProfileLite | undefined | null): { exempt: boolean; reason: string | null } {
  if (!profile) return { exempt: false, reason: null };
  // Vendor / integration pseudo-employees (Sculpture/Bevinco/BevIntel/Terminal Login)
  // — treat as exempt so compliance detectors never fire on them.
  if (profile.is_vendor_account === true) return { exempt: true, reason: 'is_vendor_account=true' };
  if (profile.is_exempt === true) return { exempt: true, reason: 'is_exempt=true' };
  const role = (profile.role_primary || '').trim();
  if (role && MANAGER_ROLE_REGEX.test(role)) {
    return { exempt: true, reason: `manager-role-proxy:${role}` };
  }
  return { exempt: false, reason: null };
}

async function loadEmployeeProfileMap(
  supabase: SupabaseClient,
  employeeIds: Array<string | null | undefined>
): Promise<Map<string, ProfileLite>> {
  const ids = Array.from(new Set(employeeIds.filter((x): x is string => !!x)));
  const map = new Map<string, ProfileLite>();
  if (ids.length === 0) return map;

  const baseSelect = 'id, preferred_name, first_name, last_name, employee_name, role_primary, hourly_wage, is_exempt, is_vendor_account';
  let resp = await supabase
    .from('employee_profiles')
    .select(baseSelect)
    .in('id', ids);
  // Older envs without is_vendor_account column — retry without it.
  if (resp.error && /is_vendor_account/i.test(resp.error.message || '')) {
    resp = await supabase
      .from('employee_profiles')
      .select('id, preferred_name, first_name, last_name, employee_name, role_primary, hourly_wage, is_exempt')
      .in('id', ids);
  }
  // Older envs without is_exempt column either — fall back to proxy-only filtering.
  if (resp.error && /is_exempt/i.test(resp.error.message || '')) {
    resp = await supabase
      .from('employee_profiles')
      .select('id, preferred_name, first_name, last_name, employee_name, role_primary, hourly_wage')
      .in('id', ids);
  }
  if (resp.error) {
    console.warn('[LABOR-ALERT] loadEmployeeProfileMap failed:', resp.error.message);
    return map;
  }
  for (const r of (resp.data || [])) {
    const display =
      r.preferred_name ||
      [r.first_name, r.last_name].filter(Boolean).join(' ').trim() ||
      r.employee_name ||
      'Unknown employee';
    map.set(r.id, {
      id: r.id,
      display_name: display,
      is_exempt: r.is_exempt === true,
      is_vendor_account: r.is_vendor_account === true,
      hourly_wage: r.hourly_wage == null ? null : Number(r.hourly_wage),
      role_primary: r.role_primary ?? null,
    });
  }
  return map;
}

function logSkipExempt(venueId: string, employeeId: string | null, profile: ProfileLite | undefined, reason: string | null, source: string) {
  const name = profile?.display_name || 'unknown';
  console.log(`[LABOR-ALERT][skip-exempt] source=${source} venue=${venueId.slice(0,8)} employee=${employeeId} name="${name}" reason=${reason || 'unknown'}`);
}

async function resolveVenueName(
  supabase: SupabaseClient,
  venueId: string
): Promise<string> {
  const { data } = await supabase
    .from('venues')
    .select('name')
    .eq('id', venueId)
    .maybeSingle();
  return data?.name || venueId.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Detector 1 + 2 + 5: DAILY pass for one venue + one business_date
// ---------------------------------------------------------------------------
export async function runDailyLaborAlerts(
  supabase: SupabaseClient,
  venueId: string,
  businessDate: string // 'YYYY-MM-DD' (Pacific)
): Promise<{
  lateMeal: number;
  missedMeal: number;
  noClockout: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let lateMeal = 0;
  let missedMeal = 0;
  let noClockout = 0;

  const venueName = await resolveVenueName(supabase, venueId);

  // ── Detector 1: LATE MEAL BREAK (shift >= 6h, first unpaid break > 5h after clock-in)
  // ── Detector 2: MISSED MEAL BREAK (break.missed=true AND waived=false on shift >= 6h)
  try {
    // Pull all closed shifts for this venue/date with their breaks in one trip
    const { data: shifts, error } = await supabase
      .from('time_entries')
      .select(`
        id, employee_id, business_date, in_date, out_date,
        time_entry_breaks ( id, paid, in_date, out_date, missed, waived )
      `)
      .eq('venue_id', venueId)
      .eq('business_date', businessDate)
      .eq('deleted', false);

    if (error) throw error;

    // Pre-load employee profiles in one trip; use map for both name display
    // and exempt filtering (eliminates per-shift N+1 lookups).
    const shiftEmpIds = (shifts || []).map((s: any) => s.employee_id).filter((id: string | null): id is string => !!id);
    const profileMap = await loadEmployeeProfileMap(supabase, shiftEmpIds);

    for (const shift of (shifts || [])) {
      const shiftHours = durationHours(shift.in_date, shift.out_date);
      const breaks = (shift.time_entry_breaks || []) as any[];
      const profile = shift.employee_id ? profileMap.get(shift.employee_id) : undefined;
      const exemptCheck = isLikelyExemptEmployee(profile);
      if (exemptCheck.exempt) {
        logSkipExempt(venueId, shift.employee_id, profile, exemptCheck.reason, 'late+missed_meal');
        continue;
      }
      const empNameFromMap = profile?.display_name;

      // ── Late meal check
      try {
        if (shiftHours !== null && shiftHours >= LATE_MEAL_SHIFT_THRESHOLD_HOURS && shift.in_date) {
          const unpaidMealBreaks = breaks
            .filter((b) => b.paid === false && b.in_date)
            .map((b) => ({
              ...b,
              durMin: b.out_date
                ? (new Date(b.out_date).getTime() - new Date(b.in_date).getTime()) / 60000
                : null,
            }))
            .filter((b) => b.durMin !== null && b.durMin >= CA_MEAL_BREAK_MIN_DURATION_MINUTES)
            .sort((a, b) => new Date(a.in_date).getTime() - new Date(b.in_date).getTime());

          if (unpaidMealBreaks.length > 0) {
            const first = unpaidMealBreaks[0];
            const hoursUntilBreak =
              (new Date(first.in_date).getTime() - new Date(shift.in_date).getTime()) /
              (1000 * 60 * 60);

            if (hoursUntilBreak > CA_MEAL_BREAK_DEADLINE_HOURS) {
              const empName = empNameFromMap || await resolveEmployeeName(supabase, shift.employee_id);
              const title = `Late meal break — ${empName} — ${businessDate}`;
              const dedupe = `late_meal:${venueId}:${shift.id}`;
              const result = await upsertComplianceInsight(supabase, {
                bar_id: venueId, venue_id: venueId,
                pillar: 'Labor', insight_type: 'Issue', severity: 'Medium',
                title,
                summary: `${empName} at ${venueName} clocked in at ${fmtTime(shift.in_date)} but did not start an unpaid meal break until ${fmtTime(first.in_date)} (${hoursUntilBreak.toFixed(2)}h into the shift). California requires the meal break to start before the end of the 5th hour.`,
                detail: `Shift: ${fmtTime(shift.in_date)} → ${fmtTime(shift.out_date)} (${fmtHrs(shiftHours)}). First unpaid meal break started ${hoursUntilBreak.toFixed(2)}h after clock-in (CA threshold: ${CA_MEAL_BREAK_DEADLINE_HOURS}h). Confirm with the employee whether the break was actually taken earlier but logged late. If actually started late, a 1-hour premium pay may be owed under CA Labor Code §226.7.`,
                source_type: `Toast Time Entries — ${venueName}`,
                source_date: businessDate,
                source_metric: 'late_meal',
                source_value: `${hoursUntilBreak.toFixed(2)}h to first meal break`,
                source_context: JSON.stringify({
                  time_entry_id: shift.id,
                  shift_in: shift.in_date,
                  shift_out: shift.out_date,
                  shift_hours: shiftHours,
                  first_unpaid_break_in: first.in_date,
                  first_unpaid_break_duration_min: first.durMin,
                  hours_until_first_break: hoursUntilBreak,
                }),
                estimated_impact: '~1h premium pay potentially owed under CA Labor Code §226.7',
                metric_name: 'hours_until_first_meal_break',
                metric_value: hoursUntilBreak.toFixed(2),
                threshold: `${CA_MEAL_BREAK_DEADLINE_HOURS}h`,
                dedupe_hash: dedupe,
                employee_id: shift.employee_id,
                employee_name: empName,
                status: 'New',
                generated_by: 'deterministic_trigger',
                insight_mode: 'daily',
              });
              if (result === 'inserted' || result === 'updated') lateMeal++;
            }
          }
          // NB: shifts >= 6h with no qualifying unpaid break at all are NOT
          // auto-flagged here. Per scope, we don't fabricate missing-break
          // inferences — that's only flagged when Toast itself records
          // missed=true (Detector 2).
        }
      } catch (e: any) {
        errors.push(`late_meal[${shift.id}]: ${e?.message || e}`);
      }

      // ── Missed meal check (per-break)
      try {
        if (shiftHours !== null && shiftHours >= MISSED_MEAL_SHIFT_THRESHOLD_HOURS) {
          const missedBreaks = breaks.filter((b) => b.missed === true && b.waived !== true);
          if (missedBreaks.length > 0) {
            const empName = empNameFromMap || await resolveEmployeeName(supabase, shift.employee_id);
            const title = `Missed meal break — ${empName} — ${businessDate}`;
            const dedupe = `missed_meal:${venueId}:${shift.id}`;
            const result = await upsertComplianceInsight(supabase, {
              bar_id: venueId, venue_id: venueId,
              pillar: 'Labor', insight_type: 'Issue', severity: 'High',
              title,
              summary: `${empName} at ${venueName} worked a ${fmtHrs(shiftHours)} shift on ${businessDate} but Toast recorded ${missedBreaks.length} missed meal break (waived=false). This is a direct CA compliance violation with payroll exposure.`,
              detail: `Shift: ${fmtTime(shift.in_date)} → ${fmtTime(shift.out_date)} (${fmtHrs(shiftHours)}). Confirm with the employee whether the break was actually taken but unrecorded. If unrecorded, correct in Toast. If actually missed, a 1-hour premium pay at the regular rate is owed under CA Labor Code §226.7.`,
              source_type: `Toast Time Entry Breaks — ${venueName}`,
              source_date: businessDate,
              source_metric: 'missed_meal',
              source_value: `${missedBreaks.length} missed break(s)`,
              source_context: JSON.stringify({
                time_entry_id: shift.id,
                shift_in: shift.in_date,
                shift_out: shift.out_date,
                shift_hours: shiftHours,
                missed_break_ids: missedBreaks.map((b) => b.id),
              }),
              estimated_impact: '1h premium pay owed per missed break (CA Labor Code §226.7)',
              metric_name: 'missed_meal_breaks',
              metric_value: String(missedBreaks.length),
              threshold: '0 missed breaks (shifts ≥6h)',
              dedupe_hash: dedupe,
              employee_id: shift.employee_id,
              employee_name: empName,
              status: 'New',
              generated_by: 'deterministic_trigger',
              insight_mode: 'daily',
            });
            if (result === 'inserted' || result === 'updated') missedMeal++;
          }
        }
      } catch (e: any) {
        errors.push(`missed_meal[${shift.id}]: ${e?.message || e}`);
      }
    }
  } catch (e: any) {
    errors.push(`late+missed pass: ${e?.message || e}`);
    console.warn('[LABOR-ALERT] late/missed meal pass failed:', e?.message || e);
  }

  // ── Detector 5: NO CLOCKOUT (last 14 days, excluding today)
  try {
    // Today in Pacific
    const today = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    );
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const lookback = new Date(today);
    lookback.setDate(lookback.getDate() - NO_CLOCKOUT_LOOKBACK_DAYS);
    const lookbackStr = lookback.toISOString().slice(0, 10);

    // ── Self-resolution sweep: dismiss prior open no_clockout insights for this
    // venue across the FULL 14-day lookback window (not just today's pass-date)
    // whose underlying time_entry has been corrected (manual out_date with
    // auto_clocked_out=false) or deleted/missing. Preserves Class C
    // (auto_clocked_out=true, not deleted) since those are real failures.
    // Runs unconditionally each daily pass — cheap and idempotent.
    try {
      const { data: openInsights } = await supabase
        .from('insights')
        .select('id, source_context')
        .eq('bar_id', venueId)
        .eq('source_metric', 'no_clockout')
        .eq('generated_by', 'deterministic_trigger')
        .gte('source_date', lookbackStr)
        .lte('source_date', businessDate)
        .in('status', ['Open', 'New']);

      const scanned = (openInsights || []).length;
      const toDismiss: string[] = [];
      for (const ins of (openInsights || [])) {
        let teId: string | null = null;
        try {
          const ctx = typeof ins.source_context === 'string'
            ? JSON.parse(ins.source_context)
            : ins.source_context;
          teId = ctx?.time_entry_id ?? null;
        } catch { /* ignore parse errors */ }
        if (!teId) { toDismiss.push(ins.id); continue; }
        const { data: te } = await supabase
          .from('time_entries')
          .select('id, out_date, auto_clocked_out, deleted')
          .eq('id', teId)
          .maybeSingle();
        if (!te || te.deleted === true) { toDismiss.push(ins.id); continue; }
        if (te.out_date != null && te.auto_clocked_out === false) {
          toDismiss.push(ins.id);
        }
      }
      if (toDismiss.length > 0) {
        const { error: dismissErr } = await supabase
          .from('insights')
          .update({ status: 'Dismissed', dismiss_reason: 'stale_no_clockout_resolved' })
          .in('id', toDismiss);
        if (dismissErr) console.warn('[LABOR-ALERT][no_clockout] dismiss update failed:', dismissErr.message);
      }
      console.log(`[LABOR-ALERT][no_clockout] sweep venue=${venueName} window=${lookbackStr}..${businessDate} scanned=${scanned} dismissed=${toDismiss.length}`);
    } catch (e: any) {
      console.warn('[LABOR-ALERT] no_clockout self-resolution failed:', e?.message || e);
    }

    // Only fire NEW no-clockout alerts when this daily pass is for a date in
    // the lookback window. (Generate-daily-insights iterates per-date.)
    if (businessDate >= lookbackStr && businessDate < todayStr) {

      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('id, employee_id, business_date, in_date, out_date, auto_clocked_out')
        .eq('venue_id', venueId)
        .eq('business_date', businessDate)
        .eq('deleted', false);

      if (error) throw error;

      // 90-minute settle window: don't fire on entries whose clock-in is too
      // recent — gives Toast time to sync a manual clockout before alerting.
      const SETTLE_MS = 90 * 60 * 1000;

      // Pre-load employee profiles to filter exempts and resolve names in one trip.
      const noClockEmpIds = (entries || []).map((e: any) => e.employee_id).filter((id: string | null): id is string => !!id);
      const noClockProfileMap = await loadEmployeeProfileMap(supabase, noClockEmpIds);

      for (const entry of (entries || [])) {
        try {
          const nullOut = entry.out_date == null;
          const autoOut = entry.auto_clocked_out === true;
          if (!nullOut && !autoOut) continue;

          // Settle window only applies to nullOut (race vs sync). Auto-clocked
          // entries are already a Toast-finalized failure; fire immediately.
          if (nullOut && entry.in_date) {
            const inMs = Date.parse(entry.in_date);
            if (inMs && (Date.now() - inMs) < SETTLE_MS) continue;
          }

          const profile = entry.employee_id ? noClockProfileMap.get(entry.employee_id) : undefined;
          const exemptCheck = isLikelyExemptEmployee(profile);
          if (exemptCheck.exempt) {
            logSkipExempt(venueId, entry.employee_id, profile, exemptCheck.reason, 'no_clockout');
            continue;
          }

          const severity = nullOut ? 'High' : 'Medium';
          const reason = nullOut ? 'No clock-out recorded' : 'Auto clocked out by Toast';
          const empName = profile?.display_name || await resolveEmployeeName(supabase, entry.employee_id);
          const title = `No clockout — ${empName} — ${businessDate}`;
          const dedupe = `no_clockout:${venueId}:${entry.id}`;

          const result = await upsertComplianceInsight(supabase, {
            bar_id: venueId, venue_id: venueId,
            pillar: 'Labor', insight_type: 'Issue', severity,
            title,
            summary: `${empName} at ${venueName} clocked in at ${fmtTime(entry.in_date)} on ${businessDate} but ${nullOut ? 'never clocked out' : 'was auto-clocked-out by Toast'}.`,
            detail: `${reason}. Verify the actual clock-out time with the employee or shift lead and correct the entry in Toast. Uncorrected entries distort labor cost and SPLH metrics.`,
            source_type: `Toast Time Entries — ${venueName}`,
            source_date: businessDate,
            source_metric: 'no_clockout',
            source_value: reason,
            source_context: JSON.stringify({
              time_entry_id: entry.id,
              in_date: entry.in_date,
              out_date: entry.out_date,
              auto_clocked_out: entry.auto_clocked_out,
            }),
            estimated_impact: 'Labor cost and SPLH metrics distorted until corrected',
            metric_name: 'no_clockout_reason',
            metric_value: nullOut ? 'null_out_date' : 'auto_clocked_out',
            threshold: 'must have manual clockout',
            dedupe_hash: dedupe,
            employee_id: entry.employee_id,
            employee_name: empName,
            status: 'New',
            generated_by: 'deterministic_trigger',
            insight_mode: 'daily',
          });
          if (result === 'inserted' || result === 'updated') noClockout++;
        } catch (e: any) {
          errors.push(`no_clockout[${entry.id}]: ${e?.message || e}`);
        }
      }
    }
  } catch (e: any) {
    errors.push(`no_clockout pass: ${e?.message || e}`);
    console.warn('[LABOR-ALERT] no-clockout pass failed:', e?.message || e);
  }

  console.log(
    `[LABOR-ALERT][daily] venue=${venueName} date=${businessDate} late=${lateMeal} missed=${missedMeal} no_clockout=${noClockout} errors=${errors.length}`
  );

  return { lateMeal, missedMeal, noClockout, errors };
}

// ---------------------------------------------------------------------------
// Detector 3 + 4: WEEKLY pass for one venue + ISO week (Mon..Sun)
//
// Pass `runMultiLocation=false` on all venue iterations except the first one
// of the cycle, since multi-location is a single global cross-venue query.
// ---------------------------------------------------------------------------
export async function runWeeklyLaborAlerts(
  supabase: SupabaseClient,
  venueId: string,
  isoWeekStart: string, // 'YYYY-MM-DD' (Monday, Pacific)
  options: { runMultiLocation?: boolean; weekId?: string | null } = {}
): Promise<{ overtime: number; multiLocation: number; mealRollup: number; noClockoutRollup: number; scheduleVariance: number; errors: string[] }> {
  const errors: string[] = [];
  let overtime = 0;
  let multiLocation = 0;

  // ISO Sunday = Monday + 6 days
  const isoMon = new Date(isoWeekStart + 'T12:00:00Z');
  const isoSunDate = new Date(isoMon);
  isoSunDate.setUTCDate(isoMon.getUTCDate() + 6);
  const isoWeekEnd = isoSunDate.toISOString().slice(0, 10);

  const venueName = await resolveVenueName(supabase, venueId);

  // ── Detector 3: EXCESSIVE OVERTIME (sum overtime_hours per employee >= 4h)
  // Salaried/exempt employees are filtered via employee_profiles.is_exempt
  // (admin override) and a manager-role-name proxy. See isLikelyExemptEmployee.
  try {
    const { data: rows, error } = await supabase
      .from('time_entries')
      .select('employee_id, overtime_hours')
      .eq('venue_id', venueId)
      .eq('deleted', false)
      .gte('business_date', isoWeekStart)
      .lte('business_date', isoWeekEnd);

    if (error) throw error;

    const byEmp = new Map<string, number>();
    for (const r of (rows || [])) {
      if (!r.employee_id) continue;
      const ot = Number(r.overtime_hours) || 0;
      byEmp.set(r.employee_id, (byEmp.get(r.employee_id) || 0) + ot);
    }

    // Pre-load profiles for all OT-bearing employees in one trip.
    const otProfileMap = await loadEmployeeProfileMap(supabase, Array.from(byEmp.keys()));

    for (const [empId, totalOt] of byEmp.entries()) {
      try {
        if (totalOt < WEEKLY_OT_ALERT_HOURS) continue;
        const profile = otProfileMap.get(empId);
        const exemptCheck = isLikelyExemptEmployee(profile);
        if (exemptCheck.exempt) {
          logSkipExempt(venueId, empId, profile, exemptCheck.reason, 'weekly_overtime');
          continue;
        }
        const empName = profile?.display_name || await resolveEmployeeName(supabase, empId);
        const title = `Overtime ≥ ${WEEKLY_OT_ALERT_HOURS}h — ${empName} — week of ${isoWeekStart}`;
        const dedupe = `weekly_ot:${venueId}:${empId}:${isoWeekStart}`;

        const result = await upsertComplianceInsight(supabase, {
          bar_id: venueId, venue_id: venueId,
          pillar: 'Labor', insight_type: 'Issue', severity: 'Medium',
          title,
          summary: `${empName} accumulated ${fmtHrs(totalOt)} of overtime at ${venueName} during the week of ${isoWeekStart}, exceeding the ${WEEKLY_OT_ALERT_HOURS}h alert threshold.`,
          detail: `Weekly overtime: ${fmtHrs(totalOt)} (CA-computed by Toast). Review next week's published schedule for ${empName} and rebalance hours, or confirm the OT was approved.`,
          source_type: `Toast Time Entries — ${venueName} — week of ${isoWeekStart}`,
          source_date: isoWeekStart,
          source_metric: 'weekly_overtime',
          source_value: fmtHrs(totalOt),
          source_context: JSON.stringify({
            employee_id: empId,
            iso_week_start: isoWeekStart,
            iso_week_end: isoWeekEnd,
            total_overtime_hours: totalOt,
          }),
          estimated_impact: `OT premium pay on ${fmtHrs(totalOt)} this week`,
          metric_name: 'weekly_overtime_hours',
          metric_value: totalOt.toFixed(2),
          threshold: `${WEEKLY_OT_ALERT_HOURS}h`,
          dedupe_hash: dedupe,
          employee_id: empId,
          employee_name: empName,
          status: 'New',
          generated_by: 'deterministic_trigger',
          insight_mode: 'weekly',
          week_id: options.weekId ?? null,
        });
        if (result === 'inserted' || result === 'updated') overtime++;
      } catch (e: any) {
        errors.push(`weekly_ot[${empId}]: ${e?.message || e}`);
      }
    }
  } catch (e: any) {
    errors.push(`weekly_ot pass: ${e?.message || e}`);
    console.warn('[LABOR-ALERT] weekly OT pass failed:', e?.message || e);
  }

  // ── Detector 4: MULTI-LOCATION SHIFTS (cross-venue, run once per cycle)
  if (options.runMultiLocation) {
    try {
      // Pull all time_entries in the window with their employee_profile join,
      // group by sevenshifts_user_id_int, find those spanning >=2 venues.
      const { data: rows, error } = await supabase
        .from('time_entries')
        .select(`
          venue_id, business_date, employee_id,
          employee_profiles!inner ( id, sevenshifts_user_id_int, preferred_name, first_name, last_name, employee_name, role_primary, hourly_wage, is_exempt, is_vendor_account )
        `)
        .eq('deleted', false)
        .gte('business_date', isoWeekStart)
        .lte('business_date', isoWeekEnd);

      if (error) throw error;

      // Bucket by sevenshifts_user_id_int → { venues: Set, displayName, profileIds: Set, exempt }
      const bySsId = new Map<string, { venues: Set<string>; name: string; empIds: Set<string>; exempt: boolean; exemptReason: string | null }>();
      for (const r of (rows || []) as any[]) {
        const prof = r.employee_profiles;
        const ssId = prof?.sevenshifts_user_id_int;
        if (ssId == null) continue;
        const key = String(ssId);
        if (!bySsId.has(key)) {
          const display =
            prof.preferred_name ||
            [prof.first_name, prof.last_name].filter(Boolean).join(' ').trim() ||
            prof.employee_name ||
            `7shifts user ${ssId}`;
          // Exempt check on the embedded profile (any matching profile flagged exempt
          // suppresses the multi-location alert for this 7shifts user).
          const exemptCheck = isLikelyExemptEmployee({
            id: prof.id,
            display_name: display,
            is_exempt: prof.is_exempt === true,
            is_vendor_account: prof.is_vendor_account === true,
            hourly_wage: prof.hourly_wage == null ? null : Number(prof.hourly_wage),
            role_primary: prof.role_primary ?? null,
          });
          bySsId.set(key, { venues: new Set(), name: display, empIds: new Set(), exempt: exemptCheck.exempt, exemptReason: exemptCheck.reason });
        }
        const bucket = bySsId.get(key)!;
        if (r.venue_id) bucket.venues.add(r.venue_id);
        if (r.employee_id) bucket.empIds.add(r.employee_id);
      }

      // Resolve venue names once
      const allVenueIds = new Set<string>();
      for (const b of bySsId.values()) {
        if (b.venues.size >= 2) for (const v of b.venues) allVenueIds.add(v);
      }
      const venueNameMap = new Map<string, string>();
      if (allVenueIds.size > 0) {
        const { data: venuesData } = await supabase
          .from('venues')
          .select('id, name')
          .in('id', Array.from(allVenueIds));
        for (const v of (venuesData || [])) venueNameMap.set(v.id, v.name);
      }

      for (const [ssIdStr, bucket] of bySsId.entries()) {
        try {
          if (bucket.venues.size < 2) continue;
          if (bucket.exempt) {
            for (const vid of bucket.venues) {
              logSkipExempt(vid, Array.from(bucket.empIds)[0] ?? null, undefined, bucket.exemptReason, 'multi_location');
            }
            continue;
          }
          const venueList = Array.from(bucket.venues);
          const venueNamesList = venueList.map((vid) => venueNameMap.get(vid) || vid.slice(0, 8));
          const namesJoined = venueNamesList.join(', ');
          const empIdsList = Array.from(bucket.empIds);

          // Emit one insight per affected venue with venue-scoped dedupe.
          for (const vid of venueList) {
            const empIdForVenue = empIdsList.find(Boolean) ?? null;
            const title = `Multi-location shifts — ${bucket.name} — week of ${isoWeekStart}`;
            const dedupe = `multi_loc:${vid}:${ssIdStr}:${isoWeekStart}`;
            const otherVenues = venueNamesList.filter((n) => n !== (venueNameMap.get(vid) || vid.slice(0, 8))).join(', ');

            const result = await upsertComplianceInsight(supabase, {
              bar_id: vid, venue_id: vid,
              pillar: 'Labor', insight_type: 'Info', severity: 'Low',
              title,
              summary: `${bucket.name} worked at ${bucket.venues.size} venues this week (${namesJoined}). Confirm cross-venue scheduling is intentional and OT is being tracked across the combined hours.`,
              detail: `${bucket.name} also worked at: ${otherVenues || '—'}. Combined hours across venues may push the employee into OT even when each venue's hours look fine in isolation.`,
              source_type: `Toast Time Entries — cross-venue — week of ${isoWeekStart}`,
              source_date: isoWeekStart,
              source_metric: 'multi_location',
              source_value: `${bucket.venues.size} venues`,
              source_context: JSON.stringify({
                sevenshifts_user_id_int: Number(ssIdStr),
                iso_week_start: isoWeekStart,
                iso_week_end: isoWeekEnd,
                venues: venueList,
                venue_names: venueNamesList,
              }),
              estimated_impact: 'Possible cross-venue OT exposure',
              metric_name: 'distinct_venues_in_week',
              metric_value: String(bucket.venues.size),
              threshold: '2',
              dedupe_hash: dedupe,
              employee_id: empIdForVenue,
              employee_name: bucket.name,
              status: 'New',
              generated_by: 'deterministic_trigger',
              insight_mode: 'weekly',
            });
            if (result === 'inserted' || result === 'updated') multiLocation++;
          }
        } catch (e: any) {
          errors.push(`multi_loc[ss=${ssIdStr}]: ${e?.message || e}`);
        }
      }
    } catch (e: any) {
      errors.push(`multi_loc pass: ${e?.message || e}`);
      console.warn('[LABOR-ALERT] multi-location pass failed:', e?.message || e);
    }
  }

  // ── Detector 7: WEEKLY MEAL-BREAK ROLLUP — one summary card per venue per
  // week aggregating individual late_meal + missed_meal insights. Lets the
  // /insights feed surface compliance volume without flooding the feed with
  // 1-row-per-employee cards (those still live on the Employee Compliance tab
  // and on /audit).
  let mealRollup = 0;
  try {
    mealRollup = await detectWeeklyMealBreakRollup(supabase, venueId, isoWeekStart, options.weekId ?? null);
  } catch (e: any) {
    errors.push(`meal_rollup: ${e?.message || e}`);
    console.warn('[LABOR-ALERT] meal_rollup pass failed:', e?.message || e);
  }

  // ── Detector 9: WEEKLY NO-CLOCKOUT ROLLUP — one summary card per venue per
  // week aggregating individual no_clockout insights. Reduces /insights feed
  // flooding while per-employee rows remain on Compliance tab + /audit.
  let noClockoutRollup = 0;
  try {
    noClockoutRollup = await detectWeeklyNoClockoutRollup(supabase, venueId, isoWeekStart, options.weekId ?? null);
  } catch (e: any) {
    errors.push(`no_clockout_rollup: ${e?.message || e}`);
    console.warn('[LABOR-ALERT] no_clockout_rollup pass failed:', e?.message || e);
  }

  // ── Detector 8: WEEKLY SCHEDULE VARIANCE — replaces daily l3 red-alert path
  let scheduleVariance = 0;
  try {
    scheduleVariance = await detectWeeklyScheduleVariance(supabase, venueId, isoWeekStart, options.weekId ?? null);
  } catch (e: any) {
    errors.push(`schedule_variance: ${e?.message || e}`);
    console.warn('[LABOR-ALERT] schedule_variance pass failed:', e?.message || e);
  }

  console.log(
    `[LABOR-ALERT][weekly] venue=${venueName} week=${isoWeekStart} ot=${overtime} multi_loc=${multiLocation} meal_rollup=${mealRollup} no_clockout_rollup=${noClockoutRollup} sched_var=${scheduleVariance} errors=${errors.length}`
  );

  return { overtime, multiLocation, mealRollup, noClockoutRollup, scheduleVariance, errors };
}

// ---------------------------------------------------------------------------
// ROLLING COMPLIANCE SWEEP — runs daily, fills gaps left by single-date daily
// passes and Monday-only weekly passes:
//   1. Late/Missed meal + No-clockout — re-scan last `windowDays` business
//      dates (catches Toast time entries that synced AFTER their daily run).
//   2. Weekly OT — current ISO week + previous ISO week.
//   3. Multi-location — current ISO week (caller decides if it runs).
//   4. Meal-break tracking config gap — one Medium insight per venue per week
//      when Toast is missing break records or never sets missed=true.
// All detectors are idempotent via dedupe_hash + the partial unique index.
// ---------------------------------------------------------------------------

function pacificToday(): string {
  const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function isoWeekMondayUtc(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? 6 : dow - 1;
  dt.setUTCDate(dt.getUTCDate() - offset);
  return dt.toISOString().slice(0, 10);
}

function shiftDateUtc(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function recentDates(windowDays: number, anchorDate?: string): string[] {
  const anchor = anchorDate || pacificToday();
  const out: string[] = [];
  for (let i = 1; i <= windowDays; i++) out.push(shiftDateUtc(anchor, -i));
  return out;
}

export async function runRollingComplianceSweep(
  supabase: SupabaseClient,
  venueId: string,
  options: {
    windowDays?: number;
    runMultiLocation?: boolean;
    weekId?: string | null;
    anchorDate?: string; // for backfill — defaults to Pacific today
  } = {}
): Promise<{
  lateMeal: number; missedMeal: number; noClockout: number;
  overtimeCurrent: number; overtimePrevious: number;
  multiLocation: number; configGap: number; mealRollup: number; noClockoutRollup: number;
  errors: string[];
}> {
  const windowDays = Math.max(1, options.windowDays ?? 7);
  const errors: string[] = [];
  let lateMeal = 0, missedMeal = 0, noClockout = 0;
  let overtimeCurrent = 0, overtimePrevious = 0, multiLocation = 0;
  let configGap = 0, mealRollup = 0, noClockoutRollup = 0;

  const anchor = options.anchorDate || pacificToday();
  const dates = recentDates(windowDays, anchor);
  for (const d of dates) {
    try {
      const r = await runDailyLaborAlerts(supabase, venueId, d);
      lateMeal += r.lateMeal; missedMeal += r.missedMeal; noClockout += r.noClockout;
      if (r.errors.length) errors.push(...r.errors.map((e) => `${d}: ${e}`));
    } catch (e: any) {
      errors.push(`rolling_daily[${d}]: ${e?.message || e}`);
    }
  }

  // Scan enough ISO weeks to fully cover windowDays. Default 7d → 2 weeks
  // (current + previous). 30d backfill → 5 weeks, so OT alerts aren't missed
  // for weeks that fell outside the original 2-week look-back.
  // Multi-location stays current-week-only to avoid re-emitting historical
  // cross-venue alerts during backfill.
  const currentWeekMon = isoWeekMondayUtc(anchor);
  const weeksToScan = Math.max(2, Math.ceil(windowDays / 7) + 1);
  for (let i = 0; i < weeksToScan; i++) {
    const wkMon = shiftDateUtc(currentWeekMon, -7 * i);
    const isCurrent = i === 0;
    try {
      const r = await runWeeklyLaborAlerts(supabase, venueId, wkMon, {
        runMultiLocation: isCurrent ? (options.runMultiLocation ?? false) : false,
        weekId:           isCurrent ? (options.weekId ?? null)           : null,
      });
      if (isCurrent) {
        overtimeCurrent = r.overtime;
        multiLocation += r.multiLocation;
      } else if (i === 1) {
        overtimePrevious = r.overtime;
      } else {
        overtimePrevious += r.overtime; // older backfilled weeks roll into prev counter
      }
      mealRollup += r.mealRollup || 0;
      noClockoutRollup += r.noClockoutRollup || 0;
      if (r.errors.length) errors.push(...r.errors.map((e) => `week[${wkMon}]: ${e}`));
    } catch (e: any) {
      errors.push(`week_pass[${wkMon}]: ${e?.message || e}`);
    }
  }

  try {
    configGap = await detectMealBreakConfigGap(supabase, venueId, currentWeekMon);
  } catch (e: any) {
    errors.push(`config_gap: ${e?.message || e}`);
  }

  console.log(`[LABOR-ALERT][rolling] venue=${venueId} window=${windowDays}d late=${lateMeal} missed=${missedMeal} noclock=${noClockout} ot_cur=${overtimeCurrent} ot_prev=${overtimePrevious} multi=${multiLocation} gap=${configGap} meal_rollup=${mealRollup} no_clockout_rollup=${noClockoutRollup} errs=${errors.length}`);
  return { lateMeal, missedMeal, noClockout, overtimeCurrent, overtimePrevious, multiLocation, configGap, mealRollup, noClockoutRollup, errors };
}

// ---------------------------------------------------------------------------
// Detector 6: Meal-break tracking configuration gap.
// Fires ONE Medium insight per venue per ISO week if last 30 days had ≥10
// shifts of ≥6h but ZERO breaks recorded with missed=true. This is almost
// always a Toast configuration gap, not perfect compliance — surface it so
// the GM can fix Toast.
// ---------------------------------------------------------------------------
async function detectMealBreakConfigGap(
  supabase: SupabaseClient,
  venueId: string,
  isoWeekStart: string
): Promise<number> {
  const venueName = await resolveVenueName(supabase, venueId);
  const sinceStr = shiftDateUtc(isoWeekStart, -30);

  const { data: shifts, error } = await supabase
    .from('time_entries')
    .select('id, in_date, out_date, time_entry_breaks ( id, missed )')
    .eq('venue_id', venueId)
    .eq('deleted', false)
    .gte('business_date', sinceStr);
  if (error) throw error;

  let longShifts = 0, longShiftsWithoutAnyBreak = 0, missedFlagsRecorded = 0, totalBreakRows = 0;
  for (const s of (shifts || []) as any[]) {
    const hrs = durationHours(s.in_date, s.out_date);
    if (hrs == null || hrs < 6) continue;
    longShifts++;
    const breaks = (s.time_entry_breaks || []) as any[];
    totalBreakRows += breaks.length;
    if (breaks.length === 0) longShiftsWithoutAnyBreak++;
    for (const b of breaks) if (b.missed === true) missedFlagsRecorded++;
  }

  if (longShifts < 10) return 0;

  // REWRITTEN GATE (was: "fire if missedFlagsRecorded === 0").
  // The old gate fired false positives at venues like Aero where Toast IS
  // tracking breaks (250 break rows / 243 long shifts) but managers never
  // override with the missed=true flag (which is rare by design).
  // New gate: only fire if the MAJORITY of long shifts have ZERO break
  // records at all AND no late_meal/missed_meal insights have fired in the
  // same 30-day window (existence of either proves tracking is working).
  const noBreakRatio = longShifts > 0 ? longShiftsWithoutAnyBreak / longShifts : 0;
  if (noBreakRatio < 0.5) return 0;

  // Cross-check: if any individual meal-break violation insight exists in
  // the same window, tracking is provably working — never fire.
  const { count: violationCount } = await supabase
    .from('insights')
    .select('id', { count: 'exact', head: true })
    .eq('bar_id', venueId)
    .in('source_metric', ['late_meal', 'missed_meal'])
    .gte('source_date', sinceStr);
  if ((violationCount || 0) > 0) return 0;

  const title = `Toast meal-break tracking misconfigured — last 30 days`;
  const dedupe = `meal_config_gap:${venueId}:${isoWeekStart}`;
  const result = await upsertComplianceInsight(supabase, {
    bar_id: venueId, venue_id: venueId,
    pillar: 'Labor', insight_type: 'Issue', severity: 'Medium',
    title,
    summary: `${venueName} had ${longShifts} shifts of 6h+ in the last 30 days, ${longShiftsWithoutAnyBreak} of which (${Math.round(noBreakRatio * 100)}%) recorded no break punches at all. Toast also recorded zero "missed meal break" flags and no late_meal/missed_meal violations have fired. Almost certainly a Toast time-tracking configuration gap — meal-break compliance alerts cannot fire for this venue until it is fixed.`,
    detail: `BarPulse's CA meal-break detectors rely on Toast recording each break's start/end. When the majority of 6h+ shifts have no break rows AND no individual meal-break violations have been detected, employees aren't punching breaks in Toast (or the job role doesn't require breaks). Fix: enable break punching in Toast for the relevant job roles, then BarPulse will start surfacing real meal-break violations within 24h.`,
    source_type: `Toast Time Entries — ${venueName} — last 30 days`,
    source_date: isoWeekStart,
    source_metric: 'meal_tracking_gap',
    source_value: `${longShiftsWithoutAnyBreak}/${longShifts} long shifts with no breaks`,
    source_context: JSON.stringify({
      window_start: sinceStr,
      long_shifts: longShifts,
      long_shifts_without_any_break: longShiftsWithoutAnyBreak,
      no_break_ratio: noBreakRatio,
      total_break_rows: totalBreakRows,
      missed_flags_recorded: missedFlagsRecorded,
    }),
    estimated_impact: 'Meal-break compliance is not visible at this venue — payroll exposure is uncapped',
    metric_name: 'missed_meal_flags_30d',
    metric_value: '0',
    threshold: '>0 expected when long_shifts >= 10',
    dedupe_hash: dedupe,
    employee_id: null,
    employee_name: null,
    status: 'New',
    generated_by: 'deterministic_trigger',
    insight_mode: 'weekly',
  });
  return (result === 'inserted' || result === 'updated') ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Detector 7: Weekly meal-break ROLLUP.
// Aggregates the individual late_meal + missed_meal insights for one venue +
// one ISO week into a single summary card. Keeps the /insights main feed
// readable while the per-employee rows still live on the Employee profile
// Compliance tab and on /audit. Idempotent via dedupe_hash + the partial
// unique index on insights.dedupe_hash WHERE generated_by='deterministic_trigger'.
// ---------------------------------------------------------------------------
async function detectWeeklyMealBreakRollup(
  supabase: SupabaseClient,
  venueId: string,
  isoWeekStart: string,
  weekId: string | null,
): Promise<number> {
  const isoMon = new Date(isoWeekStart + 'T12:00:00Z');
  const isoSunDate = new Date(isoMon);
  isoSunDate.setUTCDate(isoMon.getUTCDate() + 6);
  const isoWeekEnd = isoSunDate.toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from('insights')
    .select('id, source_metric, employee_id, employee_name, source_date')
    .eq('bar_id', venueId)
    .eq('generated_by', 'deterministic_trigger')
    .in('source_metric', ['late_meal', 'missed_meal'])
    .neq('status', 'Dismissed')
    .gte('source_date', isoWeekStart)
    .lte('source_date', isoWeekEnd);
  if (error) throw error;

  const list = (rows || []) as Array<{ source_metric: string; employee_id: string | null; employee_name: string | null }>;
  if (list.length === 0) return 0;

  let lateCount = 0, missedCount = 0;
  const empCounts = new Map<string, { name: string; n: number }>();
  for (const r of list) {
    if (r.source_metric === 'late_meal') lateCount++;
    if (r.source_metric === 'missed_meal') missedCount++;
    const key = r.employee_id || `name:${r.employee_name || 'Unknown'}`;
    const prev = empCounts.get(key);
    empCounts.set(key, { name: r.employee_name || 'Unknown employee', n: (prev?.n || 0) + 1 });
  }
  const total = lateCount + missedCount;
  const distinctEmployees = empCounts.size;

  const sortedEmps = Array.from(empCounts.values()).sort((a, b) => b.n - a.n);
  const top3 = sortedEmps.slice(0, 3).map((e) => `${e.name} (${e.n})`).join(', ');

  const venueName = await resolveVenueName(supabase, venueId);
  const severity = (total >= 10 || missedCount >= 3) ? 'High' : 'Medium';

  // Inline employee names when count is small enough to be useful.
  // ≤4 employees: name them all in title + detail.
  // 5+ employees: top 3 + "and N others" pattern.
  let title: string;
  let detail: string;
  if (distinctEmployees <= 4) {
    const named = sortedEmps.map((e) => `${e.name}${e.n > 1 ? ` (${e.n})` : ''}`).join(', ');
    title = `${venueName}: ${total} meal break violation${total === 1 ? '' : 's'} by ${named} — week of ${isoWeekStart}`;
    detail = `${total} meal break violation${total === 1 ? '' : 's'} (${missedCount} missed, ${lateCount} late) at ${venueName} during the week of ${isoWeekStart}.\n\nEmployees:\n${sortedEmps.map((e) => `• ${e.name} — ${e.n} violation${e.n === 1 ? '' : 's'}`).join('\n')}\n\nReview the shift detail on each employee's Compliance tab.`;
  } else {
    const others = distinctEmployees - 3;
    title = `${venueName}: ${total} meal break violations this week across ${distinctEmployees} employees`;
    detail = `${total} meal break violations (${missedCount} missed, ${lateCount} late) at ${venueName} during the week of ${isoWeekStart}.\n\nTop offenders:\n${sortedEmps.slice(0, 3).map((e) => `• ${e.name} — ${e.n} violations`).join('\n')}\n…and ${others} other${others === 1 ? '' : 's'}. See the venue Employees view filtered by compliance for the full list.`;
  }
  const dedupe = `meal_break_weekly_rollup:${venueId}:${isoWeekStart}`;

  const result = await upsertComplianceInsight(supabase, {
    bar_id: venueId,
    venue_id: venueId,
    pillar: 'Labor',
    insight_type: 'Issue',
    severity,
    title,
    summary: `${venueName} had ${total} meal break violation${total === 1 ? '' : 's'} (${missedCount} missed, ${lateCount} late) week of ${isoWeekStart} across ${distinctEmployees} employee${distinctEmployees === 1 ? '' : 's'}. Top: ${top3 || '—'}.`,
    detail,
    source_type: `BarPulse Compliance — ${venueName} — week of ${isoWeekStart}`,
    source_date: isoWeekStart,
    source_metric: 'meal_break_weekly_rollup',
    source_value: `${total} (${missedCount} missed / ${lateCount} late)`,
    source_context: JSON.stringify({
      iso_week_start: isoWeekStart,
      iso_week_end: isoWeekEnd,
      missed: missedCount,
      late: lateCount,
      distinct_employees: distinctEmployees,
    }),
    estimated_impact: missedCount > 0 ? `Up to ${missedCount}h §226.7 premium pay this week` : null,
    metric_name: 'meal_break_violations_week',
    metric_value: String(total),
    threshold: '0',
    dedupe_hash: dedupe,
    employee_id: null,
    employee_name: null,
    status: 'New',
    generated_by: 'deterministic_trigger',
    insight_mode: 'weekly',
    week_id: weekId,
  });
  const rolled = (result === 'inserted' || result === 'updated') ? 1 : 0;

  // ── Per-employee escalation: any employee with >= 5 meal-break violations
  //    in the week gets a dedicated High-severity card. Hidden from the main
  //    /insights feed by default (whitelisted by source_metric on the read
  //    side); surfaces on the Employee profile + audit page. We also let it
  //    pass the main feed via the readout whitelist for escalations.
  let escalations = 0;
  for (const [key, info] of empCounts.entries()) {
    if (info.n < 5) continue;
    if (!key || key.startsWith('name:')) continue; // need employee_id
    const empId = key;
    const dedupeEsc = `meal_break_emp_escalation:${venueId}:${empId}:${isoWeekStart}`;
    const titleEsc = `${info.name}: ${info.n} meal break violations — week of ${isoWeekStart}`;
    const escResult = await upsertComplianceInsight(supabase, {
      bar_id: venueId,
      venue_id: venueId,
      pillar: 'Labor',
      insight_type: 'Issue',
      severity: 'High',
      title: titleEsc,
      summary: `${info.name} accumulated ${info.n} meal break violations at ${venueName} during the week of ${isoWeekStart}. Pattern requires manager intervention — review schedule density and confirm break enforcement.`,
      detail: `Threshold: ≥5 violations in one ISO week.\nEmployee: ${info.name}\nVenue: ${venueName}\nWeek: ${isoWeekStart} → ${isoWeekEnd}\nTotal violations: ${info.n}\n\nReview the employee's Compliance tab for individual late_meal / missed_meal incidents.`,
      source_type: `BarPulse Compliance — ${venueName} — week of ${isoWeekStart}`,
      source_date: isoWeekStart,
      source_metric: 'meal_break_employee_escalation',
      source_value: `${info.n} violations`,
      source_context: JSON.stringify({
        iso_week_start: isoWeekStart,
        iso_week_end: isoWeekEnd,
        employee_id: empId,
        violations: info.n,
      }),
      estimated_impact: null,
      metric_name: 'meal_break_violations_employee_week',
      metric_value: String(info.n),
      threshold: '5',
      dedupe_hash: dedupeEsc,
      employee_id: empId,
      employee_name: info.name,
      status: 'New',
      generated_by: 'deterministic_trigger',
      insight_mode: 'weekly',
      week_id: weekId,
    });
    if (escResult === 'inserted' || escResult === 'updated') escalations++;
  }

  return rolled + escalations;
}

// ---------------------------------------------------------------------------
// Detector 9: Weekly NO-CLOCKOUT ROLLUP.
// Mirrors detectWeeklyMealBreakRollup. Aggregates open no_clockout insights
// for one venue + one ISO week into a single summary card. Per-employee
// escalation card emitted for any employee with >= 3 events in the week.
// Read-side filter in fetchInsightCardsFromSupabase hides raw no_clockout
// rows from the main feed; rollup + escalation surface naturally.
// ---------------------------------------------------------------------------
async function detectWeeklyNoClockoutRollup(
  supabase: SupabaseClient,
  venueId: string,
  isoWeekStart: string,
  weekId: string | null,
): Promise<number> {
  const isoMon = new Date(isoWeekStart + 'T12:00:00Z');
  const isoSunDate = new Date(isoMon);
  isoSunDate.setUTCDate(isoMon.getUTCDate() + 6);
  const isoWeekEnd = isoSunDate.toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from('insights')
    .select('id, source_metric, source_context, employee_id, employee_name, source_date')
    .eq('bar_id', venueId)
    .eq('generated_by', 'deterministic_trigger')
    .eq('source_metric', 'no_clockout')
    .neq('status', 'Dismissed')
    .gte('source_date', isoWeekStart)
    .lte('source_date', isoWeekEnd);
  if (error) throw error;

  const list = (rows || []) as Array<{
    source_context: string | null;
    employee_id: string | null;
    employee_name: string | null;
  }>;
  if (list.length === 0) return 0;

  let classCCount = 0;
  const empCounts = new Map<string, { name: string; n: number }>();
  for (const r of list) {
    let isClassC = false;
    if (r.source_context) {
      try {
        const ctx = JSON.parse(r.source_context);
        if (ctx && ctx.auto_clocked_out === true) isClassC = true;
      } catch { /* ignore */ }
    }
    if (isClassC) classCCount++;
    const key = r.employee_id || `name:${r.employee_name || 'Unknown'}`;
    const prev = empCounts.get(key);
    empCounts.set(key, { name: r.employee_name || 'Unknown employee', n: (prev?.n || 0) + 1 });
  }
  const total = list.length;
  const distinctEmployees = empCounts.size;

  const sortedEmps = Array.from(empCounts.values()).sort((a, b) => b.n - a.n);
  const top3 = sortedEmps.slice(0, 3).map((e) => `${e.name} (${e.n})`).join(', ');

  const venueName = await resolveVenueName(supabase, venueId);
  const severity = (total >= 5 || classCCount >= 3) ? 'High' : 'Medium';

  // Inline employee names when count is small enough to be useful.
  let title: string;
  let detail: string;
  const classCNote = classCCount > 0
    ? ` ${classCCount} of these were Toast 4am force-closes (auto_clocked_out=true) — real management failures, not routine late-night behavior.`
    : '';
  if (distinctEmployees <= 4) {
    const named = sortedEmps.map((e) => `${e.name}${e.n > 1 ? ` (${e.n})` : ''}`).join(', ');
    title = `${venueName}: ${total} no-clockout event${total === 1 ? '' : 's'} by ${named} — week of ${isoWeekStart}`;
    detail = `${total} no-clockout event${total === 1 ? '' : 's'} at ${venueName} during the week of ${isoWeekStart}.\n\nEmployees:\n${sortedEmps.map((e) => `• ${e.name} — ${e.n} event${e.n === 1 ? '' : 's'}`).join('\n')}\n\nReview the shift detail on each employee's Compliance tab.${classCNote}`;
  } else {
    const others = distinctEmployees - 3;
    title = `${venueName}: ${total} no-clockout events this week across ${distinctEmployees} employees`;
    detail = `${total} no-clockout events at ${venueName} during the week of ${isoWeekStart}.\n\nTop offenders:\n${sortedEmps.slice(0, 3).map((e) => `• ${e.name} — ${e.n} events`).join('\n')}\n…and ${others} other${others === 1 ? '' : 's'}. See the venue Employees view filtered by compliance for the full list.${classCNote}`;
  }
  const dedupe = `no_clockout_weekly_rollup:${venueId}:${isoWeekStart}`;

  const result = await upsertComplianceInsight(supabase, {
    bar_id: venueId,
    venue_id: venueId,
    pillar: 'Labor',
    insight_type: 'Issue',
    severity,
    title,
    summary: `${venueName} had ${total} no-clockout event${total === 1 ? '' : 's'} (${classCCount} Toast 4am force-close, ${total - classCCount} other) week of ${isoWeekStart} across ${distinctEmployees} employee${distinctEmployees === 1 ? '' : 's'}. Top: ${top3 || '—'}.`,
    detail,
    source_type: `BarPulse Compliance — ${venueName} — week of ${isoWeekStart}`,
    source_date: isoWeekStart,
    source_metric: 'no_clockout_weekly_rollup',
    source_value: `${total} (${classCCount} Class C / ${total - classCCount} other)`,
    source_context: JSON.stringify({
      iso_week_start: isoWeekStart,
      iso_week_end: isoWeekEnd,
      total,
      class_c: classCCount,
      distinct_employees: distinctEmployees,
    }),
    estimated_impact: null,
    metric_name: 'no_clockout_events_week',
    metric_value: String(total),
    threshold: '0',
    dedupe_hash: dedupe,
    employee_id: null,
    employee_name: null,
    status: 'New',
    generated_by: 'deterministic_trigger',
    insight_mode: 'weekly',
    week_id: weekId,
  });
  const rolled = (result === 'inserted' || result === 'updated') ? 1 : 0;

  // ── Per-employee escalation: any employee with >= 3 no_clockout events in
  //    the week gets a dedicated High-severity card. Surfaces in main feed.
  let escalations = 0;
  for (const [key, info] of empCounts.entries()) {
    if (info.n < 3) continue;
    if (!key || key.startsWith('name:')) continue; // need employee_id
    const empId = key;
    const dedupeEsc = `no_clockout_emp_escalation:${venueId}:${empId}:${isoWeekStart}`;
    const titleEsc = `${info.name}: ${info.n} no-clockout events — week of ${isoWeekStart}`;
    const escResult = await upsertComplianceInsight(supabase, {
      bar_id: venueId,
      venue_id: venueId,
      pillar: 'Labor',
      insight_type: 'Issue',
      severity: 'High',
      title: titleEsc,
      summary: `${info.name} had ${info.n} no-clockout events at ${venueName} during the week of ${isoWeekStart}. Pattern requires manager intervention — coach on clockout discipline and verify schedules.`,
      detail: `Threshold: ≥3 no-clockout events in one ISO week.\nEmployee: ${info.name}\nVenue: ${venueName}\nWeek: ${isoWeekStart} → ${isoWeekEnd}\nTotal events: ${info.n}\n\nReview the employee's Compliance tab for individual no_clockout incidents.`,
      source_type: `BarPulse Compliance — ${venueName} — week of ${isoWeekStart}`,
      source_date: isoWeekStart,
      source_metric: 'no_clockout_employee_escalation',
      source_value: `${info.n} events`,
      source_context: JSON.stringify({
        iso_week_start: isoWeekStart,
        iso_week_end: isoWeekEnd,
        employee_id: empId,
        events: info.n,
      }),
      estimated_impact: null,
      metric_name: 'no_clockout_events_employee_week',
      metric_value: String(info.n),
      threshold: '3',
      dedupe_hash: dedupeEsc,
      employee_id: empId,
      employee_name: info.name,
      status: 'New',
      generated_by: 'deterministic_trigger',
      insight_mode: 'weekly',
      week_id: weekId,
    });
    if (escResult === 'inserted' || escResult === 'updated') escalations++;
  }

  return rolled + escalations;
}

// ---------------------------------------------------------------------------
// Detector 8: Weekly SCHEDULE VARIANCE alert.
// Reads weekly_core.schedule_variance_pct vs period_config.schedule_variance_target
// for the closed ISO week. Fires Medium when |variance| > target, High when
// |variance| > 2 * target. Replaces the daily l3_score red-alert path (removed
// from generate-daily-insights Trigger 6) which produced repeat noise.
// ---------------------------------------------------------------------------
async function detectWeeklyScheduleVariance(
  supabase: SupabaseClient,
  venueId: string,
  isoWeekStart: string,
  weekId: string | null,
): Promise<number> {
  const { data: wc, error: wcErr } = await supabase
    .from('weekly_core')
    .select('schedule_variance_pct, scheduled_hours')
    .eq('bar_id', venueId)
    .eq('week_start', isoWeekStart)
    .maybeSingle();
  if (wcErr || !wc || wc.schedule_variance_pct == null) return 0;

  const { data: pc } = await supabase
    .from('period_config')
    .select('schedule_variance_target')
    .eq('bar_id', venueId)
    .maybeSingle();
  const target = Number(pc?.schedule_variance_target ?? 0.10);
  const variance = Number(wc.schedule_variance_pct);
  const absVar = Math.abs(variance);
  if (absVar <= target) return 0;

  const severity = absVar > target * 2 ? 'High' : 'Medium';
  const direction = variance > 0 ? 'over' : 'under';
  const venueName = await resolveVenueName(supabase, venueId);
  const pctStr = `${(variance * 100).toFixed(1)}%`;
  const targetStr = `±${(target * 100).toFixed(0)}%`;
  const dedupe = `schedule_variance_weekly:${venueId}:${isoWeekStart}`;
  const title = `Schedule variance ${pctStr} (${direction}) — ${venueName} — week of ${isoWeekStart}`;

  const result = await upsertComplianceInsight(supabase, {
    bar_id: venueId,
    venue_id: venueId,
    pillar: 'Labor',
    insight_type: 'Issue',
    severity,
    title,
    summary: `${venueName} actual labor hours ran ${pctStr} ${direction} schedule for the week of ${isoWeekStart} (target ${targetStr}). Scheduled ${wc.scheduled_hours ?? '—'}h.`,
    detail: `Source: weekly_core.schedule_variance_pct\nWeek: ${isoWeekStart}\nVariance: ${pctStr} (${direction} schedule)\nTarget: ${targetStr}\nScheduled hours: ${wc.scheduled_hours ?? '—'}\n\nReview clock-in / clock-out enforcement and call-in / send-home decisions for the week.`,
    source_type: `7shifts — ${venueName} — week of ${isoWeekStart}`,
    source_date: isoWeekStart,
    source_metric: 'schedule_variance_weekly',
    source_value: pctStr,
    source_context: JSON.stringify({
      iso_week_start: isoWeekStart,
      variance_pct: variance,
      target_pct: target,
      scheduled_hours: wc.scheduled_hours,
    }),
    estimated_impact: null,
    metric_name: 'schedule_variance_pct',
    metric_value: String(variance),
    threshold: String(target),
    dedupe_hash: dedupe,
    employee_id: null,
    employee_name: null,
    status: 'New',
    generated_by: 'deterministic_trigger',
    insight_mode: 'weekly',
    week_id: weekId,
  });
  return (result === 'inserted' || result === 'updated') ? 1 : 0;
}
