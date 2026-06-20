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

  return new Response(JSON.stringify({ swept: results.length, results }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});