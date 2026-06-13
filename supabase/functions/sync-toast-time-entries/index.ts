// sync-toast-time-entries — pulls Toast time entries (with breaks) for the
// previous business day per venue, and additionally pulls modifiedDate-based
// updates to catch retroactive edits to recently-synced entries.
//
// Inputs (POST body, all optional):
//   venue_id      — restrict to a single venue
//   business_date — YYYY-MM-DD; default = previous business date per venue tz
//   mode          — 'daily' (default) | 'backfill' | 'manual'
//
// In 'backfill' mode, business_date is required and the modifiedDate sweep is
// skipped.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getRestaurantConfig,
  previousBusinessDate,
  isPastCloseout,
} from "../_shared/toast-restaurant-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYNC_TYPE = "toast_time_entries";
const SYCAMORE_VENUE_ID = "cedb71f7-a800-4691-aa79-7877eacda6d4";

interface ToastCreds { clientId: string; clientSecret: string }

function credsFor(venueId: string, override?: { client_id?: string | null; client_secret?: string | null }): ToastCreds {
  if (override?.client_id && override?.client_secret) {
    return { clientId: override.client_id, clientSecret: override.client_secret };
  }
  if (venueId === SYCAMORE_VENUE_ID) {
    const id = Deno.env.get("SYCAMORE_TOAST_ANALYTICS_CLIENT_ID");
    const secret = Deno.env.get("SYCAMORE_TOAST_ANALYTICS_CLIENT_SECRET");
    if (id && secret) return { clientId: id, clientSecret: secret };
  }
  const id = Deno.env.get("TOAST_CLIENT_ID");
  const secret = Deno.env.get("TOAST_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Toast credentials not configured");
  return { clientId: id, clientSecret: secret };
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();
async function getToastToken(creds: ToastCreds): Promise<string> {
  const key = creds.clientId;
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
  const res = await fetch("https://ws-api.toasttab.com/authentication/v1/authentication/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds, userAccessType: "TOAST_MACHINE_CLIENT" }),
  });
  if (!res.ok) throw new Error(`Toast auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const token = data?.token?.accessToken;
  const expiresIn = data?.token?.expiresIn ?? 3600;
  if (!token) throw new Error("Toast auth: no accessToken");
  tokenCache.set(key, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

interface ToastBreak {
  guid: string;
  breakType?: { guid?: string };
  paid?: boolean;
  inDate?: string;
  outDate?: string;
  missed?: boolean;
  waived?: boolean;
  auditResponse?: boolean;
}

interface ToastTimeEntry {
  guid: string;
  employeeReference?: { guid: string };
  jobReference?: { guid?: string };
  shiftReference?: { guid?: string };
  inDate?: string;
  outDate?: string;
  businessDate?: number | string;
  regularHours?: number;
  overtimeHours?: number;
  hourlyWage?: number;
  autoClockedOut?: boolean;
  deleted?: boolean;
  modifiedDate?: string;
  jobName?: string;
  breaks?: ToastBreak[];
}

function compactToIsoDate(compact: string | number): string {
  const s = String(compact);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

async function fetchTimeEntries(
  token: string,
  restaurantGuid: string,
  query: URLSearchParams,
): Promise<ToastTimeEntry[]> {
  const url = `https://ws-api.toasttab.com/labor/v1/timeEntries?${query.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Toast-Restaurant-External-ID": restaurantGuid,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Toast /labor/v1/timeEntries ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = await res.json();
  return Array.isArray(body) ? body : (body.results ?? []);
}

async function upsertEntries(
  supabase: any,
  venueId: string,
  entries: ToastTimeEntry[],
): Promise<{ created: number; updated: number; breaksCreated: number; entriesWithoutEmployee: number }> {
  // Pre-load employee map (toast_employee_guid -> id) for this venue.
  const { data: emps } = await supabase
    .from("employee_profiles")
    .select("id, toast_employee_guid")
    .eq("venue_id", venueId)
    .not("toast_employee_guid", "is", null);
  const empByGuid = new Map<string, string>();
  for (const e of (emps ?? [])) empByGuid.set(e.toast_employee_guid, e.id);

  let created = 0;
  let updated = 0;
  let breaksCreated = 0;
  let entriesWithoutEmployee = 0;

  for (const e of entries) {
    if (!e.guid || !e.employeeReference?.guid || !e.inDate) continue;
    const empId = empByGuid.get(e.employeeReference.guid) ?? null;
    if (!empId) entriesWithoutEmployee++;

    const businessDate = e.businessDate
      ? compactToIsoDate(e.businessDate)
      : new Date(e.inDate).toISOString().slice(0, 10);

    const payload: Record<string, unknown> = {
      venue_id: venueId,
      employee_id: empId,
      toast_employee_guid: e.employeeReference.guid,
      toast_entry_guid: e.guid,
      toast_shift_guid: e.shiftReference?.guid ?? null,
      toast_job_guid: e.jobReference?.guid ?? null,
      toast_job_title: e.jobName ?? null,
      business_date: businessDate,
      in_date: e.inDate,
      out_date: e.outDate ?? null,
      regular_hours: e.regularHours ?? null,
      overtime_hours: e.overtimeHours ?? null,
      hourly_wage: e.hourlyWage ?? null,
      auto_clocked_out: e.autoClockedOut === true,
      deleted: e.deleted === true,
      modified_date: e.modifiedDate ?? null,
      raw: e,
    };

    // Check existence by toast_entry_guid (unique).
    const { data: existing } = await supabase
      .from("time_entries")
      .select("id")
      .eq("toast_entry_guid", e.guid)
      .maybeSingle();

    let entryId: string;
    if (existing) {
      const { error: updErr } = await supabase
        .from("time_entries")
        .update(payload)
        .eq("id", existing.id);
      if (updErr) {
        console.error(`[time-entries] update ${e.guid} failed:`, updErr.message);
        continue;
      }
      entryId = existing.id;
      updated++;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("time_entries")
        .insert(payload)
        .select("id")
        .single();
      if (insErr || !inserted) {
        console.error(`[time-entries] insert ${e.guid} failed:`, insErr?.message);
        continue;
      }
      entryId = inserted.id;
      created++;
    }

    // Replace breaks for this entry (delete + insert for simplicity).
    if (Array.isArray(e.breaks)) {
      await supabase.from("time_entry_breaks").delete().eq("time_entry_id", entryId);
      if (e.breaks.length > 0) {
        const breakRows = e.breaks
          .filter((b) => !!b.guid)
          .map((b) => ({
            time_entry_id: entryId,
            toast_break_guid: b.guid,
            break_type_guid: b.breakType?.guid ?? null,
            paid: b.paid ?? null,
            in_date: b.inDate ?? null,
            out_date: b.outDate ?? null,
            missed: b.missed === true,
            waived: b.waived === true,
            audit_response: typeof b.auditResponse === "boolean" ? b.auditResponse : null,
          }));
        if (breakRows.length > 0) {
          const { error: bErr } = await supabase.from("time_entry_breaks").insert(breakRows);
          if (bErr) console.error(`[time-entries] breaks insert for ${e.guid} failed:`, bErr.message);
          else breaksCreated += breakRows.length;
        }
      }
    }
  }

  return { created, updated, breaksCreated, entriesWithoutEmployee };
}

/**
 * Backfill time_entries.employee_id for any rows where it's NULL but a matching
 * employee_profiles row exists for the same (venue_id, toast_employee_guid).
 *
 * Why this is needed even though upsertEntries() sets employee_id at insert
 * time: rows inserted before the roster sync ran will have employee_id=NULL,
 * and on subsequent runs we only re-touch rows that Toast reports as modified.
 * This pass picks up everything else.
 *
 * Link is purely on Toast GUID — independent of employee_profiles.match_status.
 */
async function backfillEmployeeLinks(supabase: any, venueId: string): Promise<number> {
  const { data: emps } = await supabase
    .from("employee_profiles")
    .select("id, toast_employee_guid")
    .eq("venue_id", venueId)
    .not("toast_employee_guid", "is", null);
  const empByGuid = new Map<string, string>();
  for (const e of (emps ?? [])) empByGuid.set(e.toast_employee_guid, e.id);
  if (empByGuid.size === 0) return 0;

  const { data: orphans } = await supabase
    .from("time_entries")
    .select("id, toast_employee_guid")
    .eq("venue_id", venueId)
    .is("employee_id", null)
    .not("toast_employee_guid", "is", null);

  if (!orphans || orphans.length === 0) return 0;

  // Group orphan IDs by the employee_id they should point to.
  const idsByEmp = new Map<string, string[]>();
  for (const o of orphans) {
    const empId = empByGuid.get(o.toast_employee_guid);
    if (!empId) continue;
    const arr = idsByEmp.get(empId) ?? [];
    arr.push(o.id);
    idsByEmp.set(empId, arr);
  }

  let updated = 0;
  for (const [empId, ids] of idsByEmp.entries()) {
    // Chunk to keep IN-clauses sane.
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await supabase
        .from("time_entries")
        .update({ employee_id: empId })
        .in("id", chunk);
      if (error) {
        console.error(`[backfillEmployeeLinks] update failed for emp=${empId}: ${error.message}`);
        continue;
      }
      updated += chunk.length;
    }
  }
  return updated;
}

async function syncVenueTimeEntries(
  supabase: any,
  venue: { id: string; name: string; toast_restaurant_guid: string; timezone: string | null; toast_client_id: string | null; toast_client_secret: string | null },
  opts: { businessDateOverride: string | null; mode: "daily" | "backfill" | "manual" },
): Promise<Record<string, unknown>> {
  const { data: run, error: runErr } = await supabase
    .from("sync_runs")
    .insert({
      bar_id: venue.id,
      sync_type: SYNC_TYPE,
      status: "running",
      metadata: { venue_name: venue.name, mode: opts.mode },
    })
    .select("id")
    .single();
  if (runErr) throw new Error(`sync_runs insert: ${runErr.message}`);
  const runId = run.id;

  try {
    const creds = credsFor(venue.id, { client_id: venue.toast_client_id, client_secret: venue.toast_client_secret });
    const token = await getToastToken(creds);
    const venueTz = venue.timezone ?? "America/Los_Angeles";
    const cfg = await getRestaurantConfig(token, venue.toast_restaurant_guid);
    const tz = cfg.timezone ?? venueTz;

    // Determine target business date.
    let businessDateIso: string;
    let businessDateCompact: string;
    if (opts.businessDateOverride) {
      businessDateIso = opts.businessDateOverride;
      businessDateCompact = businessDateIso.replace(/-/g, "");
    } else {
      const pbd = previousBusinessDate(cfg.closeoutHour, tz);
      businessDateIso = pbd.iso;
      businessDateCompact = pbd.compact;
    }

    // In 'daily' mode, skip if we haven't crossed closeout yet.
    if (opts.mode === "daily" && !isPastCloseout(businessDateIso, cfg.closeoutHour, tz)) {
      await supabase
        .from("sync_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          records_processed: 0,
          notes: `Skipped: not yet past closeout (${cfg.closeoutHour}:00 ${tz}) for ${businessDateIso}`,
        })
        .eq("id", runId);
      return { runId, skipped: true, reason: "before_closeout", businessDate: businessDateIso };
    }

    // 1. Fetch entries by businessDate.
    const qs1 = new URLSearchParams();
    qs1.set("businessDate", businessDateCompact);
    qs1.set("includeMissedBreaks", "true");
    const dayEntries = await fetchTimeEntries(token, venue.toast_restaurant_guid, qs1);

    // Bug-3 diagnostic: in 'manual' mode, log the first non-empty breaks array
    // we see so we can permanently inspect Toast's actual payload shape.
    if (opts.mode === "manual") {
      const sample = dayEntries.find((e) => Array.isArray(e.breaks) && e.breaks.length > 0);
      if (sample) {
        console.log(
          `[time-entries:RAW-BREAKS] venue=${venue.name} entry=${sample.guid} breaks=${JSON.stringify(sample.breaks).slice(0, 800)}`,
        );
      } else {
        console.log(`[time-entries:RAW-BREAKS] venue=${venue.name} no entries with breaks in dayEntries`);
      }
    }

    const r1 = await upsertEntries(supabase, venue.id, dayEntries);

    // 2. modifiedDate sweep — catch retroactive edits in last 14 days.
    let r2 = { created: 0, updated: 0, breaksCreated: 0, entriesWithoutEmployee: 0 };
    let cursorWindowStart: string | null = null;
    if (opts.mode === "daily" || opts.mode === "manual") {
      const { data: cur } = await supabase
        .from("toast_sync_cursors")
        .select("last_modified_at")
        .eq("venue_id", venue.id)
        .eq("sync_type", SYNC_TYPE)
        .maybeSingle();

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const startIso = cur?.last_modified_at ?? fourteenDaysAgo;
      cursorWindowStart = startIso;
      const endIso = new Date().toISOString();

      const qs2 = new URLSearchParams();
      qs2.set("modifiedStartDate", startIso);
      qs2.set("modifiedEndDate", endIso);
      qs2.set("includeMissedBreaks", "true");
      const modEntries = await fetchTimeEntries(token, venue.toast_restaurant_guid, qs2);
      r2 = await upsertEntries(supabase, venue.id, modEntries);

      // Update cursor to max(modifiedDate) seen
      const maxModified = [...dayEntries, ...modEntries]
        .map((e) => e.modifiedDate)
        .filter((d): d is string => typeof d === "string")
        .sort()
        .at(-1) ?? endIso;
      await supabase
        .from("toast_sync_cursors")
        .upsert({
          venue_id: venue.id,
          sync_type: SYNC_TYPE,
          last_modified_at: maxModified,
          last_business_date: businessDateIso,
        }, { onConflict: "venue_id,sync_type" });
    }

    // Bug-2 fix: backfill employee_id for any orphan rows (rows inserted before
    // the roster sync had populated toast_employee_guid). Runs every time so
    // newly-merged employee profiles get picked up.
    const backfilledEmployeeLinks = await backfillEmployeeLinks(supabase, venue.id);

    const totalProcessed = (dayEntries.length ?? 0) + (r2.created + r2.updated);
    const created = r1.created + r2.created;
    const updated = r1.updated + r2.updated;
    const breaksCreated = r1.breaksCreated + r2.breaksCreated;
    const entriesWithoutEmployee = r1.entriesWithoutEmployee + r2.entriesWithoutEmployee;

    await supabase
      .from("sync_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_created: created,
        records_updated: updated,
        metadata: {
          venue_name: venue.name,
          mode: opts.mode,
          business_date: businessDateIso,
          breaks_created: breaksCreated,
          entries_without_matched_employee: entriesWithoutEmployee,
          backfilled_employee_links: backfilledEmployeeLinks,
          modified_window_start: cursorWindowStart,
        },
      })
      .eq("id", runId);

    return {
      runId,
      businessDate: businessDateIso,
      created,
      updated,
      breaksCreated,
      entriesWithoutEmployee,
      backfilledEmployeeLinks,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("sync_runs")
      .update({ status: "failed", completed_at: new Date().toISOString(), error_message: msg })
      .eq("id", runId);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: { venue_id?: string; business_date?: string; mode?: "daily" | "backfill" | "manual" } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const mode = body.mode ?? "daily";
    if (mode === "backfill" && !body.business_date) {
      return new Response(JSON.stringify({ error: "business_date is required in backfill mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let venueQuery = supabase
      .from("venues")
      .select("id, name, toast_restaurant_guid, timezone, toast_client_id, toast_client_secret")
      .eq("is_active", true)
      .eq("toast_api_enabled", true)
      .not("toast_restaurant_guid", "is", null);
    if (body.venue_id) venueQuery = venueQuery.eq("id", body.venue_id);

    const { data: venues, error: vErr } = await venueQuery;
    if (vErr) throw new Error(`venues query: ${vErr.message}`);
    if (!venues || venues.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No venues with Toast enabled", synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown>[] = [];
    for (const v of venues) {
      try {
        const r = await syncVenueTimeEntries(supabase, v as any, {
          businessDateOverride: body.business_date ?? null,
          mode,
        });
        results.push({ venue: v.name, ok: true, ...r });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[time-entries] ${v.name} failed:`, msg);
        results.push({ venue: v.name, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-toast-time-entries failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
