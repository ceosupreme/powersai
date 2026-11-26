import { formatDistanceToNow } from 'date-fns';

export interface AgentHandoffRow {
  id: string;
  created_at: string;
  updated_at: string;
  from_agent: string;
  to_agent: string;
  kind: string;
  title: string;
  status: string;
  schedule: string | null;
  due_at: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  last_run_at: string | null;
  parent_id: string | null;
  venue_id: string | null;
  brand_ids: string[];
  owner_question: string | null;
  notes: string | null;
  spec: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  result_links: unknown;
  action_item_id: string | null;
  content_item_id: string | null;
  studio_lease_expires_at: string | null;
}

export interface ProofLink { url: string; label: string }
export interface PublishedLink { url: string; platform: string; posted_at?: string; by?: string }
export interface NeedsYouItem {
  id: string;
  answerRowId: string;
  row: AgentHandoffRow;
  parentRow?: AgentHandoffRow;
  brandIds: string[];
  question: string | null;
  whatHappened: string | null;
  createdAt: string;
}
export interface FailureGroup { reason: string; rows: AgentHandoffRow[]; ids: string[] }
export interface ReadableSpecEntry { label: string; value: string }

export const AGENTS = ['claude', 'muse', 'chatgpt'] as const;
export type AgentKey = typeof AGENTS[number];

export function agentLabel(agent: string | null | undefined): string {
  const a = (agent ?? '').toLowerCase();
  if (a === 'claude') return 'Claude';
  if (a === 'muse') return 'Muse';
  if (a === 'chatgpt') return 'ChatGPT';
  if (a === 'owner') return 'Owner';
  return agent || 'Unknown';
}

export function isHistoryRow(row: AgentHandoffRow): boolean {
  return row.kind === 'reply' && row.spec?.history_only === true;
}

export function isSocialPost(row: AgentHandoffRow): boolean {
  return row.spec?.type === 'social_post';
}

export function getPublishedLinks(row: AgentHandoffRow): PublishedLink[] {
  const raw = row.result?.published;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof (x as Record<string, unknown>).url === 'string' && /^https?:\/\//i.test(String((x as Record<string, unknown>).url)))
    .map((x) => ({
      url: String(x.url),
      platform: String(x.platform ?? 'Social'),
      posted_at: typeof x.posted_at === 'string' ? x.posted_at : undefined,
      by: typeof x.by === 'string' ? x.by : undefined,
    }));
}

export type SocialPostState = 'posted' | 'made_not_posted' | 'not_made';

export function socialPostState(row: AgentHandoffRow): SocialPostState {
  if (getPublishedLinks(row).length > 0) return 'posted';
  if (row.status === 'done') return 'made_not_posted';
  return 'not_made';
}

export function todayPacificISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);
}

export function postDateOf(row: AgentHandoffRow): string | null {
  const d = row.spec?.post_date;
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;
}

export function isPostLate(row: AgentHandoffRow, todayPT = todayPacificISO()): boolean {
  if (!isSocialPost(row) || socialPostState(row) !== 'made_not_posted') return false;
  const d = postDateOf(row);
  return !!d && d < todayPT;
}

export function isStudioLeased(row: AgentHandoffRow, now = new Date()): boolean {
  return !!row.studio_lease_expires_at && new Date(row.studio_lease_expires_at).getTime() > now.getTime();
}

export function isStuck(row: AgentHandoffRow, now = new Date()): boolean {
  if (isHistoryRow(row) || row.status === 'done' || row.status === 'cancelled' || row.kind === 'standing_task') return false;
  const ms = now.getTime();
  if (row.status === 'failed') return true;
  if (row.due_at && new Date(row.due_at).getTime() < ms && ['new', 'claimed', 'needs_owner'].includes(row.status)) return true;
  if (row.status === 'new' && ms - new Date(row.created_at).getTime() > 48 * 3600_000) return true;
  if (row.status === 'claimed') {
    if (row.claimed_at && ms - new Date(row.claimed_at).getTime() > 24 * 3600_000) return true;
    if (row.studio_lease_expires_at && new Date(row.studio_lease_expires_at).getTime() < ms) return true;
  }
  return false;
}

export function stuckReason(row: AgentHandoffRow, now = new Date()): string {
  const ms = now.getTime();
  if (row.status === 'failed') return failureReasonOf(row);
  if (row.status === 'claimed' && row.studio_lease_expires_at && new Date(row.studio_lease_expires_at).getTime() < ms) {
    return 'Lease ran out while working';
  }
  if (row.status === 'claimed' && row.claimed_at && ms - new Date(row.claimed_at).getTime() > 24 * 3600_000) {
    return `Claimed ${ageWords(row.claimed_at, now)} and not finished`;
  }
  if (row.due_at && new Date(row.due_at).getTime() < ms) return `Past due (${formatPacificShort(row.due_at)})`;
  return `Unstarted for ${ageWords(row.created_at, now)}`;
}

export function scheduleTextOf(row: AgentHandoffRow): string {
  const s = row.schedule ?? row.spec?.schedule ?? row.spec?.cadence ?? row.spec?.frequency;
  return typeof s === 'string' && s.trim() ? s.trim() : 'Repeating';
}

export function isStandingMissed(row: AgentHandoffRow, now = new Date()): boolean {
  if (row.kind !== 'standing_task' || row.status !== 'active') return false;
  const text = `${scheduleTextOf(row)} ${row.title}`.toLowerCase();
  let maxHours: number | null = null;
  if (/\bmonthly\b|every month|each month|of every month/.test(text)) maxHours = 35 * 24;
  else if (/\bdaily\b|every day|each day/.test(text)) maxHours = 36;
  else if (/\bweekly\b|every week|each week|monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(text)) maxHours = 8.5 * 24;
  if (!maxHours) return false;
  const ref = row.last_run_at ?? row.created_at;
  return (now.getTime() - new Date(ref).getTime()) > maxHours * 3600_000;
}

export function latestNoteLine(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const lines = notes.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : null;
}

export function whatHappenedOf(row: AgentHandoffRow): string | null {
  const summary = typeof row.result?.summary === 'string' ? row.result.summary.trim() : '';
  if (summary) return summary;
  return latestNoteLine(row.notes);
}

export function failureReasonOf(row: AgentHandoffRow): string {
  const r = row.result ?? {};
  for (const k of ['error', 'reason', 'blocked_reason', 'summary']) {
    if (typeof r[k] === 'string' && (r[k] as string).trim()) return (r[k] as string).trim();
  }
  return latestNoteLine(row.notes) ?? 'Failed without a reason';
}

export function groupFailures(rows: AgentHandoffRow[]): FailureGroup[] {
  const map = new Map<string, AgentHandoffRow[]>();
  for (const r of rows) {
    const reason = failureReasonOf(r);
    const key = reason.toLowerCase();
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return Array.from(map.values())
    .map((group) => ({ reason: failureReasonOf(group[0]), rows: group, ids: group.map((x) => x.id) }))
    .sort((a, b) => b.rows.length - a.rows.length);
}

export function buildNeedsYou(rows: AgentHandoffRow[]): NeedsYouItem[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const waiting = rows.filter((r) => !isHistoryRow(r) && (r.status === 'needs_owner' || (r.to_agent === 'owner' && OPEN_AGENT_STATUSES.includes(r.status))));
  const suppressedParents = new Set<string>();
  for (const r of waiting) {
    if ((r.kind === 'question' || r.to_agent === 'owner') && r.parent_id && byId.has(r.parent_id)) {
      suppressedParents.add(r.parent_id);
    }
  }
  return waiting
    .filter((r) => !suppressedParents.has(r.id))
    .map((r) => {
      const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
      const brandIds = Array.from(new Set([...(r.brand_ids ?? []), ...(parent?.brand_ids ?? [])]));
      const question = r.owner_question?.trim() || null;
      const whatHappened = question ? null : (whatHappenedOf(r) ?? (parent ? whatHappenedOf(parent) : null));
      return { id: r.id, answerRowId: r.id, row: r, parentRow: parent, brandIds, question, whatHappened, createdAt: r.created_at };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getProofLinks(row: AgentHandoffRow): ProofLink[] {
  const out: ProofLink[] = [];
  const seen = new Set<string>();
  const add = (url: unknown, label: string) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim()) || seen.has(url.trim())) return;
    seen.add(url.trim());
    out.push({ url: url.trim(), label });
  };
  if (Array.isArray(row.result_links)) {
    for (const item of row.result_links) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        add(o.url, typeof o.label === 'string' && o.label.trim() ? o.label.trim() : 'Proof');
      }
    }
  }
  add(row.result?.drive_folder_url, 'Drive folder');
  add(row.spec?.drive_folder_url, 'Drive folder');
  return out;
}

export function statusLabel(row: AgentHandoffRow): string {
  if (isSocialPost(row)) {
    const s = socialPostState(row);
    if (s === 'posted') return 'Posted';
    if (s === 'made_not_posted') return 'Made, not posted';
  }
  if (row.kind === 'standing_task' && row.status === 'active') return 'Repeating';
  const map: Record<string, string> = {
    new: 'Waiting to start',
    claimed: 'Working on it',
    needs_owner: 'Needs you',
    failed: 'Failed',
    done: 'Finished',
    cancelled: 'Cancelled',
    active: 'Active',
  };
  return map[row.status] ?? row.status;
}

const SKIP_SPEC_KEYS = new Set(['source', 'history_only', 'by', 'hq_project_id', 'task_id', 'brand_ids', 'brands']);

export function readableSpec(spec: Record<string, unknown> | null): ReadableSpecEntry[] {
  if (!spec) return [];
  const out: ReadableSpecEntry[] = [];
  for (const [k, v] of Object.entries(spec)) {
    if (SKIP_SPEC_KEYS.has(k) || v === null || v === undefined || v === '') continue;
    const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out.push({ label, value: String(v) });
    } else if (Array.isArray(v)) {
      const items = v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean);
      if (items.length) out.push({ label, value: items.join(', ') });
    } else if (typeof v === 'object') {
      const parts = Object.entries(v as Record<string, unknown>)
        .filter(([, val]) => val !== null && val !== undefined && val !== '')
        .map(([key, val]) => `${key}: ${typeof val === 'string' ? val : JSON.stringify(val)}`);
      if (parts.length) out.push({ label, value: parts.join(' · ') });
    }
  }
  return out;
}

const pacificFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});
const pacificShortFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric',
});

export function formatPacific(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${pacificFmt.format(d)} PT`;
}

export function formatPacificShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : pacificShortFmt.format(d);
}

export function ageWords(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: false }).replace(/^about /, '');
}

export function isFinishedThisWeek(row: AgentHandoffRow, now = new Date()): boolean {
  const at = finishedAt(row);
  if (!at) return false;
  const time = Date.parse(at);
  const [y, m, d] = todayPacificISO(now).split('-').map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1));
  return time <= now.getTime() && todayPacificISO(new Date(at)) >= monday.toISOString().slice(0, 10);
}

export const OPEN_AGENT_STATUSES = ['new', 'claimed', 'needs_owner', 'failed', 'active'];

export function belongsOnDesk(row: AgentHandoffRow, since: string): boolean {
  if (isHistoryRow(row)) return false;
  return OPEN_AGENT_STATUSES.includes(row.status)
    || (isSocialPost(row) && socialPostState(row) === 'made_not_posted')
    || (row.completed_at ?? row.updated_at) >= since
    || (isSocialPost(row) && (finishedAt(row) ?? '') >= since);
}

export function isFinishedWork(row: AgentHandoffRow): boolean {
  if (isHistoryRow(row)) return false;
  return isSocialPost(row) ? socialPostState(row) === 'posted' : row.status === 'done';
}

/** Posted time, not the time the files were made; one piece across its live links. */
export function finishedAt(row: AgentHandoffRow): string | null {
  if (!isFinishedWork(row)) return null;
  if (isSocialPost(row)) {
    const times = getPublishedLinks(row).map((p) => p.posted_at).filter((t): t is string => !!t && Number.isFinite(Date.parse(t))).sort();
    return times[0] ?? row.updated_at;
  }
  return row.completed_at ?? row.updated_at;
}

export function agentBrandCounts(rows: AgentHandoffRow[], now = new Date()) {
  const work = rows.filter((r) => !isHistoryRow(r));
  return {
    open: work.filter((r) => OPEN_AGENT_STATUSES.includes(r.status)).length,
    stuck: work.filter((r) => isStuck(r, now) || isStandingMissed(r, now)).length,
    waiting: buildNeedsYou(work).length,
    madeNotPosted: work.filter((r) => isSocialPost(r) && socialPostState(r) === 'made_not_posted').length,
  };
}

/** Suppress both the question's linked to-do and its parent task's linked to-do. */
export function needsYouActionIds(items: NeedsYouItem[]): Set<string> {
  return new Set(items.flatMap((i) => [i.row.action_item_id, i.parentRow?.action_item_id]).filter((id): id is string => !!id));
}