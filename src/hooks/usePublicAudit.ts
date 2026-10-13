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
}

export interface RedactedResult {
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
  total_monthly_dollars: number;
  total_risk_exposure_dollars: number;
  results: LeakResult[];
  competitor_block: {
    keyword: string;
    you_rank: number | null;
    in_map_pack: boolean | null;
    top_competitors: Array<{ name?: string; rank?: number; place_id?: string }>;
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
  company_website?: string; // honeypot
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
      if (e) throw new Error(e.message);
      trackSiteEvent({ event_type: 'audit_start', label: 'free_audit', vertical: context.sourceVertical ?? undefined, src: context.src ?? undefined });
      const t = (data as { token: string }).token;
      setToken(t);
      setStatus('queued');
      pollOnce(t);
      timerRef.current = setInterval(() => pollOnce(t), 3000);
    } catch (err: any) {
      setError(err?.message ?? 'We could not start the checkup. Please try again.');
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
        // Supabase functions client surfaces the response body under context.
        const ctx: any = (e as any).context;
        let msg = e.message || 'We could not send the full list. Please try again.';
        try {
          const parsed = ctx?.body ? JSON.parse(ctx.body) : ctx;
          if (parsed?.error === 'invalid_email') msg = 'Enter a valid email address.';
          else if (parsed?.details?.email?.length) msg = 'Enter a valid email address.';
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const payload = data as { full_result: FullResult };
      setFull(payload.full_result);
    } catch (err: any) {
      setError(err?.message ?? 'We could not send the full list. Please try again.');
    } finally {
      setUnlocking(false);
    }
  }

  return { token, status, statusDetail, redacted, full, error, submitting, unlocking, run, unlock, reset };
}