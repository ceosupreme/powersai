import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type OperationFootprint =
  | 'solo_owner' | 'small_crew_2_5' | 'crew_6_plus' | 'multi_location';

export type AuditStatus =
  | 'queued' | 'resolving' | 'snapshotting' | 'auditing' | 'ranking' | 'complete' | 'failed';

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
}

export interface RunInput {
  business_name: string;
  city: string;
  website_url?: string;
  operation_footprint: OperationFootprint;
  company_website?: string; // honeypot
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

  async function run(input: RunInput) {
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
      const { data, error: e } = await supabase.functions.invoke('run-public-audit', { body: normalized });
      if (e) throw new Error(e.message);
      const t = (data as { token: string }).token;
      setToken(t);
      setStatus('queued');
      pollOnce(t);
      timerRef.current = setInterval(() => pollOnce(t), 3000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start audit');
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
        let msg = e.message || 'Failed to unlock';
        try {
          const parsed = ctx?.body ? JSON.parse(ctx.body) : ctx;
          if (parsed?.error === 'invalid_email') msg = 'Enter a valid business email.';
          else if (parsed?.details?.email?.length) msg = 'Enter a valid business email.';
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const payload = data as { full_result: FullResult };
      setFull(payload.full_result);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  }

  return { token, status, statusDetail, redacted, full, error, submitting, unlocking, run, unlock, reset };
}