import { guardEdgeRequest } from '../_shared/auth-guard.ts';
// Daily sweep — cancels pending/approved queue rows tied to halted, replied,
// booked, or opted_out leads (follow-up sequences only).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  const __authDenied = await guardEdgeRequest(req, 'automation-stop-condition-sweep');
  if (__authDenied) return __authDenied;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Find runs that should stop: lead opted_out / replied / booked, OR run halted.
  const { data: stopLeads } = await sb
    .from("inbound_leads")
    .select("id")
    .in("automation_status", ["replied", "booked", "opted_out", "halted"]);
  const leadIds = (stopLeads ?? []).map((r: { id: string }) => r.id);

  let stoppedRunIds: string[] = [];
  if (leadIds.length) {
    const { data: runs } = await sb
      .from("followup_sequence_runs")
      .select("id")
      .in("lead_id", leadIds)
      .neq("status", "halted");
    stoppedRunIds = (runs ?? []).map((r: { id: string }) => r.id);
    if (stoppedRunIds.length) {
      await sb.from("followup_sequence_runs")
        .update({ status: "halted", stop_reason: "stop_condition_sweep", ended_at: new Date().toISOString() })
        .in("id", stoppedRunIds);
    }
  }

  // Leads-list prospects: stop on do-not-contact, reply, booking, CRM hand-off, Won or Dead.
  const { data: stopProspects } = await sb
    .from("prospects")
    .select("id")
    .or("do_not_contact.eq.true,status.in.(replied,meeting,promoted,won,dead)");
  const prospectIds = (stopProspects ?? []).map((r: { id: string }) => r.id);
  if (prospectIds.length) {
    const { data: pruns } = await sb
      .from("followup_sequence_runs")
      .select("id")
      .eq("subject_type", "prospect")
      .in("subject_id", prospectIds)
      .neq("status", "halted");
    const ids = (pruns ?? []).map((r: { id: string }) => r.id);
    if (ids.length) {
      await sb.from("followup_sequence_runs")
        .update({ status: "halted", stop_reason: "stop_condition_sweep", ended_at: new Date().toISOString() })
        .in("id", ids);
      stoppedRunIds = stoppedRunIds.concat(ids);
    }
  }

  const { data: haltedRuns } = await sb
    .from("followup_sequence_runs")
    .select("id")
    .eq("status", "halted");
  const haltedIds = (haltedRuns ?? []).map((r: { id: string }) => r.id);

  let canceled = 0;
  if (haltedIds.length) {
    const { data: cx } = await sb
      .from("automation_message_queue")
      .update({ status: "canceled" })
      .in("source_run_id", haltedIds)
      .in("status", ["pending_review", "approved"])
      .select("id");
    canceled = (cx ?? []).length;
  }

  return new Response(JSON.stringify({ stopped_runs: stoppedRunIds.length, canceled }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});