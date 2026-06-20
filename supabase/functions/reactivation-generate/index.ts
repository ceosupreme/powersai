// Reactivation campaign: drafts a per-segment win-back message and queues
// one row per member. Operator approves in the queue UI.
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

  let payload: { list_id?: string; offer?: string; name?: string; channel?: "email" | "sms" } = {};
  try { payload = await req.json(); } catch { /* noop */ }
  const { list_id, offer, name, channel = "email" } = payload;
  if (!list_id) return json({ error: "list_id required" }, 400);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: list } = await sb.from("project_customer_lists").select("*").eq("id", list_id).maybeSingle();
  if (!list) return json({ error: "list_not_found" }, 404);

  const { data: enr } = await sb
    .from("project_automation_enrollments")
    .select("enabled, config")
    .eq("project_id", list.project_id)
    .eq("automation_key", "reactivation")
    .maybeSingle();
  if (!enr?.enabled) return json({ error: "not_enrolled" }, 400);

  const { data: members } = await sb
    .from("project_customer_list_members")
    .select("*")
    .eq("list_id", list_id)
    .limit(2000);
  if (!members?.length) return json({ error: "no_members" }, 400);

  // Segment by recency (server-side, deterministic).
  const now = Date.now();
  const segmentOf = (m: { last_visit_at: string | null }) => {
    if (!m.last_visit_at) return "unknown";
    const days = (now - new Date(m.last_visit_at).getTime()) / 86_400_000;
    if (days <= 30) return "recent";
    if (days <= 60) return "lapsed_30";
    if (days <= 90) return "lapsed_60";
    return "lapsed_90_plus";
  };

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const drafts: Record<string, { subject?: string; body: string }> = {};

  const segments = Array.from(new Set(members.map((m) => segmentOf(m as { last_visit_at: string | null }))));

  for (const seg of segments) {
    let parsed: { subject?: string; body?: string } = {};
    if (apiKey) {
      const sys = `You write a win-back ${channel} message for a customer segment. Drafts only — human review before send.
${channel === "email" ? "Return JSON: { subject, body }. Subject under 60 chars, body under 140 words." : "Return JSON: { body }. Body under 320 chars, no links unless essential."}
Use {{name}} as a token for the customer's first name.`;
      const user = `Project: ${list.name}
Segment: ${seg}
Offer: ${offer ?? "(none specified)"}
Tone: warm, brief, one CTA.`;
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
      } catch (e) { console.error("[reactivation] AI error", e); }
    }
    drafts[seg] = {
      subject: typeof parsed.subject === "string" ? parsed.subject : undefined,
      body: typeof parsed.body === "string" ? parsed.body : `(Draft pending — ${seg} ${channel} win-back)`,
    };
  }

  const { data: run, error: runErr } = await sb
    .from("reactivation_campaign_runs")
    .insert({
      project_id: list.project_id,
      list_id,
      name: name ?? `${list.name} — reactivation`,
      segment_snapshot: { segments, counts: segments.map((s) => ({ s, n: members.filter((m) => segmentOf(m as { last_visit_at: string | null }) === s).length })) },
      offer_snapshot: { offer: offer ?? null, channel },
      status: "review",
      created_by: userId,
    })
    .select("id")
    .single();
  if (runErr) return json({ error: runErr.message }, 500);

  const rows = members
    .filter((m) => (channel === "email" ? !!m.email : !!m.phone))
    .map((m) => {
      const seg = segmentOf(m as { last_visit_at: string | null });
      const draft = drafts[seg];
      const firstName = (m.name as string | null)?.split(" ")?.[0] ?? "there";
      return {
        project_id: list.project_id,
        automation_key: "reactivation",
        source_run_id: run.id,
        recipient_snapshot: { name: m.name, email: m.email, phone: m.phone, segment: seg },
        channel,
        subject: draft.subject ?? null,
        body: draft.body.replace(/\{\{name\}\}/g, firstName),
        model: MODEL,
        status: "pending_review",
        dedupe_key: `${run.id}:${m.id}`,
      };
    });

  const { error: insErr, data: inserted } = await sb
    .from("automation_message_queue")
    .insert(rows)
    .select("id");
  if (insErr) return json({ error: insErr.message }, 500);

  await sb.from("reactivation_campaign_runs")
    .update({ queued_count: (inserted ?? []).length })
    .eq("id", run.id);

  return json({ ok: true, run_id: run.id, queued: (inserted ?? []).length, segments });
});