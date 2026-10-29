import { guardEdgeRequest } from '../_shared/auth-guard.ts';
// Hourly tick. Placeholder for advancing follow-up runs whose next message
// needs DRAFTING ahead of the scheduled approval window. Today the
// enqueue-followup-sequence function drafts ALL touches up-front, so this
// sweep just no-ops + reports. Kept as a stable cron target for the future
// "draft on rolling horizon" path.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  const __authDenied = await guardEdgeRequest(req, 'followup-cadence-tick');
  if (__authDenied) return __authDenied;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({ ok: true, advanced: 0 }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});