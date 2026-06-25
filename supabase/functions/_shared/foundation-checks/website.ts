import type { FoundationCheck } from './types.ts';

async function latestSnapshot(supabase: any, venueId: string) {
  const { data } = await supabase
    .from('website_snapshots')
    .select('captured_at,https_enabled,mobile_friendly,has_contact_form,has_contact_page,fetch_error')
    .eq('venue_id', venueId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export const websiteLiveCheck: FoundationCheck = {
  id: 'website.live',
  itemKey: 'website_live',
  async run(supabase, venueId) {
    const { data: map } = await supabase
      .from('website_mappings')
      .select('website_url,last_resolve_error')
      .eq('venue_id', venueId)
      .maybeSingle();
    if (!map?.website_url) return { status: 'missing' };
    const snap = await latestSnapshot(supabase, venueId);
    if (!snap) return { status: 'partial', evidence_url: map.website_url, notes: 'URL mapped, awaiting first crawl' };
    return {
      status: snap.fetch_error ? 'partial' : 'satisfied',
      evidence_url: map.website_url,
    };
  },
};

export const websiteHttpsCheck: FoundationCheck = {
  id: 'website.https',
  itemKey: 'https_enabled',
  async run(supabase, venueId) {
    const snap = await latestSnapshot(supabase, venueId);
    if (!snap) return null;
    return { status: snap.https_enabled ? 'satisfied' : 'missing' };
  },
};

export const websiteMobileCheck: FoundationCheck = {
  id: 'website.mobile',
  itemKey: 'mobile_friendly',
  async run(supabase, venueId) {
    const snap = await latestSnapshot(supabase, venueId);
    if (!snap) return null;
    return { status: snap.mobile_friendly ? 'satisfied' : 'missing' };
  },
};

export const websiteContactCheck: FoundationCheck = {
  id: 'website.contact',
  itemKey: 'contact_form',
  async run(supabase, venueId) {
    const snap = await latestSnapshot(supabase, venueId);
    if (!snap) return null;
    const has = snap.has_contact_form || snap.has_contact_page;
    return { status: has ? 'satisfied' : 'missing' };
  },
};