// News adapter — NewsData.io free tier, geo-filtered by venue city.
// Filters to relevance keywords appropriate for hospitality marketing.

// deno-lint-ignore-file no-explicit-any
import type { ContextSourceAdapter, AdapterPullResult, VenueRow, NormalizedContextItem } from './types.ts';
import { isoToday } from './types.ts';

const RELEVANCE_KEYWORDS = [
  // Economic
  'shutdown', 'layoff', 'paycheck', 'unemployment', 'military pay',
  // Local events
  'convention', 'festival', 'parade', 'championship', 'concert',
  // Public health
  'closure', 'evacuation', 'wildfire', 'storm warning', 'flood warning',
  // Civic
  'street closure', 'road closed', 'transit', 'protest',
  // Entertainment
  'tour announce', 'film premiere', 'opening night',
];

const CATEGORY_TAGS: Record<string, string> = {
  shutdown: 'economic',
  layoff: 'economic',
  paycheck: 'economic',
  unemployment: 'economic',
  'military pay': 'economic',
  convention: 'event',
  festival: 'event',
  parade: 'event',
  championship: 'event',
  concert: 'event',
  closure: 'civic',
  evacuation: 'civic',
  wildfire: 'civic',
  'storm warning': 'civic',
  'flood warning': 'civic',
  'street closure': 'civic',
  'road closed': 'civic',
  transit: 'civic',
  protest: 'civic',
  'tour announce': 'entertainment',
  'film premiere': 'entertainment',
  'opening night': 'entertainment',
};

export const newsAdapter: ContextSourceAdapter = {
  id: 'news',
  async pull(supabase, venue): Promise<AdapterPullResult> {
    const errors: string[] = [];
    const apiKey = Deno.env.get('NEWSDATA_API_KEY');
    if (!apiKey) {
      errors.push('news: NEWSDATA_API_KEY missing');
      return { items: [], errors };
    }
    if (!venue.city) {
      errors.push('news: venue city missing');
      return { items: [], errors };
    }

    try {
      // Single broad query per venue — keep within free-tier 200/day budget
      const q = encodeURIComponent(`"${venue.city}"`);
      const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${q}&country=us&language=en&size=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`NewsData ${res.status}`);
      const json = await res.json();
      const results: any[] = json?.results ?? [];

      const items: NormalizedContextItem[] = [];
      const today = isoToday();

      for (const r of results) {
        const text = `${r.title ?? ''} ${r.description ?? ''}`.toLowerCase();
        const hits = RELEVANCE_KEYWORDS.filter((kw) => text.includes(kw));
        if (hits.length === 0) continue;
        const tags = Array.from(new Set(hits.map((h) => CATEGORY_TAGS[h] ?? 'general')));
        const eventDate = (r.pubDate as string | undefined)?.slice(0, 10) ?? today;

        items.push({
          source_type: 'news',
          source_ref: `newsdata:${r.article_id ?? r.link ?? r.title}`,
          event_date: eventDate,
          valid_until: today,
          payload: {
            title: r.title ?? '',
            summary: r.description ?? '',
            link: r.link ?? null,
            source: r.source_id ?? null,
            keywords_matched: hits,
            tags,
            country: r.country ?? null,
          },
        });
      }

      return { items, errors };
    } catch (e) {
      errors.push(`news: ${e instanceof Error ? e.message : String(e)}`);
      return { items: [], errors };
    }
  },
};
