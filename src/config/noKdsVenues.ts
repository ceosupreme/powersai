/**
 * Beverage-only venues that do not run a KDS workflow.
 * G5 (KDS time) is not applicable for these venues — render "N/A" rather than
 * a generic missing-data dash.
 *
 * Mirror of `noKdsVenues` in supabase/functions/compute-weekly-scores/index.ts.
 * Keep the two lists in sync.
 */
export const NO_KDS_VENUE_IDS: ReadonlySet<string> = new Set([
  'a869a7fe-af6c-4b4b-9c2b-5039bffd5d3b', // Aero Club
  'cedb71f7-a800-4691-aa79-7877eacda6d4', // Sycamore Den
  '37d77ac2-e2cb-48a0-8d2f-06fefa12de04', // Club Marina
  'baded85e-e4c5-4b5e-b37b-ce031adcbf18', // The Hearth House
]);

export function isNoKdsVenue(barId?: string | null): boolean {
  return !!barId && NO_KDS_VENUE_IDS.has(barId);
}
