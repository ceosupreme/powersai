import type { FoundationCheck } from './types.ts';

async function latestRepSnap(supabase: any, venueId: string) {
  const { data: venue } = await supabase.from('venues').select('bar_code').eq('id', venueId).maybeSingle();
  if (!venue?.bar_code) return null;
  const { data } = await supabase
    .from('review_snapshots')
    .select('snapshot_date,google_rating,google_review_count,yelp_rating,yelp_review_count')
    .eq('bar_id', venue.bar_code)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Rating and review count from the latest Google listing snapshot. Used
 *  when no review snapshot exists (prospect shells never get one), so a
 *  business with thousands of Google reviews isn't marked as having none. */
async function latestGbpReviews(supabase: any, venueId: string): Promise<{ rating: number | null; count: number | null } | null> {
  const { data } = await supabase
    .from('gbp_snapshots')
    .select('raw, captured_at')
    .eq('venue_id', venueId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const raw = (data as any)?.raw ?? null;
  if (!raw) return null;
  const rating = typeof raw.rating === 'number' ? raw.rating : null;
  const count = typeof raw.userRatingCount === 'number' ? raw.userRatingCount : (rating != null ? 0 : null);
  return rating == null && count == null ? null : { rating, count };
}

export const reviewsHasCheck: FoundationCheck = {
  id: 'reviews.has',
  itemKey: 'has_reviews',
  async run(supabase, venueId) {
    const snap = await latestRepSnap(supabase, venueId);
    if (snap) {
      const total = (snap.google_review_count ?? 0) + (snap.yelp_review_count ?? 0);
      return { status: total > 0 ? 'satisfied' : 'missing' };
    }
    const g = await latestGbpReviews(supabase, venueId);
    if (g?.count != null && g.count > 0) return { status: 'satisfied' };
    const { count } = await supabase
      .from('online_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId);
    if ((count ?? 0) > 0) return { status: 'satisfied' };
    return { status: 'missing' };
  },
};

export const reviewsRatingCheck: FoundationCheck = {
  id: 'reviews.rating',
  itemKey: 'rating_4_plus',
  async run(supabase, venueId) {
    const snap = (await latestRepSnap(supabase, venueId))
      ?? await (async () => { const g = await latestGbpReviews(supabase, venueId); return g ? { google_rating: g.rating, yelp_rating: null } : null; })();
    if (!snap) return null;
    const ratings = [snap.google_rating, snap.yelp_rating].filter(
      (r: any) => typeof r === 'number' && r > 0,
    ) as number[];
    if (ratings.length === 0) return null;
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    if (avg >= 4.0) return { status: 'satisfied' };
    if (avg >= 3.5) return { status: 'partial' };
    return { status: 'missing' };
  },
};

export const reviewsVolumeCheck: FoundationCheck = {
  id: 'reviews.volume',
  itemKey: 'review_volume_25',
  async run(supabase, venueId) {
    const snap = (await latestRepSnap(supabase, venueId))
      ?? await (async () => { const g = await latestGbpReviews(supabase, venueId); return g && g.count != null ? { google_review_count: g.count, yelp_review_count: 0 } : null; })();
    if (!snap) return null;
    const total = (snap.google_review_count ?? 0) + (snap.yelp_review_count ?? 0);
    return {
      status: total >= 25 ? 'satisfied' : total >= 10 ? 'partial' : 'missing',
    };
  },
};