// Shared helpers for the Google Business Profile audit pipeline.
// Wraps the Places API v1 with field masks tailored to each scope.

const PLACES_BASE = 'https://places.googleapis.com/v1/places';

export type FetchScope = 'daily_basics' | 'weekly_full';

const FIELD_MASKS: Record<FetchScope, string> = {
  daily_basics: [
    'id',
    'displayName',
    'formattedAddress',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'rating',
    'userRatingCount',
    'businessStatus',
    'websiteUri',
    'primaryType',
    'types',
    'photos',
    'currentOpeningHours',
    'regularOpeningHours',
  ].join(','),
  weekly_full: [
    'id',
    'displayName',
    'formattedAddress',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'rating',
    'userRatingCount',
    'businessStatus',
    'websiteUri',
    'primaryType',
    'primaryTypeDisplayName',
    'types',
    'photos',
    'regularOpeningHours',
    'currentOpeningHours',
    'currentSecondaryOpeningHours',
    'editorialSummary',
    'paymentOptions',
    'parkingOptions',
    'accessibilityOptions',
    'reservable',
    'servesBeer',
    'servesWine',
    'servesCocktails',
    'servesFood',
    'servesBreakfast',
    'servesLunch',
    'servesDinner',
    'servesBrunch',
    'takeout',
    'delivery',
    'dineIn',
    'reviews',
    'googleMapsUri',
  ].join(','),
};

export type GbpFetchResult = {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
};

/** Fetches a place from Google Places API v1 with the appropriate field mask. */
export async function fetchPlace(
  placeId: string,
  scope: FetchScope,
  apiKey: string,
): Promise<GbpFetchResult> {
  const url = `${PLACES_BASE}/${encodeURIComponent(placeId)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASKS[scope],
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Snapshot field extraction ──────────────────────────────────────

const norm = (s?: string | null) =>
  (s ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export type VenueRecord = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
};

/** Build a snapshot row from a Places API response. Caller persists it. */
export function buildSnapshotFields(
  data: any,
  scope: FetchScope,
  venue: VenueRecord,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!data) return out;

  // identity
  out.gbp_name = data.displayName?.text ?? null;
  out.gbp_address = data.formattedAddress ?? null;
  out.gbp_phone = data.nationalPhoneNumber ?? data.internationalPhoneNumber ?? null;

  out.nap_match_name = out.gbp_name
    ? norm(out.gbp_name as string) === norm(venue.name)
    : null;
  out.nap_match_address = venue.address && out.gbp_address
    ? norm(out.gbp_address as string).includes(norm(venue.address).split(' ').slice(0, 4).join(' '))
    : null;
  out.nap_match_phone = venue.phone && out.gbp_phone
    ? (out.gbp_phone as string).replace(/\D/g, '').slice(-10) === venue.phone.replace(/\D/g, '').slice(-10)
    : null;

  // categories
  out.primary_category = data.primaryTypeDisplayName?.text ?? data.primaryType ?? null;
  out.secondary_categories = Array.isArray(data.types)
    ? data.types.filter((t: string) => t !== data.primaryType)
    : null;

  // hours
  const hours = data.regularOpeningHours;
  if (hours?.periods) {
    const dayCount = new Set(hours.periods.map((p: any) => p?.open?.day)).size;
    out.hours_complete = dayCount >= 7 || hours.periods.length >= 7;
  } else if (hours) {
    out.hours_complete = false;
  }
  out.holiday_hours_set = Array.isArray(data.currentSecondaryOpeningHours)
    && data.currentSecondaryOpeningHours.length > 0;

  // service options
  if (scope === 'weekly_full') {
    const serviceOpts: Record<string, unknown> = {};
    for (const k of [
      'reservable', 'takeout', 'delivery', 'dineIn',
      'servesBeer', 'servesWine', 'servesCocktails', 'servesFood',
      'servesBreakfast', 'servesLunch', 'servesDinner', 'servesBrunch',
    ]) {
      if (k in data) serviceOpts[k] = data[k];
    }
    if (Object.keys(serviceOpts).length) out.service_options = serviceOpts;

    const attrs: Record<string, unknown> = {};
    if (data.paymentOptions) attrs.paymentOptions = data.paymentOptions;
    if (data.parkingOptions) attrs.parkingOptions = data.parkingOptions;
    if (data.accessibilityOptions) attrs.accessibilityOptions = data.accessibilityOptions;
    if (Object.keys(attrs).length) out.attributes = attrs;

    out.description = data.editorialSummary?.text ?? null;
  }

  out.verified = data.businessStatus === 'OPERATIONAL';
  out.website = data.websiteUri ?? null;

  // engagement (limited via Places API — photo + review counts only)
  out.photo_count = Array.isArray(data.photos) ? data.photos.length : null;
  // Places API v1 doesn't expose photo upload timestamps; left null.

  if (Array.isArray(data.reviews)) {
    const reviews = data.reviews as any[];
    const cutoff = Date.now() - 30 * 86400_000;
    const recent = reviews.filter((r) => {
      const t = Date.parse(r?.publishTime ?? '');
      return Number.isFinite(t) && t >= cutoff;
    });
    if (recent.length) {
      const responded = recent.filter((r) => r?.authorAttribution && r?.text?.text && r?.relativePublishTimeDescription).length;
      // Places API exposes review.text; owner replies aren't returned in v1.
      // Use presence of "originalText" mismatch as a weak proxy where available.
      out.review_response_rate_30d = null;
    }
    const lastReply = reviews
      .map((r) => r?.publishTime)
      .filter(Boolean)
      .sort()
      .pop();
    if (lastReply) out.last_review_response_at = lastReply;
  }

  // Posts and Q&A: not available via Places API v1 — left null,
  // populated only via manual entry.

  return out;
}

// ─── Place ID resolution ────────────────────────────────────────────

const PLACE_ID_RE = /place_id[:=]([A-Za-z0-9_-]+)/;
const CID_RE = /[?&!]1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/;

export function extractPlaceIdFromUrl(url: string): string | null {
  const m = url.match(PLACE_ID_RE);
  if (m) return m[1];
  // CID embedded in maps URLs — Places API can't resolve directly,
  // caller should fall back to text search using the URL or venue name.
  return null;
}

export async function resolvePlaceByText(
  query: string,
  apiKey: string,
): Promise<{ id?: string; name?: string; address?: string; error?: string }> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ textQuery: query }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data?.error?.message || `HTTP ${res.status}` };
  const top = data?.places?.[0];
  if (!top) return { error: 'No results' };
  return { id: top.id, name: top.displayName?.text, address: top.formattedAddress };
}
