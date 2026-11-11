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

/** Content waiting for approval: quality 80+, no hard fails, not approved yet. */
export function isApprovalReady(it: {
  quality_score: number | null;
  quality_fails: string[] | null;
  approved_at: string | null;
}): boolean {
  return (it.quality_score ?? 0) >= 80 && (it.quality_fails ?? []).length === 0 && !it.approved_at;
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
