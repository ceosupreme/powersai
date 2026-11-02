/**
 * HQ Guide: the owner's user guide. Each article is a Markdown file in
 * src/content/guide named NN-slug.md. Line 1 is "# Title", line 2 is a header
 * comment: <!-- part: X | order: NN | slug: s | route: /path or none | tags: a, b -->
 * The same files feed the PDF copy, so the screen and the PDF never drift.
 */

export type GuideBlock =
  | { type: 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

export interface GuideArticle {
  slug: string;
  order: number;
  part: string;
  route: string | null;
  tags: string[];
  title: string;
  summary: string;
  blocks: GuideBlock[];
  /** Lowercased title, summary, tags and body for search. */
  haystack: string;
}

export interface GuidePart {
  name: string;
  articles: GuideArticle[];
}

const HEADER = /<!--\s*(.*?)\s*-->/;

function parseHeader(line: string): Record<string, string> {
  const m = HEADER.exec(line ?? '');
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const piece of m[1].split('|')) {
    const i = piece.indexOf(':');
    if (i < 0) continue;
    out[piece.slice(0, i).trim().toLowerCase()] = piece.slice(i + 1).trim();
  }
  return out;
}

/** Turns the Markdown subset the guide uses into blocks: ## and ### headings, paragraphs, "- " bullets and "1. " steps. */
export function parseGuideMarkdown(body: string): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ').trim() });
    para = [];
  };
  const flushList = () => {
    if (list && list.items.length) blocks.push(list);
    list = null;
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) { flushPara(); flushList(); continue; }
    const h = /^(#{2,3})\s+(.*)$/.exec(t);
    if (h) { flushPara(); flushList(); blocks.push({ type: h[1].length === 2 ? 'h2' : 'h3', text: h[2].trim() }); continue; }
    const ul = /^[-•]\s+(.*)$/.exec(t);
    const ol = /^\d+[.)]\s+(.*)$/.exec(t);
    if (ul || ol) {
      flushPara();
      const type = ul ? 'ul' : 'ol';
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push((ul ?? ol)![1].trim());
      continue;
    }
    // A wrapped continuation line of a list item stays with that item.
    if (list && /^\s{2,}\S/.test(raw)) { list.items[list.items.length - 1] += ' ' + t; continue; }
    flushList();
    para.push(t);
  }
  flushPara();
  flushList();
  return blocks;
}

export function parseGuideFile(raw: string, fileName = ''): GuideArticle | null {
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/);
  const titleLine = lines.findIndex((l) => /^#\s+/.test(l));
  if (titleLine < 0) return null;
  const title = lines[titleLine].replace(/^#\s+/, '').trim();
  const meta = parseHeader(lines[titleLine + 1] ?? '');
  const fromName = /(\d+)-([a-z0-9-]+)\.md$/i.exec(fileName);
  const order = Number(meta.order ?? fromName?.[1] ?? 999);
  const slug = (meta.slug || fromName?.[2] || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
  const route = meta.route && meta.route !== 'none' ? meta.route : null;
  const tags = (meta.tags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const blocks = parseGuideMarkdown(lines.slice(titleLine + 2).join('\n'));
  // The first paragraph, before any heading, is the article's summary.
  const summary = blocks[0]?.type === 'p' ? blocks[0].text : '';
  const body = summary ? blocks.slice(1) : blocks;
  const text = body.map((b) => ('text' in b ? b.text : b.items.join(' '))).join(' ');
  return {
    slug, order, part: meta.part || 'Other', route, tags, title, summary, blocks: body,
    haystack: [title, summary, tags.join(' '), text].join(' ').toLowerCase(),
  };
}

/** Articles sorted by order and grouped into parts in the order the parts first appear. */
export function buildGuide(files: Record<string, string>): { articles: GuideArticle[]; parts: GuidePart[] } {
  const articles = Object.entries(files)
    .map(([name, raw]) => parseGuideFile(raw, name))
    .filter((a): a is GuideArticle => !!a)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const parts: GuidePart[] = [];
  for (const a of articles) {
    let p = parts.find((x) => x.name === a.part);
    if (!p) { p = { name: a.part, articles: [] }; parts.push(p); }
    p.articles.push(a);
  }
  return { articles, parts };
}

/** Every word of the query must appear somewhere in the article. */
export function searchGuide(articles: GuideArticle[], q: string): GuideArticle[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return articles;
  return articles.filter((a) => words.every((w) => a.haystack.includes(w)));
}

/** A route is directly openable only when it has no placeholders like :venueId. */
export const openableRoute = (route: string | null) => (route && !route.includes(':') ? route.split(/\s|,/)[0] : null);
