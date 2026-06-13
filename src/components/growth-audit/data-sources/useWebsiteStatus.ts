// Live status for the Website Crawler data source.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SourceStatus } from './mockDataSources';

export type WebsiteMapping = {
  venue_id: string;
  website_url: string | null;
  canonical_url: string | null;
  cms_detected: string | null;
  js_heavy: boolean;
  manual_only: boolean;
  consecutive_fetch_failures: number;
  last_resolved_at: string | null;
  last_resolve_error: string | null;
};

export type WebsiteSnapshot = {
  id: string;
  captured_at: string;
  source: string;
  scope: string;
  fetch_error: string | null;
  https_enabled: boolean | null;
  mobile_friendly: boolean | null;
  discovered_page_count: number | null;
  perf_score: number | null;
  inp_ms: number | null;
  lcp_ms: number | null;
  cls: number | null;
  has_menu_page: boolean | null;
  menu_is_pdf_only: boolean | null;
  has_happy_hour_page: boolean | null;
  has_events_page: boolean | null;
  has_private_party_page: boolean | null;
  private_party_has_form: boolean | null;
  private_party_linked_from_home: boolean | null;
  has_contact_page: boolean | null;
  has_contact_form: boolean | null;
  has_about_page: boolean | null;
  has_reservations_page: boolean | null;
  has_email_signup: boolean | null;
  has_social_links: boolean | null;
  has_localbusiness_schema: boolean | null;
  pages_audited: number | null;
  pages_with_title: number | null;
  pages_with_meta_desc: number | null;
  pages_with_h1: number | null;
  image_alt_coverage_pct: number | null;
  schema_types_detected: string[] | null;
};

export type WebsiteStatus = {
  mapping: WebsiteMapping | null;
  weekly: WebsiteSnapshot | null;
  pagespeed: WebsiteSnapshot | null;
  status: SourceStatus;
  lastSyncLabel: string | null;
  weeklyAgeDays: number | null;
};

export const websiteStatusKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'website-status', venueId ?? 'none'] as const;

const DAY = 86_400_000;

function relTime(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function deriveWebsiteStatus(
  mapping: WebsiteMapping | null,
  weekly: WebsiteSnapshot | null,
  pagespeed: WebsiteSnapshot | null,
): WebsiteStatus {
  const newest = [weekly, pagespeed].filter(Boolean).sort(
    (a, b) => Date.parse(b!.captured_at) - Date.parse(a!.captured_at),
  )[0] ?? null;
  const weeklyAgeDays = weekly ? (Date.now() - Date.parse(weekly.captured_at)) / DAY : null;
  const lastSyncLabel = newest ? relTime(newest.captured_at) : null;

  let status: SourceStatus = 'Not Connected';
  if (weekly && weeklyAgeDays !== null) {
    if (weekly.fetch_error) status = 'Limited';
    else if (weeklyAgeDays <= 14) status = 'Connected';
    else if (weeklyAgeDays <= 60) status = 'Partial';
    else status = 'Limited';
  } else if (mapping?.canonical_url || mapping?.website_url || mapping?.manual_only) {
    status = 'Partial';
  }
  if (mapping && mapping.consecutive_fetch_failures >= 3) status = 'Limited';

  return { mapping, weekly, pagespeed, status, lastSyncLabel, weeklyAgeDays };
}

export function useWebsiteStatus(venueId: string | null | undefined) {
  return useQuery({
    queryKey: websiteStatusKey(venueId),
    enabled: !!venueId,
    queryFn: async (): Promise<WebsiteStatus> => {
      const cols = 'id, captured_at, source, scope, fetch_error, https_enabled, mobile_friendly, discovered_page_count, perf_score, inp_ms, lcp_ms, cls, has_menu_page, menu_is_pdf_only, has_happy_hour_page, has_events_page, has_private_party_page, private_party_has_form, private_party_linked_from_home, has_contact_page, has_contact_form, has_about_page, has_reservations_page, has_email_signup, has_social_links, has_localbusiness_schema, pages_audited, pages_with_title, pages_with_meta_desc, pages_with_h1, image_alt_coverage_pct, schema_types_detected';
      const [mapRes, weekRes, psiRes] = await Promise.all([
        supabase.from('website_mappings')
          .select('venue_id, website_url, canonical_url, cms_detected, js_heavy, manual_only, consecutive_fetch_failures, last_resolved_at, last_resolve_error')
          .eq('venue_id', venueId!).maybeSingle(),
        supabase.from('website_snapshots').select(cols)
          .eq('venue_id', venueId!).eq('scope', 'weekly_full')
          .order('captured_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('website_snapshots').select(cols)
          .eq('venue_id', venueId!).eq('scope', 'daily_pagespeed')
          .order('captured_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (mapRes.error) throw mapRes.error;
      if (weekRes.error) throw weekRes.error;
      if (psiRes.error) throw psiRes.error;
      return deriveWebsiteStatus(
        (mapRes.data as WebsiteMapping | null) ?? null,
        (weekRes.data as WebsiteSnapshot | null) ?? null,
        (psiRes.data as WebsiteSnapshot | null) ?? null,
      );
    },
    staleTime: 60_000,
  });
}
