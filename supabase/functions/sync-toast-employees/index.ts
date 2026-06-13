import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
// sync-toast-employees — pulls the employee roster from Toast for every venue
// with toast_api_enabled=true and upserts into employee_profiles. Runs the
// matching pass at the end so newly-arrived Toast rows get paired with any
// existing 7shifts rows.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runMatchingPass } from "../_shared/employee-matching.ts";
import { detectVendorAccount } from "../_shared/vendor-account-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYNC_TYPE = "toast_employees";
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
  if (!token) throw new Error("Toast auth: no accessToken in response");
  tokenCache.set(key, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

interface ToastEmployee {
  guid: string;
  externalEmployeeId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  jobReferences?: Array<{ guid: string; externalId?: string | null; name?: string | null }>;
  wageOverrides?: Array<{ wage?: number; jobReference?: { guid: string } }>;
  // Toast returns createdDate as ISO 8601 (e.g. "2023-06-26T23:00:03.813+0000").
  // Used as the SECONDARY source for employee_profiles.hire_date when 7shifts
  // (the primary source) hasn't populated it.
  createdDate?: string | null;
  deleted?: boolean;
  disabled?: boolean;
  archived?: boolean;
}

interface ToastJob { guid: string; title?: string | null; deleted?: boolean }

async function fetchToastJobs(token: string, restaurantGuid: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch("https://ws-api.toasttab.com/labor/v1/jobs", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Toast-Restaurant-External-ID": restaurantGuid,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[toast-jobs] ${restaurantGuid} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return map;
    }
    const body = await res.json();
    const rows: ToastJob[] = Array.isArray(body) ? body : (body.results ?? body.jobs ?? []);
    for (const j of rows) {
      if (j.guid && j.title) map.set(j.guid, String(j.title).trim());
    }
  } catch (err) {
    console.warn(`[toast-jobs] ${restaurantGuid} fetch error:`, err instanceof Error ? err.message : String(err));
  }
  return map;
}

async function fetchAllToastEmployees(token: string, restaurantGuid: string): Promise<ToastEmployee[]> {
  const all: ToastEmployee[] = [];
  let pageToken: string | null = null;
  for (let page = 0; page < 50; page++) {
    const url = new URL("https://ws-api.toasttab.com/labor/v1/employees");
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Toast-Restaurant-External-ID": restaurantGuid,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Toast /labor/v1/employees ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    // Toast returns either an array or an object with results/nextPageToken depending on the endpoint.
    const body = await res.json();
    const rows: ToastEmployee[] = Array.isArray(body) ? body : (body.results ?? body.employees ?? []);
    all.push(...rows);
    pageToken = (Array.isArray(body) ? null : (body.nextPageToken ?? null));
    // Header-based pagination fallback
    if (!pageToken) {
      const next = res.headers.get("Toast-Next-Page-Token");
      if (next) pageToken = next;
    }
    if (!pageToken || rows.length === 0) break;
  }
  return all;
}

async function syncVenueEmployees(
  supabase: any,
  venue: { id: string; name: string; toast_restaurant_guid: string; toast_client_id: string | null; toast_client_secret: string | null },
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
  if (runErr) throw new Error(`sync_runs insert: ${runErr.message}`);
  const runId = run.id;

  try {
    const creds = credsFor(venue.id, { client_id: venue.toast_client_id, client_secret: venue.toast_client_secret });
    const token = await getToastToken(creds);
    const [employees, jobMap] = await Promise.all([
      fetchAllToastEmployees(token, venue.toast_restaurant_guid),
      fetchToastJobs(token, venue.toast_restaurant_guid),
    ]);
    console.log(`[toast-employees] ${venue.name}: ${employees.length} employees, ${jobMap.size} jobs resolved`);

    let created = 0;
    let updated = 0;
    const nowIso = new Date().toISOString();

    for (const e of employees) {
      const fullName = [e.firstName, e.lastName].filter(Boolean).join(" ").trim() || (e.email ?? "Unknown");
      // Best-effort wage: take the first wageOverride if present.
      const wage = (e.wageOverrides && e.wageOverrides.length > 0 && typeof e.wageOverrides[0].wage === "number")
        ? e.wageOverrides[0].wage
        : null;
      const isActive = e.deleted !== true && e.disabled !== true && e.archived !== true;

      // Resolve role names from jobReferences via the jobs map (fall back to inline name if Toast ever returns it).
      const resolvedTitles = (e.jobReferences ?? [])
        .map(j => jobMap.get(j.guid) ?? (j.name ? String(j.name).trim() : null))
        .filter((t): t is string => !!t);
      const uniqueTitles = Array.from(new Set(resolvedTitles));
      const rolePrimary = uniqueTitles[0] ?? null;
      const roleSecondary = uniqueTitles[1] ?? null;

      const { data: existing } = await supabase
        .from("employee_profiles")
        .select("id, source_systems, hire_date")
        .eq("venue_id", venue.id)
        .eq("toast_employee_guid", e.guid)
        .maybeSingle();

      // hire_date: 7shifts is primary; Toast is fallback. Only write when missing
      // OR when Toast's createdDate is earlier than what we already have (rare —
      // protects against accidental forward-shift if 7shifts re-created an
      // account after Toast onboarding).
      const toastHire = e.createdDate ? String(e.createdDate).slice(0, 10) : null;
      const shouldSetHire =
        toastHire != null &&
        (!existing?.hire_date || (existing.hire_date && toastHire < existing.hire_date));

      // Vendor / integration account detection — runs on every sync so newly-
      // arriving Sculpture/Bevinco/BevIntel/Terminal Login rows are flagged at
      // ingest. Only writes is_exempt/exempt_reason when isVendor=true so we
      // don't clobber manual admin overrides on real humans.
      const vendorVerdict = detectVendorAccount({
        email: e.email,
        first_name: e.firstName,
        last_name: e.lastName,
        employee_name: fullName,
        role_primary: rolePrimary,
      });
      if (vendorVerdict.isVendor) {
        console.log(`[vendor-account] venue=${venue.name} email=${e.email ?? "<none>"} name="${fullName}" reason=${vendorVerdict.reason}`);
      }

      const payload: Record<string, unknown> = {
        venue_id: venue.id,
        employee_name: fullName,
        first_name: e.firstName ?? null,
        last_name: e.lastName ?? null,
        email: e.email ?? null,
        phone: e.phoneNumber ?? null,
        toast_employee_guid: e.guid,
        toast_employee_id: e.guid, // legacy column kept in sync
        toast_external_employee_id: e.externalEmployeeId ?? null,
        toast_job_references: e.jobReferences ?? [],
        hourly_wage: wage,
        is_active: isActive,
        last_synced_at: nowIso,
        // Only overwrite roles when we successfully resolved one — protects existing data on transient API failures.
        ...(rolePrimary !== null ? { role_primary: rolePrimary } : {}),
        ...(roleSecondary !== null ? { role_secondary: roleSecondary } : {}),
        ...(shouldSetHire ? { hire_date: toastHire } : {}),
        ...(vendorVerdict.isVendor
          ? { is_vendor_account: true, is_exempt: true, exempt_reason: "vendor_account" }
          : {}),
      };

      if (existing) {
        const sources = new Set([...(existing.source_systems ?? []), "toast"]);
        await supabase
          .from("employee_profiles")
          .update({ ...payload, source_systems: Array.from(sources) })
          .eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("employee_profiles").insert({
          ...payload,
          // For brand-new Toast-only rows, always seed hire_date from Toast createdDate.
          ...(toastHire ? { hire_date: toastHire } : {}),
          source_systems: ["toast"],
          match_status: "unmatched",
          employment_status: isActive ? "active" : "terminated",
        });
        created++;
      }
    }

    const m = await runMatchingPass(supabase, venue.id);

    await supabase
      .from("sync_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        records_processed: employees.length,
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
      .update({ status: "failed", completed_at: new Date().toISOString(), error_message: msg })
      .eq("id", runId);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;
  try {
    let body: { venue_id?: string } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let venueQuery = supabase
      .from("venues")
      .select("id, name, toast_restaurant_guid, toast_client_id, toast_client_secret")
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
        const r = await syncVenueEmployees(supabase, v as any);
        results.push({ venue: v.name, ok: true, ...r });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[toast-employees] ${v.name} failed:`, msg);
        results.push({ venue: v.name, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-toast-employees failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
