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
};

const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PAGE_TIMEOUT_MS = 15_000;
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
};

export function analyzeHtml(html: string): HtmlFindings {
  const doc = html.slice(0, MAX_HTML);

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
  };
}

// ── Google's phone speed test ───────────────────────────────────────────────

type Speed = { lcp_ms: number | null; score: number | null; viewport_ok: boolean | null; final_url: string | null };

async function psiOnce(url: string, key: string | null, timeoutMs: number): Promise<{ ok: boolean; status: number | null; speed: Speed | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const params = new URLSearchParams({ url, strategy: 'mobile', category: 'PERFORMANCE' });
    if (key) params.set('key', key);
    const res = await fetch(`${PSI_URL}?${params}`, { signal: ctrl.signal });
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, status: res.status, speed: null };
    }
    const data = await res.json();
    const lh = data?.lighthouseResult;
    if (!lh || lh.runtimeError) return { ok: false, status: res.status, speed: null };
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
      },
    };
  } catch {
    return { ok: false, status: null, speed: null };
  } finally {
    clearTimeout(timer);
  }
}

async function phoneSpeed(url: string, key: string | null, budgetMs: number): Promise<Speed | null> {
  const started = Date.now();
  const first = await psiOnce(url, key, budgetMs);
  if (first.ok) return first.speed;
  // A key that isn't switched on for the speed test fails fast; try once without it.
  const left = budgetMs - (Date.now() - started);
  if (key && (first.status === 400 || first.status === 403) && left > 15_000) {
    const second = await psiOnce(url, null, left);
    if (second.ok) return second.speed;
  }
  return null;
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
    ...patch,
  };
}

export async function checkWebsite(url: string, opts: WebsiteCheckOptions): Promise<{ block: WebsiteBlock; snapshot: WebsiteSnapshotFields | null }> {
  const base = { url: displayUrl(url), source: opts.source, listing_has_site: opts.listingHasSite };

  // Their address is a social or directory page, not a website of their own.
  const social = socialLabel(url);
  if (social) return { block: emptyWebsiteBlock('social', { ...base, social_label: social }), snapshot: null };

  const [page, speed] = await Promise.all([
    fetchHomepage(url),
    phoneSpeed(url, opts.psiKey ?? null, opts.psiBudgetMs ?? 45_000),
  ]);

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
    const f = analyzeHtml(page.html);
    const block = emptyWebsiteBlock('checked', {
      ...base,
      opens: true,
      secure: finalUrl.startsWith('https://'),
      phone_ready: speed?.viewport_ok ?? f.phone_ready,
      contact: f.contact,
      ...speedPatch,
    });
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
    },
  };
}
