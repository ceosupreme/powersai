// name-match — does the Google listing we found belong to the business the
// visitor typed? Google's text search always returns its closest place, even
// for a misspelled or unlisted name, so the public checkup checks the name
// before reporting on a listing (otherwise it reports on someone else).
//
// Rules, in order:
//   1. The names match when squeezed together ("A-1 Plumbing" / "A1 Plumbing"),
//      or one squeezed name contains the other.
//   2. Otherwise, when the typed name has a distinctive word (not a
//      business-type word like "pizza" or "plumbing"), one must match and more
//      than half the words of either name must be found in the other.
//   3. A typed name made only of business-type words needs more than half the
//      words of both names to match.
// Words match when equal, when one starts with the other (4+ letters), or
// when they differ by one letter (5+ letters, for typos). The city's words are
// ignored, so "Kettner Exchange San Diego" still matches "Kettner Exchange".

const STOP = new Set([
  'the', 'and', 'of', 'a', 'an', 'at', 'in', 'on', 'by', 'for', 'to',
  'inc', 'llc', 'co', 'corp', 'corporation', 'company', 'ltd', 'pllc', 'pc', 'dba',
]);

// Business-type words. They count toward the share of matching words, but a
// match on these alone ("Tony's Pizza" for "Joe's Pizza") isn't a match.
const GENERIC = new Set([
  'restaurant', 'restaurants', 'bar', 'bars', 'grill', 'kitchen', 'cafe', 'coffee', 'pizza', 'pizzeria',
  'bakery', 'bakehouse', 'taco', 'tacos', 'taqueria', 'food', 'foods', 'eatery', 'bistro', 'brewery',
  'brewing', 'pub', 'tavern', 'lounge', 'sushi', 'bbq', 'burger', 'burgers', 'wings', 'deli', 'diner',
  'cantina', 'steakhouse', 'mexican', 'italian', 'chinese', 'thai', 'indian', 'american', 'japanese',
  'plumbing', 'plumber', 'plumbers', 'electric', 'electrical', 'electrician', 'hvac', 'heating',
  'cooling', 'air', 'conditioning', 'roofing', 'roofer', 'auto', 'automotive', 'repair', 'repairs',
  'shop', 'service', 'services', 'solutions', 'group', 'center', 'studio', 'salon', 'spa', 'dental',
  'dentist', 'law', 'firm', 'cleaning', 'cleaners', 'carpet', 'moving', 'movers', 'landscaping',
  'construction', 'contractor', 'contractors', 'home', 'homes', 'pest', 'control', 'garage', 'door',
  'doors', 'tire', 'tires', 'body', 'care', 'health', 'fitness', 'gym', 'market', 'store',
  'pros', 'pro', 'experts', 'team', 'local', 'best',
]);

function words(s: string, drop: Set<string>): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 0 && !STOP.has(w) && !drop.has(w));
}

function squeeze(s: string): string {
  return words(s, new Set()).join('');
}

function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    edits++;
    if (edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const short = Math.min(a.length, b.length);
  if (short >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return short >= 5 && oneEditApart(a, b);
}

export type NameMatch = { match: boolean; reason: string };

/** typed: what the visitor entered. found: the Google listing's name.
 *  city: what they typed as the city. */
export function namesMatch(typed: string, found: string | null | undefined, city = ''): NameMatch {
  if (!found || !found.trim()) return { match: false, reason: 'no listing name' };
  const st = squeeze(typed);
  const sg = squeeze(found);
  if (st.length >= 4 && sg.length >= 4 && (st === sg || sg.includes(st) || st.includes(sg))) {
    return { match: true, reason: 'same name' };
  }
  const cityWords = new Set(words(city, new Set()));
  const t = words(typed, cityWords);
  const g = words(found, cityWords);
  if (t.length === 0 || g.length === 0) return { match: false, reason: 'no words to compare' };
  const hit = (w: string, pool: string[]) => pool.some((p) => wordsMatch(w, p));
  const typedShare = t.filter((w) => hit(w, g)).length / t.length;
  const foundShare = g.filter((w) => hit(w, t)).length / g.length;
  const distinctive = t.filter((w) => !GENERIC.has(w));
  const shares = `typed ${Math.round(typedShare * 100)}%, found ${Math.round(foundShare * 100)}%`;
  if (distinctive.length > 0) {
    const distinctiveHits = distinctive.filter((w) => hit(w, g)).length;
    return {
      match: distinctiveHits >= 1 && (typedShare > 0.5 || foundShare > 0.5),
      reason: `distinctive words matched ${distinctiveHits} of ${distinctive.length}, ${shares}`,
    };
  }
  return { match: typedShare > 0.5 && foundShare > 0.5, reason: `business-type words only, ${shares}` };
}

// ── State check ─────────────────────────────────────────────────────────────
// Google's text search can return a place in another state with the same name
// ("Joe's Pizza, Carlsbad CA" came back as a Carlsbad, New Mexico listing).
// When the visitor typed a US state and the listing is in a different one,
// it isn't their business.

const US_STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
const STATE_CODES = new Set(Object.values(US_STATES));

/** The US state in what the visitor typed as the city ("San Diego, CA",
 *  "San Diego, California", "san diego ca"), or null. */
export function typedState(city: string): string | null {
  const clean = city.replace(/\./g, '').trim();
  const parts = clean.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].replace(/\s*\d{5}(-\d{4})?$/, '').trim();
    if (/^[A-Za-z]{2}$/.test(last) && STATE_CODES.has(last.toUpperCase())) return last.toUpperCase();
    return US_STATES[last.toLowerCase()] ?? null;
  }
  const m = clean.match(/\S\s+([A-Za-z]{2})$/);
  return m && STATE_CODES.has(m[1].toUpperCase()) ? m[1].toUpperCase() : null;
}

/** The state in a Google US address ("2001 Kettner Blvd, San Diego, CA 92101, USA"), or null. */
export function addressState(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.split(',').map((s) => s.trim());
  const country = (parts[parts.length - 1] ?? '').toUpperCase();
  if (country !== 'USA' && country !== 'UNITED STATES') return null;
  const m = (parts[parts.length - 2] ?? '').match(/^([A-Z]{2})\b/);
  return m && STATE_CODES.has(m[1]) ? m[1] : null;
}

/** True when the visitor typed a US state and the listing is in another one. */
export function statesConflict(city: string, address: string | null | undefined): boolean {
  const a = typedState(city);
  const b = addressState(address);
  return !!a && !!b && a !== b;
}
