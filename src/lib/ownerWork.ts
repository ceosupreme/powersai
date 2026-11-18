import { canApproveFinishedContent } from '@/lib/contentReadiness';
/**
 * Pure rules shared by Next 10, Waiting on me, the Portfolio cards, the brand
 * workspace and the pipeline page. No data access here so the rules can be tested.
 */

export interface DependentStep {
  owner_kind?: string | null;
  depends_on?: string | null;
}

/** Steps Claude runs never appear in the owner's lists. */
export function isClaudeStep(row: { owner_kind?: string | null }): boolean {
  return row.owner_kind === 'claude';
}

/** True when the row waits on another action item that is not Done. */
export function isBlockedByDependency(
  row: { depends_on?: string | null },
  statusById: Map<string, string | null | undefined>,
): boolean {
  if (!row.depends_on) return false;
  return statusById.get(row.depends_on) !== 'Done';
}

/** The owner-list rule: not a Claude step, and not waiting on an unfinished step. */
export function isOwnerVisible(
  row: DependentStep,
  statusById: Map<string, string | null | undefined>,
): boolean {
  return !isClaudeStep(row) && !isBlockedByDependency(row, statusById);
}

/** Dependency ids that are not already in the loaded rows. */
export function missingDependencyIds(rows: { id: string; depends_on?: string | null }[]): string[] {
  const have = new Set(rows.map((r) => r.id));
  return [...new Set(rows.map((r) => r.depends_on).filter((d): d is string => !!d && !have.has(d)))];
}

/** Link directly to a particular step without changing existing plan routes. */
export function pipelineHref(projectId: string, jobId: string, stepId?: string | null): string {
  const route = `/project/${projectId}/jobs/${jobId}`;
  return stepId ? `${route}?step=${encodeURIComponent(stepId)}` : route;
}

/**
 * Scripts, ideas, plans and other finished pieces that wait for the owner's OK are
 * action items filed with this source. They show first in Waiting on me and stay
 * out of Next 10 until decided, so one list holds them.
 */
export const APPROVAL_CARD_SOURCE = 'your_ok';

/** Approval state after the owner sends a piece back with notes; the reviser picks it up. */
export const CHANGES_REQUESTED = 'Changes requested';

export function isApprovalCard(row: { source?: string | null }): boolean {
  return row.source === APPROVAL_CARD_SOURCE;
}

const APPROVAL_KIND_WORDS: Record<string, string> = {
  script: 'Script', idea: 'Idea', plan: 'Plan', character: 'Character sheet', design: 'Design',
  shot_list: 'Shot list', brand_kit: 'Brand kit', pick: 'Pick one', footage: 'Stills and clips', post: 'Post',
};

/** The word shown on an approval card's badge, from facts.kind. */
export function approvalKindWord(facts: StepFacts | null): string {
  const k = typeof facts?.kind === 'string' ? facts.kind.trim().toLowerCase() : '';
  return APPROVAL_KIND_WORDS[k] ?? 'Review';
}

/** The piece itself: the first saved link that leaves HQ, else the first saved link. */
export function approvalOpenLink(links: TaskLink[]): TaskLink | null {
  return links.find((l) => !l.internal) ?? links[0] ?? null;
}

/** Only finished deliverables, not title-only concepts, wait for final approval. */
export function isApprovalReady(it: {
  quality_score: number | null;
  quality_fails: string[] | null;
  approved_at: string | null;
  brief?: unknown;
  format?: string | null;
  stage?: string | null;
  cta?: string | null;
  purpose_type?: string | null;
}): boolean {
  return !it.approved_at && canApproveFinishedContent(it);
}

const DAY_MS = 86_400_000;

/** STALE when a cadence is set and the last post is missing or older than ceil(7 / cadence) days. */
export function isChannelStale(
  ch: { cadence_target: number | null; last_post_at: string | null },
  now = Date.now(),
): boolean {
  const cadence = ch.cadence_target == null ? null : Number(ch.cadence_target);
  if (cadence == null || !Number.isFinite(cadence) || cadence <= 0) return false;
  if (!ch.last_post_at) return true;
  const t = new Date(ch.last_post_at).getTime();
  if (!Number.isFinite(t)) return true;
  const limitDays = Math.ceil(7 / cadence);
  return now - t > limitDays * DAY_MS;
}

export type StepStatus = 'done' | 'blocked' | 'ready' | 'decision' | 'queued' | 'open';

export const STEP_STATUS_WORD: Record<StepStatus, string> = {
  done: 'Done',
  blocked: 'Blocked',
  ready: 'Ready',
  decision: 'Awaiting your decision',
  queued: 'Assigned to Claude',
  open: 'Open',
};

/** Pipeline step status, in the order the rules are written. */
export function deriveStepStatus(
  step: { status: string | null; owner_kind: string | null; depends_on: string | null; title: string | null },
  statusById: Map<string, string | null | undefined>,
): StepStatus {
  if (step.status === 'Done') return 'done';
  if (isBlockedByDependency(step, statusById)) return 'blocked';
  if (step.owner_kind === 'owner') return (step.title ?? '').startsWith('Decision') ? 'decision' : 'ready';
  if (step.owner_kind === 'claude') return 'queued';
  return 'open';
}

export const OWNER_WORD: Record<string, string> = { claude: 'Claude', owner: 'You', agent: 'Agent', tool: 'Tool' };

export interface StepFacts {
  method?: string;
  inputs?: string[];
  expected_output?: string;
  checks?: string[];
  links?: Record<string, string>;
  [k: string]: unknown;
}

/** facts is TEXT holding JSON; fall back to the raw text. */
export function parseFacts(raw: string | null | undefined): { facts: StepFacts | null; text: string | null } {
  if (!raw || !raw.trim()) return { facts: null, text: null };
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return { facts: v as StepFacts, text: null };
    return { facts: null, text: raw };
  } catch {
    return { facts: null, text: raw };
  }
}

/** key_points is TEXT holding JSON with a steps array. */
export function parseKeyPointSteps(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    const steps = Array.isArray(v) ? v : v?.steps;
    if (!Array.isArray(steps)) return [];
    return steps
      .map((s: any) => (typeof s === 'string' ? s : s?.text ?? s?.title ?? s?.step ?? JSON.stringify(s)))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** First link to open for a step: facts.links first, then output_url. */
export function firstStepLink(facts: StepFacts | null, outputUrl: string | null | undefined): string | null {
  const links = facts?.links ? Object.values(facts.links).filter((u) => typeof u === 'string' && u) : [];
  return (links[0] as string | undefined) ?? outputUrl ?? null;
}

/** "Radar dimension — Structure: How To" -> "Structure". */
export function dimensionShelf(title: string): string | null {
  const m = title.match(/—\s*([^:]+):/);
  return m ? m[1].trim() : null;
}

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const s = Math.round((now - t) / 1000);
  const future = s < 0;
  const a = Math.abs(s);
  const fmt = (n: number, u: string) => (future ? `in ${n} ${u}${n === 1 ? '' : 's'}` : `${n} ${u}${n === 1 ? '' : 's'} ago`);
  if (a < 60) return future ? 'soon' : 'just now';
  if (a < 3600) return fmt(Math.floor(a / 60), 'minute');
  if (a < 86400) return fmt(Math.floor(a / 3600), 'hour');
  if (a < 86400 * 30) return fmt(Math.floor(a / 86400), 'day');
  if (a < 86400 * 365) return fmt(Math.floor(a / (86400 * 30)), 'month');
  return fmt(Math.floor(a / (86400 * 365)), 'year');
}

export function monthBounds(d = new Date()): { start: string; next: string; monthStart: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const s = new Date(y, m, 1);
  const n = new Date(y, m + 1, 1);
  return {
    start: s.toISOString(),
    next: n.toISOString(),
    monthStart: `${y}-${String(m + 1).padStart(2, '0')}-01`,
  };
}

export const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube', facebook_page: 'Facebook page', facebook_profile: 'Facebook profile',
  instagram: 'Instagram', pinterest: 'Pinterest', tiktok: 'TikTok', blog: 'Blog', website: 'Website',
  etsy_shop: 'Etsy shop', kdp_author: 'KDP author', shopify_store: 'Shopify store',
  fourthwall_store: 'Fourthwall store', niche_navigator: 'Niche Navigator', linkedin: 'LinkedIn',
  google_business: 'Google Business',
};

export const platformLabel = (p: string) => PLATFORM_LABELS[p] ?? p.replace(/_/g, ' ');


/** One place a task can be done: a page in HQ (internal) or another site. */
export interface TaskLink { label: string; url: string; internal: boolean }

/** Sign-in pages for the tools tasks name. First match per tool; the order sets the button order. */
const TOOL_LINKS: [RegExp, string, string][] = [
  [/go ?high ?level|highlevel|\bghl\b/i, 'Open GoHighLevel', 'https://app.gohighlevel.com/'],
  [/meta business suite|facebook page|\binstagram\b/i, 'Open Meta Business Suite', 'https://business.facebook.com/latest/home'],
  [/youtube/i, 'Open YouTube Studio', 'https://studio.youtube.com/'],
  [/\bkdp\b|kindle direct/i, 'Open KDP Bookshelf', 'https://kdp.amazon.com/en_US/bookshelf'],
  [/\betsy\b/i, 'Open Etsy Shop Manager', 'https://www.etsy.com/your/shops/me/dashboard'],
  [/payhip/i, 'Open Payhip', 'https://payhip.com/dashboard'],
  [/printful/i, 'Open Printful', 'https://www.printful.com/dashboard'],
  [/shopify/i, 'Open Shopify admin', 'https://admin.shopify.com/'],
  [/fourthwall/i, 'Open Fourthwall', 'https://my.fourthwall.com/'],
  [/tiktok/i, 'Open TikTok Studio', 'https://www.tiktok.com/tiktokstudio'],
  [/pinterest/i, 'Open Pinterest Business Hub', 'https://www.pinterest.com/business/hub/'],
  [/metricool/i, 'Open Metricool', 'https://app.metricool.com/'],
  [/lovable/i, 'Open Lovable', 'https://lovable.dev/'],
  [/github/i, 'Open GitHub', 'https://github.com/'],
  [/stripe/i, 'Open Stripe', 'https://dashboard.stripe.com/'],
  [/canva/i, 'Open Canva', 'https://www.canva.com/'],
  [/vidiq/i, 'Open vidIQ', 'https://app.vidiq.com/'],
  [/google business/i, 'Open Google Business Profile', 'https://business.google.com/'],
  [/godaddy/i, 'Open GoDaddy', 'https://dcc.godaddy.com/'],
  [/airtable/i, 'Open Airtable', 'https://airtable.com/'],
  [/higgsfield/i, 'Open Higgsfield', 'https://higgsfield.ai/'],
  [/gmail/i, 'Open Gmail drafts', 'https://mail.google.com/mail/u/0/#drafts'],
  [/\bwhop\b/i, 'Open Whop', 'https://whop.com/dashboard/'],
  [/amazon associates/i, 'Open Amazon Associates', 'https://affiliate-program.amazon.com/'],
  [/\(impact\)|impact\.com/i, 'Open Impact', 'https://app.impact.com/'],
  [/google ads/i, 'Open Google Ads', 'https://ads.google.com/'],
  [/\bga4\b|google analytics/i, 'Open Google Analytics', 'https://analytics.google.com/'],
  [/pixel/i, 'Open Meta Events Manager', 'https://business.facebook.com/events_manager2'],
  [/google calendar/i, 'Open Google Calendar', 'https://calendar.google.com/'],
  [/chatgpt/i, 'Open ChatGPT', 'https://chatgpt.com/'],
  [/gemini/i, 'Open Gemini', 'https://gemini.google.com/'],
  [/gumroad/i, 'Open Gumroad', 'https://gumroad.com/dashboard'],
  [/udemy/i, 'Open Udemy', 'https://www.udemy.com/instructor/courses/'],
  [/\bdomain\b/i, 'Check the domain on GoDaddy', 'https://www.godaddy.com/domains'],
  [/drive folder|google drive/i, 'Open Google Drive', 'https://drive.google.com/'],
  [/scheduled task|claude chat/i, 'Open Claude', 'https://claude.ai/'],
];

const HOST_LABELS: [RegExp, string][] = [
  [/docs\.google\.com\/document/, 'Open the Google Doc'],
  [/docs\.google\.com\/spreadsheets/, 'Open the Google Sheet'],
  [/drive\.google\.com/, 'Open the Drive folder'],
  [/claude\.ai/, 'Open in Claude'],
];

const titleCase = (k: string) => k.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function urlLabel(url: string): string {
  for (const [re, label] of HOST_LABELS) if (re.test(url)) return label;
  try { return `Open ${new URL(url).hostname.replace(/^www\./, '')}`; } catch { return 'Open link'; }
}

/**
 * Where to go to do a task, most specific first: links saved on the task
 * (facts.links, output_url), web addresses written in its text, the tools its
 * text names, then the HQ step or brand page it belongs to.
 */
export function taskLinks(t: {
  title?: string | null; detail?: string | null; why?: string | null;
  facts?: string | null; outputUrl?: string | null;
  projectId?: string | null; jobId?: string | null; stepId?: string | null;
}): TaskLink[] {
  const out: TaskLink[] = [];
  const seen = new Set<string>();
  const add = (label: string, url: string) => {
    const u = url.trim();
    const internal = u.startsWith('/');
    if (!u || (!internal && !/^https?:\/\//i.test(u))) return;
    const key = u.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, url: u, internal });
  };

  const { facts } = parseFacts(t.facts);
  for (const [k, u] of Object.entries(facts?.links ?? {})) if (typeof u === 'string') add(titleCase(k), u);
  if (t.outputUrl) add('Open the finished piece', t.outputUrl);

  const text = [t.title, t.detail, t.why].filter(Boolean).join('\n');
  for (const m of text.match(/https?:\/\/[^\s"'<>)\]]+/gi) ?? []) {
    const u = m.replace(/[.,;:!?]+$/, '');
    add(urlLabel(u), u);
  }
  const haystack = `${text}\n${typeof facts?.method === 'string' ? facts.method.replace(/_/g, ' ') : ''}`;
  // A saved or written link to a tool beats that tool's front door.
  const hosts = new Set(out.filter((l) => !l.internal).map((l) => new URL(l.url).hostname));
  for (const [re, label, url] of TOOL_LINKS) if (re.test(haystack) && !hosts.has(new URL(url).hostname)) add(label, url);

  if (t.projectId && t.jobId) add('Open this step in HQ', pipelineHref(t.projectId, t.jobId, t.stepId));
  else if (t.projectId) add('Open this brand in HQ', `/project/${t.projectId}`);
  return out.slice(0, 8);
}
