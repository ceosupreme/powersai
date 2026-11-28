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
  do_not_contact?: boolean | null;
  opted_out_at?: string | null;
  opt_out_channel?: string | null;
  next_try_at?: string | null;
  working_by?: string | null;
  working_until?: string | null;
  preview_by?: string | null;
  preview_link?: string | null;
  preview_promised_at?: string | null;
  inbound_lead_id?: string | null;
  last_contacted_at?: string | null;
  attempt_count?: number | null;
  out_of_tries_at?: string | null;
  time_zone?: string | null;
  text_ok?: boolean | null;
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
    case 'website': return 'Website';
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

/** Follow-up counts as due when it is today or earlier in Pacific time. */
export function isDue(date: string | null | undefined, todayPT: string): boolean {
  return !!date && date.slice(0, 10) <= todayPT;
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

/** How a do-not-contact lead got that way, in plain words. Null when the lead can be contacted. */
export function doNotContactReason(p: Pick<LeadLike, 'do_not_contact' | 'opted_out_at' | 'opt_out_channel'>): string | null {
  if (!p.do_not_contact) return null;
  const when = p.opted_out_at ? ` on ${formatDay(p.opted_out_at)}` : '';
  switch ((p.opt_out_channel ?? 'manual').toLowerCase()) {
    case 'sms': case 'text': return `They asked by text to stop${when}.`;
    case 'email': return `They unsubscribed by email${when}.`;
    case 'call': case 'phone': return `They asked on a call to stop${when}.`;
    default: return `Marked by your team${when}.`;
  }
}

/** True when the person opted out themselves, so switching it back needs their say-so. */
export const optedOutThemselves = (p: Pick<LeadLike, 'do_not_contact' | 'opt_out_channel'>) =>
  !!p.do_not_contact && !['manual', ''].includes((p.opt_out_channel ?? 'manual').toLowerCase());

export type TopLeadReason = 'replied' | 'preview' | 'due' | 'assigned' | 'new' | 'contacted';
export const TOP_LEAD_REASON: Record<TopLeadReason, string> = {
  replied: 'They reached out', preview: 'Preview call due', due: 'Callback due', assigned: 'Assigned to you', new: 'Open lead', contacted: 'Open lead',
};

/**
 * One shared queue: unanswered inbound, due preview calls, callbacks, own due assignments,
 * then open leads by fit. Access is never filtered by assignment. Future callbacks, other
 * people's active holds, opt-outs and terminal leads are excluded.
 */
export function topLeads<T extends LeadLike>(
  rows: readonly T[], todayPT: string, opts: { me?: string | null; isAdmin?: boolean; limit?: number; now?: Date; skipped?: ReadonlySet<string> } = {},
): { lead: T; reason: TopLeadReason }[] {
  const { me = null, limit = 5, now = new Date() } = opts;
  const rank: Record<TopLeadReason, number> = { replied: 0, preview: 1, due: 2, assigned: 3, new: 4, contacted: 4 };
  const picked: { lead: T; reason: TopLeadReason }[] = [];
  for (const lead of sortLeads(rows)) {
    if (lead.do_not_contact) continue;
    if (lead.working_by && lead.working_by !== me && lead.working_until && Date.parse(lead.working_until) > now.getTime()) continue;
    const stage = stageOf(lead.status);
    if (stage === 'won' || stage === 'dead') continue;
    if (lead.next_try_at ? Date.parse(lead.next_try_at) > now.getTime() : lead.next_follow_up && !isDue(lead.next_follow_up, todayPT)) continue;
    if (lead.preview_by && !lead.preview_link) continue;
    const due = lead.next_try_at ? Date.parse(lead.next_try_at) <= now.getTime() : isDue(lead.next_follow_up, todayPT);
    if (stage === 'meeting' && !due) continue;
    let reason: TopLeadReason;
    if ((lead.inbound_lead_id || lead.source === 'website') && !lead.last_contacted_at) reason = 'replied';
    else if (lead.preview_link && due) reason = 'preview';
    else if (due && lead.assigned_to !== me) reason = 'due';
    else if (lead.assigned_to === me && me) reason = 'assigned';
    else reason = stage === 'new' ? 'new' : 'contacted';
    picked.push({ lead, reason });
  }
  return picked.sort((a, b) => Number(opts.skipped?.has(a.lead.id) ?? false) - Number(opts.skipped?.has(b.lead.id) ?? false) ||
    rank[a.reason] - rank[b.reason] ||
    (['due', 'preview', 'assigned'].includes(a.reason)
      ? Date.parse(a.lead.next_try_at ?? `${a.lead.next_follow_up ?? a.lead.created_at.slice(0, 10)}T00:00:00Z`) - Date.parse(b.lead.next_try_at ?? `${b.lead.next_follow_up ?? b.lead.created_at.slice(0, 10)}T00:00:00Z`)
      : (b.lead.fit_score ?? -Infinity) - (a.lead.fit_score ?? -Infinity))).slice(0, limit);
}

export interface SalesCadence {
  max_tries: number; window_days: number; voicemail_try: number; rest_days: number; hold_minutes: number;
  preview_retry_business_days: number; stale_overdue_business_days: number; stale_untouched_days: number;
  quiet_start: string; quiet_end: string;
}
export type PayLevel = 'rep_alone' | 'rep_with_owner' | 'rep_handed_over' | 'owner_deal';
export interface SalesSettings { cadence: SalesCadence; pay: Record<PayLevel, number> & { months: number }; mailing_address: string }
export const PAY_LABELS: Record<PayLevel, string> = { rep_alone: 'Rep alone', rep_with_owner: 'Rep with Sean', rep_handed_over: 'Rep handed over', owner_deal: "Owner's own deal" };
export const RESULT_LABELS = { no_answer: 'No answer', voicemail: 'Left voicemail', owner_not_in: 'Owner not in', wrong_number: 'Wrong number',
  preview_yes: 'Yes to free preview', intro_booked: 'Intro call booked with Sean', follow_up: 'Follow-up set', not_interested: 'Not interested', stop: 'Asked to stop', pending_close: 'I closed it', hand_to_sean: 'Hand to Sean' };
export type LeadResult = keyof typeof RESULT_LABELS;
export function localParts(now: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}`, hour: Number(get('hour')) };
}
export function zonedInputToIso(value: string, zone: string): string {
  const [date, time] = value.split('T');
  if (!date || !time) throw new Error('Choose a day and time.');
  const [y, m, d] = date.split('-').map(Number); const [h, min] = time.split(':').map(Number);
  const target = Date.UTC(y, m - 1, d, h, min); let result = target;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(result), zone); const [py, pm, pd] = p.day.split('-').map(Number); const [ph, pn] = p.time.split(':').map(Number);
    result += target - Date.UTC(py, pm - 1, pd, ph, pn);
  }
  const out = new Date(result);
  if (localParts(out, zone).day !== date || localParts(out, zone).time !== time.slice(0, 5)) throw new Error('That local time does not exist. Choose another time.');
  return out.toISOString();
}
export function addBusinessDays(day: string, count: number): string {
  const [y,m,d] = day.split('-').map(Number); const date = new Date(Date.UTC(y,m-1,d)); let n = 0;
  while (n < count) { date.setUTCDate(date.getUTCDate()+1); if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) n++; }
  return date.toISOString().slice(0,10);
}
export function businessDaysElapsed(from: string, to: string): number {
  let d = from; let n = 0;
  while (d < to) { const [y,m,day] = d.split('-').map(Number); const date = new Date(Date.UTC(y,m-1,day+1)); d = date.toISOString().slice(0,10); if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) n++; }
  return n;
}
export const voicemailAllowed = (attempts: number, c: SalesCadence, hasPreview = false) => !hasPreview && attempts + 1 === c.voicemail_try;
export const hasInboundContact = (p: LeadLike) => !!p.inbound_lead_id || p.source === 'website';
export function quietHours(p: LeadLike, c: SalesCadence, now = new Date()): boolean {
  const time = localParts(now, p.time_zone || 'America/Los_Angeles').time;
  return c.quiet_start > c.quiet_end ? time >= c.quiet_start || time < c.quiet_end : time >= c.quiet_start && time < c.quiet_end;
}
export function contactGate(p: LeadLike & { phone?: string | null; email?: string | null }, channel: 'call'|'text'|'email', settings: SalesSettings, now = new Date(), wrongPhone = false): string | null {
  if (doNotContactReason(p)) return 'Do not contact this lead.';
  if (channel === 'email') {
    if (!settings.mailing_address.trim()) return 'Waiting on the business mailing address.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email ?? '') ? null : 'No valid email on file.';
  }
  if (wrongPhone) return 'Find a new number.';
  if (!p.phone) return 'No phone number on file.';
  if (quietHours(p, settings.cadence, now)) return `Quiet hours in ${p.time_zone || 'America/Los_Angeles'}.`;
  if (channel === 'text' && !p.text_ok && !hasInboundContact(p)) return 'They have not said yes to texting on a call.';
  return null;
}
export function nextFailedTry(p: LeadLike, c: SalesCadence, now = new Date()) {
  const day = localParts(now, p.time_zone || 'America/Los_Angeles').day; const attempt = (p.attempt_count ?? 0)+1;
  const part = localParts(now, p.time_zone || 'America/Los_Angeles').hour < 11 ? 'morning' : localParts(now, p.time_zone || 'America/Los_Angeles').hour < 15 ? 'midday' : 'late_afternoon';
  if (p.preview_by) return { attempt_count: attempt, next_day: addBusinessDays(day,c.preview_retry_business_days), part: 'morning', rested: false };
  const resting=attempt >= c.max_tries && !p.last_contacted_at;
  const days = resting ? c.rest_days : Math.ceil(c.window_days*attempt/(c.max_tries-1))-Math.ceil(c.window_days*(attempt-1)/(c.max_tries-1));
  const [y,m,d] = day.split('-').map(Number);
  return { attempt_count: resting ? 0 : attempt, next_day: new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10),
    part: part === 'morning' ? 'midday' : part === 'midday' ? 'late_afternoon' : 'morning', rested: resting };
}
export function staleReason(p: LeadLike, lastActivity: string | null, c: SalesCadence, now = new Date()): string | null {
  if (!p.assigned_to || p.do_not_contact || ['won','dead'].includes(p.status) || (p.working_until && Date.parse(p.working_until)>now.getTime())) return null;
  const last = Math.max(Date.parse(lastActivity || p.created_at),Date.parse(p.last_contacted_at || p.created_at));
  if (p.next_try_at && last < Date.parse(p.next_try_at) && businessDaysElapsed(todayPacific(new Date(p.next_try_at)),todayPacific(now)) > c.stale_overdue_business_days) return 'Overdue callback';
  if (!p.next_try_at && now.getTime()-last > c.stale_untouched_days*86400000) return 'Untouched with no next try';
  return null;
}
export function salesPay(setup: number, monthly: number, level: PayLevel, settings: SalesSettings, start?: string|null, cancelled?: string|null, refunds = 0, now = new Date()) {
  const rate = settings.pay[level]/100; const total = settings.pay.months;
  let months = 0;
  if (start) {
    const begun = new Date(start); const end = cancelled ? new Date(Math.min(Date.parse(cancelled),now.getTime())) : now;
    if (end >= begun) { months = (end.getUTCFullYear()-begun.getUTCFullYear())*12+end.getUTCMonth()-begun.getUTCMonth()+1; if(end.getUTCDate()<begun.getUTCDate()) months--; }
  }
  months = Math.max(0,Math.min(total,months));
  return { expected: (setup+monthly*total)*rate, accrued: Math.max(0,(setup+monthly*months-refunds)*rate), months };
}
export interface LeadScript { id: string; lead_type: string|null; step: string|null; body: string; subject?: string|null; name: string; channel: string; }
export function scriptFor(rows: LeadScript[], leadType: string|null, step: string): LeadScript[] {
  const typed = rows.filter(r=>r.lead_type===leadType && r.step===step);
  return typed.length ? typed : rows.filter(r=>r.lead_type==='any' && r.step===step);
}
export function fillLeadScript(body: string, p: LeadLike, rep: string): string {
  const values: Record<string,string> = {business:p.business_name,first_name:p.contact_name?.split(' ')[0] || 'there',rep,city:p.city || '—',services:p.their_words || '—',promised_time:p.preview_promised_at ? new Date(p.preview_promised_at).toLocaleString('en-US',{timeZone:p.time_zone || 'America/Los_Angeles'}) : '—',preview_link:p.preview_link || '—',owner:'Sean'};
  return body.replace(/\{(business|first_name|rep|city|services|promised_time|preview_link|owner)\}/g,(_m,k)=>values[k]);
}

export const EXPORT_COLUMNS = ['Name', 'Contact', 'Phone', 'Email', 'Stage', 'Source', 'Source link', 'City', 'Offer', 'Fit score', 'Assigned to', 'Next follow-up', 'Last contacted', 'Their words', 'Sell notes', 'Notes', 'Do not contact'] as const;

export function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return [EXPORT_COLUMNS as readonly string[], ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
