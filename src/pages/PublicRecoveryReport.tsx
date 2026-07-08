import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  RecoveryReportRenderer,
  type RecoveryReportRenderable,
} from '@/components/recovery-report/RecoveryReportRenderer';

interface CuratedPayload extends RecoveryReportRenderable {
  share_referral_footer: boolean;
}

export default function PublicRecoveryReport() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ok'; data: CuratedPayload } | { kind: 'missing' }
  >({ kind: 'loading' });

  useEffect(() => {
    // noindex — this page must never be crawled.
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setState({ kind: 'missing' });
        return;
      }
      const { data, error } = await supabase.functions.invoke('get-shared-recovery-report', {
        body: { token },
      });
      if (cancelled) return;
      if (error || !data || (data as { error?: string }).error) {
        setState({ kind: 'missing' });
        return;
      }
      setState({ kind: 'ok', data: data as CuratedPayload });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F4EC' }}>
        <div className="proposal-mono text-xs" style={{ color: '#7B6F5A' }}>
          loading…
        </div>
      </div>
    );
  }

  if (state.kind === 'missing') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#F7F4EC', color: '#14202B' }}
      >
        <div
          className="max-w-md text-center p-8"
          style={{
            background: '#FFFDF7',
            border: '1px solid #E4DECF',
            borderRadius: 4,
          }}
        >
          <div
            className="proposal-eyebrow mb-3"
            style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.22em', color: '#7B6F5A' }}
          >
            Report unavailable
          </div>
          <p className="text-sm" style={{ color: '#7B6F5A' }}>
            This report is no longer available. If you believe this is a mistake, reach out to
            whoever shared the link with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RecoveryReportRenderer
      report={state.data}
      referralFooter={state.data.share_referral_footer}
      status="sent"
    />
  );
}