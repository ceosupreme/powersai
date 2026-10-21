import type { FoundationCheck } from './types.ts';

/** Social links found on the business's own homepage by the website check
 *  (null: the homepage wasn't read). */
async function homepageSocial(supabase: any, venueId: string, needle: string): Promise<{ found: boolean; url?: string } | null> {
  const { data } = await supabase
    .from('website_snapshots')
    .select('raw, captured_at')
    .eq('venue_id', venueId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const links = (data as any)?.raw?.social_links;
  if (!Array.isArray(links)) return null;
  const hit = links.find((l: any) => String(l?.label ?? '').toLowerCase() === needle || String(l?.url ?? '').toLowerCase().includes(`${needle}.com`));
  return hit ? { found: true, url: hit.url } : { found: false };
}

async function isProspectShell(supabase: any, venueId: string): Promise<boolean> {
  const { data } = await supabase.from('venues').select('is_prospect_shell').eq('id', venueId).maybeSingle();
  return (data as any)?.is_prospect_shell === true;
}

/** Brand-kit link first; then the business's own homepage. For a prospect
 *  (no brand kit) whose homepage wasn't read, the answer is unknown (null). */
async function socialStatus(supabase: any, venueId: string, needle: string) {
  const r = await linkExists(supabase, venueId, needle);
  if (r.found) return { status: 'satisfied' as const, evidence_url: r.url ?? null };
  const h = await homepageSocial(supabase, venueId, needle);
  if (h?.found) return { status: 'satisfied' as const, evidence_url: h.url ?? null };
  if (h == null && await isProspectShell(supabase, venueId)) return null;
  return { status: 'missing' as const, evidence_url: null };
}

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
    return socialStatus(supabase, venueId, 'instagram');
  },
};

export const socialFacebookCheck: FoundationCheck = {
  id: 'social.facebook',
  itemKey: 'facebook_linked',
  async run(supabase, venueId) {
    return socialStatus(supabase, venueId, 'facebook');
  },
};

export const socialRecentCheck: FoundationCheck = {
  id: 'social.recent',
  itemKey: 'recent_post_30d',
  async run(supabase, venueId) {
    // A prospect's posts aren't tracked here, so for them this can't be known.
    if (await isProspectShell(supabase, venueId)) return null;
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const { count } = await supabase
      .from('social_media_posts')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .gte('post_date', cutoff);
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};