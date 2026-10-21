import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackSiteEvent } from '@/lib/studioAnalytics';

export type OperationFootprint =
  | 'solo_owner' | 'small_crew_2_5' | 'crew_6_plus' | 'multi_location';

export type AuditStatus =
  | 'queued' | 'resolving' | 'snapshotting' | 'auditing' | 'ranking' | 'complete' | 'failed';

/** The checkup's look at their website (see _shared/website-quick-check.ts).
 *  Null fields mean "couldn't tell", not "failed". Missing on older results. */
export interface WebsiteCheck {
  status: 'checked' | 'none' | 'social' | 'unreachable' | 'blocked';
  url: string | null;
  source: 'typed' | 'google' | null;
  listing_has_site: boolean | null;
  social_label: string | null;
  opens: boolean | null;
  secure: boolean | null;
  phone_ready: boolean | null;
  contact: boolean | null;
  problem: string | null;
  phone_load_seconds: number | null;
  speed: 'fast' | 'ok' | 'slow' | null;
  speed_score: number | null;
  /** What the homepage links to or shows (results from version 4 on). */
  features?: SiteFeatures | null;
}

export interface SiteFeatures {
  menu: boolean;
  menu_pdf_only: boolean;
  happy_hour: boolean;
  reservations: boolean;
  reservations_provider: string | null;
  private_events: boolean;
  events: boolean;
  online_ordering: boolean;
  gift_cards: boolean;
  email_signup: boolean;
  booking_or_quote: boolean;
  financing: boolean;
  service_areas: boolean;
  emergency: boolean;
  social: string[];
}

/** Google listing and ranking summaries the report's score uses (results
 *  from version 2 on; missing on older results). */
export interface ListingSummaryResult {
  /** The Google listing that was checked (results from version 5 on). */
  name?: string | null;
  address?: string | null;
  rating: number | null;
  review_count: number | null;
  hours_set: boolean | null;
  phone: boolean | null;
  website: boolean | null;
  photos: number | null;
  category: string | null;
}
export interface GoogleSummaryResult {
  keyword: string;
  you_rank: number | null;
  in_map_pack: boolean | null;
  /** The search ran from the business's own location (version 4 on). */
  searched_near?: boolean;
}

/** No Google listing matched the name they typed (version 5 on). The
 *  closest listing Google returned, if any, is offered instead. */
export interface NotFoundResult {
  typed_name: string;
  typed_city: string;
  closest: { name: string; address: string | null; place_id: string } | null;
  reason: 'none' | 'name' | 'state';
}

export interface RedactedResult {
  result_version?: number;
  /** Set instead of a report when no listing matched; the other fields are then absent. */
  not_found?: NotFoundResult | null;
  listing?: ListingSummaryResult | null;
  google?: GoogleSummaryResult | null;
  total_monthly_dollars: number | null;
  leak_count: number;
  top_leaks: string[];
  project_type_resolution?: {
    gbp_category: string | null;
    matched_key: string;
    path: 'exact' | 'default';
    caveat?: string;
  } | null;
  website?: WebsiteCheck | null;
}

export interface LeakResult {
  name: string;
  severity: 'headline' | 'supporting';
  benchmark: string | null;
  risk_type: 'captured_revenue' | 'avoided_loss';
  monthly_dollars: number | null;
  reason?: string;
  render_state?: 'estimated' | 'priced_with_your_numbers';
  inputs: Array<{ name: string; value?: number; source?: string; caveat?: string; unresolved?: boolean }>;
}

export interface FullResult {
  result_version?: number;
  listing?: ListingSummaryResult | null;
  google?: GoogleSummaryResult | null;
  total_monthly_dollars: number;
  total_risk_exposure_dollars: number;
  results: LeakResult[];
  competitor_block: {
    keyword: string;
    you_rank: number | null;
    in_map_pack: boolean | null;
    top_competitors: Array<{ name?: string; rank?: number; place_id?: string; rating?: number | null; review_count?: number | null }>;
  } | null;
  project_type_resolution: RedactedResult['project_type_resolution'];
  inputs_basis: Record<string, unknown> | null;
  website?: WebsiteCheck | null;
}

export interface RunInput {
  business_name: string;
  city: string;
  website_url?: string;
  operation_footprint: OperationFootprint;
  /** The closest listing they confirmed is theirs, checked by its id. */
  place_id?: string;
  company_website?: string; // honeypot
}

/** An error whose message is written for the visitor (anything else is
 *  replaced with a plain message before it's shown). */
class ShownError extends Error {}

type ErrorBody = { error?: string; details?: { email?: string[] } } | null;

/** The HTTP status and JSON body behind a functions error, when there is one
 *  (the functions client puts the response on the error's context). */
async function errorDetails(e: unknown): Promise<{ status: number | null; body: ErrorBody }> {
  const ctx = (e as { context?: unknown } | null)?.context as { status?: unknown; json?: () => Promise<unknown> } | undefined;
  const status = typeof ctx?.status === 'number' ? ctx.status : null;
  let body: ErrorBody = null;
  try { if (ctx && typeof ctx.json === 'function') body = (await ctx.json()) as ErrorBody; } catch { /* not JSON */ }
  return { status, body };
}

export interface AuditContext {
  src?: string | null;
  sourceVertical?: string | null;
  biz?: string | null;
}

export function usePublicAudit() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuditStatus | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [redacted, setRedacted] = useState<RedactedResult | null>(null);
  const [full, setFull] = useState<FullResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function reset() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setToken(null);
    setStatus(null);
    setStatusDetail(null);
    setRedacted(null);
    setFull(null);
    setError(null);
    setSubmitting(false);
    setUnlocking(false);
  }

  async function pollOnce(t: string) {
    const { data, error: e } = await supabase.functions.invoke('public-audit-status', {
      body: { token: t },
    });
    if (e) return;
    const payload = data as { status: AuditStatus; status_detail: string | null; redacted_result: RedactedResult | null };
    setStatus(payload.status);
    setStatusDetail(payload.status_detail);
    if (payload.redacted_result) setRedacted(payload.redacted_result);
    if (payload.status === 'complete' || payload.status === 'failed') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }

  async function run(input: RunInput, context: AuditContext = {}) {
    setSubmitting(true);
    setError(null);
    setToken(null); setStatus(null); setStatusDetail(null);
    setRedacted(null); setFull(null);
    try {
      const normalized = { ...input };
      if (normalized.website_url) {
        const trimmed = normalized.website_url.trim();
        normalized.website_url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      }
      const { data, error: e } = await supabase.functions.invoke('run-public-audit', { body: {
        ...normalized,
        context: { src: context.src ?? null, source_vertical: context.sourceVertical ?? null, biz: context.biz ?? input.business_name },
      } });
      if (e) {
        const { status } = await errorDetails(e);
        throw new ShownError(status === 429
          ? "You've run several checkups in the last hour. Give it a little while, then try again."
          : "We couldn't start the checkup. Check your connection and try again.");
      }
      const t = (data as { token?: string } | null)?.token;
      if (!t) throw new ShownError("We couldn't start the checkup. Please try again.");
      trackSiteEvent({ event_type: 'audit_start', label: 'free_audit', vertical: context.sourceVertical ?? undefined, src: context.src ?? undefined });
      setToken(t);
      setStatus('queued');
      pollOnce(t);
      timerRef.current = setInterval(() => pollOnce(t), 3000);
    } catch (err: unknown) {
      setError(err instanceof ShownError ? err.message : "We couldn't start the checkup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function unlock(email: string, name?: string, phone?: string) {
    if (!token) return;
    setUnlocking(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.functions.invoke('unlock-public-audit', {
        body: { token, email, name, phone },
      });
      if (e) {
        // The functions client puts the response under context.
        const { status, body } = await errorDetails(e);
        const badEmail = status === 400 && (body?.error === 'invalid_email' || body?.details?.email?.length);
        throw new ShownError(badEmail ? 'Enter a valid email address.' : "We couldn't open the full list. Please try again.");
      }
      const payload = data as { full_result?: FullResult } | null;
      if (!payload?.full_result) throw new ShownError("We couldn't open the full list. Please try again.");
      setFull(payload.full_result);
    } catch (err: unknown) {
      setError(err instanceof ShownError ? err.message : "We couldn't open the full list. Please try again.");
    } finally {
      setUnlocking(false);
    }
  }

  return { token, status, statusDetail, redacted, full, error, submitting, unlocking, run, unlock, reset };
}