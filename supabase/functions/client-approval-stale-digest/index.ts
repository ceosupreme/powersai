// Daily sweeper: for each project in client-approval mode, digest items pending > 24h
// and send via the manual_log adapter. Deduped to one digest per project per day.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveAdapter, manualLogAdapter, type AutomationChannel } from "../_shared/send-adapters.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // All client-mode enrollments.
  const { data: enrollments, error: enrErr } = await sb
    .from("project_automation_enrollments")
    .select("project_id, automation_key, config")
    .eq("approval_mode", "client")
    .eq("enabled", true);
  if (enrErr) return json({ error: enrErr.message }, 500);

  const byProject = new Map<string, { config: Record<string, unknown> }>();
  for (const e of (enrollments ?? []) as Array<{ project_id: string; config: Record<string, unknown> }>) {
    if (!byProject.has(e.project_id)) byProject.set(e.project_id, { config: e.config ?? {} });
  }

  const origin = req.headers.get("origin") ?? Deno.env.get("PUBLIC_APP_ORIGIN") ?? "";
  const results: Array<Record<string, unknown>> = [];

  for (const [projectId, { config }] of byProject.entries()) {
    // Dedup: has a digest already been logged today?
    const { data: existing } = await sb
      .from("automation_send_log")
      .select("id")
      .eq("project_id", projectId)
      .filter("metadata->>kind", "eq", "client_stale_digest")
      .filter("metadata->>digest_date", "eq", today)
      .limit(1);
    if (existing && existing.length > 0) {
      results.push({ project_id: projectId, skipped: "already_sent_today" });
      continue;
    }

    const { data: stale, error: staleErr } = await sb
      .from("automation_message_queue")
      .select("id, recipient_snapshot, body, created_at")
      .eq("project_id", projectId)
      .eq("status", "pending_review")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(25);
    if (staleErr) { results.push({ project_id: projectId, error: staleErr.message }); continue; }
    if (!stale || stale.length === 0) {
      results.push({ project_id: projectId, skipped: "none_stale" });
      continue;
    }

    const n = stale.length;
    const lines = stale.map((row, idx) => {
      const r = (row.recipient_snapshot ?? {}) as { name?: string };
      const firstLine = (row.body ?? "").split("\n")[0].slice(0, 120);
      return `${idx + 1}) ${r.name ?? "(recipient)"} — ${firstLine}`;
    });
    const body =
      `You have ${n} messages waiting: ` +
      lines.join(" ") +
      `  Approving takes one tap: ${origin}/approvals`;

    // Digest has no per-recipient address today — resolve normally, but if
    // we can't produce a recipient, force manual_log so we don't fail-fast
    // in the real email adapter.
    const digestRecipient: string | null = null; // TODO: wire owner email once contact model lands
    const adapter = digestRecipient
      ? resolveAdapter("email" as AutomationChannel, config)
      : manualLogAdapter;
    const result = await adapter.send({
      channel: "email",
      to: digestRecipient,
      subject: `${n} message${n === 1 ? "" : "s"} waiting for your approval`,
      body,
      project_id: projectId,
      queue_id: "client_stale_digest",
      metadata: { kind: "client_stale_digest", digest_date: today, internal: true },
    });

    await sb.from("automation_send_log").insert({
      project_id: projectId,
      queue_id: null,
      channel: "email",
      provider: result.provider,
      provider_message_id: result.provider_message_id ?? null,
      status: result.ok ? "sent" : "failed",
      error: result.error ?? null,
      metadata: { kind: "client_stale_digest", digest_date: today, count: n },
    });

    results.push({ project_id: projectId, sent: n, ok: result.ok });
  }

  return json({ processed: results.length, results });
});