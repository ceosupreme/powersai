// Pluggable context-source adapter contract.
// Each adapter pulls one external data feed for one venue and returns
// normalized items that the contextMarketingOpportunity analyzer consumes.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type ContextSourceType = 'calendar' | 'weather' | 'news' | 'sports' | 'events';

export type VenueRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
};

export type NormalizedContextItem = {
  source_type: ContextSourceType;
  source_ref: string;            // stable id from upstream — used for idempotent upserts
  event_date: string;            // YYYY-MM-DD (Pacific)
  valid_until?: string | null;   // YYYY-MM-DD
  payload: Record<string, any>;  // normalized: { title, summary, tags[], raw }
};

export type AdapterPullResult = {
  items: NormalizedContextItem[];
  errors: string[];
};

export interface ContextSourceAdapter {
  id: ContextSourceType;
  pull(supabase: SupabaseClient, venue: VenueRow): Promise<AdapterPullResult>;
}

export const isoToday = (): string => {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(now); // YYYY-MM-DD
};

export const addDaysISO = (iso: string, days: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};
