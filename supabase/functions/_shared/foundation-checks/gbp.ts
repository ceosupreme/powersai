import type { FoundationCheck } from './types.ts';

async function latestGbp(supabase: any, venueId: string) {
  const { data } = await supabase
    .from('gbp_snapshots')
    .select('captured_at,hours_complete,photo_count,nap_match_name,nap_match_address,nap_match_phone,verified')
    .eq('venue_id', venueId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export const gbpMappedCheck: FoundationCheck = {
  id: 'gbp.mapped',
  itemKey: 'gbp_mapped',
  async run(supabase, venueId) {
    const { data } = await supabase
      .from('gbp_place_mappings')
      .select('place_id')
      .eq('venue_id', venueId)
      .maybeSingle();
    return { status: data?.place_id ? 'satisfied' : 'missing' };
  },
};

export const gbpHoursCheck: FoundationCheck = {
  id: 'gbp.hours',
  itemKey: 'gbp_hours_complete',
  async run(supabase, venueId) {
    const s = await latestGbp(supabase, venueId);
    if (!s) return null;
    return { status: s.hours_complete ? 'satisfied' : 'missing' };
  },
};

export const gbpPhotosCheck: FoundationCheck = {
  id: 'gbp.photos',
  itemKey: 'gbp_photos',
  async run(supabase, venueId) {
    const s = await latestGbp(supabase, venueId);
    if (!s) return null;
    const c = s.photo_count ?? 0;
    return { status: c >= 10 ? 'satisfied' : c > 0 ? 'partial' : 'missing' };
  },
};

export const gbpNapCheck: FoundationCheck = {
  id: 'gbp.nap',
  itemKey: 'nap_consistent',
  async run(supabase, venueId) {
    const s = await latestGbp(supabase, venueId);
    if (!s) return null;
    const checks = [s.nap_match_name, s.nap_match_address, s.nap_match_phone];
    const failed = checks.filter((v: any) => v === false).length;
    if (failed === 0) return { status: 'satisfied' };
    if (failed === checks.length) return { status: 'missing' };
    return { status: 'partial' };
  },
};