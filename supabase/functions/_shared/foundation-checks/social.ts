import type { FoundationCheck } from './types.ts';

async function linkExists(supabase: any, venueId: string, needle: string): Promise<{ found: boolean; url?: string }> {
  const { data: kits } = await supabase.from('brand_kits').select('id').eq('project_id', venueId).eq('archived', false);
  const kitIds = (kits ?? []).map((k: any) => k.id);
  if (kitIds.length === 0) return { found: false };
  const { data } = await supabase
    .from('brand_kit_links')
    .select('url,category,label')
    .in('kit_id', kitIds);
  const match = (data ?? []).find((l: any) =>
    (l.url || '').toLowerCase().includes(needle) ||
    (l.label || '').toLowerCase().includes(needle) ||
    (l.category || '').toLowerCase().includes(needle),
  );
  return match ? { found: true, url: match.url } : { found: false };
}

export const socialInstagramCheck: FoundationCheck = {
  id: 'social.instagram',
  itemKey: 'instagram_linked',
  async run(supabase, venueId) {
    const r = await linkExists(supabase, venueId, 'instagram');
    return { status: r.found ? 'satisfied' : 'missing', evidence_url: r.url ?? null };
  },
};

export const socialFacebookCheck: FoundationCheck = {
  id: 'social.facebook',
  itemKey: 'facebook_linked',
  async run(supabase, venueId) {
    const r = await linkExists(supabase, venueId, 'facebook');
    return { status: r.found ? 'satisfied' : 'missing', evidence_url: r.url ?? null };
  },
};

export const socialRecentCheck: FoundationCheck = {
  id: 'social.recent',
  itemKey: 'recent_post_30d',
  async run(supabase, venueId) {
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const { count } = await supabase
      .from('social_media_posts')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .gte('post_date', cutoff);
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};