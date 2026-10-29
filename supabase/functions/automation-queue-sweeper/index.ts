// Cron target: sends approved queue rows whose scheduled_for <= now() (or null).
// Calls automation-send-approved per row so atomic claim is reused.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guardEdgeRequest } from "../_shared/auth-guard.ts";
import { dispatchOutcome } from "../_shared/automation-state.ts";
import { retryInboundForwards } from "../_shared/inbound-forwarding.ts";

Deno.serve(async (req) => {
  const denied = await guardEdgeRequest(req, "automation-queue-sweeper");
  if (denied) return denied;
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- Pass 1: reap stranded 'sending' rows -------------------------------
  // Rows claimed >10min ago that never got a result written (function died
  // between atomic claim and result write). Guarded by status='sending' +
  // age condition so a live send finishing concurrently wins the race.
  const strandedCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const strandedError = "stranded — delivery unconfirmed; verify before retry";
  const { data: stranded, error: strandedErr } = await sb
    .from("automation_message_queue")
    .update({
      status: "failed",
      delivery_status: "unconfirmed",
      send_result: { ok: false, provider: "unknown", error: strandedError, delivery_status: "unconfirmed" },
    })
    .eq("status", "sending")
    .not("send_attempted_at", "is", null)
    .lt("send_attempted_at", strandedCutoff)
    .select("id, project_id, channel, automation_key");

  if (strandedErr) {
    console.error("[sweeper] stranded reap failed:", strandedErr.message);
    return new Response(JSON.stringify({ ok: false, error: "recovery_unavailable" }), { status: 503, headers: corsHeaders });
  } else if (stranded && stranded.length > 0) {
    const logRows = stranded.map((r: any) => ({
      queue_id: r.id,
      project_id: r.project_id,
      channel: r.channel,
      automation_key: r.automation_key,
      adapter: "unknown",
      ok: false,
      error: "stranded",
    }));
    const { error: logErr } = await sb.from("automation_send_log").insert(logRows);
    if (logErr) console.error("[sweeper] stranded log insert failed:", logErr.message);
    console.log(`[sweeper] reaped ${stranded.length} stranded sending row(s)`);
  }

  // --- Pass 2: dispatch approved rows (existing behavior) -----------------
  const { data: rows, error } = await sb
    .from("automation_message_queue")
    .select("id")
    .eq("status", "approved")
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
    .order("scheduled_for", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-send-approved`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const results: Array<{ id: string; ok: boolean; skipped?: boolean; reason?: string | null; delivery_status?: string | null }> = [];

  for (const r of rows ?? []) {
    if (Date.now() - startedAt > 35_000) break; // Remaining rows stay approved for the next scheduled pass.
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ queue_id: r.id }),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await resp.json().catch(() => ({ error: "invalid_worker_response" }));
      results.push({ id: r.id, ...dispatchOutcome(resp.ok, body) });
    } catch {
      results.push({ id: r.id, ok: false });
    }
  }

  let inboundRetries: unknown[] = [];
  let retryError: string | null = null;
  if (Date.now() - startedAt < 35_000) {
    try { inboundRetries = await retryInboundForwards(sb); }
    catch (e) { retryError = String(e); }
  }

  return new Response(JSON.stringify({
    stranded_reaped: stranded?.length ?? 0,
    swept: results.length,
    successful_outcomes: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    inbound_retries: inboundRetries,
    inbound_retry_error: retryError,
    results,
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
