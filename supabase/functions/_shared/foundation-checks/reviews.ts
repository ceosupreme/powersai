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

export const reviewsHasCheck: FoundationCheck = {
  id: 'reviews.has',
  itemKey: 'has_reviews',
  async run(supabase, venueId) {
    const snap = await latestRepSnap(supabase, venueId);
    if (snap) {
      const total = (snap.google_review_count ?? 0) + (snap.yelp_review_count ?? 0);
      return { status: total > 0 ? 'satisfied' : 'missing' };
    }
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
    const snap = await latestRepSnap(supabase, venueId);
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
    const snap = await latestRepSnap(supabase, venueId);
    if (!snap) return null;
    const total = (snap.google_review_count ?? 0) + (snap.yelp_review_count ?? 0);
    return {
      status: total >= 25 ? 'satisfied' : total >= 10 ? 'partial' : 'missing',
    };
  },
};