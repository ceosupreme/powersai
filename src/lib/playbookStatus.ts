/** One place that decides a playbook's status word. Used by every screen. */
export type PlaybookWord = 'Planned' | 'Written' | 'Thin' | 'Superseded' | 'Archived';

export interface PlaybookStatusInput {
  status: string | null;
  expiry_date: string | null;
  full_text?: string | null;
  tags?: string[] | null;
  key_points?: string | null;
}

export const todayPT = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

const stepCount = (raw: string | null | undefined) => {
  if (!raw) return 0;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return 0;
    const n = (x: unknown) => (Array.isArray(x) ? x.length : 0);
    return n(v.steps) + n(v.setup);
  } catch { return 0; }
};

export function playbookStatus(r: PlaybookStatusInput, today = todayPT()): PlaybookWord {
  if (r.status === 'superseded') return 'Superseded';
  if (r.status === 'archived') return 'Archived';
  if (r.status === 'draft') return 'Planned';
  if (r.status !== 'active') return 'Thin';
  const current = !r.expiry_date || r.expiry_date >= today;
  const deep = (r.full_text?.length ?? 0) >= 1500
    || (r.tags ?? []).some((t) => t.startsWith('skill:') || t.startsWith('pack:'))
    || stepCount(r.key_points) >= 5;
  return current && deep ? 'Written' : 'Thin';
}

export const isHiddenPlaybook = (r: { status: string | null }) => r.status === 'superseded' || r.status === 'archived';

export function countWords(rows: PlaybookStatusInput[], today = todayPT()) {
  const c = { Written: 0, Thin: 0, Planned: 0 };
  for (const r of rows) {
    const w = playbookStatus(r, today);
    if (w === 'Written' || w === 'Thin' || w === 'Planned') c[w]++;
  }
  return c;
}

export const countsLine = (c: { Written: number; Thin: number; Planned: number }) =>
  [`${c.Written} written`, `${c.Thin} thin`, `${c.Planned} planned`].join(', ');

export const SHELVES = [
  { key: 'formats', label: 'Formats', subs: ['product_type'] },
  { key: 'platforms', label: 'Platforms', subs: ['destination'] },
  { key: 'money', label: 'Money paths', subs: ['monetization'] },
  { key: 'niches', label: 'Niches', subs: ['niche'] },
  { key: 'promotion', label: 'Promotion', subs: ['promotion'] },
  { key: 'rules', label: 'Rules', subs: ['platform_requirement', 'brand_rules'] },
  { key: 'plays', label: 'Plays', subs: ['play'] },
] as const;

export const NICHE_GROUPS = [
  'Pets', 'Health and wellness', 'Safety and self-reliance', 'Money and business', 'Local and city',
  'Music and nightlife', 'Faith and spirit', 'Lifestyle and hobbies', 'Cross-brand buyers',
];
const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Match a key_points.group value (name or slug) to a display group. */
export const nicheGroupLabel = (g: string | null | undefined) =>
  !g ? 'Other' : NICHE_GROUPS.find((n) => slug(n) === slug(g)) ?? g;

const PLATFORM_KEY: Record<string, string | null> = {
  youtube: 'youtube', facebook_page: 'facebook_page', instagram: 'instagram', pinterest: 'pinterest', tiktok: 'tiktok',
  blog: 'blog', website: 'own_site', etsy_shop: 'etsy', kdp_author: 'kdp', shopify_store: 'shopify',
  fourthwall_store: 'fourthwall', payhip: 'payhip', spotify: null,
};
export const platformPlaybookKey = (p: string) => (p in PLATFORM_KEY ? PLATFORM_KEY[p] : p);

export const SOURCE_KINDS: { value: string; label: string }[] = [
  { value: 'ai_report', label: 'AI research report' },
  { value: 'youtube_video', label: 'YouTube video' },
  { value: 'x_post', label: 'X post' },
  { value: 'course', label: 'Course' },
  { value: 'owner_note', label: 'My own notes' },
  { value: 'web_article', label: 'Web article' },
  { value: 'book', label: 'Book' },
  { value: 'other', label: 'Other' },
];
export const sourceKindWord = (k: string) => SOURCE_KINDS.find((s) => s.value === k)?.label ?? k;

export function sourceStatusWord(s: { status: string; merged_version: string | null; merge_notes: string | null }) {
  if (s.status === 'merged') return `Merged into v${s.merged_version ?? '?'}`;
  if (s.status === 'rejected') return `Rejected: ${s.merge_notes ?? 'no reason given'}`;
  if (s.status === 'assigned') return 'Assigned';
  return 'New';
}

/** venue:<id> tags. */
export const venueTags = (tags: string[] | null | undefined) =>
  (tags ?? []).filter((t) => t.startsWith('venue:')).map((t) => t.slice(6));

/** Applies to a brand: tagged for it, owned by it, or company-wide (no brand at all). */
export function appliesToBrand(r: { tags: string[] | null; venue_id: string | null }, brandId: string) {
  const vt = venueTags(r.tags);
  if (vt.includes(brandId) || r.venue_id === brandId) return true;
  return vt.length === 0 && !r.venue_id;
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}
