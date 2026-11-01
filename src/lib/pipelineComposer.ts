import { supabase } from '@/integrations/supabase/client';

const T = (t: string) => (supabase as any).from(t);

export type JobKind = 'content' | 'product' | 'lane' | 'channel_setup';

export interface ComposeInput {
  project_id: string;
  kind: JobKind;
  title: string;
  target_type?: 'content_items' | 'channel_products' | null;
  target_id?: string | null;
  target_key?: string | null;
  product_type?: string | null;
  destinations?: string[];
  monetization?: string[];
  promotion?: string[];
  level: number;
  money_destination?: string | null;
  /** Lane jobs: the foundation item key. */
  lane_item_key?: string | null;
  /** Channel setup jobs: the channel's governing method. */
  channel_method_id?: string | null;
  /** Channel setup jobs: playbook key used when no method id is given. */
  channel_method_key?: string | null;
  /** Replace the standard steps (e.g. the media kit setup). */
  custom_steps?: PlannedStep[] | null;
  /** Niche playbook ids: context only, never steps. */
  niche_ids?: string[];
}

export interface MethodRow {
  id: string; title: string; version: string | null; status: string | null;
  tags: string[] | null; key_points: string | null; subcategory: string | null;
}

export interface KeyPoints {
  kind?: string;
  /** Money paths: setup steps for the lane itself. Production jobs use only adds. */
  setup?: { n?: number; title: string; owner?: string; check?: string }[];
  steps?: { n?: number; title: string; owner?: string; check?: string }[];
  adds?: { title: string; owner?: string }[];
  planned?: boolean;
}

export interface PlannedStep {
  title: string;
  owner_kind: 'claude' | 'owner';
  method_id: string | null;
  method_key: string | null;
  check?: string | null;
  detail?: string | null;
  due_in_days?: number;
}

export const methodKey = (m: { tags: string[] | null }) =>
  (m.tags ?? []).find((t) => t.startsWith('key:'))?.slice(4) ?? null;

export function parseKeyPoints(raw: string | null | undefined): KeyPoints {
  if (!raw) return {};
  try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

const ownerOf = (o?: string): 'claude' | 'owner' => (o === 'claude' ? 'claude' : 'owner');

export const isPlannedMethod = (m: MethodRow) => m.status === 'draft' || parseKeyPoints(m.key_points).planned === true;

const placeholder = (m: MethodRow): PlannedStep => ({
  title: `Method not written yet: ${m.title}`, owner_kind: 'claude', method_id: m.id, method_key: methodKey(m),
});

const PRODUCT_PUBLISH = /^(Click Publish|Publish|List it)/;
const DEST_PUBLISH = /^(Publish|Create the listing|List it|Click Publish)/;

/** Pure step builder for content and product jobs. */
export function buildRecipeSteps(
  brandRules: MethodRow | null,
  productType: MethodRow | null,
  destinations: MethodRow[],
  monetization: MethodRow[],
  promotion: MethodRow[],
): PlannedStep[] {
  const steps: PlannedStep[] = [
    { title: 'Brand rules check', owner_kind: 'claude', method_id: brandRules?.id ?? null, method_key: brandRules ? methodKey(brandRules) : null },
  ];
  const fromMethod = (m: MethodRow, skip?: (title: string) => boolean) => {
    if (isPlannedMethod(m)) { steps.push(placeholder(m)); return; }
    for (const s of parseKeyPoints(m.key_points).steps ?? []) {
      if (skip?.(s.title)) continue;
      steps.push({ title: s.title, owner_kind: ownerOf(s.owner), method_id: m.id, method_key: methodKey(m), check: s.check ?? null });
    }
  };
  const productHasPublish = !!productType && !isPlannedMethod(productType)
    && (parseKeyPoints(productType.key_points).steps ?? []).some((s) => PRODUCT_PUBLISH.test(s.title));
  if (productType) fromMethod(productType);
  for (const d of destinations) fromMethod(d, productHasPublish ? (t) => DEST_PUBLISH.test(t) : undefined);
  for (const m of [...monetization, ...promotion]) {
    if (isPlannedMethod(m)) { steps.push(placeholder(m)); continue; }
    for (const a of parseKeyPoints(m.key_points).adds ?? []) {
      steps.push({ title: a.title, owner_kind: ownerOf(a.owner), method_id: m.id, method_key: methodKey(m) });
    }
  }
  return steps;
}

const LANE_KEYS = ['etsy', 'kdp', 'youtube', 'pinterest', 'payhip', 'gumroad', 'shopify', 'tiktok', 'instagram', 'facebook', 'blog', 'email'];
export const laneDestinationKey = (itemKey: string) => LANE_KEYS.find((k) => itemKey.toLowerCase().includes(k)) ?? null;

export function laneSteps(br: MethodRow | null, dest: MethodRow | null, setupDetail: string): PlannedStep[] {
  const mid = dest?.id ?? br?.id ?? null;
  const mkey = dest ? methodKey(dest) : br ? methodKey(br) : null;
  return [
    { title: 'Set up the accounts this avenue needs', owner_kind: 'owner', method_id: mid, method_key: mkey, detail: setupDetail },
    { title: 'First product or piece for this avenue', owner_kind: 'claude', method_id: mid, method_key: mkey },
    { title: 'List or publish it', owner_kind: 'owner', method_id: mid, method_key: mkey },
    { title: 'Promotion plan: three pieces pointing at it', owner_kind: 'claude', method_id: mid, method_key: mkey },
    { title: '30-day check: what sold or ranked', owner_kind: 'claude', method_id: mid, method_key: mkey, due_in_days: 30 },
  ];
}

export function channelSetupSteps(br: MethodRow | null, ch: MethodRow | null): PlannedStep[] {
  const mid = ch?.id ?? br?.id ?? null;
  const mkey = ch ? methodKey(ch) : br ? methodKey(br) : null;
  return [
    { title: 'Create or confirm the account and handle', owner_kind: 'owner', method_id: mid, method_key: mkey },
    { title: 'Profile copy, link and brand mark from the kit', owner_kind: 'claude', method_id: mid, method_key: mkey },
    { title: 'Apply the profile and connect the scheduler', owner_kind: 'owner', method_id: mid, method_key: mkey },
    { title: "First five pieces at this channel's level", owner_kind: 'claude', method_id: mid, method_key: mkey },
    { title: 'Cadence check in 14 days', owner_kind: 'claude', method_id: mid, method_key: mkey, due_in_days: 14 },
  ];
}

/** Row fields for one step; depends_on is set by the caller. */
export function stepRow(s: PlannedStep, i: number, ctx: { project_id: string; job_id: string; user_id: string | null }, today = new Date()) {
  const owner = s.owner_kind === 'owner';
  const due = s.due_in_days != null ? new Date(today.getTime() + s.due_in_days * 86400000).toISOString().slice(0, 10) : null;
  return {
    bar_id: ctx.project_id,
    venue_id: ctx.project_id,
    job_id: ctx.job_id,
    step_order: i + 1,
    method_id: s.method_id,
    owner_kind: s.owner_kind,
    title: s.title,
    detail: s.detail ?? s.check ?? null,
    facts: JSON.stringify({ method: s.method_key ?? '', checks: s.check ? [s.check] : [] }),
    status: 'Open',
    approval_status: owner ? (i === 0 ? 'Approved' : 'Blocked') : 'Auto',
    priority: owner ? 'P2-High' : 'P3-Medium',
    assignee: owner ? 'Allmighty' : 'Claude',
    source: 'pipeline',
    is_manual: true,
    created_by_id: ctx.user_id,
    due_date: due,
  };
}

export const recipeEntry = (m: MethodRow) => ({ id: m.id, key: methodKey(m) ?? '', title: m.title, version: m.version ?? '', status: m.status ?? '' });

/** "key:a@1.0+key:b@1.1" */
export const recipeVersionString = (recipe: { key: string; version: string }[]) =>
  recipe.map((r) => `key:${r.key}@${r.version}`).join('+');

const KB_COLS = 'id,title,version,status,tags,key_points,subcategory';

/** Recipe order: brand rules, niches, product type, destinations, monetization, promotion. */
export function orderRecipe(brandRules: MethodRow | null, niches: MethodRow[], rest: (MethodRow | null)[]): MethodRow[] {
  return [brandRules, ...niches, ...rest].filter(Boolean) as MethodRow[];
}

async function methodsByKeys(keys: string[]): Promise<Map<string, MethodRow>> {
  const out = new Map<string, MethodRow>();
  const list = [...new Set(keys.filter(Boolean))];
  if (!list.length) return out;
  const { data, error } = await T('knowledge_base').select(KB_COLS).in('status', ['active', 'draft'])
    .overlaps('tags', list.map((k) => `key:${k}`));
  if (error) throw error;
  for (const r of (data ?? []) as MethodRow[]) {
    const k = methodKey(r);
    if (k && !out.has(k)) out.set(k, r);
  }
  return out;
}

/** Create the job and its steps; returns the job id. */
export async function composePipeline(input: ComposeInput): Promise<{ jobId: string; recipe: ReturnType<typeof recipeEntry>[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  const brRes = await T('knowledge_base').select(KB_COLS).eq('venue_id', input.project_id).eq('subcategory', 'brand_rules').limit(1);
  if (brRes.error) throw brRes.error;
  const brandRules: MethodRow | null = (brRes.data ?? [])[0] ?? null;

  let niches: MethodRow[] = [];
  if (input.niche_ids?.length) {
    const nr = await T('knowledge_base').select(KB_COLS).in('id', input.niche_ids).eq('subcategory', 'niche');
    if (nr.error) throw nr.error;
    const byId = new Map(((nr.data ?? []) as MethodRow[]).map((r) => [r.id, r]));
    niches = input.niche_ids.map((id) => byId.get(id)).filter(Boolean) as MethodRow[];
  }

  let recipeRows: MethodRow[] = [];
  let steps: PlannedStep[];

  if (input.kind === 'lane') {
    const destKey = input.lane_item_key ? laneDestinationKey(input.lane_item_key) : null;
    const dest = destKey ? (await methodsByKeys([destKey])).get(destKey) ?? null : null;
    const st = await T('venue_foundation_item_status').select('item_key,status').eq('venue_id', input.project_id);
    if (st.error) throw st.error;
    const { data: venue } = await T('venues').select('project_type').eq('id', input.project_id).maybeSingle();
    const { fetchEffectiveFoundationItems } = await import('@/lib/effectiveFoundation');
    const items = venue?.project_type ? await fetchEffectiveFoundationItems(input.project_id, venue.project_type) : [];
    const statusBy = new Map(((st.data ?? []) as any[]).map((r) => [r.item_key, r.status]));
    const open = items.filter((i) => !i.item_key.startsWith('lane_') && statusBy.get(i.item_key) !== 'satisfied');
    const detail = open.length ? `Setup items not on yet:\n${open.map((i) => `- ${i.label}`).join('\n')}` : 'All setup items are on.';
    recipeRows = orderRecipe(brandRules, niches, [dest]);
    steps = laneSteps(brandRules, dest, detail);
  } else if (input.kind === 'channel_setup') {
    let ch: MethodRow | null = null;
    if (input.channel_method_id) {
      const r = await T('knowledge_base').select(KB_COLS).eq('id', input.channel_method_id).maybeSingle();
      if (r.error) throw r.error;
      ch = r.data ?? null;
    } else if (input.channel_method_key) {
      ch = (await methodsByKeys([input.channel_method_key])).get(input.channel_method_key) ?? null;
    }
    recipeRows = orderRecipe(brandRules, niches, [ch]);
    steps = input.custom_steps?.length
      ? input.custom_steps.map((s) => ({ ...s, method_id: s.method_id ?? ch?.id ?? null, method_key: s.method_key ?? (ch ? methodKey(ch) : null) }))
      : channelSetupSteps(brandRules, ch);
  } else {
    const keys = [input.product_type ?? '', ...(input.destinations ?? []), ...(input.monetization ?? []), ...(input.promotion ?? [])];
    const by = await methodsByKeys(keys);
    const pick = (ks: string[] = []) => ks.map((k) => by.get(k)).filter(Boolean) as MethodRow[];
    const pt = input.product_type ? by.get(input.product_type) ?? null : null;
    const dest = pick(input.destinations), mon = pick(input.monetization), pro = pick(input.promotion);
    recipeRows = orderRecipe(brandRules, niches, [pt, ...dest, ...mon, ...pro]);
    steps = buildRecipeSteps(brandRules, pt, dest, mon, pro);
  }

  const recipe = recipeRows.map(recipeEntry);
  const jobRes = await T('production_jobs').insert({
    project_id: input.project_id,
    kind: input.kind,
    title: input.title,
    target_type: input.target_type ?? null,
    target_id: input.target_id ?? null,
    target_key: input.target_key ?? null,
    recipe,
    level: input.level,
    money_destination: input.money_destination || null,
    status: steps[0]?.owner_kind === 'owner' ? 'ready' : 'running',
    current_step: 1,
    created_by: 'owner',
    result_links: [],
  }).select('id').single();
  if (jobRes.error) throw jobRes.error;
  const jobId = jobRes.data.id as string;

  let prev: string | null = null;
  for (let i = 0; i < steps.length; i++) {
    const row = { ...stepRow(steps[i], i, { project_id: input.project_id, job_id: jobId, user_id: user?.id ?? null }), depends_on: prev };
    const ins = await supabase.from('action_items').insert(row as any).select('id').single();
    if (ins.error) throw ins.error;
    prev = ins.data.id;
  }
  return { jobId, recipe };
}

// ---------- Prefill helpers ----------
const PLATFORM_TO_DEST: Record<string, string> = {
  youtube: 'youtube', facebook_page: 'facebook_page', instagram: 'instagram', pinterest: 'pinterest',
  tiktok: 'tiktok', blog: 'blog', website: 'own_site', etsy_shop: 'etsy', kdp_author: 'kdp',
  shopify_store: 'shopify', fourthwall_store: 'fourthwall', niche_navigator: 'niche_navigator',
};
export const platformToDestination = (p: string) => PLATFORM_TO_DEST[p] ?? null;

const OUTLET_TO_DEST: Record<string, string> = {
  'Amazon KDP': 'kdp', Kindle: 'kdp', Etsy: 'etsy', Payhip: 'payhip', Gumroad: 'gumroad', 'Own store': 'own_site',
};
export const outletToDestination = (o: string) => OUTLET_TO_DEST[o] ?? null;

export function productTypeForFormat(format: string | null | undefined): string {
  const f = (format ?? '').toLowerCase();
  if (f.includes('long_form') || f.includes('long-form')) return 'long_form_video';
  if (f.includes('short') || f.includes('reel')) return 'short_video';
  if (f.includes('printable')) return 'printable';
  if (f.includes('book')) return 'written_book';
  if (f.includes('article')) return 'blog_article';
  return 'social_piece';
}

export function productTypeForName(name: string): string {
  const n = name.toLowerCase();
  if (/word search|puzzle/.test(n)) return 'puzzle_book';
  if (/planner|tracker|\blog\b|journal/.test(n)) return 'journal_tracker';
  if (/coloring/.test(n)) return 'coloring_book';
  if (/activity/.test(n)) return 'kids_activity_book';
  if (/bundle/.test(n)) return 'bundle';
  if (/template/.test(n)) return 'canva_template';
  if (/guide|ebook|book/.test(n)) return 'written_book';
  return 'printable';
}

export const skillOf = (tags: string[] | null | undefined) => {
  const t = (tags ?? []).find((x) => x.startsWith('skill:') || x.startsWith('pack:'));
  return t ? t.slice(t.indexOf(':') + 1) : null;
};

/** Plain-text starter prompt for a Claude step. */
export function buildStarterPrompt(a: {
  brand: string; jobId: string; jobTitle: string; moneyDestination: string | null;
  stepOrder: number | null; stepTitle: string;
  method: { title: string; version: string | null; tags?: string[] | null } | null;
  facts: { inputs?: unknown[]; expected_output?: string; checks?: unknown[]; links?: Record<string, unknown> } | null;
}): string {
  const f = a.facts ?? {};
  const lines = [
    `Brand: ${a.brand}`,
    `Job: ${a.jobTitle}`,
    `Money destination: ${a.moneyDestination || 'not set'}`,
    `Step ${a.stepOrder ?? '?'}: ${a.stepTitle}`,
    `Playbook: ${a.method ? `${a.method.title}${a.method.version ? ` v${a.method.version}` : ''}` : 'none'}`,
    `Skill to load: ${skillOf(a.method?.tags) ?? 'none listed'}`,
    `Inputs: ${(f.inputs ?? []).length ? (f.inputs ?? []).map(String).join('; ') : 'none listed'}`,
    `Expected output: ${f.expected_output || 'not specified'}`,
    `Checks: ${(f.checks ?? []).length ? (f.checks ?? []).map(String).join('; ') : 'none listed'}`,
    `Links: ${f.links && Object.keys(f.links).length ? Object.entries(f.links).map(([k, v]) => `${k}: ${v}`).join('; ') : 'none'}`,
    '',
    `Write the result back to Supreme Team HQ: mark step ${a.stepOrder ?? '?'} of job ${a.jobId} Done with the output link.`,
  ];
  return lines.join('\n');
}
