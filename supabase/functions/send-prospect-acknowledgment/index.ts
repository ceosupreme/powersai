import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { resendEmailAdapter } from "../_shared/send-adapters.ts";
import { ACK_CONTACT_EMAIL, ackEnglishBody, ackSpanishBody } from "../_shared/prospectAckCopy.ts";

const Body = z.object({ lead_id: z.string().uuid() });
const CONTACT_EMAIL = ACK_CONTACT_EMAIL;
const FROM = `Sean Powers <${CONTACT_EMAIL}>`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clean(value: unknown, max = 200) {
  return String(value ?? "").replace(/[\r\n\u0000-\u001f]+/g, " ").trim().slice(0, max);
}

const englishBody = ackEnglishBody;
const spanishBody = ackSpanishBody;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${serviceRoleKey}`) return json({ error: "Unauthorized" }, 401);
  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid input" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: lead, error } = await sb.from("inbound_leads")
    .select("id,name,business_name,email,source,route_to,qualifier_data,captured_for_project_id,first_response_at")
    .eq("id", parsed.data.lead_id).maybeSingle();
  if (error || !lead) return json({ error: "Lead not found" }, 404);

  const email = clean(lead.email, 255).toLowerCase();
  if (!email) return json({ skipped: "no_email" });
  if (email.endsWith("@example.com") || email.endsWith("@test.invalid")) return json({ skipped: "test_email" });
  if (lead.captured_for_project_id) return json({ skipped: "client_captured" });
  if ((lead.route_to ?? "self") !== "self") return json({ skipped: "not_self_routed" });
  if ((lead.source ?? "").endsWith(":client")) return json({ skipped: "client_source" });
  if (lead.first_response_at) return json({ skipped: "already_sent" });

  const { data: setting } = await sb.from("site_settings").select("value").eq("key", "booking_url").maybeSingle();
  const bookingUrl = clean(setting?.value, 500);
  const business = clean(lead.business_name);
  const firstName = clean(lead.name).split(/\s+/)[0] ?? "";
  const language = (lead.qualifier_data as Record<string, unknown> | null)?.language === "es" ? "es" : "en";
  const result = await resendEmailAdapter.send({
    channel: "email", to: email, from: FROM, reply_to: CONTACT_EMAIL,
    subject: business ? (language === "es" ? `Recibí tu mensaje sobre ${business}` : `Got your note about ${business}`) : (language === "es" ? "Recibí tu mensaje" : "Got your note"),
    body: language === "es" ? spanishBody(firstName, business, bookingUrl) : englishBody(firstName, business, bookingUrl),
    project_id: "owner_notification", queue_id: `prospect_ack:${lead.id}`,
    metadata: { kind: "prospect_acknowledgment", lead_id: lead.id, internal: true },
  });
  if (!result.ok) {
    console.error("[send-prospect-acknowledgment] send failed", { lead_id: lead.id, error: result.error });
    return json({ ok: false, error: String(result.error ?? "unknown") });
  }
  const { data: marked, error: markError } = await sb.from("inbound_leads")
    .update({ first_response_at: new Date().toISOString() }).eq("id", lead.id).is("first_response_at", null).select("id");
  if (markError || !marked?.length) console.error("[send-prospect-acknowledgment] response marker failed", { lead_id: lead.id, error: markError?.message });
  return json({ ok: true, provider: result.provider });
});