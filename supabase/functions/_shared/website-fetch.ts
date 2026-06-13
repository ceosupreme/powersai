// Shared helpers for the website audit pipeline.
// Server-side HTML only; no JavaScript rendering.

import { DOMParser, type Element } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';

export const USER_AGENT = 'BarPulseBot/1.0 (+https://barpulsehq.com/bot)';
export const FETCH_TIMEOUT_MS = 12_000;
export const MAX_PAGES = 50;
export const MAX_DEPTH = 3;
export const THROTTLE_MS = 250;

export type PageKind =
  | 'home' | 'menu' | 'events' | 'private_party'
  | 'contact' | 'about' | 'happy_hour' | 'reservations' | 'other';

export type PageAudit = {
  url: string;
  http_status: number | null;
  title: string | null;
  title_len: number | null;
  meta_description: string | null;
  meta_description_len: number | null;
  h1_text: string | null;
  h1_count: number;
  image_count: number;
  images_with_alt: number;
  schema_types: string[];
  word_count: number;
  internal_link_count: number;
  last_modified: string | null;
  page_kind: PageKind;
  links_out: string[]; // for inventory/orphan detection
  has_form: boolean;
  body_text_sample: string;
};

export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    if ((u.pathname.endsWith('/') && u.pathname.length > 1)) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch { return raw; }
}

export async function resolveCanonical(url: string): Promise<{ canonical: string; status: number; ms: number }> {
  const start = Date.now();
  let target = url.startsWith('http') ? url : `https://${url}`;
  const res = await fetchWithTimeout(target, { method: 'GET' });
  return {
    canonical: normalizeUrl(res.url || target),
    status: res.status,
    ms: Date.now() - start,
  };
}

const CMS_SIGNATURES: Array<[string, RegExp]> = [
  ['Wix', /wix\.com|static\.wixstatic\.com|wix-bolt/i],
  ['Squarespace', /squarespace\.com|static1\.squarespace|sqsp\.net/i],
  ['WordPress', /wp-content|wp-includes|wordpress/i],
  ['Toast', /toasttab\.com|toast-tab/i],
  ['Shopify', /cdn\.shopify\.com|shopify\.com/i],
  ['Webflow', /webflow\.com|wf-(domain|site)/i],
];

export function detectCms(html: string): string | null {
  for (const [name, rx] of CMS_SIGNATURES) {
    if (rx.test(html)) return name;
  }
  return null;
}

export type RobotsResult = { present: boolean; allowsCrawl: boolean; sitemaps: string[] };

export async function fetchRobots(origin: string): Promise<RobotsResult> {
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`);
    if (!res.ok) return { present: false, allowsCrawl: true, sitemaps: [] };
    const txt = await res.text();
    const sitemaps = [...txt.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    // Very simple parse: find any disallow:/ for User-agent: * (or our UA).
    const blocks = txt.split(/User-agent:/i).slice(1);
    let allows = true;
    for (const b of blocks) {
      const head = b.split('\n', 1)[0].trim().toLowerCase();
      if (head === '*' || head.includes('barpulse')) {
        if (/^\s*Disallow:\s*\/\s*$/im.test(b)) allows = false;
      }
    }
    return { present: true, allowsCrawl: allows, sitemaps };
  } catch {
    return { present: false, allowsCrawl: true, sitemaps: [] };
  }
}

export async function fetchSitemap(origin: string, robotsSitemaps: string[]): Promise<string[]> {
  const candidates = robotsSitemaps.length ? robotsSitemaps : [`${origin}/sitemap.xml`];
  const urls: string[] = [];
  for (const sm of candidates) {
    try {
      const res = await fetchWithTimeout(sm);
      if (!res.ok) continue;
      const txt = await res.text();
      const locs = [...txt.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
      for (const u of locs) {
        if (u.endsWith('.xml')) {
          // nested sitemap — fetch one level deep
          try {
            const sub = await fetchWithTimeout(u);
            if (sub.ok) {
              const sx = await sub.text();
              for (const m of sx.matchAll(/<loc>([^<]+)<\/loc>/gi)) urls.push(m[1].trim());
            }
          } catch { /* ignore */ }
        } else {
          urls.push(u);
        }
        if (urls.length >= MAX_PAGES * 2) break;
      }
      if (urls.length) break;
    } catch { /* ignore */ }
  }
  return urls;
}

const KIND_KEYWORDS: Array<[PageKind, RegExp]> = [
  ['private_party', /private[- ]?(party|event|dining|room)|group[- ]?event|book.*party|host.*event|buyout/i],
  ['happy_hour',   /happy[- ]?hour|specials/i],
  ['events',       /\bevents?\b|calendar|whats[- ]?on/i],
  ['menu',         /\bmenus?\b|food|drinks?|cocktails?/i],
  ['contact',      /\bcontact\b|find[- ]?us|directions|hours[- ]?location/i],
  ['about',        /\babout\b|story|team/i],
  ['reservations', /reserv|book[- ]?(a[- ]?)?table|opentable|resy|sevenrooms|tock/i],
];

export function classifyPageKind(url: string, title: string | null, h1: string | null): PageKind {
  const hay = `${url} ${title ?? ''} ${h1 ?? ''}`;
  for (const [kind, rx] of KIND_KEYWORDS) {
    if (rx.test(hay)) return kind;
  }
  try {
    const u = new URL(url);
    if (u.pathname === '/' || u.pathname === '') return 'home';
  } catch { /* ignore */ }
  return 'other';
}

export function parsePage(url: string, html: string, status: number, originHost: string): PageAudit {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc?.querySelector('title')?.textContent?.trim() || null;
  const metaDesc = doc?.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || null;
  const h1s = Array.from(doc?.querySelectorAll('h1') ?? []) as Element[];
  const h1Text = h1s[0]?.textContent?.trim() || null;
  const imgs = Array.from(doc?.querySelectorAll('img') ?? []) as Element[];
  const imagesWithAlt = imgs.filter((i) => (i.getAttribute('alt') || '').trim().length > 0).length;

  // Schema.org JSON-LD types
  const schemaTypes: string[] = [];
  for (const s of Array.from(doc?.querySelectorAll('script[type="application/ld+json"]') ?? []) as Element[]) {
    try {
      const json = JSON.parse(s.textContent || '{}');
      const arr = Array.isArray(json) ? json : [json];
      for (const node of arr) {
        const t = node?.['@type'];
        if (Array.isArray(t)) schemaTypes.push(...t.map(String));
        else if (typeof t === 'string') schemaTypes.push(t);
      }
    } catch { /* ignore malformed */ }
  }

  const bodyText = doc?.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const wordCount = bodyText ? bodyText.split(' ').length : 0;

  const anchors = Array.from(doc?.querySelectorAll('a[href]') ?? []) as Element[];
  const linksOut: string[] = [];
  let internalLinks = 0;
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    let abs: string;
    try { abs = new URL(href, url).toString(); } catch { continue; }
    try {
      const h = new URL(abs).host;
      if (h === originHost || h.endsWith('.' + originHost) || originHost.endsWith('.' + h)) {
        internalLinks++;
        linksOut.push(normalizeUrl(abs));
      }
    } catch { /* ignore */ }
  }

  const hasForm = (doc?.querySelectorAll('form').length ?? 0) > 0;

  const kind = classifyPageKind(url, title, h1Text);

  return {
    url,
    http_status: status,
    title,
    title_len: title ? title.length : null,
    meta_description: metaDesc,
    meta_description_len: metaDesc ? metaDesc.length : null,
    h1_text: h1Text,
    h1_count: h1s.length,
    image_count: imgs.length,
    images_with_alt: imagesWithAlt,
    schema_types: Array.from(new Set(schemaTypes)),
    word_count: wordCount,
    internal_link_count: internalLinks,
    last_modified: null,
    page_kind: kind,
    links_out: Array.from(new Set(linksOut)),
    has_form: hasForm,
    body_text_sample: bodyText.slice(0, 2000),
  };
}

export async function crawlSite(rootUrl: string): Promise<{
  pages: PageAudit[];
  homeStatus: number | null;
  homeMs: number | null;
  homeHtml: string | null;
  origin: string;
  originHost: string;
  jsHeavy: boolean;
  fetchError: string | null;
}> {
  let origin = '';
  let originHost = '';
  try {
    const u = new URL(rootUrl);
    origin = `${u.protocol}//${u.host}`;
    originHost = u.host.replace(/^www\./, '');
  } catch (e) {
    return { pages: [], homeStatus: null, homeMs: null, homeHtml: null, origin: '', originHost: '', jsHeavy: false, fetchError: `invalid url: ${(e as Error).message}` };
  }

  const robots = await fetchRobots(origin);
  if (!robots.allowsCrawl) {
    return { pages: [], homeStatus: null, homeMs: null, homeHtml: null, origin, originHost, jsHeavy: false, fetchError: 'robots.txt disallows crawl' };
  }

  // Seed with sitemap URLs (preferred), else just the homepage.
  const sitemapUrls = await fetchSitemap(origin, robots.sitemaps);
  const queue: Array<{ url: string; depth: number }> = [];
  const seen = new Set<string>();

  const homeUrl = normalizeUrl(rootUrl);
  queue.push({ url: homeUrl, depth: 0 });
  seen.add(homeUrl);

  for (const u of sitemapUrls.slice(0, MAX_PAGES)) {
    const n = normalizeUrl(u);
    if (!seen.has(n)) {
      seen.add(n);
      queue.push({ url: n, depth: 1 });
    }
  }

  const pages: PageAudit[] = [];
  let homeStatus: number | null = null;
  let homeMs: number | null = null;
  let homeHtml: string | null = null;
  let jsHeavy = false;
  let fetchError: string | null = null;

  while (queue.length && pages.length < MAX_PAGES) {
    const { url, depth } = queue.shift()!;
    try {
      const start = Date.now();
      const res = await fetchWithTimeout(url);
      const ms = Date.now() - start;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/html')) {
        // Track e.g. PDFs as menu hints if URL kind matches
        if (url === homeUrl) { homeStatus = res.status; homeMs = ms; }
        if (/\.pdf($|\?)/i.test(url) || /pdf/.test(ct)) {
          pages.push({
            url, http_status: res.status, title: null, title_len: null,
            meta_description: null, meta_description_len: null,
            h1_text: null, h1_count: 0, image_count: 0, images_with_alt: 0,
            schema_types: [], word_count: 0, internal_link_count: 0,
            last_modified: null, page_kind: classifyPageKind(url, null, null),
            links_out: [], has_form: false, body_text_sample: '',
          });
        }
        continue;
      }
      const html = await res.text();
      if (url === homeUrl) {
        homeStatus = res.status;
        homeMs = ms;
        homeHtml = html;
        // JS-heavy detection: minimal text in body
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const stripped = (bodyMatch?.[1] ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (stripped.length < 500) jsHeavy = true;
      }
      const audit = parsePage(url, html, res.status, originHost);
      pages.push(audit);
      // Enqueue homepage links if no sitemap and depth allows
      if (sitemapUrls.length === 0 && depth < MAX_DEPTH) {
        for (const next of audit.links_out) {
          if (seen.has(next) || seen.size >= MAX_PAGES * 2) continue;
          seen.add(next);
          queue.push({ url: next, depth: depth + 1 });
        }
      }
    } catch (e) {
      if (url === homeUrl) fetchError = `home fetch: ${(e as Error).message}`;
    }
    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  return { pages, homeStatus, homeMs, homeHtml, origin, originHost, jsHeavy, fetchError };
}

export type Inventory = {
  has_menu_page: boolean;
  menu_is_pdf_only: boolean;
  has_happy_hour_page: boolean;
  has_events_page: boolean;
  has_private_party_page: boolean;
  private_party_has_form: boolean;
  private_party_linked_from_home: boolean;
  has_contact_page: boolean;
  has_contact_form: boolean;
  has_about_page: boolean;
  has_reservations_page: boolean;
  has_email_signup: boolean;
  has_social_links: boolean;
  phone_prominent: boolean;
  email_prominent: boolean;
};

export function deriveInventory(pages: PageAudit[], homeUrl: string, homeHtml: string | null): Inventory {
  const menuPages = pages.filter((p) => p.page_kind === 'menu');
  const menuPdfs = menuPages.filter((p) => /\.pdf($|\?)/i.test(p.url));
  const menuHtml = menuPages.filter((p) => !/\.pdf($|\?)/i.test(p.url));
  const privateParty = pages.filter((p) => p.page_kind === 'private_party');
  const contact = pages.filter((p) => p.page_kind === 'contact');
  const home = pages.find((p) => p.url === homeUrl);

  const homeLinks = new Set(home?.links_out ?? []);
  const ppLinkedFromHome = privateParty.some((p) => homeLinks.has(p.url));

  const homeHay = (homeHtml || '').toLowerCase();
  const hasEmailSignup = /newsletter|subscribe|sign[- ]?up.*email|mailing[- ]?list|email[- ]?updates/.test(homeHay)
    || pages.some((p) => /newsletter|subscribe|mailing[- ]?list/i.test(p.body_text_sample));
  const hasSocial = /facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com/.test(homeHay);
  const phoneProminent = /tel:|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(homeHay);
  const emailProminent = /mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(homeHay);

  return {
    has_menu_page: menuPages.length > 0,
    menu_is_pdf_only: menuPages.length > 0 && menuHtml.length === 0 && menuPdfs.length > 0,
    has_happy_hour_page: pages.some((p) => p.page_kind === 'happy_hour'),
    has_events_page: pages.some((p) => p.page_kind === 'events'),
    has_private_party_page: privateParty.length > 0,
    private_party_has_form: privateParty.some((p) => p.has_form),
    private_party_linked_from_home: ppLinkedFromHome,
    has_contact_page: contact.length > 0,
    has_contact_form: contact.some((p) => p.has_form),
    has_about_page: pages.some((p) => p.page_kind === 'about'),
    has_reservations_page: pages.some((p) => p.page_kind === 'reservations'),
    has_email_signup: hasEmailSignup,
    has_social_links: hasSocial,
    phone_prominent: phoneProminent,
    email_prominent: emailProminent,
  };
}

export function aggregateSeo(pages: PageAudit[]) {
  const audited = pages.filter((p) => p.http_status && p.http_status < 400);
  const totalImgs = audited.reduce((s, p) => s + p.image_count, 0);
  const altImgs = audited.reduce((s, p) => s + p.images_with_alt, 0);
  const allSchemas = new Set<string>();
  for (const p of audited) for (const s of p.schema_types) allSchemas.add(s);
  const hasLB = [...allSchemas].some((s) => /^(Local)?(Restaurant|Bar|BarOrPub|LocalBusiness|FoodEstablishment)$/i.test(s));
  return {
    pages_audited: audited.length,
    pages_with_title: audited.filter((p) => (p.title_len ?? 0) >= 10).length,
    pages_with_meta_desc: audited.filter((p) => (p.meta_description_len ?? 0) >= 50).length,
    pages_with_h1: audited.filter((p) => p.h1_count >= 1).length,
    avg_word_count: audited.length ? Math.round(audited.reduce((s, p) => s + p.word_count, 0) / audited.length) : 0,
    image_alt_coverage_pct: totalImgs ? Math.round((altImgs / totalImgs) * 1000) / 10 : null,
    schema_types_detected: [...allSchemas],
    has_localbusiness_schema: hasLB,
  };
}
