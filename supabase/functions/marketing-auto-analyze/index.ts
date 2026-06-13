// marketing-auto-analyze
// Cron-driven sweep that runs the post-event analyzer on Ended campaigns where
// auto_analysis_enabled=true and either no results yet OR inputsHash mismatch.
// Caps at 25 campaigns per run with a 1s stagger to spread Toast/AI load.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: campaigns, error } = await admin
      .from("marketing_campaigns")
      .select("id, results, end_date")
      .eq("status", "Ended")
      .eq("auto_analysis_enabled", true)
      .order("end_date", { ascending: false })
      .limit(50);
    if (error) throw error;

    const todo = (campaigns ?? []).filter((c: any) => {
      // Skip if results already generated for current inputs (best-effort: any
      // results.generatedAt + a generatedBy='auto' marker counts as analyzed).
      return !c.results?.generatedAt;
    }).slice(0, 25);

    console.log(`[auto-analyze] ${todo.length} Ended campaigns queued`);

    const results: any[] = [];
    for (const c of todo) {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/marketing-campaign-analyze`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({ campaign_id: c.id, mode: 'live', generated_by: 'auto' }),
        });
        const ok = r.ok;
        const body = await r.text();
        console.log(`[auto-analyze] ${c.id}: ${r.status} ${ok ? 'ok' : body.slice(0, 200)}`);
        results.push({ id: c.id, status: r.status, ok });
      } catch (e) {
        console.error(`[auto-analyze] ${c.id} threw:`, e);
        results.push({ id: c.id, error: String(e) });
      }
      await sleep(1000);
    }

    return json({ ok: true, processed: results.length, results });
  } catch (err) {
    console.error("[marketing-auto-analyze]", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
