// Live status for the Google Business Profile data source.
// Reads gbp_place_mappings + the most recent gbp_snapshots row for a venue
// so the Data Sources panel and the Local Search Visibility scorer can both
// reflect real connection state instead of a static placeholder.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SourceStatus } from './mockDataSources';

export type GbpMapping = {
  venue_id: string;
  place_id: string | null;
  manual_only: boolean;
  consecutive_fetch_failures: number;
  last_resolved_at: string | null;
  last_resolve_error: string | null;
};

export type GbpSnapshot = {
  id: string;
  captured_at: string;
  source: 'automated' | 'manual' | string;
  scope: string;
  fetch_error: string | null;
  primary_category: string | null;
  description: string | null;
  hours_complete: boolean | null;
  photo_count: number | null;
  last_photo_at: string | null;
  post_count: number | null;
  last_post_at: string | null;
  qa_unanswered: number | null;
  review_response_rate_30d: number | null;
  nap_match_name: boolean | null;
  nap_match_address: boolean | null;
  nap_match_phone: boolean | null;
};

export type GbpStatus = {
  mapping: GbpMapping | null;
  snapshot: GbpSnapshot | null;
  status: SourceStatus;
  lastSyncLabel: string | null;
  ageDays: number | null;
};

export const gbpStatusKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'gbp-status', venueId ?? 'none'] as const;

const DAY = 86_400_000;

function relTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function deriveGbpStatus(
  mapping: GbpMapping | null,
  snapshot: GbpSnapshot | null,
): GbpStatus {
  const ageDays = snapshot ? (Date.now() - Date.parse(snapshot.captured_at)) / DAY : null;
  const lastSyncLabel = snapshot ? relTime(snapshot.captured_at) : null;

  let status: SourceStatus = 'Not Connected';
  if (snapshot && ageDays !== null) {
    if (snapshot.fetch_error) {
      status = 'Limited';
    } else if (ageDays <= 7) {
      status = 'Connected';
    } else if (ageDays <= 30) {
      status = 'Partial';
    } else {
      status = 'Limited';
    }
  } else if (mapping?.place_id || mapping?.manual_only) {
    status = 'Partial';
  }

  if (mapping && mapping.consecutive_fetch_failures >= 3) {
    status = 'Limited';
  }

  return { mapping, snapshot, status, lastSyncLabel, ageDays };
}

export function useGbpStatus(venueId: string | null | undefined) {
  return useQuery({
    queryKey: gbpStatusKey(venueId),
    enabled: !!venueId,
    queryFn: async (): Promise<GbpStatus> => {
      const [mapRes, snapRes] = await Promise.all([
        supabase
          .from('gbp_place_mappings')
          .select('venue_id, place_id, manual_only, consecutive_fetch_failures, last_resolved_at, last_resolve_error')
          .eq('venue_id', venueId!)
          .maybeSingle(),
        supabase
          .from('gbp_snapshots')
          .select('id, captured_at, source, scope, fetch_error, primary_category, description, hours_complete, photo_count, last_photo_at, post_count, last_post_at, qa_unanswered, review_response_rate_30d, nap_match_name, nap_match_address, nap_match_phone')
          .eq('venue_id', venueId!)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (mapRes.error) throw mapRes.error;
      if (snapRes.error) throw snapRes.error;
      return deriveGbpStatus(
        (mapRes.data as GbpMapping | null) ?? null,
        (snapRes.data as GbpSnapshot | null) ?? null,
      );
    },
    staleTime: 60_000,
  });
}
