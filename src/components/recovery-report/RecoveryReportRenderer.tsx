import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import '@/components/proposals/print.css';

export interface RecoveryReportRenderable {
  display_name: string;
  period_start: string;
  period_end: string;
  metrics: {
    leads: { total: number; after_hours: number; by_channel?: Record<string, number>; ready: number };
    followups: { sent: number; re_engaged: number };
    reactivation: { contacted: number; responded: number };
    reviews: { requests_sent: number; reviews_landed: number };
  };
  estimated_dollars: number;
  estimate_basis: {
    avg_ticket: number;
    close_rate: number;
    source: 'project' | 'default' | 'mixed';
    formula: string;
    caveats: string[];
  };
  narrative: string | null;
}

function useProposalFonts() {
  useEffect(() => {
    const id = 'proposal-webfonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function fmtPeriod(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const sameYear = s.getFullYear() === e.getFullYear();
  const sFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
  const eFmt = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${sFmt} – ${eFmt}`;
}

function LedgerRow({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b proposal-rule py-2.5 last:border-0">
      <div className="min-w-0 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 proposal-forest shrink-0" strokeWidth={2.5} />
        <div className="min-w-0">
          <div className="text-base proposal-forest font-medium">{label}</div>
          {sub && <div className="text-xs proposal-ink-muted">{sub}</div>}
        </div>
      </div>
      <div className="proposal-display text-2xl whitespace-nowrap proposal-forest">
        {value.toLocaleString('en-US')}
      </div>
    </div>
  );
}

function RecoveredActivityLedger({ m }: { m: RecoveryReportRenderable['metrics'] }) {
  const leadsSub =
    m.leads.after_hours > 0
      ? `${m.leads.after_hours} captured after hours · ${m.leads.ready} qualified`
      : `${m.leads.ready} qualified`;
  return (
    <section className="proposal-avoid-break">
      <div className="proposal-eyebrow mb-2">Recovered activity</div>
      <div className="proposal-card p-5 space-y-0">
        <LedgerRow label="Leads captured" value={m.leads.total} sub={leadsSub} />
        <LedgerRow
          label="Follow-ups re-engaged"
          value={m.followups.re_engaged}
          sub={`of ${m.followups.sent} sent`}
        />
        <LedgerRow
          label="Customers reactivated"
          value={m.reactivation.responded}
          sub={`${m.reactivation.contacted} contacted`}
        />
        <LedgerRow
          label="Reviews landed"
          value={m.reviews.reviews_landed}
          sub={`${m.reviews.requests_sent} requests sent`}
        />
      </div>
    </section>
  );
}

function EstimatedValue({
  dollars,
  basis,
}: {
  dollars: number;
  basis: RecoveryReportRenderable['estimate_basis'];
}) {
  const isDefault = basis.source === 'default' || basis.source === 'mixed';
  return (
    <section className="proposal-avoid-break">
      <div className="proposal-eyebrow mb-2">Estimated recovered value</div>
      <div className="proposal-card p-6">
        <div className="flex items-baseline gap-3">
          <div className="proposal-display text-5xl proposal-money-green">{fmtMoney(dollars)}</div>
          <div className="text-xs proposal-ink-muted italic">estimate — not a guarantee</div>
        </div>

        <div className="proposal-eyebrow mt-5 mb-2">How we got this</div>
        <div className="text-sm space-y-2">
          <div className="proposal-mono text-xs proposal-ink-muted">{basis.formula}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>
              <span className="proposal-ink-muted">Avg ticket:</span>{' '}
              <span className="proposal-mono">${basis.avg_ticket}</span>
            </span>
            <span>
              <span className="proposal-ink-muted">Close rate:</span>{' '}
              <span className="proposal-mono">{(basis.close_rate * 100).toFixed(0)}%</span>
            </span>
            <span>
              <span className="proposal-ink-muted">Source:</span>{' '}
              <span className="proposal-mono">{basis.source}</span>
              {isDefault && <span className="proposal-manual-pill">default assumption</span>}
            </span>
          </div>
          {basis.caveats.length > 0 && (
            <ul className="list-disc ml-5 text-xs proposal-ink-muted space-y-0.5 mt-2">
              {basis.caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Trim trailing incomplete clauses from AI narratives.
 *
 * A '.' only ends a sentence if it is NOT between two digits AND is followed
 * by whitespace or end-of-string. Prevents mid-number cuts like "$1.5K" or
 * "0.025". Also strips dangling conjunctions (but/and/so/because/however)
 * left behind after truncation.
 */
function sanitizeNarrative(raw: string): string {
  const s = (raw ?? '').trim();
  if (!s) return s;
  const isDigit = (c: string | undefined) => !!c && c >= '0' && c <= '9';
  const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);
  const isTerm = (i: number): boolean => {
    const c = s[i];
    if (c === '!' || c === '?') return true;
    if (c !== '.') return false;
    if (isDigit(s[i - 1]) && isDigit(s[i + 1])) return false;
    return isSpace(s[i + 1]);
  };
  let cut = s;
  if (!isTerm(s.length - 1)) {
    let i = s.length - 1;
    while (i >= 0 && !isTerm(i)) i--;
    if (i < 0) return s; // no valid terminator — leave as-is
    cut = s.slice(0, i + 1);
  }
  return cut
    .replace(/[\s,]+(but|and|so|because|however)[\s,]*([.!?])\s*$/i, '$2')
    .trim();
}

function Narrative({ text }: { text: string }) {
  const clean = sanitizeNarrative(text);
  if (!clean) return null;
  return (
    <section className="proposal-avoid-break">
      <div className="proposal-eyebrow mb-2">What this looked like</div>
      <div className="proposal-card p-5">
        <p className="text-base leading-relaxed whitespace-pre-wrap">{clean}</p>
      </div>
    </section>
  );
}

function ReferralFooter() {
  return (
    <section className="proposal-avoid-break">
      <div
        className="proposal-card p-5 italic"
        style={{ borderLeft: '4px solid #C9A24B' }}
      >
        <p className="text-base leading-relaxed">
          PS — the referral offer is standing: <span className="proposal-gold not-italic font-semibold">$250</span> for every owner you send who signs. You've seen the report now. You know if it's real.
        </p>
      </div>
    </section>
  );
}

export function RecoveryReportRenderer({
  report,
  referralFooter,
  status,
}: {
  report: RecoveryReportRenderable;
  referralFooter: boolean;
  /** Draft renders the watermark; reviewed/sent do not. */
  status: 'draft' | 'reviewed' | 'sent';
}) {
  useProposalFonts();
  return (
    <div className="proposal-print-root proposal-surface p-10 relative">
      {status === 'draft' && <div className="proposal-draft-watermark">DRAFT</div>}
      <div className="relative z-10 max-w-3xl mx-auto space-y-8">
        <header className="border-b proposal-rule pb-5">
          <div className="proposal-eyebrow">Weekly Recovery Report</div>
          <h1 className="proposal-display text-5xl mt-2">
            Prepared for {report.display_name || 'your business'}
          </h1>
          <div className="text-sm proposal-ink-muted mt-2 proposal-mono">
            {fmtPeriod(report.period_start, report.period_end)}
          </div>
          <p className="mt-4 text-base leading-relaxed">
            Here is what the system recovered for your business this week — activity that
            would have slipped away otherwise.
          </p>
        </header>

        <RecoveredActivityLedger m={report.metrics} />
        <EstimatedValue dollars={report.estimated_dollars} basis={report.estimate_basis} />
        {report.narrative && report.narrative.trim().length > 0 && (
          <Narrative text={report.narrative} />
        )}
        {referralFooter && <ReferralFooter />}

        <footer className="pt-6 border-t proposal-rule text-center">
          <div className="proposal-mono text-xs proposal-ink-muted">
            Powered by Supreme Team OS
          </div>
        </footer>
      </div>
    </div>
  );
}