import { guardEdgeRequest } from '../_shared/auth-guard.ts';
// Owner notification for general inquiries and client capture leads.
// - Server-to-server only; dispatch is awaited by submit-inbound-lead.
// - Client-captured leads notify their designated project contact; missing contact falls back to the operator.
// - Idempotent via a conditional claim on inbound_leads.owner_notified_at.
// - Never sends anything to the visitor. No enrollment, no automations.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { resendEmailAdapter } from "../_shared/send-adapters.ts";

const Body = z.object({ lead_id: z.string().uuid() });

const OWNER_EMAIL = "ceosupreme@gmail.com";
const INBOX_URL = "https://supremeteammedia.com/crm?tab=inbound";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Neutralize user-supplied text for plain-text email output. */
function safeText(v: unknown, max = 4000): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .trim()
    .slice(0, max);
}

function listOf(v: unknown): string {
  if (Array.isArray(v)) {
    const items = v.map((x) => safeText(x, 120)).filter(Boolean);
    return items.length ? items.join(", ") : "";
  }
  return safeText(v, 240);
}

Deno.serve(async (req) => {
  const __authDenied = await guardEdgeRequest(req, 'notify-owner-inquiry');
  if (__authDenied) return __authDenied;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${serviceRoleKey}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid input" }, 400);
  const { lead_id } = parsed.data;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: lead, error: leadErr } = await sb
    .from("inbound_leads")
    .select(
      "id,name,business_name,email,phone,message,source,route_to,project_type," +
      "conversation_channel,qualifier_data,captured_for_project_id,created_at,owner_notified_at",
    )
    .eq("id", lead_id)
    .maybeSingle();
  if (leadErr || !lead) return json({ error: "Lead not found" }, 404);

  const projectId = (lead as any).captured_for_project_id;
  if (!projectId && ((lead as any).route_to ?? "self") !== "self") return json({ skipped: "not_owner_routed" });
  let recipientEmail = OWNER_EMAIL;
  if (projectId) {
    const {data: contacts, error} = await sb.from('venue_leadership_contacts')
      .select('is_primary,role_type,profile:profiles(email)').eq('venue_id',projectId).eq('is_active',true)
      .order('is_primary',{ascending:false});
    if (error) return json({error:'recipient_lookup_failed'},500);
    const contact = (contacts ?? []).find((c: any) => c.profile?.email && (c.is_primary || ['owner','gm','manager'].includes(c.role_type)));
    recipientEmail = (contact as any)?.profile?.email ?? OWNER_EMAIL;
  }
  if ((lead as any).owner_notified_at) return json({ skipped: "already_sent" });

  // Atomic claim — a concurrent invocation for the same lead gets zero rows.
  const attemptedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: claimed, error: claimErr } = await sb
    .from("inbound_leads")
    .update({ owner_notify_attempted_at: attemptedAt, owner_notify_error: null })
    .eq("id", lead_id)
    .is("owner_notified_at", null)
    .or(`owner_notify_attempted_at.is.null,owner_notify_attempted_at.lt.${staleBefore}`)
    .select("id");
  if (claimErr) {
    console.error("[notify-owner-inquiry] claim failed", claimErr);
    return json({ error: "claim_failed" }, 500);
  }
  if (!claimed || claimed.length === 0) return json({ skipped: "already_claimed" });

  const q = ((lead as any).qualifier_data ?? {}) as Record<string, unknown>;
  const services = listOf(q.services);
  const rows: Array<[string, string]> = [
    ["Name", safeText((lead as any).name, 200)],
    ["Email", safeText((lead as any).email, 255)],
    ["Phone", safeText((lead as any).phone, 40)],
    ["Company", safeText((lead as any).business_name, 200)],
    ["Interested in", services],
    ["Budget", safeText(q.budget_range, 120)],
    ["Timing", safeText(q.timing, 120)],
    ["Context", safeText(q.intent ?? q.site_section, 120)],
    ["Channel", safeText((lead as any).conversation_channel, 40)],
    ["Source", safeText((lead as any).source, 120)],
    ["Submitted", safeText((lead as any).created_at, 60)],
    ["Record ID", lead_id],
    ["Client project", safeText(projectId,80)],
  ].filter(([, v]) => v.length > 0) as Array<[string, string]>;

  const note = safeText((lead as any).message, 4000) || "(no note provided)";
  const subject = `New website inquiry — ${safeText((lead as any).name, 80) || "unnamed"}`;
  const body =
    `New inquiry saved from supremeteammedia.com.\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nProject note:\n${note}\n\n` +
    `Open the inbox: ${INBOX_URL}\n`;

  const result = await resendEmailAdapter.send({
    channel: "email",
    to: recipientEmail,
    subject,
    body,
    project_id: "owner_notification",
    queue_id: `owner_inquiry_alert:${lead_id}`,
    metadata: { kind: "owner_inquiry_alert", lead_id, internal: true },
  });

  if (result.ok) {
    await sb.from("inbound_leads")
      .update({ owner_notified_at: new Date().toISOString(), owner_notify_error: null })
      .eq("id", lead_id);
    console.log("[notify-owner-inquiry] sent", { lead_id, provider: result.provider });
    return json({ ok: true, provider: result.provider, provider_message_id: result.provider_message_id ?? null });
  }

  await sb.from("inbound_leads")
    .update({ owner_notified_at: null, owner_notify_attempted_at: null, owner_notify_error: String(result.error ?? "unknown").slice(0, 500) })
    .eq("id", lead_id).eq("owner_notify_attempted_at", attemptedAt);
  console.error("[notify-owner-inquiry] send failed", { lead_id, error: result.error });
  return json({ ok: false, error: String(result.error ?? "unknown") }, 200);
});
