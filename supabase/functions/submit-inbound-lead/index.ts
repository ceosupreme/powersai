// Public marketing-site contact form intake.
// Anonymous visitors POST here; this function inserts into public.inbound_leads
// using the service role (bypassing RLS). The table is NOT writable by anon.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  name: z.string().trim().min(1).max(200),
  business_name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  // Qualifier payload — all optional so the legacy contact form still works.
  project_type: z.string().trim().max(80).optional().nullable(),
  qualifier_data: z.record(z.unknown()).optional().nullable(),
  is_ready: z.boolean().optional(),
  not_ready_reason: z.string().trim().max(500).optional().nullable(),
  transcript: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    text: z.string(),
    at: z.string().optional(),
  })).optional().nullable(),
  conversation_channel: z.enum(["voice", "chat", "form", "phone"]).optional().nullable(),
  route_to: z.enum(["self", "operator", "client"]).optional().nullable(),
  // When intake happened on a client-specific qualifier URL (/q/:venueSlug),
  // this is the resolved venues.id so follow-up automation can fire against
  // that client's enrollment. Null on the generic vertical route.
  captured_for_project_id: z.string().uuid().optional().nullable(),
  // Urgency triage — strictly validated against the five canonical classes.
  // Anything outside the enum (future vertical with custom keys, or a
  // hallucinated tool arg) is silently dropped so the lead still saves;
  // losing a label is fine, losing the lead is not.
  urgency_class: z.unknown().optional().nullable(),
  // Honeypot — must be empty. Real users never see/fill this field.
  company_website: z.string().max(0).optional().nullable(),
});

const CANONICAL_URGENCY = new Set([
  "emergency", "same_day", "routine", "estimate", "maintenance",
]);
function normalizeUrgency(v: unknown): string | null {
  return typeof v === "string" && CANONICAL_URGENCY.has(v) ? v : null;
}

// NOTE: Best-effort, per-process rate limit. Edge functions are stateless and
// can scale horizontally, so this counter resets across cold starts / instances.
// It is NOT durable protection — the honeypot field above is the primary
// first line of defense. Do not mistake this for hard rate limiting.
const RATE: Map<string, { n: number; reset: number }> = new Map();
const LIMIT = 5;
const WINDOW_MS = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = RATE.get(ip);
  if (!cur || cur.reset < now) {
    RATE.set(ip, { n: 1, reset: now + WINDOW_MS });
    return false;
  }
  cur.n += 1;
  return cur.n > LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    name, business_name, email, phone, message,
    project_type, qualifier_data, is_ready, not_ready_reason,
    transcript, conversation_channel, route_to, captured_for_project_id,
    urgency_class: urgencyRaw,
  } = parsed.data;

  const urgency_class = normalizeUrgency(urgencyRaw);
  const urgency_captured_at = urgency_class ? new Date().toISOString() : null;

  // Either email or phone is required so we can actually contact the lead.
  if (!email && !phone) {
    return new Response(JSON.stringify({ error: "Email or phone is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { data: inserted, error } = await admin.from("inbound_leads").insert({
    name,
    business_name: business_name || null,
    email: email || null,
    phone: phone || null,
    message: message || null,
    project_type: project_type || null,
    qualifier_data: qualifier_data ?? {},
    is_ready: is_ready ?? false,
    not_ready_reason: not_ready_reason || null,
    transcript: transcript ?? [],
    conversation_channel: conversation_channel || null,
    route_to: route_to || "self",
    captured_for_project_id: captured_for_project_id ?? null,
    urgency_class,
    urgency_captured_at,
    source: captured_for_project_id && project_type
      ? `qualifier:${project_type}:client`
      : project_type
        ? `qualifier:${project_type}`
        : "public_site",
    user_agent: userAgent,
  }).select("id").single();

  if (error) {
    console.error("[submit-inbound-lead] insert failed:", error);
    return new Response(JSON.stringify({ error: "Could not save submission" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Emergency alert — fire-and-forget, never blocks the response.
  if (urgency_class === "emergency" && inserted?.id) {
    try {
      fetch(`${supabaseUrl}/functions/v1/alert-emergency-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ lead_id: inserted.id }),
      }).catch((e) => console.error("[submit-inbound-lead] alert-emergency error", e));
    } catch (e) {
      console.error("[submit-inbound-lead] alert-emergency dispatch failed", e);
    }
  }

  // Fire-and-forget Build C follow-up sequence enrollment. If the project for
  // this lead is enrolled in follow_up_sequence automation, enqueue drafts.
  // Errors here do NOT block the lead submission response.
  try {
    if (inserted?.id) {
      const url = `${supabaseUrl}/functions/v1/enqueue-followup-sequence`;
      // Don't await — best-effort.
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ lead_id: inserted.id }),
      }).catch((e) => console.error("[submit-inbound-lead] enqueue-followup error", e));
    }
  } catch (e) {
    console.error("[submit-inbound-lead] enqueue dispatch failed", e);
  }

  return new Response(JSON.stringify({ ok: true, id: inserted?.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});