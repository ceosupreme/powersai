// website-quick-check — the public checkup's look at a business's website.
//
// One request for the homepage, asked for the way a phone browser asks, plus
// Google's phone speed test (PageSpeed Insights) when it answers in time.
// Server-side HTML only, no JavaScript rendering, so anything that can't be
// read honestly comes back null ("couldn't tell"), never false.
//
// Used by run-public-audit. Only web-standard APIs (fetch, URL,
// AbortController), so it also runs under Node for local tests.

export type WebsiteStatus = 'checked' | 'none' | 'social' | 'unreachable' | 'blocked';

export type WebsiteBlock = {
  status: WebsiteStatus;
  /** What was checked, for display: host and path, no protocol or www. */
  url: string | null;
  /** Where the address came from. */
  source: 'typed' | 'google' | null;
  /** Their Google listing links a website (null when the listing couldn't be read). */
  listing_has_site: boolean | null;
  /** Status 'social': what the address points to instead, e.g. "Facebook page". */
  social_label: string | null;
  opens: boolean | null;
  secure: boolean | null;
  phone_ready: boolean | null;
  contact: boolean | null;
  /** Plain reason when it didn't open, e.g. "it took too long to answer". */
  problem: string | null;
  /** Google's phone speed test: seconds until the main content shows. */
  phone_load_seconds: number | null;
  speed: 'fast' | 'ok' | 'slow' | null;
  speed_score: number | null;
  /** What the homepage links to or shows (null: couldn't read the page). */
  features: SiteFeatures | null;
  /** Ad and analytics tags, and how the site shows up in search results
   *  (null: couldn't read the page). */
  marketing: SiteMarketing | null;
};

/** Ad and analytics tags. A null means "couldn't tell": a tag manager or the
 *  site builder can load tags after the page opens, which the page's HTML
 *  doesn't show. Google's speed test loads the page in a real browser, so
 *  when it answers, its list of outside services is used instead. */
export type MarketingTags = {
  meta_pixel: boolean | null;
  google_analytics: boolean | null;
  /** Only the old Google Analytics (Universal Analytics, which Google stopped
   *  on July 1, 2023), with no current tag and no tag manager. */
  old_google_analytics_only: boolean;
  google_ads: boolean;
  tiktok_pixel: boolean;
  tag_manager: boolean;
  source: 'page' | 'browser';
};

/** How the homepage shows up in search results and when its link is shared. */
export type SearchAppearance = {
  /** The page title Google shows as the blue link. */
  title: string | null;
  /** The title names the city or neighborhood / the kind of business (set by run-public-audit). */
  title_says_where?: boolean | null;
  title_says_what?: boolean | null;
  /** A description (the gray text under the link) of a useful length. */
  description: boolean;
  /** A picture for when the link is shared in texts and on social media. */
  share_image: boolean;
  /** Business details coded for search engines (schema.org LocalBusiness, Restaurant…). */
  business_schema: boolean;
};

export type SiteMarketing = { tags: MarketingTags; search: SearchAppearance };

/** What the homepage links to or shows. Read from the homepage only: a
 *  false means "no link or sign of it on the homepage". */
export type SiteFeatures = {
  menu: boolean;
  menu_pdf_only: boolean;
  happy_hour: boolean;
  reservations: boolean;
  reservations_provider: string | null;
  private_events: boolean;
  events: boolean;
  online_ordering: boolean;
  /** Ordering on their own site or their own ordering system (Toast, ChowNow,
   *  Square, DoorDash's commission-free Online Ordering, a page on their site). */
  ordering_direct: boolean;
  /** Delivery apps the homepage sends orders to, e.g. ["DoorDash", "Uber Eats"]. */
  ordering_apps: string[];
  gift_cards: boolean;
  email_signup: boolean;
  /** A rewards or loyalty program. */
  loyalty: boolean;
  /** A text club (sign up for texts). */
  text_club: boolean;
  catering: boolean;
  brunch: boolean;
  /** Opening hours shown on the homepage. */
  hours: boolean;
  booking_or_quote: boolean;
  financing: boolean;
  service_areas: boolean;
  emergency: boolean;
  /** Social profiles it links to, e.g. ["Facebook", "Instagram"]. */
  social: string[];
};

/** Columns for the shell venue's website_snapshots row. */
export type WebsiteSnapshotFields = {
  http_status: number | null;
  response_ms: number | null;
  https_enabled: boolean | null;
  mobile_friendly: boolean | null;
  has_contact_form: boolean | null;
  has_contact_page: boolean | null;
  phone_prominent: boolean | null;
  email_prominent: boolean | null;
  perf_score: number | null;
  lcp_ms: number | null;
  cms_detected: string | null;
  fetch_error: string | null;
  has_menu_page?: boolean | null;
  menu_is_pdf_only?: boolean | null;
  has_happy_hour_page?: boolean | null;
  has_events_page?: boolean | null;
  has_private_party_page?: boolean | null;
  private_party_linked_from_home?: boolean | null;
  has_reservations_page?: boolean | null;
  has_email_signup?: boolean | null;
  has_social_links?: boolean | null;
  has_localbusiness_schema?: boolean | null;
  raw?: Record<string, unknown> | null;
};

const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PAGE_TIMEOUT_MS = 15_000;
// Short wait for the secure version of an http link; sites without https
// usually refuse quickly, so this rarely adds time.
const SECURE_PROBE_TIMEOUT_MS = 6_000;
// One extra page: where "order online" leads on their own site.
const ORDER_PAGE_TIMEOUT_MS = 6_000;
const MAX_HTML = 1_500_000;
const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const NOT_FOUND = "the web address doesn't lead anywhere";
const TOO_SLOW = 'it took too long to answer';

// ── Addresses ───────────────────────────────────────────────────────────────

/** A typed or listed address as a full https URL, or null if it isn't a web address. */
export function normalizeSiteInput(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s || /\s/.test(s)) return null;
  if (/^(mailto|tel|sms|javascript|data|ftp|file):/i.test(s)) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, '')}`;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

/** "https://www.joespizza.com/" → "joespizza.com" */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, '');
    const path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '';
    return (host + path).slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

// Addresses that are someone else's page, not a website of their own.
const SOCIAL_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/i, 'Facebook page'],
  [/(^|\.)instagram\.com$/i, 'Instagram page'],
  [/(^|\.)yelp\.com$/i, 'Yelp page'],
  [/(^|\.)linktr\.ee$/i, 'Linktree page'],
  [/(^|\.)tiktok\.com$/i, 'TikTok page'],
  [/(^|\.)(x|twitter)\.com$/i, 'X (Twitter) page'],
  [/(^|\.)linkedin\.com$/i, 'LinkedIn page'],
  [/(^|\.)nextdoor\.com$/i, 'Nextdoor page'],
  [/(^|\.)youtube\.com$/i, 'YouTube channel'],
  [/(^|\.)(thumbtack|angi|homeadvisor|houzz|porch|bark)\.com$/i, 'directory listing'],
];

export function socialLabel(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    for (const [rx, label] of SOCIAL_HOSTS) if (rx.test(host)) return label;
  } catch { /* not a URL */ }
  return null;
}

// ── The homepage ────────────────────────────────────────────────────────────

type PageFetch = {
  ok: boolean;
  status: number | null;
  finalUrl: string | null;
  html: string | null;
  ms: number | null;
  /** Plain reason when it didn't open. */
  problem: string | null;
  /** A security screen answered instead of the site, so we couldn't look inside. */
  blocked: boolean;
};

const CHALLENGE_RX = /cf-chl|challenge-platform|just a moment|attention required|captcha|are you a robot|access denied|incapsula|sucuri|ddos-guard|perimeterx|datadome/i;

async function fetchOnce(url: string, timeoutMs: number): Promise<PageFetch> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': PHONE_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const finalUrl = res.url || url;
    const type = res.headers.get('content-type') || '';
    let html = '';
    if (!type || /html|xml|text\/plain/i.test(type)) html = (await res.text()).slice(0, MAX_HTML);
    else await res.body?.cancel();
    const ms = Date.now() - started;
    if (res.ok) return { ok: true, status: res.status, finalUrl, html, ms, problem: null, blocked: false };
    const screened = [401, 403, 429].includes(res.status)
      || (res.status === 503 && (CHALLENGE_RX.test(html) || res.headers.has('cf-mitigated')));
    return {
      ok: false, status: res.status, finalUrl, html: null, ms,
      problem: screened ? null : `it shows an error page (error ${res.status})`,
      blocked: screened,
    };
  } catch (e) {
    const err = e as Error;
    const msg = String(err?.message ?? e);
    const cause = String((err as { cause?: { code?: string; message?: string } })?.cause?.code ?? (err as { cause?: { message?: string } })?.cause?.message ?? '');
    const aborted = err?.name === 'AbortError' || /abort/i.test(msg);
    const dns = /dns|lookup|getaddrinfo|ENOTFOUND|EAI_AGAIN|name or service|failed to resolve/i.test(`${msg} ${cause}`);
    return {
      ok: false, status: null, finalUrl: null, html: null, ms: null,
      problem: aborted ? TOO_SLOW : dns ? NOT_FOUND : "it didn't answer",
      blocked: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** The homepage, trying the www. and plain-http versions a browser would land on. */
async function fetchHomepage(url: string): Promise<PageFetch> {
  const answered = (p: PageFetch) => p.ok || p.blocked || p.status != null;
  // Browsers try the secure address first, even when a link (like the one on
  // a Google listing) says http. Do the same, so a site that works on https
  // isn't marked "not secure" just because its listing links to http.
  if (/^http:\/\//i.test(url)) {
    const secureUrl = new URL(url);
    secureUrl.protocol = 'https:';
    const secure = await fetchOnce(secureUrl.toString(), SECURE_PROBE_TIMEOUT_MS);
    if (secure.ok) return secure;
  }
  const first = await fetchOnce(url, PAGE_TIMEOUT_MS);
  if (answered(first) || first.problem === TOO_SLOW) return first;
  const u = new URL(url);
  // Some domains only answer on www.
  if (first.problem === NOT_FOUND && !/^www\./i.test(u.hostname)) {
    const www = new URL(url);
    www.hostname = `www.${u.hostname}`;
    const second = await fetchOnce(www.toString(), PAGE_TIMEOUT_MS);
    if (answered(second)) return second;
    return first;
  }
  // Older sites without a secure connection only answer on http.
  if (first.problem !== NOT_FOUND && u.protocol === 'https:') {
    const plain = new URL(url);
    plain.protocol = 'http:';
    const second = await fetchOnce(plain.toString(), PAGE_TIMEOUT_MS);
    if (answered(second)) return second;
  }
  return first;
}

const BOOKING_RX = /calendly\.com|acuityscheduling\.com|squareup\.com\/appointments|square\.site|booksy\.com|vagaro\.com|schedulicity|setmore\.com|housecallpro\.com|getjobber\.com|servicetitan|jotform\.com|typeform\.com|hsforms\.(?:net|com)|hs-scripts\.com|formstack|wufoo\.com|gravityforms|wpforms|formspree\.io|cognitoforms|opentable\.com|resy\.com|exploretock\.com|sevenrooms\.com|toasttab\.com/i;

const CMS_SIGNATURES: Array<[string, RegExp]> = [
  ['Wix', /wix\.com|static\.wixstatic\.com|wix-bolt/i],
  ['Squarespace', /squarespace\.com|static1\.squarespace|sqsp\.net/i],
  ['WordPress', /wp-content|wp-includes|wordpress/i],
  ['GoDaddy', /img1\.wsimg\.com|godaddy/i],
  ['Toast', /toasttab\.com|toast-tab/i],
  ['Shopify', /cdn\.shopify\.com|shopify\.com/i],
  ['Webflow', /webflow\.com|wf-(domain|site)/i],
];

export type HtmlFindings = {
  phone_ready: boolean;
  /** Enough text in the page itself to judge it (not a page built only by scripts). */
  readable: boolean;
  tel_link: boolean;
  mail_link: boolean;
  contact_form: boolean;
  contact_link: boolean;
  booking: boolean;
  phone_visible: boolean;
  /** People can call, message or book from the homepage (null: couldn't tell). */
  contact: boolean | null;
  cms: string | null;
  features: SiteFeatures | null;
  marketing: SiteMarketing | null;
  social_links: Array<{ label: string; url: string }>;
  /** A page on their own site the ordering links lead to (to see where orders really go). */
  order_page: string | null;
};

// ── Online ordering: their own, or a delivery app's ─────────────────────────

/** Delivery apps, which take a cut of each order. */
const DELIVERY_APPS: Array<[string, RegExp]> = [
  ['DoorDash', /(^|\.)doordash\.com$/i],
  ['Uber Eats', /(^|\.)ubereats\.com$/i],
  ['Grubhub', /(^|\.)grubhub\.com$/i],
  ['Postmates', /(^|\.)postmates\.com$/i],
  ['Caviar', /(^|\.)trycaviar\.com$/i],
  ['Seamless', /(^|\.)seamless\.com$/i],
  ['Slice', /(^|\.)slicelife\.com$/i],
];

/** Their own ordering systems (no marketplace commission), including
 *  DoorDash's commission-free Online Ordering at order.online. */
const DIRECT_ORDER_HOST = /(^|\.)(?:order\.online|chownow\.com|olo\.com|menufy\.com|spoton\.com|lunchbox\.io|getbento\.com|popmenu\.com|owner\.com|gloriafood\.com|foodbooking\.com|flipdish\.com|hungerrush\.com|orderexperience\.net)$/i;
const ORDER_WORDS = /\border(?:ing)?\b|\bpick[\s_-]?up\b|\bdelivery\b|\btake[\s_-]?out\b|\bto[\s_-]?go\b/i;

type OrderLink = 'app' | 'direct' | 'own_page' | 'gift' | 'loyalty' | 'catering' | null;

/** What an ordering-ish link is: a delivery app, their own ordering, a page on
 *  their own site, or something else from the same provider (gift cards…). */
function classifyOrderLink(href: string, text: string, pageHost: string | null): { kind: OrderLink; app?: string } {
  const host = hostOf(href);
  if (!host) return { kind: null };
  for (const [name, rx] of DELIVERY_APPS) {
    if (rx.test(host) && !/^(?:drive|merchants|dasher|careers|help)\./i.test(host)) return { kind: 'app', app: name };
  }
  const both = `${href} ${text}`;
  if (/(^|\.)toasttab\.com$/i.test(host)) {
    if (/gift/i.test(both)) return { kind: 'gift' };
    if (/rewards?(?:signup|lookup)?|loyalty/i.test(both)) return { kind: 'loyalty' };
    if (/\/catering/i.test(href)) return { kind: 'catering' };
    if (/joinwait|waitlist/i.test(both)) return { kind: null };
    return /\/v3\b|\/online\/|order/i.test(href) || ORDER_WORDS.test(text) ? { kind: 'direct' } : { kind: null };
  }
  if (/(^|\.)(?:square\.site|squareup\.com|clover\.com)$/i.test(host)) {
    if (/gift/i.test(both)) return { kind: 'gift' };
    return /order|menu/i.test(href) || ORDER_WORDS.test(text) ? { kind: 'direct' } : { kind: null };
  }
  if (DIRECT_ORDER_HOST.test(host)) return /gift/i.test(both) ? { kind: 'gift' } : { kind: 'direct' };
  // Their own site, or a subdomain of it (order.example.com).
  const site = (pageHost ?? '').replace(/^www\./, '');
  const ownSite = host === 'x.invalid' || (!!site && (host.replace(/^www\./, '') === site || host.endsWith(`.${site}`)));
  if (ownSite && (/\/(?:order|online-order|order-online|ordering|pickup|delivery|takeout)(?:[\/?#.-]|$)/i.test(href)
    || /^order\./i.test(host)
    || /^\s*order\s*$|\border (?:online|now|ahead|pickup|delivery|food|here|to go)\b|\bonline order(?:ing)?\b/i.test(text))) {
    // A subdomain made for ordering is their ordering system itself.
    return host !== 'x.invalid' && host.replace(/^www\./, '') !== site ? { kind: 'direct' } : { kind: 'own_page' };
  }
  return { kind: null };
}

/** Where a page's ordering links go. */
export function orderingFromLinks(links: Array<{ href: string; text: string }>, pageHost: string | null): { direct: boolean; apps: string[]; ownPage: string | null } {
  const apps: string[] = [];
  let direct = false;
  let ownPage: string | null = null;
  for (const a of links) {
    const c = classifyOrderLink(a.href, a.text, pageHost);
    if (c.kind === 'app' && c.app && !apps.includes(c.app)) apps.push(c.app);
    if (c.kind === 'direct') direct = true;
    if (c.kind === 'own_page' && !ownPage) ownPage = a.href;
  }
  return { direct, apps, ownPage };
}

/** Links on a page: where they go and what they say. */
export function pageLinks(doc: string): Array<{ href: string; text: string }> {
  const anchors: Array<{ href: string; text: string }> = [];
  for (const m of doc.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const hrefM = m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = decodeEntities((hrefM ? (hrefM[1] ?? hrefM[2] ?? hrefM[3] ?? '') : '').trim());
    const aria = m[1].match(/\baria-label\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
    const label = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    anchors.push({ href, text: `${label} ${aria}`.trim() });
    if (anchors.length >= 800) break;
  }
  return anchors.filter((a) => a.href && a.href !== '#' && !/^javascript:/i.test(a.href));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|rsquo|lsquo|rdquo|ldquo|hellip|middot|bull|trade|reg|copy);/gi, (_, n: string) => ({
      amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘',
      rdquo: '”', ldquo: '“', hellip: '…', middot: '·', bull: '•', trade: '™', reg: '®', copy: '©',
    } as Record<string, string>)[n.toLowerCase()] ?? _);
}

// ── Ad and analytics tags, search appearance ────────────────────────────────

const LOCAL_BUSINESS_TYPES = new Set([
  'LocalBusiness', 'BarOrPub', 'CafeOrCoffeeShop', 'Bakery', 'Brewery', 'Winery', 'Distillery', 'NightClub',
  'FoodEstablishment', 'Restaurant', 'FastFoodRestaurant', 'IceCreamShop', 'Plumber', 'Electrician', 'Locksmith',
  'HousePainter', 'RoofingContractor', 'GeneralContractor', 'HVACBusiness', 'HomeAndConstructionBusiness',
  'MovingCompany', 'AutoRepair', 'AutoBodyShop', 'AutoWash', 'AutoDealer', 'AutomotiveBusiness', 'Dentist',
  'DaySpa', 'HairSalon', 'BeautySalon', 'HealthAndBeautyBusiness', 'ProfessionalService', 'LegalService',
  'Attorney', 'RealEstateAgent', 'DryCleaningOrLaundry', 'EntertainmentBusiness', 'Store', 'SelfStorage',
  'MedicalBusiness', 'EmergencyService', 'ChildCare', 'Hotel', 'LodgingBusiness', 'SportsActivityLocation',
]);

function metaContent(doc: string, nameRx: RegExp): string {
  for (const tag of doc.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!nameRx.test(tag)) continue;
    const m = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (m) return decodeEntities(m[1] ?? m[2] ?? '').trim();
  }
  return '';
}

/** Tags as the page's HTML shows them. Google Tag Manager or a Wix site can
 *  load more after the page opens, so a missing tag there is "couldn't tell". */
function tagsFromHtml(doc: string, cms: string | null): MarketingTags {
  const metaPixel = /connect\.facebook\.net\/[^"'\s]*\/fbevents\.js|fbq\(\s*['"]init['"]|facebook\.com\/tr\?id=/i.test(doc);
  const ga4 = /googletagmanager\.com\/gtag\/js\?id=G-|['"]G-[A-Z0-9]{6,12}['"]/.test(doc);
  const oldGa = /googletagmanager\.com\/gtag\/js\?id=UA-|['"]UA-\d{4,10}-\d{1,4}['"]|google-analytics\.com\/(?:analytics|ga)\.js/i.test(doc);
  const gtm = /googletagmanager\.com\/gtm\.js|['"]GTM-[A-Z0-9]{4,9}['"]/i.test(doc);
  const hidden = gtm || cms === 'Wix';
  return {
    meta_pixel: metaPixel ? true : hidden ? null : false,
    google_analytics: ga4 ? true : hidden ? null : false,
    old_google_analytics_only: oldGa && !ga4 && !hidden,
    google_ads: /googletagmanager\.com\/gtag\/js\?id=AW-|['"]AW-\d{6,12}['"]|googleadservices\.com\/pagead\/conversion/i.test(doc),
    tiktok_pixel: /analytics\.tiktok\.com|ttq\.load\(/i.test(doc),
    tag_manager: gtm,
    source: 'page',
  };
}

function searchFromHtml(doc: string): SearchAppearance {
  const titleM = doc.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? decodeEntities(titleM[1]).replace(/\s+/g, ' ').trim().slice(0, 160) : '';
  const types: string[] = [];
  for (const m of doc.matchAll(/"@type"\s*:\s*(?:"([A-Za-z]+)"|\[([^\]]*)\])/g)) {
    if (m[1]) types.push(m[1]); else types.push(...(m[2].match(/[A-Za-z]+/g) ?? []));
  }
  for (const m of doc.matchAll(/itemtype\s*=\s*["']https?:\/\/schema\.org\/([A-Za-z]+)/gi)) types.push(m[1]);
  return {
    title: title || null,
    description: metaContent(doc, /\bname\s*=\s*["']?description\b/i).length >= 50,
    share_image: !!(metaContent(doc, /\bproperty\s*=\s*["']?og:image\b/i) || metaContent(doc, /\bname\s*=\s*["']?twitter:image\b/i)),
    business_schema: types.some((t) => LOCAL_BUSINESS_TYPES.has(t) || /(?:Restaurant|Business|Contractor)$/.test(t)),
  };
}

const DAY_RX = '(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?s?\\.?';
const TIME_RX = '\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)';
const HOURS_RX = new RegExp(`\\b(?:${DAY_RX}|daily|every ?day|7 days a week)\\b[^.!?]{0,60}?${TIME_RX}`, 'i');
const TIME_RANGE_RX = new RegExp(`${TIME_RX}\\s*(?:-|–|—|to|until|til)\\s*(?:${TIME_RX}|close|midnight|late)`, 'i');

const SOCIAL_SITES: Array<[string, RegExp]> = [
  ['Facebook', /(^|\.)facebook\.com|(^|\.)fb\.com/i],
  ['Instagram', /(^|\.)instagram\.com/i],
  ['TikTok', /(^|\.)tiktok\.com/i],
  ['YouTube', /(^|\.)youtube\.com|(^|\.)youtu\.be/i],
  ['Yelp', /(^|\.)yelp\.com/i],
  ['LinkedIn', /(^|\.)linkedin\.com/i],
  ['X', /(^|\.)twitter\.com|(^|\.)x\.com/i],
  ['Pinterest', /(^|\.)pinterest\.com/i],
];

const RESERVATION_PROVIDERS: Array<[string, RegExp]> = [
  ['OpenTable', /opentable\./i],
  ['Resy', /resy\.com/i],
  ['Tock', /exploretock\.com/i],
  ['SevenRooms', /sevenrooms\.com/i],
  ['Yelp', /yelp\.com\/reservations/i],
];

/** A "this domain is for sale" or expired-domain page instead of a website. */
export function isParkedPage(html: string): boolean {
  const head = html.slice(0, 200_000);
  const title = (head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ');
  const text = head.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 6000);
  const rx = /\b(?:this|the) domain(?: name)? (?:is|may be) for sale\b|\bdomain (?:name )?(?:is )?for sale\b|\bis for sale \| hugedomains\b|\bbuy this domain\b|\bthis domain has expired\b|\bparked free, courtesy of\b|\bdomain parking\b/i;
  return rx.test(title) || rx.test(text) || /hugedomains\.com|sedoparking\.com|parkingcrew\.net|bodis\.com|afternic\.com\/forsale|dan\.com\/buy-domain/i.test(head);
}

function hostOf(href: string): string {
  try { return new URL(href, 'https://x.invalid').hostname.toLowerCase(); } catch { return ''; }
}

export function analyzeHtml(html: string, pageUrl: string | null = null): HtmlFindings {
  const doc = html.slice(0, MAX_HTML);
  const pageHost = pageUrl ? hostOf(pageUrl) : null;

  // Set up for phones: a viewport tag that sizes the page to the device.
  let phoneReady = false;
  for (const tag of doc.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/\bname\s*=\s*["']?viewport\b/i.test(tag)) continue;
    const m = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const content = m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
    if (/width\s*=\s*device-width|initial-scale\s*=\s*1/i.test(content)) { phoneReady = true; break; }
  }

  const text = doc
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const readable = text.length >= 200;

  const telLink = /href\s*=\s*["']?\s*tel:/i.test(doc);
  const mailLink = /href\s*=\s*["']?\s*mailto:/i.test(doc);
  const contactForm = /<textarea\b/i.test(doc) || /<input\b[^>]*\btype\s*=\s*["']?(?:email|tel)\b/i.test(doc);
  const contactLink = /<a\b[^>]*\bhref\s*=\s*["'][^"']*(?:contact|get-in-touch|quote|estimate|appointment|book-now|booking|schedule)[^"']*["']/i.test(doc)
    || /<a\b[^>]*>\s*(?:contact(?: us)?|get (?:a )?(?:free )?(?:quote|estimate)|book (?:now|online|an appointment)|schedule (?:now|service|an appointment)|request (?:a )?(?:quote|service))\s*</i.test(doc);
  const booking = BOOKING_RX.test(doc);
  const phoneVisible = /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(text);
  const anyWay = telLink || mailLink || contactForm || contactLink || booking || phoneVisible;

  let cms: string | null = null;
  for (const [name, rx] of CMS_SIGNATURES) if (rx.test(doc)) { cms = name; break; }

  // Links on the homepage: where they go and what they say.
  const realLinks = pageLinks(doc);
  const linkHit = (rx: RegExp) => realLinks.some((a) => rx.test(a.href) || rx.test(a.text));

  const socialLinks: Array<{ label: string; url: string }> = [];
  for (const a of realLinks) {
    const host = hostOf(a.href);
    if (!host) continue;
    for (const [label, rx] of SOCIAL_SITES) {
      if (rx.test(host) && !socialLinks.some((x) => x.label === label)) socialLinks.push({ label, url: a.href });
    }
  }

  let features: SiteFeatures | null = null;
  let marketing: SiteMarketing | null = null;
  let orderPage: string | null = null;
  if (readable || realLinks.length >= 5) {
    const menuLinks = realLinks.filter((a) => /menu/i.test(a.href) || /\bmenus?\b/i.test(a.text));
    let provider: string | null = null;
    for (const [name, rx] of RESERVATION_PROVIDERS) if (rx.test(doc)) { provider = name; break; }
    const hasEmailInput = /<input\b[^>]*\btype\s*=\s*["']?email\b/i.test(doc);
    const ordering = orderingFromLinks(realLinks, pageHost);
    orderPage = !ordering.direct && ordering.apps.length === 0 ? ordering.ownPage : null;
    const toastRewards = /toasttab\.com\/[^"'\s]*rewards/i.test(doc);
    features = {
      menu: menuLinks.length > 0 || /\b(?:view|see|our|full) (?:dinner |lunch |brunch |food |drink )?menus?\b/i.test(text),
      menu_pdf_only: menuLinks.length > 0 && menuLinks.every((a) => /\.pdf(?:[?#]|$)/i.test(a.href)),
      happy_hour: linkHit(/happy[\s_-]?hour/i) || /\bhappy hour\b/i.test(text),
      reservations: !!provider || linkHit(/reserv|book[\s_-]?a[\s_-]?table/i),
      reservations_provider: provider,
      private_events: linkHit(/private[\s_-]?(?:event|dining|part(?:y|ies))|buy[\s_-]?outs?\b|group[\s_-]?dining|banquet/i),
      events: realLinks.some((a) => (/(?:^|\/)(?:events?|calendar)(?:[\/?#.-]|$)|live[\s_-]?music|trivia/i.test(a.href) || /\b(?:events?|calendar|live music|trivia)\b/i.test(a.text))
        && !/private|catering|buy[\s_-]?out/i.test(`${a.href} ${a.text}`)),
      online_ordering: ordering.direct || ordering.apps.length > 0 || !!ordering.ownPage,
      ordering_direct: ordering.direct || (!!ordering.ownPage && ordering.apps.length === 0),
      ordering_apps: ordering.apps,
      gift_cards: linkHit(/gift[\s_-]?cards?|giftcard|gift[\s_-]?certificates?|egift/i),
      email_signup: (hasEmailInput && /subscribe|newsletter|mailing list|sign up for|join (?:our )?(?:email|mailing|list|vip|club)/i.test(text))
        || (/list-manage\.com|klaviyo|mailchimp/i.test(doc) && /subscribe|newsletter/i.test(text)),
      loyalty: toastRewards
        || realLinks.some((a) => /loyalty|rewards?(?:signup|lookup)?(?:[\/?#.-]|$)|vip[\s_-]?(?:club|program)|punch[\s_-]?card/i.test(a.href) || /\b(?:loyalty|rewards?|vip club|punch card)\b/i.test(a.text))
        || /\b(?:loyalty program|rewards program|join (?:our )?rewards|earn points|sign up for rewards)\b/i.test(text)
        || /thanx\.com|punchh\.com|paytronix|spendgo\.com|fivestars\.com|joinloyalty|loyaltyplant/i.test(doc)
        || /\b(?:sign up for rewards|rewards program|loyalty program)\b/i.test(metaContent(doc, /\bname\s*=\s*["']?description\b/i)),
      text_club: /\btext club\b|\bjoin (?:our )?(?:text|sms)(?:ing)? (?:club|list|alerts)\b|\btext\s+["“]?[A-Za-z0-9]{2,15}["”]?\s+to\s+\d{5,6}\b|\b(?:sms|text) (?:club|alerts|updates|list)\b|\bsign up for (?:texts|text messages|sms)\b/i.test(text)
        || /attn\.tv|attentivemobile\.com|slicktext\.com|textedly\.com|simpletexting\.com|eztexting\.com|postscript\.io|mobile-text-alerts\.com|tatango\.com|textmunication\.com/i.test(doc),
      catering: linkHit(/cater/i) || /\bcatering (?:menu|orders?|services?|available|inquir\w*|packages?)\b|\bwe cater\b/i.test(text),
      brunch: linkHit(/brunch/i) || /\bbrunch\b/i.test(text),
      hours: HOURS_RX.test(text) || TIME_RANGE_RX.test(text) || linkHit(/\bhours\b/i) || /"openingHours(?:Specification)?"/i.test(doc),
      booking_or_quote: booking || contactLink,
      financing: linkHit(/financ/i) || /\bfinancing\b/i.test(text),
      service_areas: linkHit(/service[\s_-]?areas?|areas[\s_-]?(?:we[\s_-]?)?serve|cities[\s_-]?we[\s_-]?serve/i) || /\b(?:service areas?|areas we serve|proudly serving)\b/i.test(text),
      emergency: /\b24\/7\b|\b24 hours\b|\bemergency\b/i.test(text),
      social: socialLinks.map((x) => x.label),
    };
    marketing = { tags: tagsFromHtml(doc, cms), search: searchFromHtml(doc) };
  }

  return {
    phone_ready: phoneReady,
    readable,
    tel_link: telLink,
    mail_link: mailLink,
    contact_form: contactForm,
    contact_link: contactLink,
    booking,
    phone_visible: phoneVisible,
    contact: anyWay ? true : readable ? false : null,
    cms,
    features,
    marketing,
    social_links: socialLinks,
    order_page: orderPage,
  };
}

// ── Google's phone speed test ───────────────────────────────────────────────

type Speed = {
  lcp_ms: number | null;
  score: number | null;
  viewport_ok: boolean | null;
  final_url: string | null;
  /** Tags seen loading when the speed test opened the page in a real browser
   *  (null: the test didn't list the page's requests). */
  browser_tags: { meta_pixel: boolean; google_analytics: boolean; google_ads: boolean; tiktok_pixel: boolean; tag_manager: boolean } | null;
};

/** Which tags loaded, from the speed test's list of the page's requests. */
// deno-lint-ignore no-explicit-any
function browserTags(lh: any): Speed['browser_tags'] {
  const items = lh?.audits?.['network-requests']?.details?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const urls = items.map((i: { url?: unknown }) => String(i?.url ?? '')).filter(Boolean);
  const any = (rx: RegExp) => urls.some((u: string) => rx.test(u));
  return {
    meta_pixel: any(/connect\.facebook\.net\/[^?#]*fbevents\.js|facebook\.com\/tr[/?]/i),
    google_analytics: any(/google-analytics\.com\/(?:g\/collect|mp\/collect)|googletagmanager\.com\/gtag\/js\?id=G-|analytics\.google\.com\/g\/collect/i),
    google_ads: any(/googleadservices\.com|googleads\.g\.doubleclick\.net|googletagmanager\.com\/gtag\/js\?id=AW-/i),
    tiktok_pixel: any(/analytics\.tiktok\.com/i),
    tag_manager: any(/googletagmanager\.com\/gtm\.js/i),
  };
}

async function psiOnce(url: string, key: string | null, timeoutMs: number): Promise<{ ok: boolean; status: number | null; speed: Speed | null; reason?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const params = new URLSearchParams({ url, strategy: 'mobile', category: 'PERFORMANCE' });
    if (key) params.set('key', key);
    const res = await fetch(`${PSI_URL}?${params}`, { signal: ctrl.signal });
    if (!res.ok) {
      let reason = '';
      try { reason = ((await res.json())?.error?.message ?? '').toString().slice(0, 160); } catch { /* not json */ }
      return { ok: false, status: res.status, speed: null, reason };
    }
    const data = await res.json();
    const lh = data?.lighthouseResult;
    if (!lh || lh.runtimeError) return { ok: false, status: res.status, speed: null, reason: lh?.runtimeError?.code ?? 'no result' };
    const lcp = lh.audits?.['largest-contentful-paint']?.numericValue;
    const perf = lh.categories?.performance?.score;
    const viewport = lh.audits?.viewport?.score;
    return {
      ok: true,
      status: res.status,
      speed: {
        lcp_ms: typeof lcp === 'number' ? Math.round(lcp) : null,
        score: typeof perf === 'number' ? Math.round(perf * 100) : null,
        viewport_ok: typeof viewport === 'number' ? viewport >= 0.9 : null,
        final_url: typeof lh.finalDisplayedUrl === 'string' ? lh.finalDisplayedUrl : typeof lh.finalUrl === 'string' ? lh.finalUrl : null,
        browser_tags: browserTags(lh),
      },
    };
  } catch (e) {
    return { ok: false, status: null, speed: null, reason: ctrl.signal.aborted ? 'timed out' : String(e).slice(0, 160) };
  } finally {
    clearTimeout(timer);
  }
}

const describe = (r: { status: number | null; reason?: string }) => `${r.status == null ? 'no answer' : `HTTP ${r.status}`}${r.reason ? `: ${r.reason}` : ''}`;

/** Google's phone speed test, plus a plain reason when it gave no result
 *  (saved with the website snapshot so a missing speed can be explained). */
async function phoneSpeed(url: string, key: string | null, budgetMs: number): Promise<{ speed: Speed | null; problem: string | null }> {
  const started = Date.now();
  const first = await psiOnce(url, key, budgetMs);
  if (first.ok) return { speed: first.speed, problem: null };
  // A key that isn't switched on for the speed test fails fast; try once without it.
  const left = budgetMs - (Date.now() - started);
  if (key && (first.status === 400 || first.status === 403) && left > 15_000) {
    const second = await psiOnce(url, null, left);
    if (second.ok) return { speed: second.speed, problem: `with key: ${describe(first)}; worked without key` };
    return { speed: null, problem: `with key: ${describe(first)}; without key: ${describe(second)}` };
  }
  return { speed: null, problem: `${key ? 'with key' : 'no key'}: ${describe(first)}` };
}

// ── The check ───────────────────────────────────────────────────────────────

export type WebsiteCheckOptions = {
  source: 'typed' | 'google';
  /** Their Google listing links a website (null when the listing couldn't be read). */
  listingHasSite: boolean | null;
  psiKey?: string | null;
  psiBudgetMs?: number;
};

export function emptyWebsiteBlock(status: WebsiteStatus, patch: Partial<WebsiteBlock> = {}): WebsiteBlock {
  return {
    status,
    url: null,
    source: null,
    listing_has_site: null,
    social_label: null,
    opens: null,
    secure: null,
    phone_ready: null,
    contact: null,
    problem: null,
    phone_load_seconds: null,
    speed: null,
    speed_score: null,
    features: null,
    marketing: null,
    ...patch,
  };
}

export async function checkWebsite(url: string, opts: WebsiteCheckOptions): Promise<{ block: WebsiteBlock; snapshot: WebsiteSnapshotFields | null }> {
  const base = { url: displayUrl(url), source: opts.source, listing_has_site: opts.listingHasSite };

  // Their address is a social or directory page, not a website of their own.
  const social = socialLabel(url);
  if (social) return { block: emptyWebsiteBlock('social', { ...base, social_label: social }), snapshot: null };

  const [page, speedRes] = await Promise.all([
    fetchHomepage(url),
    phoneSpeed(url, opts.psiKey ?? null, opts.psiBudgetMs ?? 45_000),
  ]);
  const speed = speedRes.speed;

  const speedPatch: Partial<WebsiteBlock> = speed && speed.lcp_ms != null
    ? {
        phone_load_seconds: Math.round(speed.lcp_ms / 100) / 10,
        speed: speed.lcp_ms <= 2500 ? 'fast' : speed.lcp_ms <= 4000 ? 'ok' : 'slow',
        speed_score: speed.score,
      }
    : {};
  const speedCols = { perf_score: speed?.score ?? null, lcp_ms: speed?.lcp_ms ?? null };

  if (page.ok && page.html != null) {
    const finalUrl = page.finalUrl || url;
    // It forwards to a social page.
    const forwarded = socialLabel(finalUrl);
    if (forwarded) return { block: emptyWebsiteBlock('social', { ...base, social_label: forwarded }), snapshot: null };
    // The address shows a "this domain is for sale" page (the site lapsed).
    if (isParkedPage(page.html)) {
      const problem = 'it shows a page saying the web address is for sale, not your website';
      return {
        block: emptyWebsiteBlock('unreachable', { ...base, opens: false, problem }),
        snapshot: {
          http_status: page.status, response_ms: page.ms, https_enabled: null, mobile_friendly: null,
          has_contact_form: null, has_contact_page: null, phone_prominent: null, email_prominent: null,
          cms_detected: null, fetch_error: 'parked domain (for sale)', ...speedCols,
          raw: { speed_problem: speedRes.problem, checked: 'parked domain' },
        },
      };
    }
    const f = analyzeHtml(page.html, finalUrl);
    // "Order online" leads to a page on their own site: open it to see where
    // the orders actually go (their own ordering, or a delivery app).
    if (f.features && f.order_page) {
      try {
        const orderUrl = new URL(f.order_page, finalUrl).toString();
        const op = await fetchOnce(orderUrl, ORDER_PAGE_TIMEOUT_MS);
        if (op.ok && op.html) {
          const o = orderingFromLinks(pageLinks(op.html.slice(0, MAX_HTML)), hostOf(finalUrl));
          if (o.direct || o.apps.length) {
            f.features.ordering_direct = o.direct;
            f.features.ordering_apps = o.apps;
          }
        }
      } catch { /* keep what the homepage showed */ }
    }
    // The speed test loads the page in a real browser, so its list of tags
    // is the full one (including tags a tag manager loads).
    const bt = speed?.browser_tags;
    if (f.marketing && bt) {
      const t = f.marketing.tags;
      f.marketing.tags = {
        meta_pixel: bt.meta_pixel || t.meta_pixel === true,
        google_analytics: bt.google_analytics || t.google_analytics === true,
        old_google_analytics_only: t.old_google_analytics_only && !bt.google_analytics,
        google_ads: bt.google_ads || t.google_ads,
        tiktok_pixel: bt.tiktok_pixel || t.tiktok_pixel,
        tag_manager: bt.tag_manager || t.tag_manager,
        source: 'browser',
      };
    }
    const block = emptyWebsiteBlock('checked', {
      ...base,
      opens: true,
      secure: finalUrl.startsWith('https://'),
      phone_ready: speed?.viewport_ok ?? f.phone_ready,
      contact: f.contact,
      features: f.features,
      marketing: f.marketing,
      ...speedPatch,
    });
    const ft = f.features;
    return {
      block,
      snapshot: {
        http_status: page.status,
        response_ms: page.ms,
        https_enabled: block.secure,
        mobile_friendly: block.phone_ready,
        has_contact_form: f.contact_form,
        has_contact_page: f.contact_link,
        phone_prominent: f.tel_link || f.phone_visible,
        email_prominent: f.mail_link,
        cms_detected: f.cms,
        fetch_error: null,
        ...speedCols,
        ...(ft ? {
          has_menu_page: ft.menu,
          menu_is_pdf_only: ft.menu_pdf_only,
          has_happy_hour_page: ft.happy_hour,
          has_events_page: ft.events,
          has_private_party_page: ft.private_events,
          private_party_linked_from_home: ft.private_events,
          has_reservations_page: ft.reservations,
          has_email_signup: ft.email_signup,
          has_social_links: ft.social.length > 0,
        } : {}),
        ...(f.marketing ? { has_localbusiness_schema: f.marketing.search.business_schema } : {}),
        raw: { features: ft, marketing: f.marketing, social_links: f.social_links, speed_problem: speedRes.problem, checked: 'homepage' },
      },
    };
  }

  // A security screen answered us, or our request failed but Google's speed
  // test loaded the page: it opens, we just can't look inside ourselves.
  if (page.blocked || speed) {
    const finalUrl = speed?.final_url || page.finalUrl || url;
    const block = emptyWebsiteBlock(speed ? 'checked' : 'blocked', {
      ...base,
      opens: speed ? true : null,
      secure: finalUrl.startsWith('https://'),
      phone_ready: speed?.viewport_ok ?? null,
      ...speedPatch,
    });
    return {
      block,
      snapshot: {
        http_status: page.status,
        response_ms: page.ms,
        https_enabled: block.secure,
        mobile_friendly: block.phone_ready,
        has_contact_form: null,
        has_contact_page: null,
        phone_prominent: null,
        email_prominent: null,
        cms_detected: null,
        fetch_error: page.blocked ? `security screen (HTTP ${page.status})` : page.problem,
        ...speedCols,
        raw: { speed_problem: speedRes.problem, checked: 'speed test only' },
      },
    };
  }

  // It didn't open.
  return {
    block: emptyWebsiteBlock('unreachable', { ...base, opens: false, problem: page.problem }),
    snapshot: {
      http_status: page.status,
      response_ms: page.ms,
      https_enabled: null,
      mobile_friendly: null,
      has_contact_form: null,
      has_contact_page: null,
      phone_prominent: null,
      email_prominent: null,
      cms_detected: null,
      fetch_error: page.problem,
      ...speedCols,
      raw: { speed_problem: speedRes.problem, checked: 'did not open' },
    },
  };
}
