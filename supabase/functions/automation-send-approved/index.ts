// Atomically claims an approved queue row, runs the adapter, logs result.
// Mirrors content-publish-automation's check-and-set pattern.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveAdapter, type AutomationChannel } from "../_shared/send-adapters.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: { queue_id?: string } = {};
  try { payload = await req.json(); } catch { /* noop */ }
  const queueId = payload.queue_id;
  if (!queueId) return json({ error: "queue_id required" }, 400);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Atomic claim — only one worker wins.
  const { data: claimed, error: claimErr } = await sb
    .from("automation_message_queue")
    .update({ status: "sending", send_attempted_at: new Date().toISOString() })
    .eq("id", queueId)
    .eq("status", "approved")
    .select("*")
    .maybeSingle();

  if (claimErr) return json({ error: claimErr.message }, 500);
  if (!claimed) return json({ skipped: true, reason: "not_approved_or_already_claimed" });

  // Resolve adapter from enrollment config.
  const { data: enr } = await sb
    .from("project_automation_enrollments")
    .select("config")
    .eq("project_id", claimed.project_id)
    .eq("automation_key", claimed.automation_key)
    .maybeSingle();

  const adapter = resolveAdapter(claimed.channel as AutomationChannel, enr?.config ?? {});
  const recipient = (claimed.recipient_snapshot ?? {}) as Record<string, unknown>;
  const to = (recipient.email as string) ?? (recipient.phone as string) ?? (recipient.handle as string) ?? null;

  let result;
  try {
    result = await adapter.send({
      channel: claimed.channel,
      to,
      subject: claimed.subject,
      body: claimed.edited_body ?? claimed.body,
      project_id: claimed.project_id,
      queue_id: claimed.id,
      metadata: claimed.metadata ?? {},
    });
  } catch (e) {
    result = { ok: false, provider: adapter.name, error: String(e) };
  }

  await sb.from("automation_send_log").insert({
    project_id: claimed.project_id,
    queue_id: claimed.id,
    automation_key: claimed.automation_key,
    channel: claimed.channel,
    adapter: adapter.name,
    to_address: to,
    subject: claimed.subject,
    body: claimed.edited_body ?? claimed.body,
    ok: result.ok,
    provider_message_id: result.provider_message_id ?? null,
    error: result.error ?? null,
    raw: result.raw ?? null,
  });

  await sb
    .from("automation_message_queue")
    .update({
      status: result.ok ? "sent" : "failed",
      send_result: result as unknown as Record<string, unknown>,
    })
    .eq("id", claimed.id);

  return json({ ok: result.ok, adapter: adapter.name });
});