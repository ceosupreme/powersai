// Drafts a review request, queues it for approval.
// Idempotent on (project_id, trigger_ref).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-2.5-flash";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: ud } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  const userId = ud?.user?.id;
  if (!userId) return json({ error: "unauthorized" }, 401);

  type Body = {
    project_id?: string;
    trigger_ref?: string;
    trigger_source?: "manual" | "event";
    recipient?: { name?: string; email?: string; phone?: string };
    visit_at?: string;
    channel?: "email" | "sms";
  };
  let payload: Body = {};
  try { payload = await req.json(); } catch { /* noop */ }
  const { project_id, trigger_ref, trigger_source = "manual", recipient, visit_at, channel = "email" } = payload;
  if (!project_id || !trigger_ref || !recipient) return json({ error: "project_id, trigger_ref, recipient required" }, 400);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: enr } = await sb
    .from("project_automation_enrollments")
    .select("enabled, config")
    .eq("project_id", project_id)
    .eq("automation_key", "review_request")
    .maybeSingle();
  if (!enr?.enabled) return json({ error: "not_enrolled" }, 400);

  const config = (enr.config ?? {}) as Record<string, unknown>;
  const delayHours = typeof config.delay_hours === "number" ? (config.delay_hours as number) : 2;
  const platformLink = typeof config.platform_link === "string" ? (config.platform_link as string) : "";
  const venueName = typeof config.venue_name === "string" ? (config.venue_name as string) : "";

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  let parsed: { subject?: string; body?: string } = {};
  if (apiKey) {
    const sys = `Write a short, friendly review request. Drafts only — human review before send.
${channel === "email" ? "Return JSON: { subject, body }. Subject under 60 chars; body under 110 words; include the review link." : "Return JSON: { body }. Body under 280 chars; include the review link."}`;
    const user = `Customer: ${recipient.name ?? "(unknown)"}
Venue: ${venueName || "(unspecified)"}
Review link: ${platformLink || "(no link configured)"}
Tone: warm, brief, one ask.`;
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
          response_format: { type: "json_object" },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        parsed = JSON.parse(j?.choices?.[0]?.message?.content ?? "{}");
      }
    } catch (e) { console.error("[review-request] AI error", e); }
  }

  const body = typeof parsed.body === "string"
    ? parsed.body
    : `Hi ${recipient.name ?? "there"} — thanks for stopping by${venueName ? " at " + venueName : ""}! Would you mind leaving us a quick review? ${platformLink || ""}`.trim();
  const subject = typeof parsed.subject === "string" ? parsed.subject : "Quick favor?";

  const baseTime = visit_at ? new Date(visit_at).getTime() : Date.now();
  const scheduledFor = new Date(baseTime + delayHours * 3_600_000).toISOString();

  // Create the run (idempotent on project_id+trigger_ref).
  const { data: run, error: runErr } = await sb
    .from("review_request_runs")
    .insert({
      project_id, trigger_source, trigger_ref, created_by: userId, status: "queued",
    })
    .select("id")
    .single();
  if (runErr) {
    if ((runErr as { code?: string }).code === "23505") {
      return json({ skipped: true, reason: "already_requested" });
    }
    return json({ error: runErr.message }, 500);
  }

  const { data: q, error: qErr } = await sb
    .from("automation_message_queue")
    .insert({
      project_id,
      automation_key: "review_request",
      source_run_id: run.id,
      recipient_snapshot: recipient,
      channel,
      subject: channel === "email" ? subject : null,
      body,
      model: MODEL,
      status: "pending_review",
      scheduled_for: scheduledFor,
      dedupe_key: trigger_ref,
    })
    .select("id")
    .single();

  if (qErr) return json({ error: qErr.message }, 500);
  await sb.from("review_request_runs").update({ queued_message_id: q.id }).eq("id", run.id);

  return json({ ok: true, run_id: run.id, queue_id: q.id });
});