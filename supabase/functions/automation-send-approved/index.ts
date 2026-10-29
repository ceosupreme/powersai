import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guardEdgeRequest } from "../_shared/auth-guard.ts";
import { resolveAdapter, type AutomationChannel, type SendResult } from "../_shared/send-adapters.ts";
import { deliveryState } from "../_shared/automation-state.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const denied = await guardEdgeRequest(req, "automation-send-approved");
  if (denied) return denied;
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let payload: { queue_id?: string };
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!payload.queue_id || !/^[0-9a-f-]{36}$/i.test(payload.queue_id)) return json({ error: "queue_id required" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: claim, error: claimError } = await sb.rpc("hq_claim_automation_send", { p_queue_id: payload.queue_id });
  if (claimError) return json({ error: "send_gate_unavailable" }, 503);
  if (!claim?.claimed) return json({ ok: false, skipped: true, reason: claim?.reason ?? "not_eligible" });
  const row = claim.queue;
  const adapter = resolveAdapter(row.channel as AutomationChannel, claim.config);
  const recipient = row.recipient_snapshot ?? {};
  const to = row.channel === "email" ? recipient.email : row.channel === "sms" ? recipient.phone : recipient.handle;
  let result: SendResult;
  try {
    result = await adapter.send({
      channel: row.channel, to: to ?? null, subject: row.subject,
      body: row.edited_body ?? row.body, project_id: row.project_id, queue_id: row.id,
      // Customer queue metadata must never bypass suppression by declaring itself internal.
      metadata: { ...row.metadata, automation_key: row.automation_key, internal: false },
      beforeSend: async () => {
        const { data, error } = await sb.rpc("hq_claim_automation_send", {
          p_queue_id: row.id, p_expected_attempted_at: row.send_attempted_at,
        });
        if (error) throw new Error("final_send_gate_unavailable");
        return data?.claimed === true;
      },
    });
  } catch (e) {
    result = { ok: false, provider: adapter.name, error: String(e), delivery_status: "unconfirmed" };
  }
  result.delivery_status = deliveryState(result);
  const { data: recorded, error: recordError } = await sb.rpc("hq_finish_automation_send", {
    p_queue_id: row.id, p_attempted_at: row.send_attempted_at, p_result: result, p_to: to ?? null,
  });
  if (recordError) {
    console.error("[automation-send] outcome persistence failed", { queue_id: row.id, error: recordError.message });
    return json({ ok: false, error: "outcome_unconfirmed_verify_before_retry", delivery_status: "unconfirmed" }, 503);
  }
  return json({ ok: recorded?.ok === true, adapter: adapter.name, delivery_status: recorded?.delivery_status, error: result.error });
});
