// Cron target: sends approved queue rows whose scheduled_for <= now() (or null).
// Calls automation-send-approved per row so atomic claim is reused.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
      send_result: { ok: false, provider: "unknown", error: strandedError },
    })
    .eq("status", "sending")
    .not("send_attempted_at", "is", null)
    .lt("send_attempted_at", strandedCutoff)
    .select("id, project_id, channel, automation_key");

  if (strandedErr) {
    console.error("[sweeper] stranded reap failed:", strandedErr.message);
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
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-send-approved`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const results: Array<{ id: string; ok: boolean }> = [];

  for (const r of rows ?? []) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ queue_id: r.id }),
      });
      results.push({ id: r.id, ok: resp.ok });
    } catch {
      results.push({ id: r.id, ok: false });
    }
  }

  return new Response(JSON.stringify({
    stranded_reaped: stranded?.length ?? 0,
    swept: results.length,
    results,
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});