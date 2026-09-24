// Receives Resend "email.received" webhooks for hello@supremeteammedia.com.
// Never trusts the payload body: the email is re-fetched from Resend's
// Receiving API with RESEND_API_KEY (that fetch is the authentication).
// Optional svix signature check when RESEND_WEBHOOK_SECRET is set.
// Idempotent by resend_email_id. Forwards a copy to the owner.
import { createClient } from "npm:@supabase/supabase-js@2";
import { resendEmailAdapter } from "../_shared/send-adapters.ts";

const OWNER_EMAIL = "ceosupreme@gmail.com";
const ok = (d: unknown = { ok: true }) =>
  new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });

async function verifySvix(secret: string, req: Request, body: string): Promise<boolean> {
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sigs = req.headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sigs.split(" ").some((s) => s.split(",")[1] === expected);
}

function parseAddr(v: unknown): { email: string; name: string | null } {
  const s = Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
  const m = s.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { email: m[2].trim().toLowerCase(), name: m[1].trim() || null };
  return { email: s.trim().toLowerCase(), name: null };
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const bodyText = await req.text();

  const whSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (whSecret) {
    try {
      if (!(await verifySvix(whSecret, req, bodyText))) {
        console.warn("[resend-inbound] signature check failed");
        return new Response("Invalid signature", { status: 401 });
      }
    } catch (e) {
      console.error("[resend-inbound] signature error", e);
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let evt: any;
  try { evt = JSON.parse(bodyText); } catch { return ok({ ignored: "bad json" }); }
  if (evt?.type && evt.type !== "email.received") return ok({ ignored: evt.type });
  const emailId = String(evt?.data?.email_id ?? evt?.data?.id ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(emailId)) return ok({ ignored: "no id" });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) { console.error("[resend-inbound] RESEND_API_KEY missing"); return ok({ ignored: "no key" }); }

  let email: any = null;
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (r.ok) email = await r.json();
    else console.warn("[resend-inbound] fetch failed", r.status, (await r.text()).slice(0, 300));
  } catch (e) { console.error("[resend-inbound] fetch error", e); }
  if (!email || !(email.id || email.from)) return ok({ ignored: "not found" });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await sb.from("inbound_emails").select("id, forwarded_at").eq("resend_email_id", emailId).maybeSingle();
  if (existing) return ok({ duplicate: true });

  const from = parseAddr(email.from);
  const to = parseAddr(email.to).email || "hello@supremeteammedia.com";
  const subject = String(email.subject ?? "").slice(0, 500);
  const html = typeof email.html === "string" ? email.html : null;
  const text = typeof email.text === "string" && email.text.trim() ? email.text : (html ? htmlToText(html) : "");
  const receivedAt = email.created_at ?? evt?.data?.created_at ?? new Date().toISOString();
  const attachments = Array.isArray(email.attachments)
    ? email.attachments.map((a: any) => ({ id: a.id ?? null, filename: a.filename ?? null, content_type: a.content_type ?? null, size: a.size ?? null }))
    : [];

  let leadId: string | null = null;
  if (from.email) {
    const { data: lead } = await sb.from("inbound_leads").select("id").ilike("email", from.email)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    leadId = lead?.id ?? null;
  }

  const { attachments: _a, ...rawRest } = email;
  const { data: row, error: insErr } = await sb.from("inbound_emails").insert({
    resend_email_id: emailId,
    received_at: receivedAt,
    from_email: from.email || null,
    from_name: from.name,
    to_email: to,
    subject,
    text_body: text.slice(0, 100_000),
    html_body: html ? html.slice(0, 200_000) : null,
    attachments,
    lead_id: leadId,
    raw: { ...rawRest, html: undefined, text: undefined },
  }).select("id").single();
  if (insErr) {
    if ((insErr as any).code === "23505") return ok({ duplicate: true });
    console.error("[resend-inbound] insert failed", insErr.message);
    return ok({ error: "insert failed" });
  }

  const header = `From: ${from.name ?? ""} <${from.email}> to ${to} at ${receivedAt}`;
  const result = await resendEmailAdapter.send({
    channel: "email",
    to: OWNER_EMAIL,
    from: "Supreme Team Media <hello@supremeteammedia.com>",
    reply_to: from.email || undefined,
    subject: `[hello@] ${subject || "(no subject)"}`,
    body: `${header}\n\n${text || "(no text body)"}`,
    project_id: "owner_notification",
    queue_id: `inbound_forward:${emailId}`,
    metadata: { kind: "inbound_forward", internal: true },
  });
  await sb.from("inbound_emails").update(
    result.ok
      ? { forwarded_at: new Date().toISOString(), forwarded_error: null }
      : { forwarded_error: String(result.error ?? "unknown").slice(0, 500) },
  ).eq("id", row.id);
  if (!result.ok) console.error("[resend-inbound] forward failed", result.error);
  return ok({ stored: true, forwarded: result.ok });
});
