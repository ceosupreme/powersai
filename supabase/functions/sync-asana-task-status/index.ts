// Polls Asana for status of approved action_items and writes back.
// Triggered every 15 minutes via pg_cron.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASANA_BASE = "https://app.asana.com/api/1.0";
const OPT_FIELDS =
  "gid,name,completed,completed_at,due_on,modified_at,assignee.gid,assignee.name";

interface AsanaTask {
  gid: string;
  completed: boolean;
  completed_at: string | null;
  due_on: string | null;
  modified_at: string | null;
  assignee: { gid: string; name: string } | null;
}

function deriveStatus(t: AsanaTask): string {
  if (t.completed) return "completed";
  if (t.due_on) {
    const today = new Date().toISOString().slice(0, 10);
    if (t.due_on < today) return "overdue";
  }
  return "open";
}

async function fetchAsanaTask(token: string, gid: string): Promise<AsanaTask | null> {
  const r = await fetch(`${ASANA_BASE}/tasks/${encodeURIComponent(gid)}?opt_fields=${OPT_FIELDS}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    console.error(`[sync-asana-task-status] fetch ${gid} failed: ${r.status} ${await r.text()}`);
    return null;
  }
  const j = await r.json();
  return j.data as AsanaTask;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const asanaToken = Deno.env.get("ASANA_ACCESS_TOKEN");
  if (!asanaToken) {
    return new Response(JSON.stringify({ error: "ASANA_ACCESS_TOKEN not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Optional body to filter
  let onlyId: string | null = null;
  let limit = 200;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action_item_id) onlyId = String(body.action_item_id);
    if (body?.limit) limit = Math.min(500, Math.max(1, Number(body.limit)));
  } catch (_) {}

  // Pull approved action_items with an Asana GID that aren't completed locally yet.
  // Skip those synced in the last 5 min (unless explicitly targeted).
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let q = supabase
    .from("action_items")
    .select("id, asana_task_gid, asana_task_status, asana_last_synced_at")
    .not("asana_task_gid", "is", null)
    .neq("asana_task_gid", "")
    .order("asana_last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (onlyId) {
    q = q.eq("id", onlyId);
  } else {
    q = q.or(`asana_last_synced_at.is.null,asana_last_synced_at.lt.${fiveMinAgo}`);
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error("[sync-asana-task-status] query error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let scanned = 0;
  let updated = 0;
  let missing = 0;
  let unchanged = 0;

  for (const row of rows || []) {
    scanned++;
    // skip rows whose gid looks non-Asana (UUIDs from native tasks)
    const gid = String(row.asana_task_gid || "");
    if (!gid || gid.includes("-")) {
      unchanged++;
      continue;
    }

    const t = await fetchAsanaTask(asanaToken, gid);
    if (!t) {
      missing++;
      await supabase
        .from("action_items")
        .update({ asana_last_synced_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    const status = deriveStatus(t);
    const patch: Record<string, unknown> = {
      asana_task_status: status,
      asana_due_on: t.due_on,
      asana_completed_at: t.completed_at,
      asana_modified_at: t.modified_at,
      asana_assignee_gid: t.assignee?.gid ?? null,
      asana_assignee_name: t.assignee?.name ?? null,
      asana_last_synced_at: new Date().toISOString(),
    };

    // If completed in Asana and not completed locally, also mark our row.
    if (t.completed) {
      patch.status = "Completed";
      if (t.completed_at) patch.completed_at = t.completed_at;
    }

    const { error: upErr } = await supabase
      .from("action_items")
      .update(patch)
      .eq("id", row.id);

    if (upErr) {
      console.error(`[sync-asana-task-status] update ${row.id} failed:`, upErr);
    } else {
      updated++;
    }
  }

  const ms = Date.now() - startedAt;
  console.log(
    `[sync-asana-task-status] scanned=${scanned} updated=${updated} missing=${missing} unchanged=${unchanged} ms=${ms}`,
  );

  return new Response(
    JSON.stringify({ scanned, updated, missing, unchanged, ms }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
