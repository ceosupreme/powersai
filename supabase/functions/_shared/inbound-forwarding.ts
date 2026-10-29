import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { resendEmailAdapter, type SendInput } from "./send-adapters.ts";
import { claimWorker } from "./worker-lease.ts";

// Preserve the existing owner destination unless an explicit server setting replaces it.
const EXISTING_OWNER_EMAIL = "ceosupreme@gmail.com";

/** Only newly attempted forwards enter the retry schedule; old inbox mail is not bulk-sent. */
export async function forwardStoredInbound(sb: SupabaseClient, id: string) {
  const lease = await claimWorker(sb, `inbound-forward:${id}`);
  if (!lease) return { ok: false, deferred: "already_running" };
  try {
    const { data: row, error } = await sb.from("inbound_emails").select("*").eq("id", id).single();
    if (error) throw error;
    if (row.forwarded_at) return { ok: true, duplicate: true };
    if (row.forward_next_attempt_at && new Date(row.forward_next_attempt_at).getTime() > Date.now()) return { ok: false, deferred: "retry_scheduled" };
    const firstAttempt = row.forward_first_attempt_at ?? new Date().toISOString();
    if ((row.forward_attempts ?? 0) >= 5 || Date.now() - new Date(firstAttempt).getTime() > 23 * 3600_000) {
      const { error: stopError } = await sb.from("inbound_emails").update({
        forward_next_attempt_at: null, forwarded_error: "forward_unconfirmed_verify_before_retry",
      }).eq("id", id);
      if (stopError) throw stopError;
      return { ok: false, error: "forward_unconfirmed_verify_before_retry" };
    }
    const payload = (lease.state.payload ?? {
      channel: "email", to: Deno.env.get("HQ_INBOUND_FORWARD_EMAIL") || EXISTING_OWNER_EMAIL,
      from: "Supreme Team Media <hello@supremeteammedia.com>", reply_to: row.from_email || undefined,
      subject: `[hello@] ${row.subject || "(no subject)"}`,
      body: `From: ${row.from_name ?? ""} <${row.from_email}> to ${row.to_email} at ${row.received_at}\n\n${row.text_body || "(no text body)"}`,
      project_id: "owner_notification", queue_id: `inbound_forward:${row.resend_email_id}`,
      metadata: { kind: "inbound_forward", internal: true },
    }) as SendInput;
    // Retain the exact payload for the stable provider idempotency key.
    await lease.save({ ...lease.state, payload, attempted_at: new Date().toISOString() });
    const attempts = Number(row.forward_attempts ?? 0) + 1;
    const { error: attemptError } = await sb.from("inbound_emails").update({
      forward_attempts: attempts, forward_first_attempt_at: firstAttempt,
      forward_next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }).eq("id", id);
    if (attemptError) throw attemptError;
    const result = await resendEmailAdapter.send(payload);
    const { error: recordError } = await sb.from("inbound_emails").update(result.ok ? {
      forwarded_at: new Date().toISOString(), forwarded_error: null, forward_next_attempt_at: null,
    } : {
      forwarded_error: String(result.error ?? "unknown").slice(0, 500),
      forward_next_attempt_at: attempts >= 5 ? null : new Date(Date.now() + Math.min(60, 5 * 2 ** (attempts - 1)) * 60_000).toISOString(),
    }).eq("id", id);
    if (recordError) throw recordError;
    await lease.save({ ...lease.state, result, completed_at: result.ok ? new Date().toISOString() : null });
    return { ok: result.ok, delivery_status: result.delivery_status, error: result.error };
  } finally { await lease.release(); }
}

export async function retryInboundForwards(sb: SupabaseClient) {
  const { data, error } = await sb.from("inbound_emails").select("id")
    .is("forwarded_at", null).not("forward_next_attempt_at", "is", null)
    .lte("forward_next_attempt_at", new Date().toISOString()).order("forward_next_attempt_at").limit(3);
  if (error) throw error;
  const results = [];
  for (const row of data ?? []) {
    try { results.push({ id: row.id, ...await forwardStoredInbound(sb, row.id) }); }
    catch (e) { results.push({ id: row.id, ok: false, error: String(e) }); }
  }
  return results;
}
