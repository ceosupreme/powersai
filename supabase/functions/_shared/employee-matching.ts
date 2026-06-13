// Shared helpers for matching Toast and 7shifts employees within a venue.
//
// Match priority:
//   1. Email (case-insensitive, trimmed) — strongest signal.
//   2. Normalized full name — fallback when email missing or doesn't match.
//   3. Otherwise: leave both rows separate, mark match_status accordingly.
//
// Manual decisions (match_status='manual') are NEVER overwritten.

// deno-lint-ignore-file no-explicit-any

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const t = email.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

export function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null;
  const cleaned = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function fullName(first?: string | null, last?: string | null, fallback?: string | null): string | null {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (f || l) return `${f} ${l}`.trim();
  if (fallback) return fallback.trim();
  return null;
}

interface EmployeeRow {
  id: string;
  venue_id: string;
  employee_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  toast_employee_guid: string | null;
  sevenshifts_user_id_int: number | null;
  match_status: string;
  source_systems: string[] | null;
}

/**
 * Run a matching pass for one venue. Pulls all employees in the venue,
 * pairs Toast-only and 7shifts-only rows, merges where possible, and
 * updates match_status on the rest.
 *
 * Merging strategy when a pair is found:
 *   - Pick the row that has the most fields populated as the "winner".
 *   - Copy missing IDs/fields from the other row into the winner.
 *   - Delete the loser row.
 *   - Set winner: match_status='matched', match_method=<email|name>,
 *     source_systems=union, last_synced_at=now.
 */
export async function runMatchingPass(
  supabase: any,
  venueId: string,
): Promise<{ matched: number; unmatched: number; oneSided: number; ambiguous: number }> {
  const { data: rows, error } = await supabase
    .from("employee_profiles")
    .select(
      "id, venue_id, employee_name, first_name, last_name, email, toast_employee_guid, sevenshifts_user_id_int, match_status, source_systems",
    )
    .eq("venue_id", venueId)
    .neq("match_status", "manual");

  if (error) throw new Error(`runMatchingPass: ${error.message}`);
  const all: EmployeeRow[] = rows ?? [];

  // Bucket by source: rows that have ONLY Toast vs ONLY 7shifts vs both.
  const toastOnly: EmployeeRow[] = [];
  const sevenOnly: EmployeeRow[] = [];
  const both: EmployeeRow[] = [];

  for (const r of all) {
    const hasToast = !!r.toast_employee_guid;
    const hasSeven = r.sevenshifts_user_id_int != null;
    if (hasToast && hasSeven) both.push(r);
    else if (hasToast) toastOnly.push(r);
    else if (hasSeven) sevenOnly.push(r);
  }

  // Already-paired rows: just ensure match_status reflects reality.
  for (const r of both) {
    if (r.match_status !== "matched") {
      await supabase
        .from("employee_profiles")
        .update({ match_status: "matched", last_synced_at: new Date().toISOString() })
        .eq("id", r.id);
    }
  }

  // Build candidate maps for the 7shifts side.
  const sevenByEmail = new Map<string, EmployeeRow[]>();
  const sevenByName = new Map<string, EmployeeRow[]>();
  for (const r of sevenOnly) {
    const e = normalizeEmail(r.email);
    if (e) {
      const arr = sevenByEmail.get(e) ?? [];
      arr.push(r);
      sevenByEmail.set(e, arr);
    }
    const n = normalizeName(fullName(r.first_name, r.last_name, r.employee_name));
    if (n) {
      const arr = sevenByName.get(n) ?? [];
      arr.push(r);
      sevenByName.set(n, arr);
    }
  }

  let matched = 0;
  let ambiguous = 0;
  const claimedSeven = new Set<string>();

  for (const tRow of toastOnly) {
    const tEmail = normalizeEmail(tRow.email);
    const tName = normalizeName(fullName(tRow.first_name, tRow.last_name, tRow.employee_name));

    let candidates: EmployeeRow[] = [];
    let method: "email" | "name" | null = null;

    if (tEmail && sevenByEmail.has(tEmail)) {
      candidates = (sevenByEmail.get(tEmail) ?? []).filter((s) => !claimedSeven.has(s.id));
      method = "email";
    }
    if (candidates.length === 0 && tName && sevenByName.has(tName)) {
      candidates = (sevenByName.get(tName) ?? []).filter((s) => !claimedSeven.has(s.id));
      method = "name";
    }

    if (candidates.length === 1 && method) {
      const sRow = candidates[0];
      claimedSeven.add(sRow.id);
      try {
        await mergeRows(supabase, tRow, sRow, method);
        matched++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[runMatchingPass] mergeRows failed for toast=${tRow.id} seven=${sRow.id}: ${msg}`);
        // Soft-fail — keep the matching pass going so one bad row doesn't take down the whole run.
      }
    } else if (candidates.length > 1) {
      ambiguous++;
      await supabase
        .from("employee_profiles")
        .update({ match_status: "unmatched" })
        .eq("id", tRow.id);
    }
  }

  // Anything still unclaimed on either side: mark as no_match_in_other.
  let oneSided = 0;
  for (const tRow of toastOnly) {
    // Re-fetch is wasteful; check via state we already have.
    const stillToastOnly = !claimedSeven.has(tRow.id) && tRow.match_status !== "matched";
    if (stillToastOnly) {
      await supabase
        .from("employee_profiles")
        .update({ match_status: "no_match_in_other" })
        .eq("id", tRow.id);
      oneSided++;
    }
  }
  for (const sRow of sevenOnly) {
    if (claimedSeven.has(sRow.id)) continue;
    await supabase
      .from("employee_profiles")
      .update({ match_status: "no_match_in_other" })
      .eq("id", sRow.id);
    oneSided++;
  }

  return { matched, unmatched: 0, oneSided, ambiguous };
}

async function mergeRows(
  supabase: any,
  toastRow: EmployeeRow,
  sevenRow: EmployeeRow,
  method: "email" | "name",
): Promise<void> {
  // Fetch full rows so we can union fields.
  const { data: full, error } = await supabase
    .from("employee_profiles")
    .select("*")
    .in("id", [toastRow.id, sevenRow.id]);
  if (error || !full || full.length !== 2) {
    throw new Error(`mergeRows fetch failed: ${error?.message ?? "missing rows"}`);
  }
  const toastFull = full.find((r: any) => r.id === toastRow.id)!;
  const sevenFull = full.find((r: any) => r.id === sevenRow.id)!;

  // Winner = whichever has more populated fields. Ties go to the Toast row
  // because Toast carries payroll-relevant identifiers we prefer to keep stable.
  const score = (r: any) =>
    Object.values(r).filter((v) => v !== null && v !== undefined && v !== "").length;
  const [winner, loser] = score(toastFull) >= score(sevenFull)
    ? [toastFull, sevenFull]
    : [sevenFull, toastFull];

  // Build merge payload: prefer winner's value, fall back to loser's.
  const merged: Record<string, unknown> = { ...winner };
  for (const [k, v] of Object.entries(loser)) {
    if (k === "id" || k === "created_at") continue;
    if (merged[k] === null || merged[k] === undefined || merged[k] === "") {
      merged[k] = v;
    }
  }

  // Always carry both IDs.
  merged.toast_employee_guid = winner.toast_employee_guid ?? loser.toast_employee_guid;
  merged.sevenshifts_user_id_int =
    winner.sevenshifts_user_id_int ?? loser.sevenshifts_user_id_int;
  merged.sevenshifts_employee_id =
    winner.sevenshifts_employee_id ?? loser.sevenshifts_employee_id;
  merged.sevenshifts_punch_id = winner.sevenshifts_punch_id ?? loser.sevenshifts_punch_id;
  merged.toast_employee_id = winner.toast_employee_id ?? loser.toast_employee_id;
  merged.toast_external_employee_id =
    winner.toast_external_employee_id ?? loser.toast_external_employee_id;

  // Union source_systems
  const sources = new Set<string>([
    ...((winner.source_systems as string[]) ?? []),
    ...((loser.source_systems as string[]) ?? []),
  ]);
  merged.source_systems = Array.from(sources);

  merged.match_status = "matched";
  merged.match_method = method;
  merged.last_synced_at = new Date().toISOString();
  delete (merged as any).updated_at;

  // Time entries already linked to the loser need to follow the winner.
  // Do this BEFORE the loser is deleted so we don't orphan rows.
  await supabase
    .from("time_entries")
    .update({ employee_id: winner.id })
    .eq("employee_id", loser.id);

  // CRITICAL ORDERING: delete the loser FIRST, then update the winner.
  // The merged payload carries both rows' IDs (toast_employee_guid +
  // sevenshifts_user_id_int). If we updated the winner while the loser
  // still exists, both rows would briefly hold the same
  // (venue_id, toast_employee_guid) and the partial unique index
  // uq_employee_profiles_venue_toast_guid would reject the UPDATE.
  // Same hazard for uq_employee_profiles_venue_7s_user.
  const { error: delErr } = await supabase
    .from("employee_profiles")
    .delete()
    .eq("id", loser.id);
  if (delErr) {
    console.error(`[mergeRows] delete loser ${loser.id} failed: ${delErr.message}`);
    return; // soft-fail: don't take down the whole sync run
  }

  const { error: updErr } = await supabase
    .from("employee_profiles")
    .update(merged)
    .eq("id", winner.id);
  if (updErr) {
    console.error(
      `[mergeRows] update winner ${winner.id} failed (loser already deleted): ${updErr.message}`,
    );
    // soft-fail: loser is gone, winner keeps its prior IDs — manual review possible.
  }
}
