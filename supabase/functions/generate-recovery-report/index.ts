// Recovery Report generator — internal-first weekly draft per project.
// Dispatcher (no body / {}) fans out per active project; per-project mode
// aggregates from existing tables, computes a conservative dollar estimate,
// and writes one recovery_reports row with status='draft'. Never sends.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_AVG_TICKET = 40;
const DEFAULT_CLOSE_RATE = 0.15;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nowPacific(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
  );
}

function getPreviousWeek(): { weekStart: string; weekEnd: string } {
  const now = nowPacific();
  const dow = now.getDay(); // 0=Sun
  const daysToLastSun = dow === 0 ? 7 : dow;
  const lastSun = new Date(now);
  lastSun.setDate(now.getDate() - daysToLastSun);
  const y = lastSun.getFullYear();
  const m = String(lastSun.getMonth() + 1).padStart(2, "0");
  const d = String(lastSun.getDate()).padStart(2, "0");
  const weekEnd = `${y}-${m}-${d}`;
  const weekStart = addDays(weekEnd, -6);
  return { weekStart, weekEnd };
}

function ptHour(iso: string): number {
  const d = new Date(iso);
  const h = new Date(
    d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
  ).getHours();
  return h;
}

interface Metrics {
  leads: {
    total: number;
    after_hours: number;
    by_channel: Record<string, number>;
    ready: number;
  };
  followups: { sent: number; re_engaged: number };
  reactivation: { contacted: number; responded: number };
  reviews: { requests_sent: number; reviews_landed: number };
}

interface EstimateBasis {
  avg_ticket: number;
  close_rate: number;
  source: "project" | "default" | "mixed";
  formula: string;
  caveats: string[];
}

async function aggregateProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  weekStart: string,
  weekEnd: string,
): Promise<{ metrics: Metrics; basis: EstimateBasis; dollars: number }> {
  const startIso = `${weekStart}T00:00:00-08:00`;
  const endIso = `${addDays(weekEnd, 1)}T00:00:00-08:00`;
  const caveats: string[] = [];

  // ── Leads captured (linked via captured_for_project_id at intake) ──
  const { data: leadRows = [] } = await supabase
    .from("inbound_leads")
    .select("id, conversation_channel, created_at, is_ready, status, updated_at")
    .eq("captured_for_project_id", projectId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const leads = leadRows ?? [];
  const byChannel: Record<string, number> = {};
  let afterHours = 0;
  let ready = 0;
  for (const l of leads) {
    const ch = (l.conversation_channel as string | null) ?? "unknown";
    byChannel[ch] = (byChannel[ch] ?? 0) + 1;
    const h = ptHour(l.created_at as string);
    if (h < 9 || h >= 17) afterHours++;
    if (l.is_ready) ready++;
  }

  // ── Follow-up runs + re-engagement (best-effort derivation) ──
  const { data: fuRuns = [] } = await supabase
    .from("followup_sequence_runs")
    .select("id, lead_id, fired_at, status")
    .eq("project_id", projectId)
    .gte("fired_at", startIso)
    .lt("fired_at", endIso);
  const fuSent = (fuRuns ?? []).length;

  // re-engaged: lead.updated_at > earliest fired_at AND is_ready true.
  let reEngaged = 0;
  const leadFirstFire = new Map<string, string>();
  for (const r of fuRuns ?? []) {
    const lid = r.lead_id as string | null;
    if (!lid || !r.fired_at) continue;
    const cur = leadFirstFire.get(lid);
    if (!cur || (r.fired_at as string) < cur) {
      leadFirstFire.set(lid, r.fired_at as string);
    }
  }
  if (leadFirstFire.size > 0) {
    const ids = Array.from(leadFirstFire.keys());
    const { data: leadStates = [] } = await supabase
      .from("inbound_leads")
      .select("id, is_ready, updated_at")
      .in("id", ids);
    for (const l of leadStates ?? []) {
      const fire = leadFirstFire.get(l.id as string);
      if (l.is_ready && fire && (l.updated_at as string) > fire) reEngaged++;
    }
    caveats.push(
      "Re-engaged counts leads marked ready after a follow-up fired; not a confirmed reply event.",
    );
  }

  // ── Reactivation campaigns ──
  const { data: reactRuns = [] } = await supabase
    .from("reactivation_campaign_runs")
    .select("id, queued_count, started_at")
    .eq("project_id", projectId)
    .gte("started_at", startIso)
    .lt("started_at", endIso);
  const reactContacted = (reactRuns ?? []).reduce(
    (s, r) => s + ((r.queued_count as number | null) ?? 0),
    0,
  );
  // Responded = approved sends in window for this project + reactivation key.
  const { count: reactRespondedCount } = await supabase
    .from("automation_send_log")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("automation_key", "reactivation")
    .eq("ok", true)
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  // Send-log "ok" reflects delivery, not customer response. Flag clearly.
  const reactResponded = reactRespondedCount ?? 0;
  if (reactContacted > 0) {
    caveats.push(
      "Reactivation 'responded' reflects delivered messages; no per-customer reply tracking yet — treat as upper bound.",
    );
  }

  // ── Review requests + landed reviews ──
  const { count: reviewSent } = await supabase
    .from("review_request_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("fired_at", startIso)
    .lt("fired_at", endIso);
  const { count: reviewsLanded } = await supabase
    .from("google_reviews")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", projectId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if ((reviewSent ?? 0) > 0) {
    caveats.push(
      "Reviews landed counts new Google reviews in-window; attribution to a specific request is approximate.",
    );
  }

  // ── Dollar estimate basis ──
  const { data: targets } = await supabase
    .from("bar_targets")
    .select("weekly_revenue_target")
    .eq("venue_id", projectId)
    .maybeSingle();
  // Average ticket: derive from period_config if present.
  const { data: period } = await supabase
    .from("period_config")
    .select("*")
    .eq("bar_id", projectId)
    .maybeSingle();
  let avgTicket = (period as any)?.avg_ticket ?? (period as any)?.average_ticket ?? null;
  let closeRate = (period as any)?.close_rate ?? (period as any)?.lead_close_rate ?? null;
  let source: EstimateBasis["source"] = "project";
  if (avgTicket == null) {
    avgTicket = DEFAULT_AVG_TICKET;
    source = "default";
    caveats.push(
      `No project avg ticket on file; using conservative default $${DEFAULT_AVG_TICKET}.`,
    );
  }
  if (closeRate == null) {
    closeRate = DEFAULT_CLOSE_RATE;
    source = source === "project" ? "mixed" : "default";
    caveats.push(
      `No project close rate on file; using conservative default ${(DEFAULT_CLOSE_RATE * 100).toFixed(0)}%.`,
    );
  }

  const leadsTotal = leads.length;
  const dollars = Math.round(
    leadsTotal * closeRate * avgTicket +
      reactResponded * avgTicket +
      reEngaged * closeRate * avgTicket,
  );

  const metrics: Metrics = {
    leads: { total: leadsTotal, after_hours: afterHours, by_channel: byChannel, ready },
    followups: { sent: fuSent, re_engaged: reEngaged },
    reactivation: { contacted: reactContacted, responded: reactResponded },
    reviews: {
      requests_sent: reviewSent ?? 0,
      reviews_landed: reviewsLanded ?? 0,
    },
  };

  const basis: EstimateBasis = {
    avg_ticket: Number(avgTicket),
    close_rate: Number(closeRate),
    source,
    formula:
      "(leads_captured × close_rate × avg_ticket) + (reactivated_responded × avg_ticket) + (re_engaged × close_rate × avg_ticket)",
    caveats,
  };
  void targets;
  return { metrics, basis, dollars };
}

async function generateNarrative(
  projectId: string,
  venueName: string,
  weekStart: string,
  weekEnd: string,
  metrics: Metrics,
  basis: EstimateBasis,
  dollars: number,
): Promise<string> {
  const system = `You write short internal recovery summaries for an operator to review before sharing with a client.

RULES:
- Activity counts are FACTS. State them plainly.
- Dollar figures are ESTIMATES against the client's own averages. Always prefix with "est." and reference the basis.
- NEVER say "we earned you", "we made you", or imply guaranteed revenue. Use "captured", "re-engaged", "at work", "in motion".
- 3–5 sentences max. Plain language. No marketing fluff. No emojis.
- End every sentence with a period, exclamation, or question mark. Never end on an incomplete clause, a trailing conjunction (but, and, so, because, however), or an ellipsis. If a thought can't finish inside the sentence limit, cut it.`;

  const user = `Project: ${venueName}
Week: ${weekStart} → ${weekEnd}

Facts:
- Leads captured: ${metrics.leads.total} (after-hours: ${metrics.leads.after_hours})
- Follow-ups sent: ${metrics.followups.sent}; re-engaged: ${metrics.followups.re_engaged}
- Reactivation contacted: ${metrics.reactivation.contacted}; responded: ${metrics.reactivation.responded}
- Review requests sent: ${metrics.reviews.requests_sent}; reviews landed: ${metrics.reviews.reviews_landed}

Estimate: $${dollars} at work, based on avg ticket $${basis.avg_ticket} and close rate ${(basis.close_rate * 100).toFixed(0)}% (source: ${basis.source}).

Write a 3–5 sentence internal summary.`;

  try {
    const res = await callAI({
      taskType: "user_facing_narrative",
      functionName: "generate-recovery-report",
      venueId: projectId,
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 400,
      temperature: 0.4,
    });
    return res.text.trim();
  } catch (e) {
    console.warn("[recovery-report] narrative AI failed", e);
    return `This week we captured ${metrics.leads.total} leads (${metrics.leads.after_hours} after-hours), re-engaged ${metrics.followups.re_engaged}, reactivated ${metrics.reactivation.responded} past customers, and generated ${metrics.reviews.reviews_landed} new reviews from ${metrics.reviews.requests_sent} requests. Est. $${dollars} at work, based on your avg ticket of $${basis.avg_ticket} and a ${(basis.close_rate * 100).toFixed(0)}% close rate.`;
  }
}

async function processProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  weekStart: string,
  weekEnd: string,
) {
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  const venueName = (venue as any)?.name ?? "this project";

  const { metrics, basis, dollars } = await aggregateProject(
    supabase,
    projectId,
    weekStart,
    weekEnd,
  );

  const narrative = await generateNarrative(
    projectId,
    venueName,
    weekStart,
    weekEnd,
    metrics,
    basis,
    dollars,
  );

  const { error } = await supabase
    .from("recovery_reports")
    .upsert(
      {
        project_id: projectId,
        period_start: weekStart,
        period_end: weekEnd,
        metrics,
        estimated_dollars: dollars,
        estimate_basis: basis,
        narrative,
        narrative_edited: false,
        status: "draft",
        generated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,period_start" },
    );
  if (error) {
    console.error("[recovery-report] upsert failed", projectId, error);
    return { project_id: projectId, status: "error", error: error.message };
  }
  return { project_id: projectId, status: "ok", dollars, metrics };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const { weekStart, weekEnd } = body.week_start
    ? { weekStart: body.week_start, weekEnd: addDays(body.week_start, 6) }
    : getPreviousWeek();

  // Per-project mode
  if (body.project_id) {
    const result = await processProject(supabase, body.project_id, weekStart, weekEnd);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Dispatcher: active projects = those with any automation enrollment row.
  const { data: enrolled = [] } = await supabase
    .from("project_automation_enrollments")
    .select("project_id");
  const projectIds = Array.from(
    new Set((enrolled ?? []).map((r: any) => r.project_id).filter(Boolean)),
  );

  console.log(
    `[recovery-report] dispatch week=${weekStart}..${weekEnd} projects=${projectIds.length}`,
  );

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const fnUrl = `${supabaseUrl}/functions/v1/generate-recovery-report`;

  const dispatched: string[] = [];
  for (const pid of projectIds) {
    try {
      await supabase.rpc("net_http_post", {
        url: fnUrl,
        headers_json: JSON.stringify({
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        }),
        body_json: JSON.stringify({ project_id: pid, week_start: weekStart }),
      });
      dispatched.push(pid);
    } catch (e) {
      console.warn("[recovery-report] dispatch fail", pid, e);
    }
  }

  return new Response(
    JSON.stringify({ week_start: weekStart, week_end: weekEnd, dispatched: dispatched.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});