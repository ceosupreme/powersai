// sync-seven-shifts — pulls the active+inactive employee roster from 7shifts
// for every venue with sevenshifts_api_enabled=true, upserts into
// employee_profiles, and runs the Toast↔7shifts matching pass at the end.
//
// Note: this function name is preserved for backward compatibility with the
// existing SettingsSyncTab and any external triggers. It used to be a stub for
// qualitative-only data; it now also syncs the roster.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runMatchingPass } from "../_shared/employee-matching.ts";
import { detectVendorAccount } from "../_shared/vendor-account-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEVEN_SHIFTS_BASE = "https://api.7shifts.com/v2";
const SYNC_TYPE = "seven_shifts_roster";

async function sevenShiftsFetch(path: string, token: string): Promise<any> {
  const res = await fetch(`${SEVEN_SHIFTS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`7shifts ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function getCompanyId(token: string): Promise<number> {
  const data = await sevenShiftsFetch("/whoami", token);
  const activeUser = data.data?.users?.find((u: { active: boolean }) => u.active);
  if (activeUser) return activeUser.company_id;
  if (data.data?.company_id) return data.data.company_id;
  throw new Error("Could not resolve 7shifts company id from /whoami");
}

interface SevenShiftsUser {
  id: number;
  punch_id?: number | string | null;
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  home_number?: string | null;
  active?: boolean;
  inactive?: boolean;
  // 7shifts API does NOT expose a hire_date field on /users. The closest signal
  // is `created` — the timestamp the user record was created in 7shifts, which
  // for most operators equals the hire date (they create the account on hiring).
  // We map this to employee_profiles.hire_date as the primary source; Toast's
  // createdDate is the fallback when 7shifts is missing.
  created?: string | null;
  wage_cents?: number | null;
  wage?: number | null;
  roles?: Array<{ id: number; location_id?: number | null }>;
  locations?: Array<{ id: number }>;
  departments?: Array<{ id: number }>;
}

async function fetchAllUsersForLocation(
  token: string,
  companyId: number,
  locationId: string,
  status: "active" | "inactive",
): Promise<SevenShiftsUser[]> {
  const all: SevenShiftsUser[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams();
    qs.set("location_id", locationId);
    qs.set("status", status);
    qs.set("limit", "100");
    if (cursor) qs.set("cursor", cursor);
    const res = await sevenShiftsFetch(`/company/${companyId}/users?${qs.toString()}`, token);
    const rows: SevenShiftsUser[] = res.data ?? [];
    all.push(...rows);
    cursor = res.meta?.cursor?.next ?? null;
    if (!cursor || rows.length === 0) break;
  }
  return all;
}

async function syncVenueRoster(
  supabase: any,
  token: string,
  companyId: number,
  venue: { id: string; name: string; seven_shifts_location_id: string | null },
): Promise<{ runId: string; created: number; updated: number; matched: number; oneSided: number; ambiguous: number }> {
  const { data: run, error: runErr } = await supabase
    .from("sync_runs")
    .insert({
      bar_id: venue.id,
      sync_type: SYNC_TYPE,
      status: "running",
      metadata: { venue_name: venue.name },
    })
    .select("id")
    .single();
  if (runErr) throw new Error(`sync_runs insert failed: ${runErr.message}`);
  const runId = run.id;

  try {
    if (!venue.seven_shifts_location_id) {
      throw new Error(`Venue ${venue.name} has no seven_shifts_location_id`);
    }

    const [active, inactive] = await Promise.all([
      fetchAllUsersForLocation(token, companyId, venue.seven_shifts_location_id, "active"),
      fetchAllUsersForLocation(token, companyId, venue.seven_shifts_location_id, "inactive"),
    ]);
    const users = [...active, ...inactive];

    let created = 0;
    let updated = 0;
    const nowIso = new Date().toISOString();

    for (const u of users) {
      const userIdInt = u.id;
      // Find existing row by 7shifts ID for this venue.
      const { data: existing } = await supabase
        .from("employee_profiles")
        .select("id, source_systems, match_status")
        .eq("venue_id", venue.id)
        .eq("sevenshifts_user_id_int", userIdInt)
        .maybeSingle();

      const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || (u.email ?? "Unknown");
      const wage = u.wage_cents != null
        ? u.wage_cents / 100
        : (typeof u.wage === "number" ? u.wage : null);

      const vendorVerdict = detectVendorAccount({
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        employee_name: fullName,
        role_primary: null,
      });
      if (vendorVerdict.isVendor) {
        console.log(`[vendor-account] venue=${venue.name} email=${u.email ?? "<none>"} name="${fullName}" reason=${vendorVerdict.reason}`);
      }

      const payload: Record<string, unknown> = {
        venue_id: venue.id,
        employee_name: fullName,
        first_name: u.first_name ?? null,
        last_name: u.last_name ?? null,
        preferred_name: u.preferred_name ?? null,
        email: u.email ?? null,
        phone: u.mobile_number ?? u.home_number ?? null,
        sevenshifts_employee_id: String(u.id),
        sevenshifts_user_id_int: userIdInt,
        sevenshifts_punch_id: u.punch_id != null ? String(u.punch_id) : null,
        seven_shifts_role_ids: (u.roles ?? []).map((r) => r.id),
        seven_shifts_location_ids: (u.locations ?? []).map((l) => l.id),
        seven_shifts_department_ids: (u.departments ?? []).map((d) => d.id),
        hourly_wage: wage,
        // Map 7shifts `created` ISO timestamp → date for hire_date.
        hire_date: u.created ? String(u.created).slice(0, 10) : null,
        is_active: u.active === true,
        last_synced_at: nowIso,
        ...(vendorVerdict.isVendor
          ? { is_vendor_account: true, is_exempt: true, exempt_reason: "vendor_account" }
          : {}),
      };

      if (existing) {
        const sources = new Set([...(existing.source_systems ?? []), "7shifts"]);
        await supabase
          .from("employee_profiles")
          .update({ ...payload, source_systems: Array.from(sources) })
          .eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("employee_profiles").insert({
          ...payload,
          source_systems: ["7shifts"],
          match_status: "unmatched",
          employment_status: u.active === true ? "active" : "terminated",
        });
        created++;
      }
    }

    // Run the matching pass (Toast<->7shifts) for this venue.
    const m = await runMatchingPass(supabase, venue.id);

    await supabase
      .from("sync_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        records_processed: users.length,
        records_created: created,
        records_updated: updated,
        metadata: {
          venue_name: venue.name,
          matched: m.matched,
          one_sided: m.oneSided,
          ambiguous: m.ambiguous,
        },
      })
      .eq("id", runId);

    return { runId, created, updated, matched: m.matched, oneSided: m.oneSided, ambiguous: m.ambiguous };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: msg,
      })
      .eq("id", runId);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = Deno.env.get("SEVEN_SHIFTS_ACCESS_TOKEN");
    if (!token) throw new Error("SEVEN_SHIFTS_ACCESS_TOKEN not configured");

    let body: { venue_id?: string; action?: string } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Backward-compat debug action
    if (body.action === "list_locations") {
      const companyId = await getCompanyId(token);
      const locations = await sevenShiftsFetch(`/company/${companyId}/locations`, token);
      return new Response(JSON.stringify(locations), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let venueQuery = supabase
      .from("venues")
      .select("id, name, seven_shifts_location_id")
      .eq("is_active", true)
      .eq("sevenshifts_api_enabled", true)
      .not("seven_shifts_location_id", "is", null);

    if (body.venue_id) venueQuery = venueQuery.eq("id", body.venue_id);

    const { data: venues, error: vErr } = await venueQuery;
    if (vErr) throw new Error(`venues query: ${vErr.message}`);
    if (!venues || venues.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No venues with 7shifts enabled",
        synced: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const companyId = await getCompanyId(token);
    const results: Record<string, unknown>[] = [];
    for (const v of venues) {
      try {
        const r = await syncVenueRoster(supabase, token, companyId, v as any);
        results.push({ venue: v.name, ok: true, ...r });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[7shifts roster] ${v.name} failed:`, msg);
        results.push({ venue: v.name, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-seven-shifts (roster) failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
