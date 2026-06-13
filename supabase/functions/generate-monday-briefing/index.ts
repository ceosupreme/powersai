import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runWeeklyLaborAlerts } from "../_shared/labor-compliance-alerts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nowPacific(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

function normalizeWinsOutput(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.replace(/^[\s•\-]+/, "").trim())
      .filter(Boolean)
      .map((item) => `• ${item}`)
      .join("\n");
  }

  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return normalizeWinsOutput(parsed);
    }
  } catch {
    // Use raw string below.
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-]+/, "").trim())
    .filter(Boolean)
    .map((line) => `• ${line}`)
    .join("\n");
}

function getPreviousWeek(): { weekStart: string; weekEnd: string } {
  const now = nowPacific();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysToLastSun = dayOfWeek === 0 ? 7 : dayOfWeek;
  const lastSun = new Date(now);
  lastSun.setDate(now.getDate() - daysToLastSun);
  const y = lastSun.getFullYear();
  const m = String(lastSun.getMonth() + 1).padStart(2, "0");
  const d = String(lastSun.getDate()).padStart(2, "0");
  const weekEnd = `${y}-${m}-${d}`;
  const weekStart = addDays(weekEnd, -6); // Monday
  return { weekStart, weekEnd };
}

import { callAI as sharedCallAI } from "../_shared/ai-models.ts";

async function callAI(
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number,
  venueId?: string | null,
): Promise<string> {
  // System message (if present as first message) is hoisted to top-level for
  // Anthropic compatibility; sharedCallAI handles the split transparently.
  const sys = messages.find((m) => m.role === "system")?.content;
  const conv = messages.filter((m) => m.role !== "system") as { role: "user" | "assistant"; content: string }[];
  const r = await sharedCallAI({
    taskType: "user_facing_narrative",
    functionName: "generate-monday-briefing",
    venueId: venueId ?? null,
    system: sys,
    messages: conv,
    temperature,
    maxTokens,
  });
  console.log(
    `[monday-briefing] callAI ok: model=${r.modelId} maxTokens=${maxTokens} ` +
    `respChars=${r.text.length} in_tok=${r.usage.input_tokens} out_tok=${r.usage.output_tokens}`,
  );
  return r.text;
}

// ── Phase 1: Weekly Insights ──────────────────────────────────────

// Normalize a name for matching: strip diacritics, lowercase, collapse whitespace.
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

type WeekLogRow = {
  ref: string;             // "L1", "L2", ...
  id: string;
  log_type: string;        // gm_log | lead_log | shift_log
  date: string;
  author_name: string;
  snippet: string;
};

function snippetFromLog(row: any, fields: string[]): string {
  const parts: string[] = [];
  for (const f of fields) {
    const v = row?.[f];
    if (!v) continue;
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v) || typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch { /* skip */ }
    }
  }
  return parts.join(' | ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function fetchWeekLogs(
  supabase: any, barId: string, weekStart: string, weekEnd: string
): Promise<WeekLogRow[]> {
  const out: WeekLogRow[] = [];
  let n = 0;
  const push = (id: string, log_type: string, date: string, author_name: string, snippet: string) => {
    if (!id || !date) return;
    n += 1;
    out.push({ ref: `L${n}`, id, log_type, date, author_name: author_name || 'Unknown', snippet });
  };

  const [gm, lead, shift] = await Promise.all([
    supabase.from('gm_logs')
      .select('id, date, author_name, raw_text, overall_shift_summary, summary_notes, wins, incidents, for_chad, challenges_and_concerns, recognition_given, coaching_given')
      .eq('bar_id', barId).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('lead_logs')
      .select('id, date, shift, author_name, raw_text, business_flow, customer_issues, shoutouts, issues, improvement_suggestions, staffing_levels')
      .eq('bar_id', barId).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('shift_logs')
      .select('id, date, log_type, author_name, raw_text, shift_summary, shift_wins, shift_challenges, handoff_notes, headlines, description, callout_names')
      .eq('bar_id', barId).gte('date', weekStart).lte('date', weekEnd),
  ]);

  for (const r of (gm.data || [])) {
    push(r.id, 'gm_log', r.date, r.author_name,
      snippetFromLog(r, ['overall_shift_summary','summary_notes','wins','incidents','for_chad','challenges_and_concerns','recognition_given','coaching_given','raw_text']));
  }
  for (const r of (lead.data || [])) {
    push(r.id, 'lead_log', r.date, r.author_name,
      snippetFromLog(r, ['business_flow','shoutouts','issues','customer_issues','improvement_suggestions','staffing_levels','raw_text']));
  }
  for (const r of (shift.data || [])) {
    push(r.id, r.log_type ? `shift_log:${r.log_type}` : 'shift_log', r.date, r.author_name,
      snippetFromLog(r, ['shift_summary','headlines','description','shift_wins','shift_challenges','handoff_notes','callout_names','raw_text']));
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  // Re-number after sort so refs are stable in the prompt order.
  return out.map((r, i) => ({ ...r, ref: `L${i + 1}` }));
}

function inferSystem(sourceMetric: string | null): string {
  if (!sourceMetric) return "BarPulse Analysis";
  const m = sourceMetric.toLowerCase();
  if (["net_sales", "gross_sales", "revenue", "avg_check", "transactions", "bev_sales", "food_sales", "comps", "voids", "void_pct", "comps_pct", "discounts", "refunds", "tip_pct", "tips"].some(k => m.includes(k))) return "Toast POS";
  if (["labor", "splh", "overtime", "foh_hours", "boh_hours", "worked_hours", "scheduled_hours", "labor_pct", "labor_cost"].some(k => m.includes(k))) return "Toast POS";
  if (["engage_", "callout", "no_show", "late", "shift_bid", "dropped_shift", "tenure"].some(k => m.includes(k))) return "7shifts";
  if (["google_rating", "google_review"].some(k => m.includes(k))) return "Google Reviews";
  if (["missing", "variance", "pour_cost", "inventory", "sculpture"].some(k => m.includes(k))) return "Sculpture Hospitality";
  if (["task_completion", "log_completion", "secret_shop", "coaching"].some(k => m.includes(k))) return "BarPulse Logs";
  return "BarPulse Analysis";
}

async function generateWeeklyInsights(
  supabase: any,
  barId: string,
  weekUuid: string,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  // Fetch venue name for source citations
  const { data: venueRow } = await supabase
    .from("venues")
    .select("name")
    .eq("id", barId)
    .single();
  const venueName = venueRow?.name || barId;

  // ── Per-venue employee roster (for resolving cited_employee_names → ids) ──
  const { data: rosterRows } = await supabase
    .from('employee_profiles')
    .select('id, employee_name, preferred_name, first_name, last_name')
    .eq('venue_id', barId)
    .eq('is_vendor_account', false);
  type RosterEntry = { id: string; canonical: string; tokens: string[] };
  const employeeRoster: RosterEntry[] = (rosterRows || []).map((r: any) => {
    const full = r.employee_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.preferred_name || '';
    const tokens = [r.employee_name, r.preferred_name, r.first_name, r.last_name,
      [r.first_name, r.last_name?.[0]].filter(Boolean).join(' ')]
      .filter(Boolean)
      .map((s: string) => normalizeForMatch(s))
      .filter((s: string) => s.length > 0);
    return { id: r.id, canonical: full, tokens };
  }).filter((r) => r.tokens.length > 0);

  // ── Fetch all logs for the week (gm + lead + shift) ──
  const weekLogs = await fetchWeekLogs(supabase, barId, weekStart, weekEnd);
  const logIndex = new Map<string, WeekLogRow>();
  for (const r of weekLogs) logIndex.set(r.ref, r);
  const logIdToRef = new Map<string, string>();
  for (const r of weekLogs) logIdToRef.set(r.id, r.ref);

  // Fetch daily insights for this week
  const { data: dailyInsights } = await supabase
    .from("insights")
    .select("*")
    .eq("bar_id", barId)
    .eq("week_id", weekUuid);

  // Fetch weekly_core for this week
  const { data: weeklyCore } = await supabase
    .from("weekly_core")
    .select("*")
    .eq("bar_id", barId)
    .eq("week_id", weekUuid)
    .maybeSingle();

  // Fetch previous week's weekly_core
  const prevWeekStart = addDays(weekStart, -7);
  const { data: prevWeek } = await supabase
    .from("weeks")
    .select("id")
    .eq("bar_id", barId)
    .eq("week_start", prevWeekStart)
    .maybeSingle();

  let prevCore = null;
  if (prevWeek?.id) {
    const { data } = await supabase
      .from("weekly_core")
      .select("*")
      .eq("bar_id", barId)
      .eq("week_id", prevWeek.id)
      .maybeSingle();
    prevCore = data;
  }

  const insights = dailyInsights || [];

  // --- Fetch Google review data for this week ---
  const snapshotEndDate = addDays(weekEnd, 7);
  const { data: reviewSnapshots } = await supabase
    .from("review_snapshots")
    .select("google_rating, google_review_count, rating_change, snapshot_date")
    .eq("bar_id", barId)
    .gte("snapshot_date", weekStart)
    .lte("snapshot_date", snapshotEndDate)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: googleReviews } = await supabase
    .from("google_reviews")
    .select("author_name, rating, review_text, publish_time, snapshot_date")
    .eq("bar_id", barId)
    .gte("snapshot_date", weekStart)
    .lte("snapshot_date", snapshotEndDate);

  // Previous week's review count for volume comparison
  const prevSnapEnd = addDays(weekStart, -1);
  const prevSnapStart = addDays(weekStart, -7);
  const { data: prevReviewSnapshot } = await supabase
    .from("review_snapshots")
    .select("google_review_count")
    .eq("bar_id", barId)
    .gte("snapshot_date", prevSnapStart)
    .lte("snapshot_date", prevSnapEnd)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insights.length === 0 && !weeklyCore && !reviewSnapshots) {
    console.log(`No data for bar ${barId} week ${weekStart}, skipping weekly insights`);
    return 0;
  }

  // Build Google Reviews context block
  let googleReviewContext = "";
  if (reviewSnapshots || (googleReviews && googleReviews.length > 0)) {
    const parts: string[] = ["## GOOGLE REVIEWS DATA"];
    if (reviewSnapshots) {
      parts.push(`Current Google Rating: ${reviewSnapshots.google_rating ?? "N/A"}`);
      parts.push(`Total Review Count: ${reviewSnapshots.google_review_count ?? "N/A"}`);
      if (reviewSnapshots.rating_change != null) {
        parts.push(`Rating Change vs Previous: ${reviewSnapshots.rating_change > 0 ? "+" : ""}${reviewSnapshots.rating_change}`);
      }
      if (prevReviewSnapshot?.google_review_count != null && reviewSnapshots.google_review_count != null) {
        const countDiff = reviewSnapshots.google_review_count - prevReviewSnapshot.google_review_count;
        parts.push(`New Reviews This Week: ${countDiff} (prev total: ${prevReviewSnapshot.google_review_count})`);
      }
    }
    const reviews = googleReviews || [];
    const negativeReviews = reviews.filter((r: any) => r.rating <= 3);
    if (negativeReviews.length > 0) {
      parts.push(`\nNEGATIVE REVIEWS (≤3 stars):`);
      for (const r of negativeReviews) {
        parts.push(`- ${r.rating}★ by "${r.author_name}": "${r.review_text || '(no text)'}"`);
      }
    }
    if (reviews.length > 0) {
      parts.push(`\nALL RECENT REVIEWS (${reviews.length}):`);
      for (const r of reviews) {
        parts.push(`- ${r.rating}★ by "${r.author_name}": "${(r.review_text || '(no text)').slice(0, 200)}"`);
      }
    }
    googleReviewContext = "\n\n" + parts.join("\n");
  }

  const systemPrompt = `You are a strategic operations analyst consolidating a week of daily restaurant insights into a focused weekly summary.

YOUR ROLE: You are a strategic analyst preparing a weekly briefing for a bar owner. The owner already has a scorecard with every number. Your job is to tell them:

1. THE STORY OF THE WEEK — Not "revenue was $52K vs $55K target" but "Revenue missed by $3K, driven entirely by Tuesday-Wednesday softness. Weekend was actually 108% of target. The problem is narrow and fixable."

2. WHAT'S CHANGING — "This is the third straight week labor % has improved. It's now within 1 point of target. The scheduling changes from 3 weeks ago are working — don't reverse them."

3. WHAT NEEDS ATTENTION — "Guest complaints appeared in logs on 3 separate days this week, all mentioning wait times. This wasn't flagged as critical on any single day, but the weekly pattern suggests a systemic issue."

4. WHAT TO CELEBRATE — "Saturday's crew delivered $14.8K on 4 people. That's the best SPLH day in 8 weeks. Recognize them."

NEVER produce a weekly insight that just restates a weekly metric vs target without context. The scorecard already shows that. Every insight should include either a WHY, a PATTERN, a CONNECTION, or a RECOMMENDED ACTION that the scorecard alone cannot provide. If the data doesn't support a deeper explanation, it's okay to flag a significant miss or win — but say what's unknown and what to investigate rather than just restating the number.

YOUR JOB: Take the raw daily insights (which may be repetitive) and produce a SMALL, PRIORITIZED set of consolidated weekly insights that tell the story of this venue's week.

HARD CAP:
- Return AT MOST 8 insights total
- Prefer 5-6 insights when possible
- If the week is uneventful, return 0-2 insights only
- Prioritize the few items that most clearly cost money, create guest/operational risk, or require a management decision this week

CONSOLIDATION RULES:
1. If the same issue appears on multiple days, MERGE it into one weekly insight that identifies the PATTERN
2. CONNECT related insights across pillars — if labor was high AND sales were low on the same days, that's ONE insight about efficiency, not two separate ones
3. RANK by impact — lead with the insight that has the biggest dollar or operational impact
4. Compare to previous week where data is available to identify meaningful change, not filler commentary
5. Positive momentum belongs in wins/briefing, not in active insights unless immediate recognition or reinforcement is truly warranted

STRICT REJECTION RULES — DO NOT RETURN AN INSIGHT IF:
- the metric is improving and already stable/healthy
- the item only says a metric was above/below target without deeper pattern, root cause, risk, or decision value
- the best action is "monitor", "document", "reinforce", "keep an eye on", "continue", or "stay the course"
- it is a generic positive trend that belongs in wins instead of insights
- it does not identify a concrete cost, risk, or decision point
- the movement is slight, marginal, modest, stable, or otherwise low-stakes
- the language sounds like "slightly improved", "small increase", "edged up", "ticked up", "held steady", "remained solid", "modest lift", or "minor improvement"
- the story is basically "things are a bit better" or "things are roughly fine" without a meaningful management decision this week

For each consolidated insight:
- pillar: "Revenue" | "Labor" | "Operations" | "Guest Experience"
- severity: "Critical" | "High" | "Medium" | "Low"
- insight_type: "Issue" | "Trend" | "Pattern" | "Staff Recognition"
- title: max 80 chars, specific (include numbers)
- summary: one sentence
- detail: 2-3 sentences with specific numbers and context
- source_metric: primary metric (e.g., "labor_pct", "net_sales")
- days_affected: number of days this issue appeared (for pattern detection)
- suggested_action: { title, detail, estimated_minutes, priority, suggested_assignee } — REQUIRED only when the issue needs intervention this week. If the best action is passive, do not return the insight at all.

=== THE ACTION ===

The suggested_action is your recommendation to the venue's GM — someone who will read it and act on it. Treat it the way an experienced operations advisor would: you have looked at the week, and you are telling them what to do about it.

Reason from the situation to the most likely cause and the specific fix you would make if this were your venue. The action is your conclusion — not an assignment for the GM to go figure out what you were supposed to figure out. Telling the GM to "investigate," "review," or "look into" something is only acceptable if the action also says what you expect them to find and what to do about it.

When the evidence genuinely does not let you determine the cause, do not stop at "investigate." Give the GM the likely scenarios and what to do in each: "If the Monday drop was traffic-driven, the issue is demand — check whether the competing event recurs and adjust Monday staffing down. If it was ticket-driven, it's upselling — brief the bar team on the cocktail-attach target." A decision the GM can act on beats a task that hands the thinking back to them.

Ground the action in the specific numbers, days, patterns, and people in this week's data. An action that could have been written about any venue in any week is too generic. Connect it to the root cause, not the symptom. Never restate the problem headline as the action — if the GM learns nothing from the action that they didn't already know from the insight, it is not an action.

Size the action to the most impactful first step the GM can take. If the real fix is larger than one shift's work, give them that first step rather than a multi-week initiative. Include a realistic estimated_minutes (15, 30, 45, 60, 90, 120).

You may use any verb that fits. The test is not which words you use — it is whether the GM, reading the action, knows the concrete thing to do, or is being told to go think about it themselves.

Examples that meet the standard:
- "Pull the daily sales breakdown — Monday and Tuesday lost 140 transactions vs last week while ticket size held. This is a traffic problem, not a ticket problem: check whether the road closure on Main recurs next week and cut Monday/Tuesday opening labor by one server if so."
- "Labor % rose to 31% but labor hours were flat — this is the 26% revenue drop, not overstaffing. Do not cut hours. Focus the week on the revenue recovery action above."
- "Cocktail share of sales fell from 34% to 27% over three weeks — upselling has slipped. Brief the bar team Friday on the cocktail-attach target and spot-check Saturday tickets."

Examples that fail the standard:
- "Investigate why revenue dropped this week." — hands the GM the thinking instead of doing it.
- "Monitor revenue trends and evaluate performance." — vague; no specific conclusion or fix.
- "Review: Revenue dropped 26% week-over-week to $17.2K." — restates the problem; the GM learns nothing new.

=== LAYER 1: TOAST POS — SALES & LABOR DATA ===

When analyzing Toast POS data in weekly context:
- ALWAYS frame revenue changes in BOTH dollars and percentage.
- Distinguish TRAFFIC problems (transaction count) from TICKET problems (average check). The fix is completely different.
- Analyze by DAYPART — a flat week can hide a Monday collapse offset by a Saturday spike.
- Labor % reasoning: Labor % = labor dollars / revenue. If labor % spiked but labor hours are flat → revenue dropped, not overstaffing. Don't tell the GM to cut hours.
- Use the best comparison period: YoY > WoW. If WoW shows a big swing, check YoY context before classifying severity.
- Menu mix signals: declining high-margin items (cocktails, appetizers) as a share of sales → upselling dropped.

SEVERITY: CRITICAL = large, sustained, confirmed by multiple signals. HIGH = meaningful and worth acting on. MEDIUM = trends developing over 2+ weeks. LOW = minor fluctuations or positive trends worth reinforcing.

=== LAYER 2: 7SHIFTS — QUALITATIVE DATA (Log Book, Tasks, Shift Feedback) ===

7shifts is used ONLY for qualitative operational data. It is NOT a source for scheduling hours, labor hours, labor cost, or any financial metrics. Toast is the sole source of truth for all financial and labor metrics.

When analyzing 7shifts data in weekly context:
- Log book entries and task completion provide operational context
- Cross-reference with Toast metrics for compound insights
- Do NOT reference scheduled hours, worked hours, or schedule variance from 7shifts

SEVERITY: Assess relative to team size and operational context.

=== LAYER 3: ASANA/LOGS — GM LOGS & SHIFT LEAD LOGS ===

When analyzing log and task data in weekly context:
- Task completion is a LEADING indicator — drops predict operational problems next week.
- Quality matters: "all good" every day is a red flag. Logs with detail at 80% completion > checkbox at 100%.
- Connect task gaps to metrics: line checks not done AND variance spiked → direct connection.
- Same insight generated 3+ weeks in a row = underlying issue isn't being addressed. Suggest a different approach.

SEVERITY: Assess relative to the GM's own baseline and trends.

=== LAYER 4: SCULPTURE HOSPITALITY — INVENTORY & VARIANCE DATA ===

INVENTORY PERIOD HANDLING (read this FIRST before reasoning about inventory):
- Each Sculpture inventory report covers a specific period (period_start–period_end) that often does NOT align with the Mon–Sun scoring week. The data context will state the inventory period, the scoring week, and the overlap in days.
- If overlap < 5 days (the context will tag this as "PERIOD MISALIGNED"): do NOT correlate inventory variance with this scoring week's sales, labor, or shift events. Report inventory findings as standalone observations tied to the inventory period only.
- If overlap ≥ 5 days: correlations are permitted, but you MUST cite the overlapping date range explicitly (e.g., "during the 4/6–4/9 overlap window").
- If a "RECURRING SHRINKAGE" section is present in the context: prioritize those items above any single-report variance. Items appearing in multiple consecutive counts indicate SYSTEMIC loss (over-pouring, theft, miscount methodology) — not one-off events. Frame the recommendation around root cause, not item-level remediation.
- Always cite the actual inventory period dates (not the scoring week) in the SOURCE field for inventory insights, e.g., "Sculpture Hospitality — {Venue} — {period_start} to {period_end}".

When analyzing inventory data in weekly context:
- ALWAYS lead with dollar impact: "$347 in missing Tito's" not "18% variance on Tito's."
- Prioritize by DOLLAR LOSS, not variance percentage. 5% on a high-volume well vodka ($800) > 25% on specialty amaro ($40).
- Variance patterns suggest root cause: high-volume poured items → over-pouring; full-bottle items → theft/miscounts; negative variance → counting error; uniform across categories → methodology problem.
- Compare actual pour cost vs ideal pour cost from the Sculpture report.

SEVERITY: Assess based on gap between actual and ideal, combined with dollar impact.


=== CROSS-SOURCE REASONING LAYER ===

When data from multiple sources is available, look for connections. Connected signals are more important than isolated ones.

Revenue + Labor: Revenue down + labor hours up = worst case. Revenue down + hours down = appropriate if not too aggressive. Revenue up + hours flat = efficiency win.
Revenue + Inventory: Revenue down + high variance = bleeding from both ends (CRITICAL). Revenue up + low variance = everything working.
Labor + Accountability: Hours exceeded schedule + GM logs incomplete = no one managing the floor. Clean adherence + high completion = healthy system.
Inventory + Accountability: High variance + line checks not done = predictable loss. Variance improved + task completion high = action items working.

COMPOUND INSIGHTS: When two sources point to the same problem, generate a compound insight referencing both in PROBLEM and SOURCE. The action should address the root cause.

=== IMPLEMENTATION GUIDANCE ===

=== LAYER 5: GOOGLE REVIEWS ===

When Google review data is provided:
- ONLY generate an insight when something ACTIONABLE happened: a rating drop, a new negative review (≤3 stars), a pattern across negative reviews, or unusual review volume changes.
- Do NOT generate insights for "rating held steady" or "no new reviews." That is noise.
- For NEGATIVE REVIEWS (≤3 stars): Quote the review text in the PROBLEM field. Connect the complaint to operational root causes in the ACTION (e.g., "Check Friday's shift log to see if the kitchen was short-staffed").
- For RATING DROPS: Include the delta (e.g., "dropped from 4.4 to 4.2") and identify contributing reviews if available.
- For PATTERNS: If multiple low reviews mention the same issue (slow service, dirty, rude staff), surface that as a themed insight.
- pillar: Always "Guest Experience"
- source_metric: "google_rating" or "google_reviews"
- SOURCE format in detail: "Google Reviews — {Venue} — Week of {date range}"

=== CROSS-SOURCE REASONING LAYER ===

When data from multiple sources is available, look for connections. Connected signals are more important than isolated ones.

Revenue + Labor: Revenue down + labor hours up = worst case. Revenue down + hours down = appropriate if not too aggressive. Revenue up + hours flat = efficiency win.
Revenue + Inventory: Revenue down + high variance = bleeding from both ends (CRITICAL). Revenue up + low variance = everything working.
Labor + Accountability: Hours exceeded schedule + GM logs incomplete = no one managing the floor. Clean adherence + high completion = healthy system.
Inventory + Accountability: High variance + line checks not done = predictable loss. Variance improved + task completion high = action items working.
Google Reviews + Operations: Negative reviews mentioning service issues + labor or scheduling problems = compound insight worth surfacing.

COMPOUND INSIGHTS: When two sources point to the same problem, generate a compound insight referencing both in PROBLEM and SOURCE. The action should address the root cause.

Generate only the highest-signal items. Cap output at 8 insights maximum and prefer 5-6. Suppress healthy improving metrics, generic target-comparison commentary, and any item whose best next step is just to monitor or document. Positive momentum should appear in wins/briefing, not as an active insight. Use venue-specific context when genuinely helpful, but never create a target-only insight. Compare against the venue's own baseline, not universal thresholds. Only apply reasoning for data sources present.

DETERMINISTIC FACTS — DO NOT INVENT:
Do NOT make claims about log volume, sync status, employee count, or data completeness. Those values are tracked deterministically and are either provided to you as named fields (e.g., "Logs submitted this week: N") or absent. If absent, do not speculate. Focus on operational narrative content only — patterns, root causes, decisions, and actions.

=== SOURCE ATTRIBUTION — REQUIRED ON EVERY INSIGHT ===

You are given a numbered list of LOG ENTRIES below (refs L1, L2, L3 …) and an EMPLOYEE ROSTER. For every insight you return you MUST populate:

- "cited_log_refs": array of log refs (e.g. ["L3","L7"]) that directly support the insight. Cite the actual logs whose content drove the insight. If an insight is purely metric-driven (Toast/Sculpture/Google Reviews) and no log supports it, return [].
- "cited_employee_names": array of employee names (use names EXACTLY as they appear in the EMPLOYEE ROSTER) that the insight is about — the subject of recognition, the person involved in an issue, etc. Do NOT include the log author unless they are explicitly the subject. If the insight is not about specific people, return [].
- The "detail" field MUST quote or paraphrase the cited log content with author + date attribution (e.g., "On 2026-05-08, lead Marco Diaz noted '…'") rather than the generic 'BarPulse Analysis' phrasing. Never write "BarPulse Analysis" or "according to logs" without naming author + date.

If you cannot cite a real log or roster employee, do not invent one — leave the array empty.

Return ONLY a valid JSON array. No markdown.`;

  // Build LOG ENTRIES block — author + date + log_type + snippet for every log this week.
  const logEntriesBlock = weekLogs.length === 0
    ? "No GM/Lead/Shift logs were submitted this week."
    : weekLogs.map((r) =>
        `[${r.ref}] ${r.log_type} · ${r.date} · ${r.author_name}${r.snippet ? `: ${r.snippet}` : ''}`
      ).join('\n');

  const rosterBlock = employeeRoster.length === 0
    ? "(no roster available)"
    : employeeRoster.map((e) => `- ${e.canonical}`).join('\n');

  const userPrompt = `Weekly data for analysis:

DAILY INSIGHTS THIS WEEK (${insights.length} total):
${JSON.stringify(insights.map((i: any) => ({
  title: i.title,
  pillar: i.pillar,
  severity: i.severity,
  type: i.insight_type,
  summary: i.summary,
  source_date: i.source_date,
  source_metric: i.source_metric,
  source_value: i.source_value,
})), null, 2)}

LOG ENTRIES THIS WEEK (${weekLogs.length} total — cite by ref):
${logEntriesBlock}

EMPLOYEE ROSTER (use these exact names in cited_employee_names):
${rosterBlock}

THIS WEEK'S AGGREGATED METRICS:
${weeklyCore ? JSON.stringify(weeklyCore, null, 2) : "No weekly_core data available"}

PREVIOUS WEEK'S METRICS (for comparison):
${prevCore ? JSON.stringify(prevCore, null, 2) : "No previous week data available"}${googleReviewContext}`;

  const aiResponse = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.4,
    6000,
    barId
  );

  // Parse AI response
  let weeklyInsights: any[];
  try {
    const cleaned = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    weeklyInsights = JSON.parse(cleaned);
    if (!Array.isArray(weeklyInsights)) throw new Error("Not an array");
  } catch (e) {
    console.error("Failed to parse weekly insights AI response:", e, aiResponse);
    return 0;
  }

  const bannedText = /(\bbelow target\b|\bmonitor\b|\bdocument\b|\breinforce\b|\bkeep an eye on\b|\bstay the course\b|\bcontinue monitoring\b|\bcontinue to watch\b|\bcontinue to monitor\b|\bkeep monitoring\b|\bmaintain course\b|\bno immediate action\b|\bwatch this\b)/i;
  const softMovementText = /(slight(ly)?|small increase|small improvement|marginal|modest|minor|edged up|tick(ed)? up|held steady|remain(ed)? solid|stable improvement|improv(ed)? slightly|up modestly|increased a bit|healthy stability|within range|on track)/i;
  const positiveOnlyText = /(improv(ed|ing)|strong week|positive trend|momentum|held steady|stable and healthy|within range|on track)/i;
  const downsideText = /\b(risk|complaint|loss|miss|decline|drop|variance|over|under|issue|problem|shortfall|cost|pressure|exposure|headwind|erosion)\b/i;

  const filteredWeeklyInsights = weeklyInsights
    .filter((wi: any) => {
      const title = String(wi?.title || "");
      const summary = String(wi?.summary || "");
      const detail = String(wi?.detail || "");
      const insightType = String(wi?.insight_type || "Issue");
      const actionTitle = String(wi?.suggested_action?.title || "");
      const actionDetail = String(wi?.suggested_action?.detail || "");
      const combined = `${title}\n${summary}\n${detail}\n${actionTitle}\n${actionDetail}`;

      if (!title.trim() || !summary.trim()) return false;
      if (["win", "staff recognition", "recognition"].includes(insightType.toLowerCase())) return false;
      if (bannedText.test(combined)) return false;
      if (/\btarget\b/i.test(combined)) return false;
      if (softMovementText.test(combined) && !downsideText.test(combined)) return false;
      if (positiveOnlyText.test(combined) && !downsideText.test(combined)) return false;
      if (!wi?.suggested_action || !actionTitle.trim() || !actionDetail.trim()) return false;
      return true;
    })
    .slice(0, 8);

  // Resolve cited_log_refs and cited_employee_names per insight before insert.
  type Resolved = {
    sourceContext: string | null;
    sourceLogIds: string[];
    employeeMatches: { id: string; canonical: string }[];
  };
  const resolveCitations = (wi: any): Resolved => {
    const out: Resolved = { sourceContext: null, sourceLogIds: [], employeeMatches: [] };

    const refs = Array.isArray(wi?.cited_log_refs) ? wi.cited_log_refs : [];
    const citedLogs: WeekLogRow[] = [];
    for (const raw of refs) {
      const refKey = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
      const hit = refKey ? logIndex.get(refKey) : null;
      if (hit) citedLogs.push(hit);
    }
    if (citedLogs.length > 0) {
      out.sourceLogIds = citedLogs.map((l) => l.id);
      out.sourceContext = 'Source logs: ' + citedLogs
        .map((l) => `${l.log_type} · ${l.date} · ${l.author_name}`)
        .join('; ');
    }

    const names = Array.isArray(wi?.cited_employee_names) ? wi.cited_employee_names : [];
    const seen = new Set<string>();
    for (const raw of names) {
      if (typeof raw !== 'string' || !raw.trim()) continue;
      const needle = normalizeForMatch(raw);
      if (!needle) continue;
      let match = employeeRoster.find((e) => e.tokens.includes(needle));
      if (!match) {
        const firstTok = needle.split(/\s+/)[0];
        match = employeeRoster.find((e) => e.tokens.some((t) => t.split(/\s+/)[0] === firstTok));
      }
      if (!match || seen.has(match.id)) continue;
      seen.add(match.id);
      out.employeeMatches.push({ id: match.id, canonical: match.canonical });
    }
    return out;
  };

  const resolved: Resolved[] = filteredWeeklyInsights.map(resolveCitations);

  // Insert weekly-level insights
  const insightRows = filteredWeeklyInsights.map((wi: any, idx: number) => {
    const r = resolved[idx];
    const firstEmp = r.employeeMatches[0];
    return {
      bar_id: barId,
      week_id: weekUuid,
      day_id: null,
      pillar: wi.pillar || "Operations",
      severity: wi.severity || "Medium",
      insight_type: wi.insight_type || "Issue",
      insight_mode: "weekly",
      title: wi.title || "Weekly Pattern",
      summary: wi.summary || "",
      detail: wi.detail || "",
      source_metric: wi.source_metric || null,
      source_type: `${inferSystem(wi.source_metric)} — ${venueName} — ${weekStart} to ${weekEnd}`,
      source_date: weekStart,
      source_context: r.sourceContext,
      employee_id: firstEmp?.id ?? null,
      employee_name: firstEmp?.canonical ?? null,
      generated_by: "weekly_insights",
      generated_at: new Date().toISOString(),
      status: "New",
    };
  });

  if (insightRows.length > 0) {
    const { data: insertedInsights, error } = await supabase
      .from("insights")
      .insert(insightRows)
      .select("id");
    if (error) console.error("Error inserting weekly insights:", error);

    if (!error && insertedInsights) {
      const actionRows: any[] = [];
      const tagRows: { insight_id: string; employee_id: string; role: string; employee_name: string }[] = [];
      for (let i = 0; i < insertedInsights.length; i++) {
        const insightId = insertedInsights[i].id;
        const sa = filteredWeeklyInsights[i]?.suggested_action;
        if (sa?.title && sa?.detail) {
          actionRows.push({
            insight_id: insightId,
            bar_id: barId,
            week_id: weekUuid,
            title: sa.title,
            detail: sa.detail || "",
            estimated_minutes: sa.estimated_minutes || 15,
            priority: sa.priority || "P3-Medium",
            suggested_assignee: sa.suggested_assignee || null,
            approval_status: "Proposed",
            status: "Not Started",
            source: "barpulse",
          });
        }
        for (const emp of resolved[i].employeeMatches) {
          tagRows.push({
            insight_id: insightId,
            employee_id: emp.id,
            role: 'subject',
            employee_name: emp.canonical,
          });
        }
        const refs = resolved[i].sourceLogIds;
        if (refs.length > 0) {
          console.log(`[WEEKLY-CITE] insight=${insightId} logs=${refs.length} emps=${resolved[i].employeeMatches.length}`);
        }
      }
      if (actionRows.length > 0) {
        const { error: actionErr } = await supabase.from("action_items").insert(actionRows);
        if (actionErr) console.error("Error inserting action items:", actionErr);
        else console.log(`Inserted ${actionRows.length} action items for weekly insights`);
      }
      if (tagRows.length > 0) {
        const { error: tagErr } = await supabase.from('insight_employees').insert(tagRows);
        if (tagErr) console.warn(`[WEEKLY-CITE-TAG] insert failed: ${tagErr.message}`);
        else console.log(`[WEEKLY-CITE-TAG] inserted ${tagRows.length} employee tags for weekly insights`);
      }
    }

    // Intentionally no status-flip on daily insights.
    // Prior behavior blanket-marked all prior-week daily_insights_v2 rows
    // Consolidated, which hid 290+ narrative cards system-wide (gate #1 in
    // shouldShowInFeed short-circuits dismissed/consolidated). Daily AI
    // insights are one-per-bar-per-day narrative cards, not high-frequency
    // repeats — they have no consolidation need. High-frequency repeats
    // (meal_break, no_clockout) are deterministic and already routed via
    // their own *_weekly_rollup detectors + read-side filters in
    // shouldShowInFeed. The Monday briefing writes weekly_insights and stops.
  }

  console.log(`Inserted ${insightRows.length} weekly insights for bar ${barId}`);
  return insightRows.length;
}

// ── Phase 2: Monday Briefing ──────────────────────────────────────

async function generateMondayBriefing(
  supabase: any,
  barId: string,
  weekUuid: string,
  weekStart: string,
  weekEnd: string
): Promise<boolean> {
  // Fetch venue name and GM name
  const { data: venueRow } = await supabase
    .from("venues")
    .select("name, gm_name")
    .eq("id", barId)
    .single();
  const venueName = venueRow?.name || barId;
  const gmName = venueRow?.gm_name || 'Unknown';

  // Fetch scorecard
  const { data: scorecard } = await supabase
    .from("weekly_scorecard")
    .select("*")
    .eq("bar_id", barId)
    .eq("week_id", weekUuid)
    .maybeSingle();

  if (!scorecard) {
    console.log(`No scorecard for bar ${barId}, skipping briefing`);
    return false;
  }

  // Fetch weekly_core
  const { data: weeklyCore } = await supabase
    .from("weekly_core")
    .select("*")
    .eq("bar_id", barId)
    .eq("week_id", weekUuid)
    .maybeSingle();

  // Fetch period_config targets
  const { data: config } = await supabase
    .from("period_config")
    .select("*")
    .eq("bar_id", barId)
    .lte("effective_start", weekEnd)
    .or(`effective_end.is.null,effective_end.gte.${weekStart}`)
    .order("effective_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Previous week comparison
  const prevWeekStart = addDays(weekStart, -7);
  const { data: prevWeek } = await supabase
    .from("weeks")
    .select("id")
    .eq("bar_id", barId)
    .eq("week_start", prevWeekStart)
    .maybeSingle();

  let prevCore = null;
  if (prevWeek?.id) {
    const { data } = await supabase
      .from("weekly_core")
      .select("*")
      .eq("bar_id", barId)
      .eq("week_id", prevWeek.id)
      .maybeSingle();
    prevCore = data;
  }

  // All insights for this week (daily + weekly)
  const { data: allInsights } = await supabase
    .from("insights")
    .select("title, pillar, severity, insight_type, summary, detail, source_metric")
    .eq("bar_id", barId)
    .eq("week_id", weekUuid);

  // Pending action items
  const { count: pendingActions } = await supabase
    .from("action_items")
    .select("id", { count: "exact", head: true })
    .eq("bar_id", barId)
    .eq("week_id", weekUuid)
    .neq("status", "Completed");

  const insights = allInsights || [];
  const wins = insights.filter(
    (i: any) => i.insight_type === "Win" || i.insight_type === "Recognition"
  );
  const highIssues = insights.filter(
    (i: any) => i.severity === "High" && i.insight_type !== "Win"
  );

  // Week-over-week changes
  const wow: Record<string, string> = {};
  if (weeklyCore && prevCore) {
    const pctChange = (curr: number | null, prev: number | null) => {
      if (curr == null || prev == null || prev === 0) return "N/A";
      const change = ((curr - prev) / prev) * 100;
      return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
    };
    wow.net_sales = pctChange(weeklyCore.net_sales, prevCore.net_sales);
    wow.labor_pct = pctChange(weeklyCore.labor_pct, prevCore.labor_pct);
    wow.transactions = pctChange(weeklyCore.transactions, prevCore.transactions);
    wow.guests = pctChange(weeklyCore.weekly_guests, prevCore.weekly_guests);
    wow.tip_pct = pctChange(weeklyCore.tip_pct, prevCore.tip_pct);
    wow.splh = pctChange(weeklyCore.splh, prevCore.splh);
  }

  const systemPrompt = `You are writing a concise weekly performance summary for a bar/restaurant owner managing multiple venues.

Structure your response as JSON with these fields:
- briefing: REQUIRED. For the monday_briefing field: Write 2-3 sentences of analysis followed by 1 sentence starting with "**Recommendation:**". Total length: 80-120 words maximum. This is a hard limit. No greeting ("Good morning", "Hi", "Hello"). No sign-off or closing. No generic praise ("Great week!", "The team did well", "Strong performance overall"). No filler transitions ("However", "Moving forward", "It's worth noting"). Lead with the single biggest business outcome of the week — positive or negative. Include one specific strength and one specific risk with exact numbers. Connect the dots across metrics — do not just list what went up or down. The Recommendation must be one strategic priority, not a task list. Do NOT restate every pillar score. Do NOT start with the venue name. Do NOT use bullet points or numbered lists. Output plain paragraph text only, with **Recommendation:** bolded in markdown. Always return a non-empty briefing even when there are zero wins.
- wins: OPTIONAL. Write 0-5 separate wins grounded only in the provided weekly data and insight context. Each win must be a plain-text bullet on its own line starting with "• ". Keep each bullet specific, factual, and concise. Do not return JSON arrays, numbered lists, or a single paragraph. Do not invent causes, staff praise, or broad claims that are not directly supported by the input. If there are no meaningful wins, return an empty string.
- key_drivers: REQUIRED. A concise paragraph summarizing what drove the overall score up or down. This must still be populated even when wins is empty.

DETERMINISTIC FACTS — DO NOT INVENT:
Do NOT make claims about log volume, sync status, employee count, or data completeness. Those values are tracked deterministically and are either provided to you as named fields (e.g., "Logs submitted this week: N") or absent. If absent, do not speculate. Focus on operational narrative content only — patterns, root causes, decisions, and actions.

Return ONLY the JSON object, no markdown.`;

  const userPrompt = `Venue: ${venueName}
GM: ${gmName}
Week: ${weekStart} to ${weekEnd}

SCORECARD:
- Overall Score: ${scorecard.overall_score ?? "N/A"}/100 (Grade: ${scorecard.overall_grade ?? "N/A"})
- Confidence: ${scorecard.confidence ?? 0}%
- Revenue Score: ${scorecard.revenue_score ?? "N/A"}
- Labor Score: ${scorecard.labor_score ?? "N/A"}
- Operations Score: ${scorecard.operations_score ?? "N/A"}
- Guest Score: ${scorecard.guest_score ?? "N/A"}

KEY METRICS:
- Net Sales: $${weeklyCore?.net_sales?.toLocaleString() ?? "N/A"} (Target: $${config?.weekly_net_sales_target ?? "N/A"})
- Labor %: ${weeklyCore?.labor_pct ? (weeklyCore.labor_pct * 100).toFixed(1) + "%" : "N/A"} (Target: ${config?.labor_pct_target ? (config.labor_pct_target * 100).toFixed(1) + "%" : "N/A"})
- SPLH: $${weeklyCore?.splh?.toFixed(2) ?? "N/A"} (Target: $${config?.splh_target ?? "N/A"})
- Transactions: ${weeklyCore?.transactions ?? "N/A"}
- Guests: ${weeklyCore?.weekly_guests ?? "N/A"}
- Tip %: ${weeklyCore?.tip_pct ? (weeklyCore.tip_pct * 100).toFixed(1) + "%" : "N/A"}
- Google Rating: ${weeklyCore?.google_rating ?? "N/A"}
- Logs submitted this week: ${weeklyCore?.employee_logs_count ?? "N/A"}

WEEK-OVER-WEEK CHANGES:
${Object.entries(wow).map(([k, v]) => `- ${k}: ${v}`).join("\n") || "No previous week data"}

WINS (${wins.length}):
${wins.map((w: any) => `- ${w.title}: ${w.summary}`).join("\n") || "None identified"}

HIGH-SEVERITY ISSUES (${highIssues.length}):
${highIssues.map((i: any) => `- ${i.title}: ${i.summary}`).join("\n") || "None identified"}

ALL INSIGHTS (${insights.length} total):
${insights.map((i: any) => `- [${i.pillar}/${i.severity}] ${i.title}: ${i.summary}`).join("\n") || "None"}

PENDING ACTION ITEMS: ${pendingActions ?? 0}`;

  const aiResponse = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.5,
    3000,
    barId
  );

  // Parse response
  let briefingData: { briefing: string; wins: string; key_drivers: string };
  try {
    const cleaned = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    briefingData = {
      briefing: typeof parsed?.briefing === "string" ? parsed.briefing : "",
      wins: typeof parsed?.wins === "string" || Array.isArray(parsed?.wins) ? normalizeWinsOutput(parsed.wins) : "",
      key_drivers: typeof parsed?.key_drivers === "string" ? parsed.key_drivers : "",
    };
  } catch (e) {
    console.error("Failed to parse briefing AI response:", e);
    briefingData = {
      briefing: aiResponse,
      wins: wins.map((w: any) => `• ${w.title}`).join("\n"),
      key_drivers: "Unable to parse structured key drivers.",
    };
  }

  briefingData = {
    briefing: typeof briefingData.briefing === "string" ? briefingData.briefing.trim() : "",
    wins: normalizeWinsOutput(briefingData.wins),
    key_drivers: typeof briefingData.key_drivers === "string" ? briefingData.key_drivers.trim() : "",
  };

  if (!briefingData.briefing) {
    const fallbackParts = [
      scorecard.overall_score != null ? `Overall score finished at ${scorecard.overall_score}/100.` : "",
      weeklyCore?.net_sales != null ? `Net sales landed at $${Number(weeklyCore.net_sales).toLocaleString()}.` : "",
      highIssues[0]?.summary ? `Biggest risk this week was ${highIssues[0].summary.replace(/[.\s]*$/, "")}.` : "",
      "**Recommendation:** Focus on the single biggest performance constraint from this week and correct it before the next cycle."
    ].filter(Boolean);

    briefingData.briefing = fallbackParts.join(" ");
  }

  if (!briefingData.key_drivers) {
    briefingData.key_drivers = highIssues[0]?.summary || "Weekly performance was driven by the strongest score movements and the most material operational signals in the data.";
  }

  // Update weekly_scorecard
  const { error } = await supabase
    .from("weekly_scorecard")
    .update({
      monday_briefing: briefingData.briefing,
      wins: briefingData.wins,
      key_drivers: briefingData.key_drivers,
      generated_at: new Date().toISOString(),
    })
    .eq("bar_id", barId)
    .eq("week_id", weekUuid);

  if (error) {
    console.error("Error updating weekly_scorecard:", error);
    return false;
  }

  console.log(`Monday briefing generated for bar ${barId}`);
  return true;
}

// ── Main handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let barIds: string[] = [];

    if (body.bar_id) {
      barIds = [body.bar_id];
    } else {
      const { data: bars } = await supabase
        .from("venues")
        .select("id")
        .eq("is_active", true);
      barIds = (bars || []).map((b: any) => b.id);
    }

    const { weekStart, weekEnd } = body.week_start
      ? { weekStart: body.week_start, weekEnd: addDays(body.week_start, 6) }
      : getPreviousWeek();

    console.log(
      `Processing ${barIds.length} bars for week ${weekStart} – ${weekEnd}`
    );

    const results: any[] = [];
    let multiLocAlreadyRun = false;
    const isRetry = body.is_retry === true;

    for (const barId of barIds) {
      try {
        // Find the week UUID
        const { data: weekRow } = await supabase
          .from("weeks")
          .select("id")
          .eq("bar_id", barId)
          .eq("week_start", weekStart)
          .maybeSingle();

        if (!weekRow?.id) {
          results.push({ bar_id: barId, status: "skipped", reason: "No weeks record" });
          continue;
        }

        const weekUuid = weekRow.id;

        // PRECONDITION: weekly_scorecard row must exist before we generate.
        // Race fix: compute-weekly-scores may not have written yet on Monday.
        const { data: existingScorecard } = await supabase
          .from("weekly_scorecard")
          .select("bar_id, monday_briefing")
          .eq("bar_id", barId)
          .eq("week_id", weekUuid)
          .maybeSingle();

        // Sweeper mode: skip venues that already have a substantive briefing.
        const sweeperMode = body.sweeper === true;
        if (
          sweeperMode &&
          existingScorecard?.monday_briefing &&
          String(existingScorecard.monday_briefing).length > 50
        ) {
          results.push({ bar_id: barId, status: "skipped", reason: "already_populated" });
          continue;
        }

        if (!existingScorecard) {
          console.log(
            `[BRIEFING-PRECONDITION-FAIL] bar=${barId} week_start=${weekStart} ` +
            `reason=missing_scorecard is_retry=${isRetry}`
          );

          // Re-enqueue once via pg_net to retry after delay (only if not already a retry)
          if (!isRetry) {
            try {
              const fnUrl = `${supabaseUrl}/functions/v1/generate-monday-briefing`;
              const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
              await supabase.rpc("net_http_post", {
                url: fnUrl,
                headers_json: JSON.stringify({
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${anonKey}`,
                }),
                body_json: JSON.stringify({
                  bar_id: barId,
                  week_start: weekStart,
                  is_retry: true,
                }),
              });
              console.log(`[BRIEFING-REENQUEUE] bar=${barId}`);
            } catch (reErr: any) {
              console.warn(`[BRIEFING-REENQUEUE-FAIL] bar=${barId} err=${reErr?.message || reErr}`);
            }
          }

          results.push({
            bar_id: barId,
            status: "skipped",
            reason: "missing_scorecard",
            reenqueued: !isRetry,
          });
          continue;
        }

        // Phase 1: Weekly Insights
        const insightsCount = await generateWeeklyInsights(
          supabase, barId, weekUuid, weekStart, weekEnd
        );

        // Phase 2: Monday Briefing
        const briefingOk = await generateMondayBriefing(
          supabase, barId, weekUuid, weekStart, weekEnd
        );

        // Phase 3: Labor compliance alerts
        let laborOt = 0;
        let laborMulti = 0;
        try {
          const labor = await runWeeklyLaborAlerts(supabase, barId, weekStart, {
            runMultiLocation: !multiLocAlreadyRun,
            weekId: weekUuid,
          });
          laborOt = labor.overtime;
          laborMulti = labor.multiLocation;
          if (!multiLocAlreadyRun) multiLocAlreadyRun = true;
          if (labor.errors.length > 0) {
            console.warn(`[LABOR-ALERT] bar ${barId} weekly soft-fail:`, labor.errors);
          }
        } catch (e: any) {
          console.warn(`[LABOR-ALERT] bar ${barId} weekly pass crashed:`, e?.message || e);
        }

        // Log sync_run
        await supabase.from("sync_runs").insert({
          bar_id: barId,
          sync_type: "monday_briefing",
          status: "completed",
          completed_at: new Date().toISOString(),
          records_created: insightsCount + laborOt + laborMulti,
          metadata: {
            week_start: weekStart,
            week_end: weekEnd,
            weekly_insights_count: insightsCount,
            briefing_generated: briefingOk,
            labor_overtime_alerts: laborOt,
            labor_multi_location_alerts: laborMulti,
            is_retry: isRetry,
          },
        });

        results.push({
          bar_id: barId,
          status: "ok",
          weekly_insights: insightsCount,
          briefing: briefingOk,
          labor_overtime: laborOt,
          labor_multi_location: laborMulti,
        });
      } catch (err: any) {
        console.error(`Error bar ${barId}:`, err.message);
        results.push({ bar_id: barId, status: "error", error: err.message });
      }
    }

    // [BRIEFING-COVERAGE] Diagnostic: populated rate for this week.
    try {
      const { data: coverageRows } = await supabase
        .from("weekly_scorecard")
        .select("bar_id, monday_briefing, weeks!inner(week_start)")
        .eq("weeks.week_start", weekStart);
      const total = (coverageRows || []).length;
      const populated = (coverageRows || []).filter(
        (r: any) => r.monday_briefing && String(r.monday_briefing).length > 50
      ).length;
      const missingBars = (coverageRows || [])
        .filter((r: any) => !r.monday_briefing || String(r.monday_briefing).length <= 50)
        .map((r: any) => r.bar_id);
      console.log(
        `[BRIEFING-COVERAGE] week_start=${weekStart} populated=${populated}/${total} ` +
        `is_retry=${isRetry} missing_bar_ids=${JSON.stringify(missingBars)}`
      );
    } catch (covErr: any) {
      console.warn(`[BRIEFING-COVERAGE] query failed: ${covErr?.message || covErr}`);
    }

    return new Response(
      JSON.stringify({ ok: true, weekStart, weekEnd, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
