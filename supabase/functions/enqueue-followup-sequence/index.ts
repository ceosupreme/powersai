// Enqueue a follow-up sequence for a single inbound lead.
// - Idempotent on lead_id (followup_sequence_runs has unique(lead_id))
// - Drafts an opener + day-N touches per configured channel via Lovable AI
// - Inserts into automation_message_queue with dedupe_key = lead:channel:day
// - Nothing sends from here — operator must approve in queue.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-2.5-flash";
const DEFAULT_DAYS = [0, 1, 3, 7, 14, 30];

type Channel = "email" | "sms" | "linkedin_dm" | "instagram_dm";

const CHANNEL_NOTES: Record<Channel, string> = {
  email: "Cold email. Subject + body under 120 words. One CTA.",
  sms: "SMS. Under 320 chars. No links unless essential.",
  linkedin_dm: "LinkedIn DM. Under 90 words. Conversational.",
  instagram_dm: "Instagram DM. Under 60 words. Casual, one CTA.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: { lead_id?: string } = {};
  try { payload = await req.json(); } catch { /* noop */ }
  const leadId = payload.lead_id;
  if (!leadId) return json({ error: "lead_id required" }, 400);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: lead } = await sb
    .from("inbound_leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return json({ error: "lead_not_found" }, 404);

  const projectId = (lead.project_id as string) ?? (lead.venue_id as string);
  if (!projectId) return json({ skipped: true, reason: "no_project_on_lead" });

  // Check enrollment.
  const { data: enr } = await sb
    .from("project_automation_enrollments")
    .select("enabled, config")
    .eq("project_id", projectId)
    .eq("automation_key", "followup_sequence")
    .maybeSingle();

  if (!enr?.enabled) return json({ skipped: true, reason: "not_enrolled" });

  const config = (enr.config ?? {}) as Record<string, unknown>;
  const channels = Array.isArray(config.channels) && (config.channels as string[]).length
    ? (config.channels as Channel[]).filter((c) => ["email","sms","linkedin_dm","instagram_dm"].includes(c))
    : ["email"] as Channel[];
  const days = Array.isArray(config.sequence_days) && (config.sequence_days as number[]).length
    ? (config.sequence_days as number[]).filter((d) => Number.isInteger(d) && d >= 0 && d <= 365).slice(0, 12)
    : DEFAULT_DAYS;
  const tone = typeof config.tone === "string" ? (config.tone as string) : "professional, direct, friendly";

  // Atomic-ish run creation. Unique on lead_id.
  const { data: run, error: runErr } = await sb
    .from("followup_sequence_runs")
    .insert({
      project_id: projectId,
      lead_id: leadId,
      enrollment_snapshot: { channels, days, tone },
      status: "active",
    })
    .select("id")
    .single();

  if (runErr) {
    // Duplicate (already enqueued) — return existing.
    if ((runErr as { code?: string }).code === "23505") {
      return json({ skipped: true, reason: "already_enqueued" });
    }
    return json({ error: runErr.message }, 500);
  }

  const recipient = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    business_name: lead.business_name,
  };
  const leadCreated = new Date(lead.created_at as string).getTime();

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const drafts: Record<string, { opener?: string; sequence: Array<{ day: number; body: string; subject?: string }> }> = {};

  for (const channel of channels) {
    let parsed: { opener?: string; sequence?: Array<{ day: number; label?: string; body: string; subject?: string }> } = {};
    if (apiKey) {
      const sys = `You write outreach for a sales operator. Drafts only — they will be human-reviewed and sent manually.
Channel rules: ${CHANNEL_NOTES[channel]}
Tone: ${tone}
Return ONLY a JSON object with this exact shape:
{ "opener": string, "sequence": [{ "day": number, "label": string, "body": string${channel === "email" ? ', "subject": string' : ""} }] }
- "opener" is the Day-0 message.
- One entry per requested day below.
- Mix value, proof, soft CTA. Do not pitch every message.`;
      const user = `Lead: ${lead.name ?? "(unknown)"}${lead.business_name ? ` — ${lead.business_name}` : ""}
Email: ${lead.email ?? "(none)"}  Phone: ${lead.phone ?? "(none)"}
Their message: ${lead.message ?? "(none)"}
Project type: ${lead.project_type ?? "(none)"}
Qualifier data: ${JSON.stringify(lead.qualifier_data ?? {}).slice(0, 1500)}

Sequence days requested: ${days.join(", ")}`;

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
      } catch (e) {
        console.error("[enqueue-followup] AI error", e);
      }
    }

    drafts[channel] = {
      opener: typeof parsed.opener === "string" ? parsed.opener : "",
      sequence: Array.isArray(parsed.sequence)
        ? parsed.sequence
            .filter((s) => s && typeof s.body === "string")
            .map((s) => ({
              day: Number.isInteger(s.day) ? s.day : 0,
              body: s.body,
              subject: typeof s.subject === "string" ? s.subject : undefined,
            }))
        : [],
    };
  }

  // Insert queue rows. Day 0 = opener; otherwise sequence entry matching day.
  const queueRows: Array<Record<string, unknown>> = [];
  for (const channel of channels) {
    const draft = drafts[channel];
    for (const day of days) {
      let body: string | undefined;
      let subject: string | undefined;
      if (day === 0 && draft.opener) {
        body = draft.opener;
      } else {
        const match = draft.sequence.find((s) => s.day === day);
        if (match) { body = match.body; subject = match.subject; }
      }
      if (!body) body = `(Draft pending — Day ${day} ${channel} message for ${lead.name ?? "lead"})`;
      queueRows.push({
        project_id: projectId,
        automation_key: "followup_sequence",
        source_run_id: run.id,
        recipient_snapshot: recipient,
        channel,
        subject: subject ?? null,
        body,
        model: MODEL,
        status: "pending_review",
        scheduled_for: new Date(leadCreated + day * 86_400_000).toISOString(),
        dedupe_key: `${leadId}:${channel}:${day}`,
      });
    }
  }

  const { data: inserted, error: insErr } = await sb
    .from("automation_message_queue")
    .insert(queueRows)
    .select("id");

  if (insErr) {
    console.error("[enqueue-followup] queue insert failed", insErr);
    await sb.from("followup_sequence_runs").update({ status: "failed", ended_at: new Date().toISOString() }).eq("id", run.id);
    return json({ error: insErr.message }, 500);
  }

  const ids = (inserted ?? []).map((r: { id: string }) => r.id);
  await sb.from("followup_sequence_runs").update({ queued_message_ids: ids }).eq("id", run.id);
  await sb.from("inbound_leads").update({ automation_status: "enrolled" }).eq("id", leadId);

  return json({ ok: true, run_id: run.id, queued: ids.length });
});