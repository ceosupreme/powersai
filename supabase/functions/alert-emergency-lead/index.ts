// Operator alert path for emergency-classified inbound leads.
// - Dispatches through the shared send-adapter interface (manual_log today,
//   Twilio SMS drops in later without changes here).
// - BYPASSES the client approval / QA queue (automation_message_queue) —
//   this is an operator notification, not a customer message.
// - Logs to automation_send_log with metadata.kind='emergency_lead_alert'
//   (mirrors the client-stale-digest convention).
// - Idempotent: a second call for the same lead_id is a no-op.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { resolveAdapter, type AutomationChannel } from "../_shared/send-adapters.ts";

const Body = z.object({ lead_id: z.string().uuid() });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid input" }, 400);
  const { lead_id } = parsed.data;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: lead, error: leadErr } = await sb
    .from("inbound_leads")
    .select("id,name,business_name,email,phone,message,project_type,urgency_class,urgency_captured_at,captured_for_project_id")
    .eq("id", lead_id)
    .maybeSingle();
  if (leadErr || !lead) return json({ error: "Lead not found" }, 404);
  if (lead.urgency_class !== "emergency") {
    return json({ skipped: "not_emergency" });
  }

  // Idempotency: bail if we've already logged an alert for this lead.
  const { data: existing } = await sb
    .from("automation_send_log")
    .select("id")
    .filter("metadata->>kind", "eq", "emergency_lead_alert")
    .filter("metadata->>lead_id", "eq", lead_id)
    .limit(1);
  if (existing && existing.length > 0) return json({ skipped: "already_sent" });

  // Recipient resolution: primary/GM leadership contact for the linked
  // project. No project link → recipient=null; we still log so the
  // operator sees the intent in the send log.
  let recipient: { name: string | null; email: string | null; phone: string | null } | null = null;
  let recipientSource: "venue_leadership_contacts" | "none" = "none";
  const projectId = (lead as any).captured_for_project_id ?? null;
  let projectConfig: Record<string, unknown> = {};
  if (projectId) {
    const { data: contacts } = await sb
      .from("venue_leadership_contacts")
      .select("full_name,email,phone,role,is_active")
      .eq("venue_id", projectId)
      .eq("is_active", true);
    const rows = (contacts ?? []) as Array<{ full_name: string | null; email: string | null; phone: string | null; role: string | null }>;
    if (rows.length > 0) {
      const rank = (r: string | null) => {
        const s = (r ?? "").toLowerCase();
        if (s.includes("owner")) return 0;
        if (s.includes("gm") || s.includes("general")) return 1;
        if (s.includes("manager")) return 2;
        return 3;
      };
      rows.sort((a, b) => rank(a.role) - rank(b.role));
      const pick = rows[0];
      recipient = { name: pick.full_name, email: pick.email, phone: pick.phone };
      recipientSource = "venue_leadership_contacts";
    }
    // Optional: pull adapter config from the project's follow-up enrollment
    // so real providers (Twilio, Resend) can wire in later without changes here.
    const { data: enr } = await sb
      .from("project_automation_enrollments")
      .select("config")
      .eq("project_id", projectId)
      .eq("automation_key", "follow_up_sequence")
      .maybeSingle();
    if (enr?.config && typeof enr.config === "object") {
      projectConfig = enr.config as Record<string, unknown>;
    }
  }

  const preferredChannel: AutomationChannel = recipient?.phone ? "sms" : "email";
  const to = preferredChannel === "sms" ? recipient?.phone ?? null : recipient?.email ?? null;

  const business = lead.business_name || lead.name || "a prospect";
  const callback = lead.phone || lead.email || "(no callback on file)";
  const summary = (lead.message ?? "").trim().slice(0, 240) || "(no details provided)";
  const subject = `EMERGENCY LEAD — ${business}`;
  const body =
    `EMERGENCY inbound lead.\n` +
    `Business: ${business}\n` +
    `Callback: ${callback}\n` +
    `Summary: ${summary}\n` +
    `Respond fast — timer is running.`;

  const adapter = resolveAdapter(preferredChannel, projectConfig);
  const result = await adapter.send({
    channel: preferredChannel,
    to,
    subject,
    body,
    project_id: projectId ?? "unassigned",
    queue_id: `emergency_lead_alert:${lead_id}`,
    metadata: { kind: "emergency_lead_alert", lead_id, recipient_source: recipientSource },
  });

  await sb.from("automation_send_log").insert({
    project_id: projectId,
    queue_id: null,
    channel: preferredChannel,
    provider: result.provider,
    provider_message_id: result.provider_message_id ?? null,
    status: result.ok ? "sent" : "failed",
    error: result.error ?? null,
    metadata: {
      kind: "emergency_lead_alert",
      lead_id,
      recipient_source: recipientSource,
      recipient_to: to,
    },
  });

  return json({ ok: true, recipient_source: recipientSource, dispatched: result.ok });
});