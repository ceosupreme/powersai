// Signed inbound mail and delivery receipts. Persist first; retries resume failed forwards.
import { createClient } from "npm:@supabase/supabase-js@2";
import { readBoundedWebhookBody, verifySvix } from "../_shared/webhook-signature.ts";
import { deliveryEventState } from "../_shared/automation-state.ts";
import { forwardStoredInbound } from "../_shared/inbound-forwarding.ts";
import { guardEdgeRequest } from "../_shared/auth-guard.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function parseAddr(v: unknown) {
  const s = Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
  const m = s.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  return m ? { email: m[2].trim().toLowerCase(), name: m[1].trim() || null } : { email: s.trim().toLowerCase(), name: null };
}
function htmlToText(html: string) {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, "\n\n").trim();
}

Deno.serve(async (req) => {
  const denied = await guardEdgeRequest(req, "resend-inbound-webhook");
  if (denied) return denied;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) return json({ error: "webhook_verification_not_configured" }, 503);
  let bodyBytes: Uint8Array | null;
  try { bodyBytes = await readBoundedWebhookBody(req); }
  catch { return json({ error: "invalid_body" }, 400); }
  if (!bodyBytes) return json({ error: "payload_too_large" }, 413);
  if (!(await verifySvix(secret, req, bodyBytes))) return json({ error: "invalid_signature" }, 401);
  let event: any;
  try { event = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes)); }
  catch { return json({ error: "invalid_json" }, 400); }
  const emailId = String(event?.data?.email_id ?? event?.data?.id ?? "");
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(emailId)) return json({ error: "invalid_email_id" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const delivery = deliveryEventState(event.type);
    if (delivery) {
      const occurredAt = new Date(event.created_at ?? event.data?.created_at ?? Date.now());
      if (!Number.isFinite(occurredAt.getTime())) return json({ error: "invalid_event_time" }, 400);
      const { error } = await sb.rpc("hq_record_delivery_event", {
        p_event_id: req.headers.get("svix-id"), p_message_id: emailId,
        p_state: delivery, p_type: event.type, p_occurred_at: occurredAt.toISOString(),
      });
      if (error) throw error;
      return json({ recorded: true, delivery_status: delivery });
    }
    if (event.type !== "email.received") return json({ ignored: event.type ?? "unknown" });
    const { data: existing, error: readError } = await sb.from("inbound_emails").select("id, forwarded_at")
      .eq("resend_email_id", emailId).maybeSingle();
    if (readError) throw readError;
    let row = existing;
    if (!row) {
      const apiKey = Deno.env.get("RESEND_RECEIVING_API_KEY") || Deno.env.get("RESEND_API_KEY");
      if (!apiKey) return json({ error: "receiving_not_configured" }, 503);
      const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return json({ error: "provider_read_failed", provider_status: response.status }, 503);
      const email = await response.json();
      if (!email?.from) return json({ error: "provider_message_incomplete" }, 503);
      const from = parseAddr(email.from);
      const to = parseAddr(email.to).email;
      // Exact email match: underscores and percent signs must not become LIKE wildcards.
      const emailPattern = from.email.replace(/[\\%_]/g, "\\$&");
      // A fresh duplicate lead must not hide the older lead whose sequence is active.
      const { data: activeLeads, error: activeLeadError } = await sb.from("inbound_leads")
        .select("id,followup_sequence_runs!inner(status)").ilike("email", emailPattern)
        .eq("followup_sequence_runs.status", "active").order("created_at", { ascending: false }).limit(1);
      if (activeLeadError) throw activeLeadError;
      let leadId = activeLeads?.[0]?.id ?? null;
      if (!leadId) {
        const { data: leads, error: leadError } = await sb.from("inbound_leads").select("id")
          .ilike("email", emailPattern).order("created_at", { ascending: false }).limit(1);
        if (leadError) throw leadError;
        leadId = leads?.[0]?.id ?? null;
      }
      const html = typeof email.html === "string" ? email.html : null;
      const text = typeof email.text === "string" && email.text.trim() ? email.text : html ? htmlToText(html) : "";
      const { attachments: _attachments, ...rawRest } = email;
      const { data: created, error: insertError } = await sb.from("inbound_emails").insert({
        resend_email_id: emailId, received_at: email.created_at ?? event.created_at ?? new Date().toISOString(),
        from_email: from.email, from_name: from.name, to_email: to,
        subject: String(email.subject ?? "").slice(0, 500), text_body: text.slice(0, 100_000), html_body: html?.slice(0, 200_000) ?? null,
        attachments: (Array.isArray(email.attachments) ? email.attachments : []).map((a: any) => ({ id: a.id, filename: a.filename, content_type: a.content_type, size: a.size })),
        lead_id: leadId, raw: { ...rawRest, html: undefined, text: undefined },
      }).select("id, forwarded_at").single();
      if (insertError?.code === "23505") {
        const retry = await sb.from("inbound_emails").select("id, forwarded_at").eq("resend_email_id", emailId).single();
        if (retry.error) throw retry.error;
        row = retry.data;
      } else if (insertError) throw insertError;
      else row = created;
    }
    if (!row) throw new Error("inbound_record_missing");
    // Repeat on redelivery so a failure between storage and cancellation is recoverable.
    const { data: cancelled, error: replyError } = await sb.rpc("hq_apply_inbound_reply", { p_inbound_id: row.id });
    if (replyError) throw replyError;
    if (row.forwarded_at) return json({ stored: true, duplicate: true, cancelled_followups: cancelled });
    const result = await forwardStoredInbound(sb, row.id);
    return json({ stored: true, forwarded: result.ok, cancelled_followups: cancelled, ...result }, result.ok ? 200 : 503);
  } catch (e) {
    console.error("[resend-inbound] retryable processing failure", String(e));
    return json({ error: "processing_failed_retryable" }, 503);
  }
});
