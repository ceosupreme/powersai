/** Leads page rules: stages, source labels, sorting, filtering and export rows. */
export type LeadStage = 'new' | 'contacted' | 'replied' | 'meeting' | 'won' | 'dead';

export const LEAD_STAGES: { key: LeadStage; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'replied', label: 'Replied' },
  { key: 'meeting', label: 'Meeting booked' },
  { key: 'won', label: 'Won' },
  { key: 'dead', label: 'Dead' },
];

export const stageLabel = (s: LeadStage) => LEAD_STAGES.find((x) => x.key === s)?.label ?? 'New';

export interface LeadLike {
  id: string;
  status: string;
  source: string;
  platform?: string | null;
  business_name: string;
  contact_name?: string | null;
  city?: string | null;
  their_words?: string | null;
  offer?: string | null;
  assigned_to?: string | null;
  outreach_mode?: string | null;
  fit_score?: number | null;
  leak_total?: number | null;
  created_at: string;
  promoted_company_id?: string | null;
  next_follow_up?: string | null;
}

/** new/checked/queued are New; promoted with no other known stage counts as Meeting booked. */
export function stageOf(status: string): LeadStage {
  switch (status) {
    case 'contacted': case 'replied': case 'meeting': case 'won': case 'dead': return status;
    case 'promoted': return 'meeting';
    default: return 'new';
  }
}

export const inCrm = (p: Pick<LeadLike, 'status' | 'promoted_company_id'>) =>
  p.status === 'promoted' || !!p.promoted_company_id;

export function sourceLabel(source: string, platform?: string | null): string {
  const pl = (platform ?? '').toLowerCase();
  if (pl.includes('instagram')) return 'Instagram';
  if (pl.includes('facebook')) return 'Facebook';
  switch (source) {
    case 'places': return 'Google';
    case 'social': return 'Social';
    case 'manual': return 'Manual';
    case 'jobs': return 'Job board';
    case 'network': return 'Network';
    default: return source ? source[0].toUpperCase() + source.slice(1) : 'Unknown';
  }
}

/** fit_score high first, then leak_total high first, then newest. Missing numbers go last. */
export function sortLeads<T extends LeadLike>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) =>
    (b.fit_score ?? -Infinity) - (a.fit_score ?? -Infinity) ||
    (b.leak_total ?? -Infinity) - (a.leak_total ?? -Infinity) ||
    Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

export interface LeadFilters {
  search: string;
  stage: 'all' | LeadStage;
  source: string; // 'all' or a source label
  offer: string; // 'all' or offer text
  assigned: string; // 'all' | 'mine' | 'unassigned' | user id
  outreach: 'all' | 'manual' | 'auto';
}

export const DEFAULT_FILTERS: LeadFilters = { search: '', stage: 'all', source: 'all', offer: 'all', assigned: 'all', outreach: 'all' };

export function filterLeads<T extends LeadLike>(rows: readonly T[], f: LeadFilters, me: string | null): T[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((p) => {
    if (q && ![p.business_name, p.contact_name, p.city, p.their_words].some((v) => (v ?? '').toLowerCase().includes(q))) return false;
    if (f.stage !== 'all' && stageOf(p.status) !== f.stage) return false;
    if (f.source !== 'all' && sourceLabel(p.source, p.platform) !== f.source) return false;
    if (f.offer !== 'all' && (p.offer ?? '') !== f.offer) return false;
    if (f.assigned === 'mine' && (!me || p.assigned_to !== me)) return false;
    if (f.assigned === 'unassigned' && p.assigned_to) return false;
    if (!['all', 'mine', 'unassigned'].includes(f.assigned) && p.assigned_to !== f.assigned) return false;
    if (f.outreach !== 'all' && (p.outreach_mode ?? 'manual') !== f.outreach) return false;
    return true;
  });
}

/** Overdue when the follow-up date is before today's Pacific date. */
export function isOverdue(date: string | null | undefined, todayPT: string): boolean {
  return !!date && date < todayPT;
}

export const todayPacific = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

export function formatDay(date: string | null | undefined): string {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A logged contact moves a New lead to Contacted; any later stage stays put. */
export function stageAfterContact(status: string): string | null {
  return stageOf(status) === 'new' && status !== 'promoted' ? 'contacted' : null;
}

export const EXPORT_COLUMNS = ['Name', 'Contact', 'Phone', 'Email', 'Stage', 'Source', 'Source link', 'City', 'Offer', 'Fit score', 'Assigned to', 'Next follow-up', 'Last contacted', 'Their words', 'Sell notes', 'Notes'] as const;

export function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return [EXPORT_COLUMNS as readonly string[], ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
