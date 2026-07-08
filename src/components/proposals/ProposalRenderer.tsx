import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SOURCE_LABEL } from '@/lib/leakStackFormat';
import type { LeakStackResult, LeakStackRun } from '@/hooks/useLeakStack';
import type { ProposalContent, ProposalRow } from './types';
import { ENGINE_LABEL } from './types';
import './print.css';

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Load webfonts once when the renderer mounts.
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

function summarizeInputsBasis(run: LeakStackRun | null | undefined, selectedKeys: string[]): string {
  if (!run) return '';
  const selected = run.results.filter((r) => selectedKeys.includes(r.name));
  const sources = new Set<string>();
  for (const r of selected.length ? selected : run.results) {
    for (const inp of r.inputs) {
      if (inp.source) sources.add(SOURCE_LABEL[inp.source]);
    }
  }
  const list = Array.from(sources);
  if (list.length === 0) return 'A live install uses your numbers.';
  return `Estimates — basis: ${list.join(', ')}. A live install uses your numbers.`;
}

function LeakLedger({
  content,
  run,
}: {
  content: ProposalContent;
  run: LeakStackRun | null | undefined;
}) {
  const runResults = run?.results ?? [];
  const chosen: LeakStackResult[] = runResults.filter((r) =>
    content.selected_leak_keys.includes(r.name),
  );
  const captured = chosen.filter((r) => r.risk_type !== 'avoided_loss');
  const avoided = chosen.filter((r) => r.risk_type === 'avoided_loss');
  const manual = content.manual_leaks ?? [];
  const footnote = summarizeInputsBasis(run, content.selected_leak_keys);

  return (
    <section className="proposal-avoid-break">
      <div className="proposal-eyebrow mb-2">The leak ledger</div>
      <div className="proposal-card p-5 space-y-1">
        {captured.length === 0 && manual.length === 0 && avoided.length === 0 && (
          <div className="text-sm proposal-ink-muted italic">No leaks selected yet.</div>
        )}

        {captured.map((r) => (
          <div key={r.name} className="flex items-baseline justify-between gap-4 border-b proposal-rule py-2 last:border-0">
            <div className="min-w-0">
              <div className="text-base proposal-forest font-medium">{r.name}</div>
              {r.benchmark && <div className="text-xs proposal-ink-muted">{r.benchmark}</div>}
            </div>
            <div className="proposal-money text-xl whitespace-nowrap">
              {fmtMoney(r.monthly_dollars)}<span className="proposal-ink-muted text-xs font-normal proposal-mono"> /mo</span>
            </div>
          </div>
        ))}

        {manual.map((m, i) => (
          <div key={`m-${i}`} className="flex items-baseline justify-between gap-4 border-b proposal-rule py-2 last:border-0">
            <div className="min-w-0">
              <div className="text-base proposal-forest font-medium">
                {m.name}
                <span className="proposal-manual-pill">provided manually</span>
              </div>
              {m.note && <div className="text-xs proposal-ink-muted">{m.note}</div>}
            </div>
            <div className="proposal-money text-xl whitespace-nowrap">
              {fmtMoney(m.monthly_dollars)}<span className="proposal-ink-muted text-xs font-normal proposal-mono"> /mo</span>
            </div>
          </div>
        ))}

        {avoided.length > 0 && (
          <>
            <div className="proposal-eyebrow mt-4 mb-1">Avoided-loss exposure</div>
            {avoided.map((r) => (
              <div key={r.name} className="flex items-baseline justify-between gap-4 border-b proposal-rule py-2 last:border-0">
                <div className="min-w-0">
                  <div className="text-base proposal-forest font-medium">{r.name}</div>
                  {r.benchmark && <div className="text-xs proposal-ink-muted">{r.benchmark}</div>}
                </div>
                <div className="proposal-money text-xl whitespace-nowrap">
                  {fmtMoney(r.monthly_dollars)}<span className="proposal-ink-muted text-xs font-normal proposal-mono"> /mo</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {footnote && <div className="proposal-eyebrow mt-2 normal-case tracking-normal" style={{ letterSpacing: 0, textTransform: 'none' }}>{footnote}</div>}
    </section>
  );
}

function HowItGetsPlugged() {
  const steps = [
    ['Detect', 'Live signals across your ops surface leaks the moment they open.'],
    ['Dollarize', 'Every leak is priced against your real revenue — never fabricated.'],
    ['Assign', 'The right owner is paged with the exact action, not a vague alert.'],
    ['Verify', 'A human approves every outbound send. Nothing ships unwatched.'],
  ];
  return (
    <section className="proposal-avoid-break">
      <div className="proposal-eyebrow mb-2">How it gets plugged</div>
      <div className="proposal-card p-5">
        <div className="grid grid-cols-4 gap-3">
          {steps.map(([title, body], i) => (
            <div key={title} className="relative">
              <div className="proposal-display text-lg mb-1">{title}</div>
              <div className="text-xs proposal-ink-muted leading-snug">{body}</div>
              {i < steps.length - 1 && (
                <div
                  className="absolute top-3 -right-2 w-4 border-t border-dotted"
                  style={{ borderColor: '#C9A24B' }}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t proposal-rule text-xs proposal-ink-muted italic">
          Nothing replaced. A human approves every send.
        </div>
      </div>
    </section>
  );
}

function WhatGetsInstalled({ content }: { content: ProposalContent }) {
  return (
    <section className="proposal-avoid-break">
      <div className="proposal-eyebrow mb-2">What gets installed</div>
      <div className="proposal-card p-5">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="proposal-display text-2xl">{content.price_display || 'Package'}</div>
        </div>
        <ul className="space-y-1.5">
          {(content.engines_included ?? []).map((e) => (
            <li key={e} className="flex items-center gap-2 text-sm proposal-forest">
              <CheckCircle2 className="w-4 h-4 proposal-check" strokeWidth={2.5} />
              {ENGINE_LABEL[e]}
            </li>
          ))}
          {(content.engines_included ?? []).length === 0 && (
            <li className="text-xs proposal-ink-muted italic">No engines selected.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

export function ProposalRenderer({
  proposal,
  run,
}: {
  proposal: ProposalRow;
  run: LeakStackRun | null | undefined;
}) {
  useProposalFonts();
  const c = proposal.content;
  return (
    <div className="proposal-print-root proposal-surface p-10 relative">
      {proposal.status === 'draft' && <div className="proposal-draft-watermark">DRAFT</div>}
      <div className="relative z-10 max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b proposal-rule pb-5">
          <div className="proposal-eyebrow">Profit Leak Proposal</div>
          <h1 className="proposal-display text-5xl mt-2">
            Prepared for {c.prospect_name || 'your business'}
          </h1>
          <div className="text-sm proposal-ink-muted mt-2 proposal-mono">{fmtDate(proposal.created_at)}</div>
          {c.intro_line && <p className="mt-4 text-base leading-relaxed">{c.intro_line}</p>}
        </header>

        <LeakLedger content={c} run={run} />
        <HowItGetsPlugged />
        <WhatGetsInstalled content={c} />

        {/* Next step */}
        <section className="proposal-avoid-break">
          <div className="proposal-eyebrow mb-2">Next step</div>
          <div className="proposal-card p-5 space-y-2">
            <p className="text-base leading-relaxed">
              {c.next_step_line || 'Reply to this proposal and I\'ll open a 20-minute install kickoff.'}
            </p>
            {c.contact_line && <p className="text-sm proposal-ink-muted proposal-mono">{c.contact_line}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}