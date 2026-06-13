import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function scoreHigherIsBetter(
  actual: number | null,
  target: number | null
): number | null {
  if (actual == null || !target) return null;
  return Math.min(100, Math.round((actual / target) * 100));
}

function scoreLowerIsBetter(
  actual: number | null,
  target: number | null
): number | null {
  if (actual == null || !target) return null;
  if (actual <= target) return 100;
  return Math.max(0, Math.round(100 - ((actual - target) / (target * 2)) * 100));
}

function scoreRating(
  actual: number | null,
  target: number | null
): number | null {
  if (actual == null || !target) return null;
  return Math.min(100, Math.round((actual / target) * 100));
}

function assignGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function pillarAvg(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s != null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}


function nowPacific(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

function todayPacific(): string {
  const d = nowPacific();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPreviousWeek(): { weekStart: string; weekEnd: string } {
  const now = nowPacific();
  const dayOfWeek = now.getDay();
  const daysToLastSun = dayOfWeek === 0 ? 7 : dayOfWeek;
  const lastSun = new Date(now);
  lastSun.setDate(now.getDate() - daysToLastSun);
  const y = lastSun.getFullYear();
  const m = String(lastSun.getMonth() + 1).padStart(2, "0");
  const d = String(lastSun.getDate()).padStart(2, "0");
  const weekEnd = `${y}-${m}-${d}`;
  const weekStart = addDays(weekEnd, -6);
  return { weekStart, weekEnd };
}

function simpleAvg(rows: any[], metricField: string): number | null {
  const vals = rows.filter((r) => r[metricField] != null).map((r) => Number(r[metricField]));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function simpleSum(rows: any[], metricField: string): number | null {
  const vals = rows.filter((r) => r[metricField] != null).map((r) => Number(r[metricField]));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const includeTrace = Boolean(body.include_trace);
    let barIds: string[] = [];

    if (Array.isArray(body.bar_ids) && body.bar_ids.length > 0) {
      barIds = body.bar_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
    } else if (body.bar_id) {
      barIds = [body.bar_id];
    } else {
      const { data: bars } = await supabase
        .from("venues")
        .select("id")
        .eq("is_active", true);
      barIds = (bars || []).map((bar: any) => bar.id);
    }

    const rawWeekStart = body.week_start || null;
    const normalizeWeekStart = (value: string) => {
      const dt = new Date(value + "T00:00:00Z");
      const day = dt.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      dt.setUTCDate(dt.getUTCDate() + diff);
      return dt.toISOString().slice(0, 10);
    };

    const weekStarts = Array.isArray(body.week_starts) && body.week_starts.length > 0
      ? body.week_starts.map((value: unknown) => String(value)).map(normalizeWeekStart)
      : [rawWeekStart ? normalizeWeekStart(rawWeekStart) : getPreviousWeek().weekStart];

    const uniqueWeekStarts: string[] = [...new Set(weekStarts as string[])].sort();
    console.log(`Processing ${barIds.length} bars for ${uniqueWeekStarts.length} week(s): ${uniqueWeekStarts.join(", ")}`);

    const results: any[] = [];
    for (const weekStart of uniqueWeekStarts) {
      const weekEnd = addDays(weekStart, 6);
      for (const barId of barIds) {
        try {
          const result = await processBar(supabase, barId, weekStart, weekEnd, includeTrace);
          results.push({ bar_id: barId, weekStart, weekEnd, status: "ok", ...result });
        } catch (err: any) {
          console.error(`Error bar ${barId} week ${weekStart}:`, err.message);
          results.push({ bar_id: barId, weekStart, weekEnd, status: "error", error: err.message });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, weekStarts: uniqueWeekStarts, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processBar(
  supabase: any,
  barId: string,
  weekStart: string,
  weekEnd: string,
  includeTrace = false,
) {
  const weekId = `${barId.slice(0, 8)}-${weekStart}`;
  const { data: weekRow } = await supabase
    .from("weeks")
    .upsert(
      {
        week_id: weekId,
        bar_id: barId,
        week_start: weekStart,
        week_end: weekEnd,
        // status intentionally omitted:
        //   - on INSERT, column default 'in_progress' applies
        //   - on CONFLICT, supabase-js upsert only assigns columns present
        //     in the payload, so an existing 'computed' status is preserved
        //     and not regressed by a later re-run.
        // 'computed' is written ONLY after weekly_scorecard succeeds below.
      },
      { onConflict: "bar_id,week_start" },
    )
    .select("id")
    .single();

  const weekUuid = weekRow?.id;
  if (!weekUuid) throw new Error("Failed to upsert weeks record");

  const { data: barRow } = await supabase
    .from("venues")
    .select("name, bar_code, asana_project_gid, asana_score_section_gid, asana_score_assignee_gid, task_source, seven_shifts_location_id, timezone, toast_restaurant_guid, toast_client_id, toast_client_secret")
    .eq("id", barId)
    .single();

  const barCode = barRow?.bar_code ?? barId;
  const asanaProjectGid = barRow?.asana_project_gid || "1212581047822912";
  const asanaScoreSectionGid = barRow?.asana_score_section_gid;

  // Resolve GM Asana GID from venue_leadership_contacts (source of truth).
  // Fall back to venues.asana_score_assignee_gid only for diagnostics; do
  // NOT use the legacy field for actual scoring once tasks_status is set.
  let gmAsanaGid: string | null = null;
  let tasksStatus: "gm_only" | "gm_not_mapped" = "gm_not_mapped";
  {
    const { data: gmRows } = await supabase
      .from("venue_leadership_contacts")
      .select("asana_gid, is_primary, created_at")
      .eq("venue_id", barId)
      .eq("role_type", "gm")
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    const gid = gmRows?.[0]?.asana_gid;
    if (gid) {
      gmAsanaGid = gid;
      tasksStatus = "gm_only";
    }
  }
  // For backward compatibility with existing search code below
  const asanaScoreAssigneeGid = gmAsanaGid;
  const taskSource = barRow?.task_source || "none";


  const primaryDailyQuery = `from("daily_metrics").select("*").eq("bar_id", "${barCode}").gte("date", "${weekStart}").lte("date", "${weekEnd}")`;
  const fallbackDailyQuery = `from("daily_metrics").select("*").eq("bar_id", "${barId}").gte("date", "${weekStart}").lte("date", "${weekEnd}")`;

  let readSource = barCode === barId ? "venue_uuid" : "bar_code";
  let readKey = barCode;
  let { data: metrics } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("bar_id", barCode)
    .gte("date", weekStart)
    .lte("date", weekEnd);

  if ((!metrics || metrics.length === 0) && barCode !== barId) {
    const fallback = await supabase
      .from("daily_metrics")
      .select("*")
      .eq("bar_id", barId)
      .gte("date", weekStart)
      .lte("date", weekEnd);
    metrics = fallback.data;
    readSource = "venue_uuid_fallback";
    readKey = barId;
    console.log(`Fallback: found ${metrics?.length ?? 0} rows by venue UUID ${barId}`);
  }

  const rows = metrics || [];
  const hasRows = rows.length > 0;

  // ── Coverage Gate ─────────────────────────────────────────
  // Hard skip when daily_metrics coverage < 85% (6 of 7 days). Prevents silent
  // sync stalls (e.g. wall-clock timeouts on sync-toast-metrics) from producing
  // misleading partial-week scorecards. No flag column, no UI surface — the
  // prior week's row stays current until coverage catches up.
  // See mem://architecture/compute-weekly-scores/coverage-gate.
  const DAILY_COVERAGE_THRESHOLD = 0.85;
  const PLAUSIBLE_NET_SALES_FLOOR = 100; // $100/day floor: catches degenerate $0/$19/$117 rows.
  const distinctDates = new Set(rows.map((r: any) => r.date).filter(Boolean));
  const daysPresent = distinctDates.size;
  const coveragePct = daysPresent / 7;
  if (coveragePct < DAILY_COVERAGE_THRESHOLD) {
    console.log(`[COVERAGE-GATE] ${barCode}/${weekStart} only ${daysPresent}/7 days — skipping weekly_core write`);
    // Observability: log to suppressed_metrics so the UI can render a "why"
    // tooltip when downstream tiles show '—'.
    try {
      await supabase.from('suppressed_metrics').insert({
        bar_id: barCode,
        venue_id: barId,
        week_start: weekStart,
        metric_key: 'weekly_core',
        gate: 'coverage_gate',
        reason: `Only ${daysPresent}/7 daily_metrics rows present (threshold ${Math.round(DAILY_COVERAGE_THRESHOLD * 100)}%).`,
        days_present: daysPresent,
        threshold: DAILY_COVERAGE_THRESHOLD,
      });
    } catch (e) {
      console.warn('[COVERAGE-GATE] suppressed_metrics log failed:', e instanceof Error ? e.message : e);
    }
    return {
      bar_id: barId,
      week_start: weekStart,
      week_end: weekEnd,
      status: "skipped",
      reason: "coverage_gate",
      days_present: daysPresent,
    };
  }
  // Phase E: value-aware coverage. Catch days that are present but degenerate
  // (e.g. $0 or $19 rows from partial-day captures). A real slow Monday at any
  // venue clears $100/day comfortably.
  const validDays = new Set(
    rows
      .filter((r: any) => Number(r.net_sales) >= PLAUSIBLE_NET_SALES_FLOOR)
      .map((r: any) => r.date),
  ).size;
  if (validDays / 7 < DAILY_COVERAGE_THRESHOLD) {
    console.log(`[COVERAGE-GATE-VALUE] ${barCode}/${weekStart} only ${validDays}/7 days have plausible net_sales (>= $${PLAUSIBLE_NET_SALES_FLOOR}) — skipping weekly_core write`);
    try {
      await supabase.from('suppressed_metrics').insert({
        bar_id: barCode,
        venue_id: barId,
        week_start: weekStart,
        metric_key: 'weekly_core',
        gate: 'coverage_gate_value',
        reason: `Only ${validDays}/7 days had net_sales >= $${PLAUSIBLE_NET_SALES_FLOOR} (threshold ${Math.round(DAILY_COVERAGE_THRESHOLD * 100)}%).`,
        days_present: daysPresent,
        valid_days: validDays,
        threshold: DAILY_COVERAGE_THRESHOLD,
        details: { plausible_net_sales_floor: PLAUSIBLE_NET_SALES_FLOOR },
      });
    } catch (e) {
      console.warn('[COVERAGE-GATE-VALUE] suppressed_metrics log failed:', e instanceof Error ? e.message : e);
    }
    return {
      bar_id: barId,
      week_start: weekStart,
      week_end: weekEnd,
      status: "skipped",
      reason: "coverage_gate_value",
      days_present: daysPresent,
      valid_days: validDays,
    };
  }

  const sum = (field: string) =>
    rows.reduce((acc: number, row: any) => acc + (Number(row[field]) || 0), 0);
  const sumInt = (field: string) =>
    rows.reduce((acc: number, row: any) => acc + (parseInt(row[field]) || 0), 0);

  const netSales = sum("net_sales");
  const grossSales = sum("gross_sales");
  const laborCost = sum("labor_cost");
  const laborHours = sum("labor_hours");
  const scheduledHours = sum("scheduled_hours");
  const workedHours = sum("worked_hours");
  const overtimeHours = sum("overtime_hours");
  const tips = sum("tips");
  const voids = sum("voids");
  const discounts = sum("discounts");
  const refunds = sum("refunds");
  const comps = sum("comps");
  const unpaidAmount = sum("unpaid_amount");
  const transactions = sumInt("orders_count");
  const guests = sumInt("guests");

  const traceDailySums = {
    net_sales: netSales,
    gross_sales: grossSales,
    labor_cost_used: laborCost,
    labor_cost_total_authoritative: sum("labor_cost_total"),
    labor_hours_used: laborHours,
    labor_hours_total_authoritative: sum("labor_hours_total"),
    overtime_hours: overtimeHours,
    tips_used: tips,
    tips_amount_authoritative: sum("tips_amount"),
    voids_used: voids,
    voids_amount_authoritative: sum("voids_amount"),
    discounts_used: discounts,
    discounts_amount_authoritative: sum("discounts_amount"),
    refunds_used: refunds,
    refunds_amount_authoritative: sum("refunds_amount"),
    comps: comps,
    unpaid_amount: unpaidAmount,
    transactions,
    guests,
  };

  console.log(`Bar ${barId}: ${rows.length} daily_metrics rows, netSales=${netSales}, hasRows=${hasRows}`);

  const hasFinancialData = hasRows && rows.some((row: any) =>
    row.net_sales != null ||
    row.gross_sales != null ||
    row.refunds != null ||
    row.unpaid_amount != null ||
    row.voids != null ||
    row.discounts != null ||
    row.tips != null ||
    row.comps != null
  );

  const splh = laborHours > 0 && netSales > 0 ? netSales / laborHours : null;
  const laborPct = netSales > 0 && laborCost > 0 ? laborCost / netSales : null;

  // ── Coverage gates for Toast check/day–derived metrics ───────────────
  // tips, unpaid_amount, avg_turn_time_mins all come from the same Toast
  // check/day report. If that report failed for some days in the window,
  // SUM(tips) / SUM(net_sales) divides a partial numerator by a full
  // denominator and produces a misleadingly low tip%. Same for unpaid
  // (under-counted SUM) and turn time (avg over partial week).
  // Policy: require ≥85% sales-weighted (tips) or day-count (unpaid/turn)
  // coverage; otherwise surface as null so UI shows "—" instead of a fake
  // number. (architecture/data-integrity-policy + product/trust-reliability)
  const COVERAGE_THRESHOLD = 0.85;
  const tipsCoverageDenom = rows.reduce(
    (acc: number, r: any) => acc + ((r.tips != null) ? (Number(r.net_sales) || 0) : 0),
    0,
  );
  const unpaidCoverageDays = rows.filter((r: any) => r.unpaid_amount != null).length;
  const tipsCoveragePct = netSales > 0 ? tipsCoverageDenom / netSales : 0;
  const unpaidCoveragePct = rows.length > 0 ? unpaidCoverageDays / rows.length : 0;
  const tipsCovered = tipsCoveragePct >= COVERAGE_THRESHOLD && tipsCoverageDenom > 0;
  const unpaidCovered = unpaidCoveragePct >= COVERAGE_THRESHOLD;
  if (!tipsCovered) {
    console.warn(`[COVERAGE] ${barCode}: tips coverage ${(tipsCoveragePct * 100).toFixed(1)}% < 85% (${rows.filter((r:any)=>r.tips!=null).length}/${rows.length} days) — suppressing tip_pct/tips_amount`);
  }
  if (!unpaidCovered) {
    console.warn(`[COVERAGE] ${barCode}: unpaid coverage ${(unpaidCoveragePct * 100).toFixed(1)}% < 85% (${unpaidCoverageDays}/${rows.length} days) — suppressing unpaid_checks_amount`);
  }

  // tip_pct now uses coverage-aware denominator (net_sales of tip-bearing
  // days only) instead of full-week net_sales.
  const tipPct = tipsCovered ? (tips / tipsCoverageDenom) : null;
  const tipsForOutput = tipsCovered ? tips : null;
  const unpaidAmountForOutput = unpaidCovered ? unpaidAmount : null;

  const voidRate = netSales > 0 && voids > 0 ? voids / netSales : null;
  const discountPct = netSales > 0 && discounts > 0 ? discounts / netSales : null;
  const refundPct = hasFinancialData && netSales > 0 ? refunds / netSales : null;
  const combinedCompsDiscountsPct = netSales > 0 ? discounts / netSales : null;
  const aov = transactions > 0 ? netSales / transactions : null;

  // --- Fetch 7shifts company ID early (used by L3, O5, L5) ---
  let sevenShiftsCompanyId: string | null = null;
  const sevenShiftsToken = Deno.env.get("SEVEN_SHIFTS_ACCESS_TOKEN");
  const locationId = barRow?.seven_shifts_location_id;
  if (sevenShiftsToken && locationId) {
    try {
      const whoami = await fetch("https://api.7shifts.com/v2/whoami", {
        headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" },
      });
      if (!whoami.ok) throw new Error(`7shifts whoami failed: ${whoami.status}`);
      const whoamiData = await whoami.json();
      const activeUser = whoamiData.data?.users?.find((u: any) => u.active);
      const companyId = activeUser?.company_id || whoamiData.data?.company_id;
      sevenShiftsCompanyId = companyId ? String(companyId) : null;
      console.log(`[7shifts] companyId=${sevenShiftsCompanyId} for venue="${barRow?.name ?? barId}"`);
    } catch (err: any) {
      console.error(`[7shifts] whoami error: ${err.message}`);
    }
  }

  // --- L3 Schedule Variance: hours_and_wages report ---
  let scheduleVariancePct: number | null = null;
  let sevenShiftsScheduledHours: number | null = null;
  let sevenShiftsActualHours: number | null = null;
  if (sevenShiftsToken && locationId && sevenShiftsCompanyId) {
    try {
      const venueName = barRow?.name ?? barId;
      const baseParams = `company_id=${sevenShiftsCompanyId}&location_id=${locationId}&from=${weekStart}&to=${weekEnd}`;

      // Scheduled hours (punches=false)
      const schedResp = await fetch(
        `https://api.7shifts.com/v2/reports/hours_and_wages?${baseParams}&punches=false`,
        { headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" } }
      );
      if (!schedResp.ok) throw new Error(`hours_and_wages (sched) ${schedResp.status}: ${await schedResp.text()}`);
      const schedData = await schedResp.json();

      // Worked hours (punches=true)
      const workedResp = await fetch(
        `https://api.7shifts.com/v2/reports/hours_and_wages?${baseParams}&punches=true`,
        { headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" } }
      );
      if (!workedResp.ok) throw new Error(`hours_and_wages (worked) ${workedResp.status}: ${await workedResp.text()}`);
      const workedData = await workedResp.json();

      // Sum total_hours across all users
      const sumUserHours = (data: any): number => {
        const users = data?.users ?? data?.data?.users ?? [];
        return users.reduce((sum: number, u: any) => sum + (u?.total?.total_hours ?? 0), 0);
      };

      const scheduledHours = sumUserHours(schedData);
      const workedHours = sumUserHours(workedData);

      sevenShiftsScheduledHours = Math.round(scheduledHours * 100) / 100;
      sevenShiftsActualHours = Math.round(workedHours * 100) / 100;

      if (scheduledHours > 0) {
        scheduleVariancePct = (workedHours - scheduledHours) / scheduledHours;
        console.log(`[L3] hours_and_wages venue="${venueName}" scheduled=${scheduledHours.toFixed(2)}h worked=${workedHours.toFixed(2)}h variance=${(scheduleVariancePct * 100).toFixed(2)}%`);
      } else {
        console.warn(`[L3] no scheduled hours from report venue="${venueName}" week=${weekStart}`);
      }
    } catch (err: any) {
      console.error(`L3: hours_and_wages error: ${err.message}`);
    }
  }

  const overtimeRate = laborHours > 0 ? overtimeHours / laborHours : null;
  const turnTimeAvgRaw = simpleAvg(rows, "avg_turn_time_mins");
  const turnCoverageDays = rows.filter((r: any) => r.avg_turn_time_mins != null).length;
  const turnCoveragePct = rows.length > 0 ? turnCoverageDays / rows.length : 0;
  const turnCovered = turnCoveragePct >= COVERAGE_THRESHOLD;
  if (!turnCovered && turnTimeAvgRaw != null) {
    console.warn(`[COVERAGE] ${barCode}: turn-time coverage ${(turnCoveragePct * 100).toFixed(1)}% < 85% (${turnCoverageDays}/${rows.length} days) — suppressing turn_time_avg_min`);
  }
  const turnTimeAvg = turnCovered ? turnTimeAvgRaw : null;
  let avgKdsTimeMins = simpleAvg(rows, "avg_kds_time_mins");
  let kdsOver25Pct: number | null = simpleAvg(rows, "kds_over_25_pct");
  let kdsTotalTickets:  number | null = simpleSum(rows, "kds_total_tickets");
  let kdsOver25Tickets: number | null = simpleSum(rows, "kds_over_25_tickets");

  // --- G5: Direct Toast API fetch for KDS time (primary source) ---
  // Venues confirmed to have no KDS data in Toast API
  const noKdsVenues = new Set([
    "a869a7fe-af6c-4b4b-9c2b-5039bffd5d3b", // Aero Club
    "cedb71f7-a800-4691-aa79-7877eacda6d4", // Sycamore Den
    "37d77ac2-e2cb-48a0-8d2f-06fefa12de04", // Club Marina
    "baded85e-e4c5-4b5e-b37b-ce031adcbf18", // The Hearth House — items never reach READY status (verified 2026-04-20: 3160 SENT / 0 READY)
  ]);
  {
    if (noKdsVenues.has(barId)) {
      console.log(`[G5] Skipping KDS fetch for ${barRow?.name || barId} — venue has no KDS data`);
    } else {
      const toastGuid = barRow?.toast_restaurant_guid || Deno.env.get("TOAST_RESTAURANT_GUID");
      const toastClientId = barRow?.toast_client_id || Deno.env.get("TOAST_CLIENT_ID");
      const toastClientSecret = barRow?.toast_client_secret || Deno.env.get("TOAST_CLIENT_SECRET");

      if (toastClientId && toastClientSecret && toastGuid) {
        try {
          // Authenticate with Toast
          const authRes = await fetch("https://ws-api.toasttab.com/authentication/v1/authentication/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId: toastClientId, clientSecret: toastClientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
          });
          if (!authRes.ok) throw new Error(`Toast auth failed: ${authRes.status}`);
          const authData = await authRes.json();
          if (authData.status !== "SUCCESS" || !authData.token?.accessToken) throw new Error("Toast auth: no token");
          const toastToken = authData.token.accessToken;

          const toastHeaders = {
            Authorization: `Bearer ${toastToken}`,
            "Toast-Restaurant-External-ID": toastGuid,
            "Content-Type": "application/json",
          };

          // Fetch orders for the week
          let kdsTimeMs = 0;
          let kdsCount = 0;
          let kdsOver25Count = 0;
          const statusCounts: Record<string, number> = {};
          const pageSize = 100;
          const maxPages = 25;
          let page = 1;

          while (page <= maxPages) {
            const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${weekStart}T00:00:00.000Z&endDate=${weekEnd}T23:59:59.999Z&pageSize=${pageSize}&page=${page}`;
            const ordersRes = await fetch(url, { headers: toastHeaders });
            if (!ordersRes.ok) {
              if (ordersRes.status === 429) { await new Promise(r => setTimeout(r, 500)); continue; }
              break;
            }
            const orders = await ordersRes.json();
            if (!orders.length) break;

            for (const order of orders) {
              if (!order.checks) continue;
              for (const check of order.checks) {
                if (!check.selections) continue;
                // Track the MAX fulfillment time across all READY items in this check (ticket-level)
                let checkMaxMs = 0;
                let checkHasReady = false;
                for (const item of check.selections) {
                  const status = item.fulfillmentStatus || 'NONE';
                  statusCounts[status] = (statusCounts[status] || 0) + 1;

                  if (item.fulfillmentStatus === "READY" && item.modifiedDate) {
                    const startTime = item.createdDate || order.openedDate;
                    if (startTime) {
                      const diffMs = new Date(item.modifiedDate).getTime() - new Date(startTime).getTime();
                      const diffMins = diffMs / 60000;
                      if (diffMins > 0 && diffMins < 120) {
                        checkHasReady = true;
                        if (diffMs > checkMaxMs) checkMaxMs = diffMs;
                      }
                    }
                  }
                }
                // Count one ticket time per check using the slowest item
                if (checkHasReady) {
                  kdsTimeMs += checkMaxMs;
                  kdsCount++;
                  if (checkMaxMs / 60000 > 25) kdsOver25Count++;
                }
              }
            }

            if (orders.length < pageSize) break;
            page++;
            await new Promise(r => setTimeout(r, 200));
          }

          if (kdsCount > 0) {
            avgKdsTimeMins = kdsTimeMs / kdsCount / 60000;
            kdsOver25Pct = kdsOver25Count / kdsCount;
            kdsTotalTickets = kdsCount;
            kdsOver25Tickets = kdsOver25Count;
            console.log(`[G5] Direct Toast fetch: avgKdsTimeMins=${avgKdsTimeMins.toFixed(2)}, kdsOver25Pct=${(kdsOver25Pct * 100).toFixed(1)}% from ${kdsCount} tickets (check-level max), over25=${kdsOver25Count}`);
          } else {
            console.log(`[G5] Direct Toast fetch: no READY items found for week ${weekStart}. Status breakdown: ${JSON.stringify(statusCounts)}`);
          }
        } catch (err: any) {
          console.error(`[G5] Toast KDS fetch error: ${err.message}`);
        }
      } else {
        console.log(`[G5] No Toast credentials available — using daily_metrics value: ${avgKdsTimeMins}`);
      }
    }
  }

  // --- O1: Asana Task Completion (only when task_source=asana) ---
  let asanaTotalTasks = 0;
  let asanaCompletedTasks = 0;
  let asanaOnTimeTasks = 0;
  let asanaInRedTasks = 0;

  if (taskSource === "asana") {
    const asanaToken = Deno.env.get("ASANA_ACCESS_TOKEN");
    const WORKSPACE_GID = "16292914201127";

    if (asanaToken && asanaScoreAssigneeGid) {
      // Preferred path: workspace-level search by assignee across ALL projects
      try {
        // Asana due_on.after/before are EXCLUSIVE, so offset by 1 day to include boundary dates
        const inclusiveStart = new Date(weekStart + 'T00:00:00Z');
        inclusiveStart.setUTCDate(inclusiveStart.getUTCDate() - 1);
        const inclusiveEnd = new Date(weekEnd + 'T00:00:00Z');
        inclusiveEnd.setUTCDate(inclusiveEnd.getUTCDate() + 1);
        const searchAfter = inclusiveStart.toISOString().slice(0, 10);
        const searchBefore = inclusiveEnd.toISOString().slice(0, 10);

        console.log(`[Asana O1] Workspace search for assignee ${asanaScoreAssigneeGid}, week ${weekStart}-${weekEnd} (search window: after ${searchAfter}, before ${searchBefore})`);
        let offset: string | null = null;
        let allTasks: any[] = [];

        do {
          const params = new URLSearchParams({
            'assignee.any': asanaScoreAssigneeGid,
            'due_on.after': searchAfter,
            'due_on.before': searchBefore,
            'opt_fields': 'completed,completed_at,due_on,name',
            'is_subtask': 'false',
            'limit': '100',
          });
          if (offset) params.set('offset', offset);

          const url = `https://app.asana.com/api/1.0/workspaces/${WORKSPACE_GID}/tasks/search?${params}`;
          const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${asanaToken}` },
          });

          if (!resp.ok) {
            console.error(`[Asana O1] Workspace search error: ${resp.status} ${await resp.text()}`);
            break;
          }

          const json = await resp.json();
          allTasks = allTasks.concat(json.data || []);
          offset = json.next_page?.offset || null;
          await new Promise(r => setTimeout(r, 200));
        } while (offset);

        asanaTotalTasks = allTasks.length;
        asanaCompletedTasks = allTasks.filter((t: any) => t.completed).length;

        // Task performance breakdown (for Weekly Review Task Performance card)
        const _todayStr = new Date().toISOString().slice(0, 10);
        asanaOnTimeTasks = allTasks.filter((t: any) =>
          t.completed && t.completed_at && t.due_on &&
          t.completed_at.slice(0, 10) <= t.due_on
        ).length;
        asanaInRedTasks = allTasks.filter((t: any) =>
          !t.completed && t.due_on && t.due_on < _todayStr
        ).length;

        console.log(`[Asana O1] Workspace search result: ${asanaCompletedTasks}/${asanaTotalTasks} tasks completed for assignee ${asanaScoreAssigneeGid}, week ${weekStart}-${weekEnd} (on-time=${asanaOnTimeTasks}, in-red=${asanaInRedTasks})`);

        // Cache fallback: workspace /tasks/search occasionally returns 0 even
        // when the token can see the GM's tasks via /tasks?assignee=… (observed
        // on Aero Club / Mac). Recompute from the nightly asana_gm_tasks cache.
        if (asanaTotalTasks === 0 && asanaScoreAssigneeGid) {
          const { data: cacheRows, error: cacheErr } = await supabase
            .from("asana_gm_tasks")
            .select("completed, completed_at, due_on")
            .eq("venue_id", barId)
            .gte("due_on", weekStart)
            .lte("due_on", weekEnd);

          if (cacheErr) {
            console.error(`[Asana O1] asana_gm_tasks cache query failed: ${cacheErr.message}`);
          } else if (cacheRows && cacheRows.length > 0) {
            const todayPacific = new Date().toLocaleDateString("en-CA", {
              timeZone: "America/Los_Angeles",
            });

            asanaTotalTasks = cacheRows.length;
            asanaCompletedTasks = cacheRows.filter((r: any) => r.completed === true).length;
            asanaOnTimeTasks = cacheRows.filter((r: any) =>
              r.completed === true &&
              r.completed_at != null &&
              r.due_on != null &&
              String(r.completed_at).slice(0, 10) <= r.due_on
            ).length;
            asanaInRedTasks = cacheRows.filter((r: any) =>
              r.completed !== true &&
              r.due_on != null &&
              r.due_on < todayPacific
            ).length;

            console.log(`[Asana O1] search returned 0; used asana_gm_tasks cache: ${asanaCompletedTasks}/${asanaTotalTasks}`);
          }
        }
      } catch (asanaErr: any) {
        console.error(`[Asana O1] Workspace search failed: ${asanaErr.message}`);
      }
    } else if (asanaToken && asanaProjectGid) {
      // Fallback: project-based fetch (for venues without assignee GID)
      try {
        const asanaUrl = asanaScoreSectionGid
          ? `https://app.asana.com/api/1.0/sections/${asanaScoreSectionGid}/tasks?opt_fields=completed,completed_at,assignee,due_on`
          : `https://app.asana.com/api/1.0/projects/${asanaProjectGid}/tasks?opt_fields=completed,completed_at,assignee,due_on&completed_since=2020-01-01T00:00:00Z`;

        console.log(`[Asana O1] Fallback project fetch: ${asanaUrl}`);
        const asanaResp = await fetch(asanaUrl, {
          headers: { Authorization: `Bearer ${asanaToken}` },
        });

        if (asanaResp.ok) {
          const { data: asanaTasks } = await asanaResp.json();
          let tasks = asanaTasks || [];

          // Filter by due_on within the scoring week
          const dueDateFiltered = tasks.filter((t: any) => {
            if (!t.due_on) return false;
            return t.due_on >= weekStart && t.due_on <= weekEnd;
          });

          if (dueDateFiltered.length > 0) {
            asanaTotalTasks = dueDateFiltered.length;
            asanaCompletedTasks = dueDateFiltered.filter((t: any) => t.completed).length;
            console.log(`[Asana O1] Fallback due-date filtered: ${asanaCompletedTasks}/${asanaTotalTasks}`);
          } else {
            asanaTotalTasks = tasks.length;
            asanaCompletedTasks = tasks.filter((t: any) => t.completed).length;
            console.log(`[Asana O1] Fallback snapshot: ${asanaCompletedTasks}/${asanaTotalTasks}`);
          }
        } else {
          console.error(`[Asana O1] Fallback API error: ${asanaResp.status} ${await asanaResp.text()}`);
        }
      } catch (asanaErr: any) {
        console.error(`[Asana O1] Fallback fetch failed: ${asanaErr.message}`);
      }
    } else {
      console.log("[Asana O1] No ASANA_ACCESS_TOKEN or no assignee/project GID — skipping");
    }
  } else {
    console.log(`task_source=${taskSource} — skipping Asana O1`);
  }

  const taskCompletionPct = asanaTotalTasks > 0 ? asanaCompletedTasks / asanaTotalTasks : null;

  // --- Task backlog (separate from scoring math) ---
  // Sourced from asana_gm_tasks cache. Counts ALL open tasks for this venue's
  // GM regardless of due date — surfaces the backlog Chad sees in Asana that
  // doesn't appear in the due-this-week scoring window.
  let tasksOpenBacklog: number | null = null;
  let tasksTotalAssigned: number | null = null;
  let tasksTotalOutstanding: number | null = null;
  let tasksCompletedThisWeek: number | null = null;
  if (gmAsanaGid) {
    const { count: backlogCount, error: backlogErr } = await supabase
      .from("asana_gm_tasks")
      .select("task_gid", { count: "exact", head: true })
      .eq("venue_id", barId)
      .eq("completed", false);
    if (backlogErr) {
      console.warn(`[task backlog] count error: ${backlogErr.message}`);
    } else {
      tasksOpenBacklog = backlogCount ?? 0;
      console.log(`[task backlog] venue ${barId} open=${tasksOpenBacklog}`);
    }

    // Weekly snapshot metrics (Chad's mental model: workload + backlog + throughput)
    // - total_assigned: cumulative tasks created on/before week_end
    // - total_outstanding: assigned ≤ week_end AND (completed_at IS NULL OR completed_at > week_end)
    // - completed_this_week: completed_at between week_start (00:00) and week_end (23:59:59)
    try {
      const weekEndExclusiveIso = new Date(weekEnd + "T23:59:59.999Z").toISOString();
      const weekStartIso = new Date(weekStart + "T00:00:00.000Z").toISOString();

      // Page through tasks for this venue/GM (cache table). Counting via select-all
      // since we need date comparisons that mix nulls + bounds.
      const { data: gmRows, error: gmRowsErr } = await supabase
        .from("asana_gm_tasks")
        .select("task_gid, created_at_asana, completed_at, completed")
        .eq("venue_id", barId);

      if (gmRowsErr) {
        console.warn(`[task weekly snapshot] fetch error: ${gmRowsErr.message}`);
      } else {
        let assigned = 0, outstanding = 0, completedWk = 0;
        for (const r of (gmRows ?? []) as Array<{ created_at_asana: string | null; completed_at: string | null; completed: boolean }>) {
          const created = r.created_at_asana;
          if (!created || created > weekEndExclusiveIso) continue;
          assigned++;
          const done = r.completed_at;
          if (!done || done > weekEndExclusiveIso) {
            outstanding++;
          }
          if (done && done >= weekStartIso && done <= weekEndExclusiveIso) {
            completedWk++;
          }
        }
        tasksTotalAssigned = assigned;
        tasksTotalOutstanding = outstanding;
        tasksCompletedThisWeek = completedWk;
        console.log(`[task weekly snapshot] venue ${barId} ${weekStart}..${weekEnd} assigned=${assigned} outstanding=${outstanding} completed=${completedWk}`);
      }
    } catch (e: any) {
      console.warn(`[task weekly snapshot] failed: ${e?.message ?? e}`);
    }
  } else {
    console.log(`[task backlog] no GM mapped for venue ${barId} → tasks_status=gm_not_mapped`);
  }


  // --- O5: Sidework Completion (7shifts tasks — ALL venues with location_id) ---
  let sideworkTotal = 0;
  let sideworkCompleted = 0;
  {
    const sevenShiftsToken = Deno.env.get("SEVEN_SHIFTS_ACCESS_TOKEN");
    const locationId = barRow?.seven_shifts_location_id;
    if (sevenShiftsToken && locationId) {
      try {
        let companyId = sevenShiftsCompanyId;
        if (!companyId) {
          const whoami = await fetch("https://api.7shifts.com/v2/whoami", {
            headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" },
          });
          if (!whoami.ok) throw new Error(`7shifts whoami failed: ${whoami.status}`);
          const whoamiData = await whoami.json();
          const activeUser = whoamiData.data?.users?.find((u: any) => u.active);
          companyId = String(activeUser?.company_id || whoamiData.data?.company_id);
        }

        const current = new Date(weekStart + "T00:00:00Z");
        const end = new Date(weekEnd + "T00:00:00Z");
        while (current <= end) {
          const dateStr = current.toISOString().slice(0, 10);
          try {
            const summaryResp = await fetch(
              `https://api.7shifts.com/v2/company/${companyId}/task_list_daily_summary?location_id=${locationId}&date=${dateStr}`,
              { headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" } },
            );
            if (summaryResp.ok) {
              const summaryData = await summaryResp.json();
              const taskLists = summaryData?.data?.task_lists || [];
              for (const list of taskLists) {
                sideworkTotal += Number(list.total_tasks) || 0;
                sideworkCompleted += Number(list.total_tasks_completed) || 0;
              }
            } else if (summaryResp.status === 403) {
              console.warn("[O5] 7shifts task_list_daily_summary returned 403 — may require Gourmet plan");
              break;
            } else {
              console.warn(`[O5] 7shifts task summary for ${dateStr}: ${summaryResp.status}`);
            }
          } catch (dayErr: any) {
            console.warn(`[O5] 7shifts task summary error for ${dateStr}: ${dayErr.message}`);
          }
          current.setUTCDate(current.getUTCDate() + 1);
        }
        console.log(`[O5] Sidework: ${sideworkCompleted}/${sideworkTotal} completed for location ${locationId} (${weekStart} to ${weekEnd})`);
      } catch (err: any) {
        console.error(`[O5] 7shifts sidework fetch failed: ${err.message}`);
      }
    } else {
      console.log("[O5] No 7shifts token or location_id — skipping sidework");
    }
  }
  const sideworkCompletionPct = sideworkTotal > 0 ? sideworkCompleted / sideworkTotal : null;

  // --- L5: Workforce Engagement (7shifts Engage Overview) ---
  // Use frequency=month to match the enterprise report's monthly aggregation
  let engageLates: number | null = null;
  let engageNoShows: number | null = null;
  let engageDroppedShifts: number | null = null;
  let engageShiftBids: number | null = null;
  let engageAvgShiftScore: number | null = null;
  let engageAvgTenure: number | null = null;
  let engageCompositeScore: number | null = null;
  {
    const sevenShiftsToken = Deno.env.get("SEVEN_SHIFTS_ACCESS_TOKEN");
    const locationId = barRow?.seven_shifts_location_id;
    if (sevenShiftsToken && locationId && sevenShiftsCompanyId) {
      try {
        // Fetch engage overview — default frequency is weekly (matches our weekly scoring period)
        const engageResp = await fetch(
          `https://api.7shifts.com/v2/company/${sevenShiftsCompanyId}/locations/${locationId}/engage_overview?date=${weekEnd}`,
          { headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" } },
        );
        if (engageResp.ok) {
          const engageData = await engageResp.json();
          const d = engageData?.data;
          if (d) {
            const ls = d?.location_stats ?? {};

            // Get raw counts from location_stats
            const rawLates = ls.lates?.current ?? null;
            const rawNoShows = ls.no_shows?.current ?? null;
            const rawDropped = ls.shift_drops?.current ?? null;
            engageShiftBids = ls.shift_bids?.current ?? null;

            // shift_feedback.current can be null for the current week — fall back to monthly
            engageAvgShiftScore = d.shift_feedback?.current ?? null;
            if (engageAvgShiftScore == null) {
              try {
                const monthResp = await fetch(
                  `https://api.7shifts.com/v2/company/${sevenShiftsCompanyId}/locations/${locationId}/engage_overview?date=${weekEnd}&frequency=month`,
                  { headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" } },
                );
                if (monthResp.ok) {
                  const monthData = await monthResp.json();
                  engageAvgShiftScore = monthData?.data?.shift_feedback?.current ?? null;
                  console.log(`[L5] shift_feedback weekly was null, monthly=${engageAvgShiftScore}`);
                }
              } catch (e: any) {
                console.warn(`[L5] Monthly shift_feedback fallback failed: ${e.message}`);
              }
            }

            engageAvgTenure = d.tenure?.average_tenure ?? null;

            // Count total scheduled shifts for THIS location in THIS week
            let totalShifts = 0;
            try {
              let shiftCursor: string | undefined;
              const shiftStartDate = `${weekStart}T00:00:00Z`;
              const shiftEndDate = `${weekEnd}T23:59:59Z`;
              let page = 0;
              do {
                const qs = new URLSearchParams({
                  location_id: String(locationId),
                  "start[gte]": shiftStartDate,
                  "start[lte]": shiftEndDate,
                  limit: "250",
                });
                if (shiftCursor) qs.set("cursor", shiftCursor);
                const shiftsResp = await fetch(
                  `https://api.7shifts.com/v2/company/${sevenShiftsCompanyId}/shifts?${qs}`,
                  { headers: { Authorization: `Bearer ${sevenShiftsToken}`, Accept: "application/json" } },
                );
                if (!shiftsResp.ok) {
                  const errBody = await shiftsResp.text();
                  console.warn(`[L5] Shifts API error ${shiftsResp.status}: ${errBody.substring(0, 200)}`);
                  break;
                }
                const shiftsData = await shiftsResp.json();
                const pageCount = shiftsData.data?.length ?? 0;
                totalShifts += pageCount;
                // cursor is inside meta.cursor as a string "next" value
                const cursorObj = shiftsData.meta?.cursor;
                shiftCursor = typeof cursorObj === 'string' ? cursorObj : cursorObj?.next ?? undefined;
                page++;
                if (page === 1) {
                  console.log(`[L5] Shifts page 1: ${pageCount} shifts, meta=${JSON.stringify(shiftsData.meta)}`);
                }
              } while (shiftCursor && page < 10);
            } catch (e: any) {
              console.warn(`[L5] Shifts count failed: ${e.message}`);
            }

            console.log(`[L5] Raw counts: lates=${rawLates} no_shows=${rawNoShows} dropped=${rawDropped} bids=${engageShiftBids} totalShifts=${totalShifts}`);

            // Compute percentages using totalShifts as denominator
            if (totalShifts > 0) {
              engageLates = rawLates != null ? Math.round((rawLates / totalShifts) * 1000) / 10 : null;
              engageNoShows = rawNoShows != null ? Math.round((rawNoShows / totalShifts) * 1000) / 10 : null;
              engageDroppedShifts = rawDropped != null ? Math.round((rawDropped / totalShifts) * 1000) / 10 : null;
            } else {
              // Fallback: store raw counts if we can't get total shifts
              engageLates = rawLates;
              engageNoShows = rawNoShows;
              engageDroppedShifts = rawDropped;
              console.warn(`[L5] totalShifts=0, storing raw counts as fallback`);
            }

            console.log(`[L5] Result: lates=${engageLates}% no_shows=${engageNoShows}% dropped=${engageDroppedShifts}% bids=${engageShiftBids} avg_score=${engageAvgShiftScore} tenure=${engageAvgTenure}d`);

            // Normalize each sub-metric into 0-100 for composite scoring
            const normalize = (val: number | null, maxBad: number, lowerIsBetter: boolean): number | null => {
              if (val == null) return null;
              if (lowerIsBetter) {
                if (val <= 0) return 100;
                return Math.max(0, Math.round(100 - (val / maxBad) * 100));
              } else {
                return Math.min(100, Math.round((val / maxBad) * 100));
              }
            };

            // Normalization thresholds now work with percentages for lates/no_shows/dropped
            const tenureMonths = engageAvgTenure != null ? Math.round((engageAvgTenure / 30.44) * 10) / 10 : null;
            const normScores = [
              normalize(engageLates, 20, true),              // 0% lates = 100, 20%+ = 0
              normalize(engageNoShows, 15, true),             // 0% no-shows = 100, 15%+ = 0
              normalize(engageDroppedShifts, 20, true),       // 0% dropped = 100, 20%+ = 0
              normalize(engageShiftBids, 20, false),          // 20+ bids = 100
              normalize(engageAvgShiftScore, 5, false),       // 5.0 = 100
              normalize(tenureMonths, 24, false),              // 24+ months = 100
            ];

            const validNorms = normScores.filter((s): s is number => s != null);
            if (validNorms.length > 0) {
              engageCompositeScore = Math.round(validNorms.reduce((a, b) => a + b, 0) / validNorms.length);
            }

            console.log(`[L5] Composite=${engageCompositeScore}`);
          } else {
            console.warn(`[L5] Engage API returned OK but data object is empty/null. Full response: ${JSON.stringify(engageData)}`);
          }
        } else {
          const errBody = await engageResp.text();
          console.warn(`[L5] Engage API error ${engageResp.status}: ${errBody}`);
        }
      } catch (err: any) {
        console.error(`[L5] Engage fetch failed: ${err.message}`);
      }
    } else {
      console.log("[L5] Missing 7shifts credentials — skipping workforce engagement");
    }
  }

  // --- G4: Online Reputation (Google + Yelp combined) ---
  let googleRating: number | null = null;
  let yelpRating: number | null = null;
  let onlineReputationScore: number | null = null;
  {
    const { data: reviewSnap } = await supabase
      .from("review_snapshots")
      .select("google_rating, yelp_rating, snapshot_date")
      .eq("bar_id", barId)
      .lte("snapshot_date", weekEnd)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reviewSnap?.google_rating != null) {
      googleRating = Number(reviewSnap.google_rating);
    }
    if (reviewSnap?.yelp_rating != null) {
      yelpRating = Number(reviewSnap.yelp_rating);
    }

    // Fallback: if either rating is still missing, check +7 days ahead
    if (googleRating == null || yelpRating == null) {
      const fallbackEnd = addDays(weekEnd, 7);
      const { data: fallbackSnap } = await supabase
        .from("review_snapshots")
        .select("google_rating, yelp_rating, snapshot_date")
        .eq("bar_id", barId)
        .gt("snapshot_date", weekEnd)
        .lte("snapshot_date", fallbackEnd)
        .order("snapshot_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (googleRating == null && fallbackSnap?.google_rating != null) {
        googleRating = Number(fallbackSnap.google_rating);
        console.log(`[G4] Fallback filled Google=${googleRating} from ${fallbackSnap.snapshot_date}`);
      }
      if (yelpRating == null && fallbackSnap?.yelp_rating != null) {
        yelpRating = Number(fallbackSnap.yelp_rating);
        console.log(`[G4] Fallback filled Yelp=${yelpRating} from ${fallbackSnap.snapshot_date}`);
      }
    }

    // Compute online reputation score from whatever we have
    if (googleRating != null && yelpRating != null) {
      onlineReputationScore = Math.round(((googleRating + yelpRating) / 2) * 100) / 100;
      console.log(`[G4] Online Reputation: Google=${googleRating} + Yelp=${yelpRating} = ${onlineReputationScore}`);
    } else if (googleRating != null) {
      onlineReputationScore = googleRating;
      console.log(`[G4] Online Reputation: Google-only=${googleRating}`);
    } else if (yelpRating != null) {
      onlineReputationScore = yelpRating;
      console.log(`[G4] Online Reputation: Yelp-only=${yelpRating}`);
    } else {
      console.log(`[G4] No snapshot found for bar ${barId} near week ending ${weekEnd}`);
    }
  }

  const [{ count: shiftCount }, { count: gmCount }, { count: leadCount }] = await Promise.all([
    supabase
      .from("shift_logs")
      .select("id", { count: "exact", head: true })
      .eq("bar_id", barId)
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("gm_logs")
      .select("id", { count: "exact", head: true })
      .eq("bar_id", barId)
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("lead_logs")
      .select("id", { count: "exact", head: true })
      .eq("bar_id", barId)
      .gte("date", weekStart)
      .lte("date", weekEnd),
  ]);

  const employeeLogsCount = (shiftCount ?? 0) + (gmCount ?? 0) + (leadCount ?? 0);

  // Sanitize helper: convert NaN/Infinity to null for Postgres compatibility
  const san = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const weeklyCorePayload = {
    week_id: weekUuid,
    bar_id: barId,
    gross_sales: hasRows ? san(grossSales) : null,
    net_sales: hasRows ? san(netSales) : null,
    transactions: hasRows ? san(transactions) : null,
    aov: san(aov != null ? Math.round(aov * 100) / 100 : null),
    discount_amount: hasRows ? san(discounts) : null,
    discount_pct: san(discountPct != null ? Math.round(discountPct * 10000) / 10000 : null),
    labor_cost_total: hasRows ? san(laborCost) : null,
    labor_hours_total: hasRows ? san(laborHours) : null,
    labor_pct: san(laborPct != null ? Math.round(laborPct * 10000) / 10000 : null),
    splh: san(splh != null ? Math.round(splh * 100) / 100 : null),
    scheduled_hours: san(sevenShiftsScheduledHours ?? (hasRows ? scheduledHours : null)),
    actual_hours: san(sevenShiftsActualHours ?? (hasRows ? laborHours : null)),
    schedule_variance_pct:
      san(scheduleVariancePct != null ? Math.round(scheduleVariancePct * 10000) / 10000 : null),
    overtime_hours: hasRows ? san(overtimeHours) : null,
    overtime_rate:
      san(overtimeRate != null ? Math.round(overtimeRate * 10000) / 10000 : null),
    tasks_due: tasksStatus === "gm_not_mapped" ? null : san(asanaTotalTasks),
    tasks_completed: tasksStatus === "gm_not_mapped" ? null : san(asanaCompletedTasks),
    tasks_on_time: tasksStatus === "gm_not_mapped" ? null : san(asanaOnTimeTasks),
    tasks_in_red: tasksStatus === "gm_not_mapped" ? null : san(asanaInRedTasks),
    on_time_rate: tasksStatus === "gm_not_mapped" ? null : san(
      asanaTotalTasks > 0
        ? Math.round((asanaOnTimeTasks / asanaTotalTasks) * 10000) / 10000
        : null
    ),
    task_completion_pct: tasksStatus === "gm_not_mapped" ? null :
      san(taskCompletionPct != null ? Math.round(taskCompletionPct * 10000) / 10000 : null),
    tasks_open_backlog: tasksOpenBacklog,
    tasks_total_assigned: tasksStatus === "gm_not_mapped" ? null : san(tasksTotalAssigned),
    tasks_total_outstanding: tasksStatus === "gm_not_mapped" ? null : san(tasksTotalOutstanding),
    tasks_completed_this_week: tasksStatus === "gm_not_mapped" ? null : san(tasksCompletedThisWeek),
    tasks_status: tasksStatus,

    turn_time_avg_min: san(turnTimeAvg != null ? Math.round(turnTimeAvg) : null),
    void_amount: hasRows ? san(voids) : null,
    void_rate: san(voidRate != null ? Math.round(voidRate * 10000) / 10000 : null),
    unpaid_checks_amount: hasRows ? san(unpaidAmountForOutput) : null,
    weekly_guests: hasRows ? san(guests) : null,
    tips_amount: hasRows ? san(tipsForOutput) : null,
    tip_pct: san(tipPct != null ? Math.round(tipPct * 10000) / 10000 : null),
    refund_amount: hasFinancialData ? san(refunds) : null,
    refund_pct: san(refundPct != null ? Math.round(refundPct * 10000) / 10000 : null),
    google_rating: san(googleRating),
    comps_amount: hasRows ? san(comps) : null,
    employee_logs_count: san(employeeLogsCount),
    // New Phase 1 fields
    sidework_completion_pct: san(sideworkCompletionPct != null ? Math.round(sideworkCompletionPct * 10000) / 10000 : null),
    sidework_tasks_total: san(sideworkTotal || null),
    sidework_tasks_completed: san(sideworkCompleted || null),
    engage_lates: san(engageLates),
    engage_no_shows: san(engageNoShows),
    engage_dropped_shifts: san(engageDroppedShifts),
    engage_shift_bids: san(engageShiftBids),
    engage_avg_shift_score: san(engageAvgShiftScore),
    engage_avg_tenure: san(engageAvgTenure),
    engage_composite_score: san(engageCompositeScore),
    yelp_rating: san(yelpRating),
    online_reputation_score: san(onlineReputationScore),
    avg_kds_time_mins: san(avgKdsTimeMins != null ? Math.round(avgKdsTimeMins * 100) / 100 : null),
    kds_over_25_pct: san(kdsOver25Pct != null ? Math.round(kdsOver25Pct * 10000) / 10000 : null),
    kds_total_tickets: san(kdsTotalTickets != null ? Math.round(kdsTotalTickets) : null),
    kds_over_25_tickets: san(kdsOver25Tickets != null ? Math.round(kdsOver25Tickets) : null),
    computed_at: new Date().toISOString(),
  };

  // YOY fields will be added after lookup below

  const { data: config } = await supabase
    .from("period_config")
    .select("*")
    .eq("bar_id", barId)
    .lte("effective_start", weekEnd)
    .or(`effective_end.is.null,effective_end.gte.${weekStart}`)
    .order("effective_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  // --- YOY: Look up same-calendar-week from prior year ---
  let lastYearNetSales: number | null = null;
  let lastYearTransactions: number | null = null;
  let lastYearAov: number | null = null;
  let lastYearGuests: number | null = null;
  let yoyChangePct: number | null = null;
  let yoyTransactionsPct: number | null = null;
  let yoyAovPct: number | null = null;
  let yoyGuestsPct: number | null = null;
  let lastYearOvertimeRate: number | null = null;
  {
    const lyWeekStart = addDays(weekStart, -364); // same weekday, 52 weeks back
    const lyWeekEnd = addDays(lyWeekStart, 6);

    // Try bar_code first, then venue UUID (matching current week logic)
    let { data: lyRows } = await supabase
      .from("daily_metrics")
      .select("net_sales, orders_count, guests")
      .eq("bar_id", barCode)
      .gte("date", lyWeekStart)
      .lte("date", lyWeekEnd);

    if ((!lyRows || lyRows.length === 0) && barCode !== barId) {
      const fallback = await supabase
        .from("daily_metrics")
        .select("net_sales, orders_count, guests")
        .eq("bar_id", barId)
        .gte("date", lyWeekStart)
        .lte("date", lyWeekEnd);
      lyRows = fallback.data;
    }

    if (lyRows && lyRows.length > 0) {
      const lyNetSales = lyRows.reduce((s: number, r: any) => s + (Number(r.net_sales) || 0), 0);
      const lyTransactions = lyRows.reduce((s: number, r: any) => s + (parseInt(r.orders_count) || 0), 0);
      const lyGuests = lyRows.reduce((s: number, r: any) => s + (parseInt(r.guests) || 0), 0);
      const lyAov = lyTransactions > 0 ? lyNetSales / lyTransactions : null;

      if (lyNetSales > 0) lastYearNetSales = lyNetSales;
      if (lyTransactions > 0) lastYearTransactions = lyTransactions;
      if (lyGuests > 0) lastYearGuests = lyGuests;
      if (lyAov != null && lyAov > 0) lastYearAov = Math.round(lyAov * 100) / 100;

      // Compute YOY deltas
      if (lastYearNetSales && netSales > 0) yoyChangePct = Math.round(((netSales - lastYearNetSales) / lastYearNetSales) * 10000) / 10000;
      if (lastYearTransactions && transactions > 0) yoyTransactionsPct = Math.round(((transactions - lastYearTransactions) / lastYearTransactions) * 10000) / 10000;
      if (lastYearAov && aov) yoyAovPct = Math.round(((aov - lastYearAov) / lastYearAov) * 10000) / 10000;
      if (lastYearGuests && guests > 0) yoyGuestsPct = Math.round(((guests - lastYearGuests) / lastYearGuests) * 10000) / 10000;

      console.log(`[YOY] Found ${lyRows.length} rows for ${lyWeekStart}–${lyWeekEnd}: sales=${lastYearNetSales} txns=${lastYearTransactions} aov=${lastYearAov} guests=${lastYearGuests}`);
    } else {
      console.log(`[YOY] No prior-year data for ${lyWeekStart}–${lyWeekEnd}`);
    }

    // Also look up prior-year weekly_core for ratio metrics (overtime_rate, labor_pct, etc.)
    const { data: lyCore } = await supabase
      .from("weekly_core")
      .select("overtime_rate")
      .eq("bar_id", barId)
      .gte("week_id", weekUuid) // just need the join — query by week range instead
      .limit(1)
      .maybeSingle();

    // Better approach: find prior-year week via the weeks table
    const { data: lyWeekRow } = await supabase
      .from("weeks")
      .select("id")
      .eq("bar_id", barId)
      .eq("week_start", lyWeekStart)
      .maybeSingle();

    // lastYearOvertimeRate declared at outer scope (line 921)
    if (lyWeekRow?.id) {
      const { data: lyCoreRow } = await supabase
        .from("weekly_core")
        .select("overtime_rate")
        .eq("week_id", lyWeekRow.id)
        .eq("bar_id", barId)
        .maybeSingle();
      if (lyCoreRow?.overtime_rate != null && Number(lyCoreRow.overtime_rate) > 0) {
        lastYearOvertimeRate = Number(lyCoreRow.overtime_rate);
        console.log(`[YOY-L4] Prior-year overtime_rate=${lastYearOvertimeRate} from week ${lyWeekStart}`);
      }
    }
    if (lastYearOvertimeRate == null) {
      console.log(`[YOY-L4] No prior-year overtime_rate for ${lyWeekStart}`);
    }
  }




  // Add YOY fields to payload and upsert
  const fullCorePayload = {
    ...weeklyCorePayload,
    last_year_net_sales: san(lastYearNetSales),
    last_year_transactions: san(lastYearTransactions),
    last_year_aov: san(lastYearAov),
    last_year_guests: san(lastYearGuests),
    yoy_change_pct: san(yoyChangePct),
    yoy_transactions_pct: san(yoyTransactionsPct),
    yoy_aov_pct: san(yoyAovPct),
    yoy_guests_pct: san(yoyGuestsPct),
  };
  const { error: coreErr } = await supabase.from("weekly_core").upsert(fullCorePayload, { onConflict: "week_id,bar_id" });
  if (coreErr) {
    console.error(`weekly_core upsert FAILED for ${barId} week ${weekUuid}:`, JSON.stringify(coreErr));
    throw new Error(`weekly_core upsert failed: ${coreErr.message}`);
  }

  // Volume metrics: use YOY target when available, fall back to manual config
  const r1Target = lastYearNetSales ?? (config?.weekly_net_sales_target ? Number(config.weekly_net_sales_target) : null);
  const r2Target = lastYearTransactions ?? (config?.weekly_orders_target ? Number(config.weekly_orders_target) : null);
  const r3Target = lastYearAov ?? (config?.weekly_aov_target ? Number(config.weekly_aov_target) : null);
  const g1Target = lastYearGuests ?? (config?.weekly_guests_target ? Number(config.weekly_guests_target) : null);

  const r1 = scoreHigherIsBetter(netSales > 0 ? netSales : null, r1Target);
  const r2 = scoreHigherIsBetter(transactions > 0 ? transactions : null, r2Target);
  const r3 = scoreHigherIsBetter(aov, r3Target);
  const r4 = scoreLowerIsBetter(combinedCompsDiscountsPct, config?.discount_pct_target ? Number(config.discount_pct_target) : null);

  const l1 = scoreLowerIsBetter(laborPct, config?.labor_pct_target ? Number(config.labor_pct_target) : null);
  const l2 = scoreHigherIsBetter(splh, config?.splh_target ? Number(config.splh_target) : null);
  const l3 = scoreLowerIsBetter(scheduleVariancePct != null ? Math.abs(scheduleVariancePct) : null, config?.schedule_variance_target ? Number(config.schedule_variance_target) : null);
  const l4Target = lastYearOvertimeRate ?? (config?.overtime_rate_target ? Number(config.overtime_rate_target) : null);
  const l4 = scoreLowerIsBetter(overtimeRate, l4Target);
  const l5 = engageCompositeScore != null ? scoreHigherIsBetter(engageCompositeScore / 100, (config?.engage_score_target ? Number(config.engage_score_target) : 0.70)) : null;

  const o1 = scoreHigherIsBetter(taskCompletionPct, config?.task_completion_target ? Number(config.task_completion_target) : null);
  const o2 = scoreLowerIsBetter(turnTimeAvg, config?.turn_time_target_min ? Number(config.turn_time_target_min) : null);
  const o3 = scoreLowerIsBetter(voidRate, config?.void_rate_target ? Number(config.void_rate_target) : null);
  const o4Actual = hasFinancialData ? unpaidAmountForOutput : null;
  const o4 = scoreLowerIsBetter(o4Actual, config?.unpaid_amount_target != null ? Number(config.unpaid_amount_target) : null);
  const o5 = scoreHigherIsBetter(sideworkCompletionPct, config?.sidework_completion_target ? Number(config.sidework_completion_target) : 0.90);

  const g1 = scoreHigherIsBetter(guests > 0 ? guests : null, g1Target);
  const g2 = scoreHigherIsBetter(tipPct, config?.tip_pct_target ? Number(config.tip_pct_target) : null);
  const g3 = scoreLowerIsBetter(refundPct, config?.refund_pct_target ? Number(config.refund_pct_target) : null);
  const g4 = scoreRating(onlineReputationScore, config?.google_rating_target ? Number(config.google_rating_target) : null);

  // G5: KDS — % of tickets over 25 min (lower is better)
  const scoreKdsOver25 = (pct: number | null): number | null => {
    if (pct == null) return null;
    const p = pct * 100; // convert 0-1 ratio to 0-100
    if (p <= 5) return 95;   // A
    if (p <= 15) return 85;  // B
    if (p <= 25) return 75;  // C
    if (p <= 40) return 65;  // D
    return 40;               // F
  };
  const g5 = scoreKdsOver25(kdsOver25Pct);

  const revenueScore = pillarAvg([r1, r2, r3, r4]);
  const laborScore = pillarAvg([l1, l2, l3, l4, l5]);
  const operationsScore = pillarAvg([o1, o2, o3, o4, o5]);
  const guestScore = pillarAvg([g1, g2, g3, g4, g5]);

  const wGuest = config?.weight_guest ? Number(config.weight_guest) : 35;
  const wRevenue = config?.weight_revenue ? Number(config.weight_revenue) : 25;
  const wLabor = config?.weight_labor ? Number(config.weight_labor) : 20;
  const wOps = config?.weight_operations ? Number(config.weight_operations) : 20;

  const pillarEntries: { score: number | null; weight: number }[] = [
    { score: guestScore, weight: wGuest },
    { score: revenueScore, weight: wRevenue },
    { score: laborScore, weight: wLabor },
    { score: operationsScore, weight: wOps },
  ];

  const validPillars = pillarEntries.filter((pillar) => pillar.score != null);
  let overallScore: number | null = null;
  if (validPillars.length > 0) {
    const totalWeight = validPillars.reduce((acc, pillar) => acc + pillar.weight, 0);
    overallScore = Math.round(
      validPillars.reduce((acc, pillar) => acc + pillar.score! * (pillar.weight / totalWeight), 0),
    );
  }

  const grade = overallScore != null ? assignGrade(overallScore) : null;
  const allSignals = [r1, r2, r3, r4, l1, l2, l3, l4, l5, o1, o2, o3, o4, o5, g1, g2, g3, g4, g5];
  const confidence = Math.round((allSignals.filter((signal) => signal != null).length / 19) * 100);

  const scorecardPayload = {
      week_id: weekUuid,
      bar_id: barId,
      overall_score: san(overallScore),
      overall_grade: grade,
      confidence: san(confidence),
      guest_score: san(guestScore),
      revenue_score: san(revenueScore),
      labor_score: san(laborScore),
      operations_score: san(operationsScore),
      r1_actual: san(netSales > 0 ? netSales : null), r1_score: san(r1),
      r2_actual: san(transactions > 0 ? transactions : null), r2_score: san(r2),
      r3_actual: san(aov != null ? Math.round(aov * 100) / 100 : null), r3_score: san(r3),
      r4_actual: san(combinedCompsDiscountsPct != null ? Math.round(combinedCompsDiscountsPct * 10000) / 10000 : null), r4_score: san(r4),
      l1_actual: san(laborPct != null ? Math.round(laborPct * 10000) / 10000 : null), l1_score: san(l1),
      l2_actual: san(splh != null ? Math.round(splh * 100) / 100 : null), l2_score: san(l2),
      l3_actual: san(scheduleVariancePct != null ? Math.round(scheduleVariancePct * 10000) / 10000 : null), l3_score: san(l3),
      l4_actual: san(overtimeRate != null ? Math.round(overtimeRate * 10000) / 10000 : null), l4_score: san(l4),
      l5_actual: san(engageCompositeScore), l5_score: san(l5),
      o1_actual: san(taskCompletionPct != null ? Math.round(taskCompletionPct * 10000) / 10000 : null), o1_score: san(o1),
      o2_actual: san(turnTimeAvg != null ? Math.round(turnTimeAvg) : null), o2_score: san(o2),
      o3_actual: san(voidRate != null ? Math.round(voidRate * 10000) / 10000 : null), o3_score: san(o3),
      o4_actual: san(o4Actual), o4_score: san(o4),
      o5_actual: san(sideworkCompletionPct != null ? Math.round(sideworkCompletionPct * 10000) / 10000 : null), o5_score: san(o5),
      g1_actual: san(guests > 0 ? guests : null), g1_score: san(g1),
      g2_actual: san(tipPct != null ? Math.round(tipPct * 10000) / 10000 : null), g2_score: san(g2),
      g3_actual: san(refundPct != null ? Math.round(refundPct * 10000) / 10000 : null), g3_score: san(g3),
      g4_actual: san(onlineReputationScore), g4_score: san(g4),
      g5_actual: san(kdsOver25Pct != null ? Math.round(kdsOver25Pct * 10000) / 10000 : null), g5_score: san(g5),
  };
  console.log(`[SCORECARD] Writing scorecard for ${barId} week ${weekUuid}, overall=${scorecardPayload.overall_score}, grade=${grade}`);
  const { error: scorecardErr } = await supabase.from("weekly_scorecard").upsert(
    scorecardPayload,
    { onConflict: "week_id,bar_id" },
  );
  if (scorecardErr) {
    console.error(`Scorecard upsert FAILED for ${barId} week ${weekUuid}:`, JSON.stringify(scorecardErr));
    throw new Error(`Scorecard upsert failed for ${barId}: ${scorecardErr.message}`);
  }
  console.log(`[SCORECARD] Successfully wrote scorecard for ${barId}`);

  // Lifecycle: mark the weeks row 'computed' ONLY after scorecard succeeds.
  // Coverage-gated runs return earlier and leave status as 'in_progress'.
  const { error: weekStatusErr } = await supabase
    .from("weeks")
    .update({ status: "computed" })
    .eq("id", weekUuid);
  if (weekStatusErr) {
    console.error(`[WEEK-STATUS] Failed to mark week ${weekUuid} computed for ${barId}:`, weekStatusErr.message);
    // Non-fatal: scorecard is already persisted.
  }



  const syncRunMetadata = {
    week_start: weekStart,
    week_end: weekEnd,
    overall_score: san(overallScore),
    grade,
    confidence: san(confidence),
    signals_with_data: allSignals.filter((signal) => signal != null).length,
  };

  const { error: syncRunErr } = await supabase.from("sync_runs").insert({
    bar_id: barId,
    sync_type: "weekly_scores",
    status: "completed",
    completed_at: new Date().toISOString(),
    records_processed: rows.length,
    records_created: 1,
    metadata: syncRunMetadata,
  });
  if (syncRunErr) {
    console.error(`Sync run insert FAILED for ${barId}:`, JSON.stringify(syncRunErr));
    throw new Error(`Sync run insert failed for ${barId}: ${syncRunErr.message}`);
  }

  return {
    overall_score: overallScore,
    grade,
    confidence,
    trace: includeTrace
      ? {
          venue_name: barRow?.name ?? null,
          bar_code: barCode,
          week_start: weekStart,
          week_end: weekEnd,
          read_source: readSource,
          read_key: readKey,
          daily_query: primaryDailyQuery,
          fallback_query: barCode !== barId ? fallbackDailyQuery : null,
          aggregation_fields: {
            net_sales: "daily_metrics.net_sales",
            gross_sales: "daily_metrics.gross_sales",
            labor_cost_total_written_from: "daily_metrics.labor_cost",
            labor_hours_total_written_from: "daily_metrics.labor_hours",
            tips_amount_written_from: "daily_metrics.tips",
            void_amount_written_from: "daily_metrics.voids",
            discount_amount_written_from: "daily_metrics.discounts",
            refund_amount_written_from: "daily_metrics.refunds",
            transactions_written_from: "daily_metrics.orders_count",
            weekly_guests_written_from: "daily_metrics.guests",
            turn_time_avg_min_written_from: "simpleAvg(daily_metrics.avg_turn_time_mins)",
          },
          daily_metrics_rows: rows.map((row: any) => ({
            date: row.date ?? null,
            source: row.source ?? null,
            net_sales: row.net_sales ?? null,
            orders_count: row.orders_count ?? null,
            guests: row.guests ?? null,
            tips: row.tips ?? null,
            tips_amount: row.tips_amount ?? null,
            voids: row.voids ?? null,
            voids_amount: row.voids_amount ?? null,
            discounts: row.discounts ?? null,
            discounts_amount: row.discounts_amount ?? null,
            refunds: row.refunds ?? null,
            refunds_amount: row.refunds_amount ?? null,
            avg_turn_time_mins: row.avg_turn_time_mins ?? null,
            synced_at: row.synced_at ?? null,
            last_synced_at: row.last_synced_at ?? null,
          })),
          daily_sums: traceDailySums,
          weekly_core_payload: weeklyCorePayload,
          sync_run_metadata: syncRunMetadata,
        }
      : undefined,
  };
}
