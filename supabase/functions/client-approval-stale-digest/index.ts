// Notify verified project client approvers, with durable daily deduplication.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guardEdgeRequest } from "../_shared/auth-guard.ts";
import { resolveAdapter, type SendInput } from "../_shared/send-adapters.ts";
import { claimWorker } from "../_shared/worker-lease.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  const denied = await guardEdgeRequest(req, "client-approval-stale-digest");
  if (denied) return denied;
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
  // Do not trust a caller-provided Origin when constructing an email link.
  const origin = (Deno.env.get("PUBLIC_APP_ORIGIN") || "https://supremeteammedia.com").replace(/\/$/, "");
  const { data: enrollments, error } = await sb.from("project_automation_enrollments")
    .select("project_id,automation_key,config,venues!inner(is_active)").eq("approval_mode", "client").eq("enabled", true).eq("venues.is_active", true);
  if (error) return json({ error: "enrollment_lookup_failed" }, 503);
  const results: Record<string, unknown>[] = [];
  const projectIds = [...new Set((enrollments ?? []).map((e) => e.project_id))];
  for (const projectId of projectIds) {
    try {
      const projectEnrollments = enrollments!.filter((e) => e.project_id === projectId);
      const { data: stale, error: staleError, count } = await sb.from("automation_message_queue")
        .select("id,automation_key,recipient_snapshot,body", { count: "exact" }).eq("project_id", projectId)
        .in("automation_key", projectEnrollments.map((e) => e.automation_key))
        .eq("status", "pending_review").lt("created_at", cutoff).order("created_at").limit(25);
      if (staleError) throw staleError;
      if (!stale?.length) { results.push({ project_id: projectId, skipped: "none_stale" }); continue; }
      const { data: assignments, error: assignmentError } = await sb.from("venue_assignments")
        .select("user_id").eq("venue_id", projectId);
      if (assignmentError) throw assignmentError;
      const { data: legacyAssignments, error: legacyAssignmentError } = await sb.from("user_venue_roles")
        .select("user_id").eq("venue_id", projectId);
      if (legacyAssignmentError) throw legacyAssignmentError;
      const ids = [...new Set([...(assignments ?? []), ...(legacyAssignments ?? [])].map((a) => a.user_id))];
      const { data: clients, error: roleError } = ids.length
        ? await sb.from("user_roles").select("user_id").eq("role", "client").in("user_id", ids)
        : { data: [], error: null };
      if (roleError) throw roleError;
      const { data: profiles, error: profileError } = clients?.length
        ? await sb.from("profiles").select("id,email").in("id", clients.map((c) => c.user_id))
        : { data: [], error: null };
      if (profileError) throw profileError;
      const recipients = (profiles ?? []).filter((p) => typeof p.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email));
      if (!recipients.length) {
        results.push({ project_id: projectId, ok: false, error: "no_assigned_client_approver_email" });
        continue; // No guessed address and no fabricated send log.
      }
      for (const recipient of recipients) {
        const key = `client-stale-digest:${projectId}:${today}:${recipient.id}`;
        const lease = await claimWorker(sb, key);
        if (!lease) { results.push({ project_id: projectId, skipped: "digest_running" }); continue; }
        try {
          if (lease.state.complete) { results.push({ project_id: projectId, skipped: "already_processed_today" }); continue; }
          const payload = (lease.state.payload ?? {
            channel: "email", to: recipient.email, subject: `${count ?? stale.length} messages waiting for approval`,
            body: `You have ${count ?? stale.length} messages waiting for review.\n\n` + stale.map((r, i) =>
              `${i + 1}) ${(r.recipient_snapshot as { name?: string })?.name ?? "Recipient"} — ${r.body.split("\n")[0].slice(0, 120)}`,
            ).join("\n") + `\n\nReview: ${origin}/approvals`,
            project_id: projectId, queue_id: key, metadata: { kind: "client_stale_digest", digest_date: today, internal: true },
          }) as SendInput;
          await lease.save({ ...lease.state, payload });
          const adapter = resolveAdapter("email", projectEnrollments[0].config);
          const result = await adapter.send(payload);
          const { error: logError } = await sb.from("automation_send_log").upsert({
            project_id: projectId, queue_id: null, automation_key: stale[0].automation_key, channel: "email",
            adapter: result.provider, to_address: recipient.email, subject: payload.subject, body: payload.body,
            ok: result.ok, provider_message_id: result.provider_message_id ?? null, error: result.error ?? null,
            raw: { ...result, kind: "client_stale_digest", digest_date: today, pending_count: count ?? stale.length }, dedupe_key: key,
          }, { onConflict: "dedupe_key", ignoreDuplicates: false });
          if (logError) throw logError;
          await lease.save({ ...lease.state, complete: result.ok, result });
          results.push({ project_id: projectId, ok: result.ok, delivery_status: result.delivery_status, error: result.error });
        } finally { await lease.release(); }
      }
    } catch (e) { results.push({ project_id: projectId, ok: false, error: String(e) }); }
  }
  return json({ processed: results.length, results, ok: results.every((r) => r.ok !== false) }, results.some((r) => r.ok === false) ? 503 : 200);
});
