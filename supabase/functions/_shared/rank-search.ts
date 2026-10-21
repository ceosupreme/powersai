// rank-search — where a business shows up in Google's results for a search,
// asked from around the business's own location (the way someone nearby
// searches). Only place IDs are requested, which Google doesn't charge for
// ("Text Search Essentials (IDs Only)"), so extra searches cost nothing.

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const MAX_RESULTS = 20;
const RADIUS_M = 5000;

export type SearchRank = {
  keyword: string;
  /** 1-based position, or null when it isn't in the first 20 results. */
  you_rank: number | null;
  /** The search failed (the rank is unknown, not "not in the top 20"). */
  error?: string;
};

export async function rankFor(
  apiKey: string,
  keyword: string,
  placeId: string,
  lat: number | null,
  lng: number | null,
  timeoutMs = 10_000,
): Promise<SearchRank> {
  const body: Record<string, unknown> = { textQuery: keyword, maxResultCount: MAX_RESULTS };
  if (typeof lat === 'number' && typeof lng === 'number') {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS_M } };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(TEXT_SEARCH_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'places.id' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { keyword, you_rank: null, error: `HTTP ${res.status}` };
    const data = await res.json();
    const ids: string[] = Array.isArray(data?.places) ? data.places.map((p: { id?: string }) => String(p?.id ?? '')) : [];
    const idx = ids.indexOf(placeId);
    return { keyword, you_rank: idx >= 0 ? idx + 1 : null };
  } catch (e) {
    return { keyword, you_rank: null, error: ctrl.signal.aborted ? 'timed out' : String(e).slice(0, 120) };
  } finally {
    clearTimeout(timer);
  }
}
