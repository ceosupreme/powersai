import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
// Syncs each venue's GM Asana task workload into asana_gm_tasks cache.
// Strategy: completed_since=now-14d returns ALL incomplete tasks (any age) +
// tasks completed in the last 14 days. One call per GM, paginated.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASANA_BASE = "https://app.asana.com/api/1.0";
const WORKSPACE_GID = "16292914201127";
const OPT_FIELDS =
  "gid,name,completed,completed_at,due_on,created_at,modified_at,permalink_url";

interface AsanaTask {
  gid: string;
  name?: string;
  completed: boolean;
  completed_at: string | null;
  due_on: string | null;
  created_at: string | null;
  modified_at: string | null;
  permalink_url?: string;
}

interface GmRow {
  venue_id: string;
  asana_gid: string | null;
  display_name: string | null;
}

async function fetchGmTasks(
  token: string,
  gmGid: string,
  completedSinceIso: string,
): Promise<AsanaTask[]> {
  const all: AsanaTask[] = [];
  let offset: string | null = null;
  let pages = 0;
  const maxPages = 20; // safety cap = 2000 tasks per GM

  do {
    const params = new URLSearchParams({
      assignee: gmGid,
      workspace: WORKSPACE_GID,
      completed_since: completedSinceIso,
      opt_fields: OPT_FIELDS,
      limit: "100",
    });
    if (offset) params.set("offset", offset);

    const url = `${ASANA_BASE}/tasks?${params}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Asana ${resp.status}: ${body.slice(0, 300)}`);
    }

    const json = await resp.json();
    const data: AsanaTask[] = json.data ?? [];
    all.push(...data);
    offset = json.next_page?.offset ?? null;
    pages++;
    await new Promise((r) => setTimeout(r, 150));
  } while (offset && pages < maxPages);

  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('asana', corsHeaders);
  if (__disabled) return __disabled;

  const startedAt = Date.now();
  const asanaToken = Deno.env.get("ASANA_ACCESS_TOKEN");
  if (!asanaToken) {
    return new Response(
      JSON.stringify({ error: "ASANA_ACCESS_TOKEN not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Optional venue filter
  let venueFilter: string | null = null;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.venue_id && typeof body.venue_id === "string") {
        venueFilter = body.venue_id;
      }
    } else {
      const u = new URL(req.url);
      venueFilter = u.searchParams.get("venue_id");
    }
  } catch (_) { /* ignore */ }

  // Load active GMs
  let gmQuery = supabase
    .from("venue_leadership_contacts")
    .select("venue_id, asana_gid, display_name")
    .eq("role_type", "gm")
    .eq("is_active", true);
  if (venueFilter) gmQuery = gmQuery.eq("venue_id", venueFilter);

  const { data: gms, error: gmErr } = await gmQuery;
  if (gmErr) {
    return new Response(JSON.stringify({ error: gmErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const completedSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString();

  const summary: any[] = [];

  for (const gm of (gms ?? []) as GmRow[]) {
    const venueId = gm.venue_id;
    const gmGid = gm.asana_gid;
    const gmName = gm.display_name ?? "(unknown)";

    if (!gmGid) {
      summary.push({ venue_id: venueId, gm: gmName, status: "no_asana_gid" });
      continue;
    }

    try {
      const tasks = await fetchGmTasks(asanaToken, gmGid, completedSince);

      // Upsert
      if (tasks.length > 0) {
        const rows = tasks.map((t) => ({
          venue_id: venueId,
          gm_asana_gid: gmGid,
          task_gid: t.gid,
          name: t.name ?? null,
          completed: !!t.completed,
          completed_at: t.completed_at,
          due_on: t.due_on,
          created_at_asana: t.created_at,
          modified_at_asana: t.modified_at,
          permalink_url: t.permalink_url ?? null,
          synced_at: new Date().toISOString(),
        }));

        // Chunk upserts to avoid payload limits
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const { error: upErr } = await supabase
            .from("asana_gm_tasks")
            .upsert(chunk, { onConflict: "venue_id,task_gid" });
          if (upErr) throw new Error(`upsert: ${upErr.message}`);
        }
      }

      // Sweep: drop cache rows that have aged out (completed > 14d ago AND
      // not in current response). We only delete rows that meet BOTH criteria
      // so we don't accidentally drop currently-open backlog tasks if Asana
      // omits them transiently.
      const seenGids = new Set(tasks.map((t) => t.gid));
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch existing cache rows for this venue
      const { data: existing, error: existErr } = await supabase
        .from("asana_gm_tasks")
        .select("task_gid, completed, completed_at")
        .eq("venue_id", venueId);

      let deleted = 0;
      if (!existErr && existing) {
        const toDelete = existing
          .filter((r: any) =>
            !seenGids.has(r.task_gid) &&
            r.completed &&
            r.completed_at &&
            r.completed_at < cutoff
          )
          .map((r: any) => r.task_gid);

        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from("asana_gm_tasks")
            .delete()
            .eq("venue_id", venueId)
            .in("task_gid", toDelete);
          if (!delErr) deleted = toDelete.length;
        }
      }

      summary.push({
        venue_id: venueId,
        gm: gmName,
        gm_gid: gmGid,
        fetched: tasks.length,
        open: tasks.filter((t) => !t.completed).length,
        completed_recent: tasks.filter((t) => t.completed).length,
        deleted,
        status: "ok",
      });
    } catch (err: any) {
      console.error(`[sync-asana-gm-tasks] ${gmName} (${venueId}) failed:`, err?.message);
      summary.push({
        venue_id: venueId,
        gm: gmName,
        gm_gid: gmGid,
        status: "error",
        error: String(err?.message ?? err),
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(`[sync-asana-gm-tasks] done in ${durationMs}ms`, JSON.stringify(summary));

  return new Response(
    JSON.stringify({ ok: true, duration_ms: durationMs, summary }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
