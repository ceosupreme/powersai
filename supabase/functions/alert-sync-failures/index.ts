// Sweep edge function: scans sync_runs for genuinely-unresolved failed/partial
// runs and creates one Asana alert task per row in section 1212842230116263,
// assigned to Supreme. Idempotent via sync_runs.alert_task_gid.
//
// Gated by app_config.sync_failure_alerts_enabled (ships false).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const SECTION_GID = "1212842230116263";
const ASANA_WORKSPACE_GID = "16292914201127";
const SUPREME_FULL_NAME = "Supreme";
const SWEEP_LOOKBACK_HOURS = 48;
const RETRY_GRACE_MINUTES = 30;
const PER_SWEEP_CAP = 50;

let cachedProjectGid: string | null = null;

async function resolveProjectGid(asanaToken: string): Promise<string> {
  if (cachedProjectGid) return cachedProjectGid;
  const r = await fetch(
    `https://app.asana.com/api/1.0/sections/${SECTION_GID}?opt_fields=project.gid`,
    { headers: { Authorization: `Bearer ${asanaToken}` } },
  );
  const j = await r.json();
  if (!r.ok) throw new Error(`Asana section lookup failed [${r.status}]: ${JSON.stringify(j)}`);
  const gid = j?.data?.project?.gid;
  if (!gid) throw new Error(`Could not resolve parent project for section ${SECTION_GID}`);
  cachedProjectGid = gid;
  return gid;
}

function fmtPT(iso: string | null): string {
  if (!iso) return "(none)";
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

function todayPTDateOnly(): string {
  // YYYY-MM-DD in PT
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const __disabled = await guardIntegration('asana', corsHeaders);
  if (__disabled) return __disabled;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Kill switch
    const { data: flagRow, error: flagErr } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "sync_failure_alerts_enabled")
      .maybeSingle();
    if (flagErr) throw new Error(`flag read failed: ${flagErr.message}`);
    const enabled = flagRow?.value === true || flagRow?.value === "true";
    if (!enabled) {
      console.log("[ALERT-SWEEP] disabled, skipping");
      return new Response(JSON.stringify({ ok: true, enabled: false, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolve Supreme GID
    const { data: supremeRow, error: supremeErr } = await supabase
      .from("profiles")
      .select("asana_gid")
      .eq("full_name", SUPREME_FULL_NAME)
      .maybeSingle();
    if (supremeErr) throw new Error(`supreme lookup failed: ${supremeErr.message}`);
    const supremeGid = supremeRow?.asana_gid;
    if (!supremeGid) {
      console.error("[ALERT-BLOCKER] Supreme profile has no asana_gid; cannot assign alert tasks.");
      return new Response(JSON.stringify({ ok: false, error: "Supreme asana_gid missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Asana credentials
    const asanaToken = Deno.env.get("ASANA_ACCESS_TOKEN");
    if (!asanaToken) throw new Error("ASANA_ACCESS_TOKEN not configured");
    const projectGid = await resolveProjectGid(asanaToken);

    // 4. Candidate rows (filter in SQL via RPC-less .rpc -> use raw via .select)
    // We can't easily express the NOT EXISTS in PostgREST; use a SQL RPC.
    // Fallback: fetch candidates broadly then filter in JS.
    const lookbackIso = new Date(Date.now() - SWEEP_LOOKBACK_HOURS * 3600 * 1000).toISOString();
    const graceIso = new Date(Date.now() - RETRY_GRACE_MINUTES * 60 * 1000).toISOString();

    const { data: candidates, error: candErr } = await supabase
      .from("sync_runs")
      .select("id, bar_id, sync_type, status, started_at, completed_at, records_processed, records_created, records_updated, error_message, notes")
      .in("status", ["failed", "partial"])
      .is("alert_task_gid", null)
      .not("completed_at", "is", null)
      .gt("started_at", lookbackIso)
      .lt("started_at", graceIso)
      .neq("sync_type", "sync_runs_reap")
      .order("started_at", { ascending: true })
      .limit(PER_SWEEP_CAP * 4); // headroom for client-side filter

    if (candErr) throw new Error(`candidate fetch failed: ${candErr.message}`);
    if (!candidates || candidates.length === 0) {
      console.log("[ALERT-SWEEP] no candidates");
      return new Response(JSON.stringify({ ok: true, processed: 0, created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out transients: any later success exists for same (bar_id, sync_type) on same PT day.
    // Pull all later successes in the window once, then in-memory check.
    const { data: laterSuccesses, error: succErr } = await supabase
      .from("sync_runs")
      .select("bar_id, sync_type, started_at")
      .in("status", ["completed", "success"])
      .gt("started_at", lookbackIso);
    if (succErr) throw new Error(`later-success fetch failed: ${succErr.message}`);

    const ptDay = (iso: string) => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(new Date(iso));
      const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
      return `${get("year")}-${get("month")}-${get("day")}`;
    };

    const successKey = new Set<string>();
    for (const s of laterSuccesses ?? []) {
      successKey.add(`${s.bar_id}|${s.sync_type}|${ptDay(s.started_at)}|${s.started_at}`);
    }
    // Build per-(bar,type,day) sorted later-success list
    const successByBucket = new Map<string, string[]>();
    for (const s of laterSuccesses ?? []) {
      const k = `${s.bar_id}|${s.sync_type}|${ptDay(s.started_at)}`;
      const arr = successByBucket.get(k) ?? [];
      arr.push(s.started_at);
      successByBucket.set(k, arr);
    }

    const unresolved = candidates.filter((c) => {
      const k = `${c.bar_id}|${c.sync_type}|${ptDay(c.started_at)}`;
      const sucs = successByBucket.get(k);
      if (!sucs) return true;
      return !sucs.some((t) => t > c.started_at);
    }).slice(0, PER_SWEEP_CAP);

    if (unresolved.length === 0) {
      console.log(`[ALERT-SWEEP] ${candidates.length} candidates, all transient`);
      return new Response(JSON.stringify({ ok: true, processed: candidates.length, created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load venue names in one shot
    const barIds = [...new Set(unresolved.map((r) => r.bar_id))];
    const { data: venues } = await supabase
      .from("venues").select("id, name").in("id", barIds);
    const venueName = new Map<string, string>((venues ?? []).map((v) => [v.id, v.name]));

    const dueOn = todayPTDateOnly();
    let created = 0, errors = 0;

    for (const sr of unresolved) {
      const vname = venueName.get(sr.bar_id) ?? sr.bar_id;
      const ptDate = ptDay(sr.started_at);
      const title = `🔴 Sync failure — ${vname} — ${sr.status} — ${ptDate} PT`;
      const notes = [
        `Venue: ${vname} (${sr.bar_id})`,
        `Sync function: ${sr.sync_type}`,
        `Status: ${sr.status}`,
        `Records processed/created/updated: ${sr.records_processed ?? 0}/${sr.records_created ?? 0}/${sr.records_updated ?? 0}`,
        `Started (PT): ${fmtPT(sr.started_at)}`,
        `Completed (PT): ${fmtPT(sr.completed_at)}`,
        `Error: ${sr.error_message ?? "(none)"}`,
        `Notes: ${sr.notes ?? "(none)"}`,
        `sync_run_id: ${sr.id}`,
      ].join("\n");

      try {
        const resp = await fetch("https://app.asana.com/api/1.0/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${asanaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              name: title,
              notes,
              due_on: dueOn,
              assignee: supremeGid,
              workspace: ASANA_WORKSPACE_GID,
              projects: [projectGid],
              memberships: [{ project: projectGid, section: SECTION_GID }],
            },
          }),
        });
        const body = await resp.json();
        if (!resp.ok) {
          console.error(`[ALERT-CREATE-FAILED] sync_run_id=${sr.id} status=${resp.status} body=${JSON.stringify(body)}`);
          errors++;
          continue;
        }
        const gid = body?.data?.gid;
        if (!gid) {
          console.error(`[ALERT-CREATE-FAILED] sync_run_id=${sr.id} no gid in response`);
          errors++;
          continue;
        }
        const { error: updErr } = await supabase
          .from("sync_runs")
          .update({ alert_task_gid: gid })
          .eq("id", sr.id);
        if (updErr) {
          console.error(`[ALERT-MARK-FAILED] sync_run_id=${sr.id} gid=${gid} err=${updErr.message}`);
        }
        created++;
        console.log(`[ALERT-CREATED] sync_run_id=${sr.id} task=${gid} venue=${vname} type=${sr.sync_type}`);
      } catch (e) {
        console.error(`[ALERT-CREATE-FAILED] sync_run_id=${sr.id} exception=${(e as Error).message}`);
        errors++;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      candidates: candidates.length,
      unresolved: unresolved.length,
      created,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[ALERT-SWEEP-FATAL]", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
