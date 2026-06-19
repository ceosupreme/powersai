// Generates outreach drafts from a saved CRM lead analysis via Lovable AI Gateway.
// Mirrors capture-classify pattern. Drafting only — nothing sent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const CHANNELS = ["cold_email", "linkedin_dm", "instagram_dm", "sms"] as const;
type Channel = typeof CHANNELS[number];

type Body = {
  analysis_id?: string;
  channel?: Channel;
  tone?: string;
  sequence_days?: number[];
};

const CHANNEL_NOTES: Record<Channel, string> = {
  cold_email: "Cold email. Subject line + body. Body under 120 words. No fluff. One clear CTA.",
  linkedin_dm: "LinkedIn DM. Under 90 words. Conversational, no formal sign-off.",
  instagram_dm: "Instagram DM. Under 60 words. Casual, lowercase OK, one CTA.",
  sms: "SMS. Under 320 chars. No links unless essential. Plain text only.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* noop */ }
  const { analysis_id, channel, tone } = body;
  const sequence_days = Array.isArray(body.sequence_days) && body.sequence_days.length
    ? body.sequence_days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 365).slice(0, 12)
    : [1, 3, 7, 14, 30];

  if (!analysis_id || !channel || !CHANNELS.includes(channel)) {
    return new Response(JSON.stringify({ error: "analysis_id and valid channel required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: analysis, error: aErr } = await svc
    .from("crm_lead_analyses")
    .select("id, company_id, summary, recommendation_reason, recommended_offer_id, priority")
    .eq("id", analysis_id).maybeSingle();
  if (aErr || !analysis) {
    return new Response(JSON.stringify({ error: "analysis not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: company } = await svc
    .from("crm_companies").select("name, website, industry").eq("id", analysis.company_id).maybeSingle();

  let offer: any = null;
  if (analysis.recommended_offer_id) {
    const { data } = await svc
      .from("service_offers")
      .select("id, name, description, who_its_for, problem_solved, deliverables, timeline, starter_price, premium_price, best_target")
      .eq("id", analysis.recommended_offer_id).maybeSingle();
    offer = data;
  }

  const seqList = sequence_days.map((d) => `- Day ${d}`).join("\n");
  const sys = `You write outreach for a sales operator. Drafts only — they will be reviewed and sent manually.
Channel rules: ${CHANNEL_NOTES[channel]}
Tone: ${tone || "professional, direct, friendly"}
Return ONLY a JSON object with this exact shape:
{ "opener": string, "sequence": [{ "day": number, "label": string, "body": string }] }
- "opener" is the initial Day-0 message.
- Then ONE entry in "sequence" per requested day below, in order. Use the same day numbers.
- "label" is a short tag (e.g. "value follow-up", "mini-audit", "case study", "soft close").
- Each "body" follows the channel rules above. Reference the offer naturally — do NOT pitch every message; mix value, proof, and CTAs.`;

  const user = `Lead: ${company?.name ?? "(unknown)"}${company?.website ? ` — ${company.website}` : ""}${company?.industry ? ` — ${company.industry}` : ""}

Business summary: ${analysis.summary ?? "(none)"}
Why this offer fits: ${analysis.recommendation_reason ?? "(none)"}
Lead priority: ${analysis.priority ?? "medium"}

Matched offer:
${offer ? `name: ${offer.name}
who_its_for: ${offer.who_its_for ?? ""}
problem_solved: ${offer.problem_solved ?? ""}
deliverables: ${offer.deliverables ?? ""}
timeline: ${offer.timeline ?? ""}
best_target: ${offer.best_target ?? ""}` : "(no matched offer — write generic value outreach)"}

Sequence days requested (in order):
${seqList}`;

  let parsed: any = null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "AI is busy — try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted", message: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: t.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    parsed = JSON.parse(content);
  } catch (e) {
    return new Response(JSON.stringify({ error: "ai_parse_failed", detail: String(e) }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const opener: string = typeof parsed.opener === "string" ? parsed.opener : "";
  const sequence = Array.isArray(parsed.sequence)
    ? parsed.sequence
        .filter((s: any) => s && typeof s.body === "string")
        .map((s: any) => ({
          day: Number.isInteger(s.day) ? s.day : 0,
          label: typeof s.label === "string" ? s.label : "",
          body: s.body,
        }))
    : [];

  const { data: inserted, error: iErr } = await svc
    .from("crm_outreach_drafts")
    .insert({
      analysis_id,
      company_id: analysis.company_id,
      offer_id: analysis.recommended_offer_id ?? null,
      channel,
      tone: tone ?? null,
      opener,
      sequence,
      model: MODEL,
      created_by: userId,
    })
    .select("*")
    .single();

  if (iErr) {
    return new Response(JSON.stringify({ error: "insert_failed", detail: iErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, draft: inserted }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});