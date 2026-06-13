import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
// Scheduled background sync for Asana → BarPulse. Runs every 2h during
// business hours via pg_cron. Per-venue try/catch so one failure doesn't
// kill the rest. Tracks consecutive failures in venue_asana_sync_health.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const __disabled = await guardIntegration('asana', corsHeaders);
  if (__disabled) return __disabled;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const startedAt = Date.now();
  let venuesProcessed = 0, venuesFailed = 0, tasksReconciled = 0;
  const perVenue: Array<{ venue_id: string; ok: boolean; tasks: number; error?: string }> = [];

  try {
    const { data: adapters, error: adErr } = await admin
      .from("venue_execution_adapters")
      .select("venue_id")
      .eq("adapter_type", "asana")
      .eq("live_writes_enabled", true);
    if (adErr) throw adErr;

    for (const a of (adapters || [])) {
      const venueId = a.venue_id;
      try {
        // Find active campaigns with an Asana external_id.
        const { data: campaigns, error: cErr } = await admin
          .from("marketing_campaigns")
          .select("id, execution_adapter, status")
          .eq("venue_id", venueId)
          .not("execution_adapter->>external_id", "is", null);
        if (cErr) throw cErr;

        const active = (campaigns || []).filter((c: any) =>
          ["Scheduled", "In Progress", "Active", "Draft"].includes(c.status)
        );

        let venueTasks = 0;
        for (const c of active) {
          const externalId = (c.execution_adapter as any)?.external_id;
          if (!externalId) continue;

          // Invoke the existing single-task pull via service role.
          const r = await fetch(`${SUPABASE_URL}/functions/v1/marketing-asana-pull`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
              apikey: SERVICE_KEY,
            },
            body: JSON.stringify({ venue_id: venueId, external_task_id: externalId, campaign_id: c.id }),
          });
          if (!r.ok) {
            const t = await r.text();
            throw new Error(`pull ${externalId} ${r.status}: ${t.slice(0, 200)}`);
          }
          const body = await r.json();

          // Apply the patch back to the campaign row (mirrors the client adapter).
          if (body?.sync_lost) {
            await admin
              .from("marketing_campaigns")
              .update({
                execution_adapter: {
                  ...(c.execution_adapter as any),
                  sync_status: "Sync Failed",
                  error_message: "Task not found in Asana.",
                },
              })
              .eq("id", c.id);
          } else if (body?.patch) {
            const patch: Record<string, unknown> = {};
            if (body.patch.title) patch.title = body.patch.title;
            if (body.patch.startDate) patch.start_date = body.patch.startDate;
            if (body.patch.endDate) patch.end_date = body.patch.endDate;
            if (body.patch.status) patch.status = body.patch.status;
            if (body.patch.executionAdapter) patch.execution_adapter = body.patch.executionAdapter;
            patch.last_synced_from = "asana";
            await admin.from("marketing_campaigns").update(patch).eq("id", c.id);
          }
          venueTasks++;
          tasksReconciled++;
        }

        await admin.from("venue_asana_sync_health").upsert({
          venue_id: venueId,
          consecutive_failures: 0,
          last_success_at: new Date().toISOString(),
          last_error: null,
        });
        perVenue.push({ venue_id: venueId, ok: true, tasks: venueTasks });
        venuesProcessed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[cron-asana-pull] venue ${venueId} failed:`, msg);

        // Increment counter atomically: read current, then write +1.
        const { data: cur } = await admin
          .from("venue_asana_sync_health")
          .select("consecutive_failures")
          .eq("venue_id", venueId)
          .maybeSingle();
        const next = (cur?.consecutive_failures ?? 0) + 1;
        await admin.from("venue_asana_sync_health").upsert({
          venue_id: venueId,
          consecutive_failures: next,
          last_failure_at: new Date().toISOString(),
          last_error: msg.slice(0, 500),
        });
        perVenue.push({ venue_id: venueId, ok: false, tasks: 0, error: msg.slice(0, 200) });
        venuesFailed++;
      }

      // 2s stagger between venues for Asana rate limits.
      await sleep(2000);
    }

    const duration_ms = Date.now() - startedAt;
    console.log(`[cron-asana-pull] done venues=${venuesProcessed} failed=${venuesFailed} tasks=${tasksReconciled} ms=${duration_ms}`);
    return new Response(
      JSON.stringify({ ok: true, venuesProcessed, venuesFailed, tasksReconciled, duration_ms, perVenue }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[cron-asana-pull] fatal:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
