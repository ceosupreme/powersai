import { useEffect, useMemo, useState } from 'react';
import { usePublicAudit, type AuditStatus, type OperationFootprint } from '@/hooks/usePublicAudit';

const STAGES: { key: AuditStatus; label: string }[] = [
  { key: 'resolving', label: 'Resolving your Google Business Profile' },
  { key: 'snapshotting', label: 'Scanning your website, reviews, and map ranking' },
  { key: 'auditing', label: 'Running foundation and growth checks' },
  { key: 'ranking', label: 'Putting dollar figures on what's slipping' },
  { key: 'complete', label: 'Ready' },
];

const ORDER: Record<AuditStatus, number> = {
  queued: 0, resolving: 1, snapshotting: 2, auditing: 3, ranking: 4, complete: 5, failed: 5,
};

const FOOTPRINTS: { value: OperationFootprint; label: string }[] = [
  { value: 'solo_owner', label: 'Solo' },
  { value: 'small_crew_2_5', label: '2–5 crew' },
  { value: 'crew_6_plus', label: '6+ crew' },
  { value: 'multi_location', label: 'Multi-location' },
];

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '$—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export default function FreeAudit() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'The free Missed Money Checkup — see what your business is losing';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content') ?? null;
    if (meta) meta.setAttribute('content', 'Two minutes. My system reads the public side of your business — your Google listing, your website, your reviews — and shows where leads, follow-up, and trust are slipping.');
    return () => {
      document.title = prev;
      if (meta && prevDesc != null) meta.setAttribute('content', prevDesc);
    };
  }, []);
  const audit = usePublicAudit();
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [footprint, setFootprint] = useState<OperationFootprint>('small_crew_2_5');
  const [honeypot, setHoneypot] = useState('');
  const [email, setEmail] = useState('');
  const [unlockName, setUnlockName] = useState('');

  const canSubmit = businessName.trim().length > 0 && city.trim().length > 0 && !audit.submitting;
  const running = audit.status && audit.status !== 'complete' && audit.status !== 'failed';
  const currentStageIdx = audit.status ? ORDER[audit.status] : -1;

  const closingCta = useMemo(() => {
    if (footprint === 'multi_location') {
      return 'This system ran an 8-location group in production — multi-location is its home turf. Book 15 minutes.';
    }
    if (footprint === 'solo_owner') {
      return 'Starts at $49/mo — one system, installed, catching every inquiry. Book 15 minutes.';
    }
    return "This took 2 minutes and I didn't touch your business. Imagine what the full system catches. Book 15 minutes.";
  }, [footprint]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return; // bot
    if (!canSubmit) return;
    audit.run({
      business_name: businessName.trim(),
      city: city.trim(),
      website_url: websiteUrl.trim() || undefined,
      operation_footprint: footprint,
      company_website: honeypot,
    });
  }

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    await audit.unlock(email.trim(), unlockName.trim() || undefined);
  }

  return (
    <>
      <main className="stm-marketing min-h-screen bg-[hsl(var(--stm-bg))] font-body text-[hsl(var(--stm-ink))]">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <header className="mb-10">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]/70">Free Missed Money Checkup</p>
            <h1 className="font-display text-4xl leading-[1.05] md:text-6xl">
              The free Missed Money Checkup
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[hsl(var(--stm-ink))]/70">
              Two minutes. My system reads the public side of your business — your Google listing, your website, your reviews — and shows where leads, follow-up, and trust are slipping, with an honest estimate of what it may be costing.
            </p>
          </header>

          {/* Intake */}
          {!running && !audit.redacted && (
            <form onSubmit={onSubmit} className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-6 md:p-8 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/60">Business name *</span>
                  <input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-lg border border-[hsl(var(--stm-ink))]/15 bg-white px-3 py-2.5 text-base focus:border-[hsl(var(--stm-cobalt))] focus:outline-none"
                    placeholder="Acme Plumbing"
                    maxLength={200}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/60">City *</span>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-[hsl(var(--stm-ink))]/15 bg-white px-3 py-2.5 text-base focus:border-[hsl(var(--stm-cobalt))] focus:outline-none"
                    placeholder="Portland, OR"
                    maxLength={120}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/60">Website (optional)</span>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full rounded-lg border border-[hsl(var(--stm-ink))]/15 bg-white px-3 py-2.5 text-base focus:border-[hsl(var(--stm-cobalt))] focus:outline-none"
                    placeholder="acmeplumbing.com"
                    maxLength={500}
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--stm-ink))]/50">Just the domain is fine — we’ll resolve the rest.</p>
                </label>
                <div className="md:col-span-2">
                  <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/60">Size of the operation *</span>
                  <div className="flex flex-wrap gap-2">
                    {FOOTPRINTS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setFootprint(f.value)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          footprint === f.value
                            ? 'bg-[hsl(var(--stm-cobalt))] text-[hsl(var(--stm-bg))]'
                            : 'border border-[hsl(var(--stm-ink))]/15 bg-white text-[hsl(var(--stm-ink))] hover:border-[hsl(var(--stm-cobalt))]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Honeypot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                aria-hidden="true"
              />

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--stm-cobalt))] px-7 py-3.5 text-sm font-medium text-[hsl(var(--stm-bg))] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
                >
                  {audit.submitting ? 'Starting…' : "Show me what I'm missing"}
                </button>
                <span className="hidden font-mono text-xs text-[hsl(var(--stm-ink))]/50 md:inline">~30 seconds</span>
              </div>
              {audit.error && <p className="mt-4 text-sm text-[hsl(var(--stm-loss))]">{audit.error}</p>}
            </form>
          )}

          {/* Progress theater */}
          {(running || audit.status === 'failed') && (
            <div className="mt-2 rounded-2xl bg-[hsl(var(--stm-cobalt))] p-6 font-mono text-sm text-[hsl(var(--stm-bg))] shadow-lg md:p-8">
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-bg))]/70">Live read · {businessName || 'your business'}</p>
              <ul className="space-y-2">
                {STAGES.map((stage) => {
                  const done = ORDER[stage.key] < currentStageIdx || audit.status === 'complete';
                  const active = ORDER[stage.key] === currentStageIdx && audit.status !== 'complete';
                  const pending = ORDER[stage.key] > currentStageIdx;
                  return (
                    <li key={stage.key} className="flex items-start gap-3">
                      <span className="mt-0.5 w-4">
                        {done ? '✓' : active ? <span className="inline-block animate-pulse">▸</span> : pending ? '·' : '×'}
                      </span>
                      <span className={done ? 'opacity-70' : active ? '' : 'opacity-40'}>
                        {stage.label}{active ? '…' : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {audit.statusDetail && (
                <pre className="mt-5 max-h-40 overflow-auto whitespace-pre-wrap border-t border-[hsl(var(--stm-bg))]/20 pt-3 text-xs opacity-70">{audit.statusDetail}</pre>
              )}
              {audit.status === 'failed' && (
                <div className="mt-5 border-t border-[hsl(var(--stm-bg))]/20 pt-4">
                  <p className="text-[hsl(var(--stm-warn))]">
                    {(() => {
                      const lines = (audit.statusDetail ?? '').trim().split('\n').filter(Boolean);
                      const last = lines[lines.length - 1] ?? '';
                      const cleaned = last.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').replace(/^Pipeline failed:\s*/i, '');
                      return cleaned && !/degraded/i.test(cleaned)
                        ? `We couldn't finish this — ${cleaned}. Your business wasn't touched.`
                        : "We couldn't finish this. Your business wasn't touched.";
                    })()}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => audit.reset()}
                      className="rounded-full bg-[hsl(var(--stm-warn))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--stm-ink))] transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      Try again
                    </button>
                    <a
                      href="/#contact"
                      className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--stm-bg))]/70 underline-offset-4 hover:underline"
                    >
                      Or talk to a human
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Redacted result */}
          {audit.redacted && !audit.full && (
            <div className="mt-2 space-y-8">
              <div className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-8 md:p-10 shadow-sm">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]">Money you're likely missing</p>
                <p className="font-display text-6xl md:text-8xl leading-[0.95] text-[hsl(var(--stm-loss))]">
                  {fmtMoney(audit.redacted.total_monthly_dollars)}
                  <span className="ml-2 text-2xl md:text-3xl text-[hsl(var(--stm-ink))]/50">/mo</span>
                </p>
                <p className="mt-4 text-lg text-[hsl(var(--stm-ink))]/70">
                  {audit.redacted.leak_count} distinct gap{audit.redacted.leak_count === 1 ? '' : 's'} detected.
                </p>
                {audit.redacted.top_leaks.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {audit.redacted.top_leaks.map((n) => (
                      <span key={n} className="rounded-full border border-[hsl(var(--stm-warn))] bg-[hsl(var(--stm-warn))]/10 px-3 py-1 text-sm">{n}</span>
                    ))}
                  </div>
                )}
                {audit.redacted.project_type_resolution?.path === 'default' && (
                  <p className="mt-6 rounded-lg border border-[hsl(var(--stm-warn))]/40 bg-[hsl(var(--stm-warn))]/10 p-3 text-xs">
                    {audit.redacted.project_type_resolution.caveat}
                  </p>
                )}
              </div>

              {/* Locked rows */}
              <div className="rounded-2xl border border-dashed border-[hsl(var(--stm-ink))]/15 bg-white/50 p-6">
                <div className="space-y-2 blur-sm select-none pointer-events-none">
                  {Array.from({ length: Math.max(2, audit.redacted.leak_count - 3) }).map((_, i) => (
                    <div key={i} className="flex justify-between border-b border-[hsl(var(--stm-ink))]/10 pb-2">
                      <span className="text-sm">Additional gap line item {i + 4}</span>
                      <span className="font-mono text-sm">$X,XXX/mo</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unlock */}
              <form onSubmit={onUnlock} className="rounded-2xl bg-[hsl(var(--stm-ink))] p-8 text-[hsl(var(--stm-bg))] shadow-lg md:p-10">
                <h3 className="font-display text-3xl md:text-4xl">See the full list.</h3>
                <p className="mt-2 text-[hsl(var(--stm-bg))]/70">Every gap, every dollar, every source flag. Emailed to you and shown right here.</p>
                <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="text"
                    value={unlockName}
                    onChange={(e) => setUnlockName(e.target.value)}
                    placeholder="Name (optional)"
                    className="rounded-lg border border-[hsl(var(--stm-bg))]/20 bg-transparent px-3 py-2.5 text-[hsl(var(--stm-bg))] placeholder-[hsl(var(--stm-bg))]/40 focus:border-[hsl(var(--stm-warn))] focus:outline-none"
                    maxLength={200}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    className="rounded-lg border border-[hsl(var(--stm-bg))]/20 bg-transparent px-3 py-2.5 text-[hsl(var(--stm-bg))] placeholder-[hsl(var(--stm-bg))]/40 focus:border-[hsl(var(--stm-warn))] focus:outline-none"
                    maxLength={255}
                  />
                  <button
                    type="submit"
                    disabled={audit.unlocking || !email}
                    className="rounded-full bg-[hsl(var(--stm-warn))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--stm-ink))] disabled:opacity-60"
                  >
                    {audit.unlocking ? 'Unlocking…' : 'Show me the full list'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Full result */}
          {audit.full && (
            <div className="mt-2 space-y-8">
              <div className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-8 md:p-10 shadow-sm">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]">The full list</p>
                <p className="font-display text-5xl md:text-7xl leading-[0.95] text-[hsl(var(--stm-loss))]">
                  {fmtMoney(audit.full.total_monthly_dollars)}
                  <span className="ml-2 text-2xl md:text-3xl text-[hsl(var(--stm-ink))]/50">/mo captured revenue</span>
                </p>
                {audit.full.total_risk_exposure_dollars > 0 && (
                  <p className="mt-2 text-lg text-[hsl(var(--stm-ink))]/60">
                    Plus {fmtMoney(audit.full.total_risk_exposure_dollars)}/mo in avoided-loss risk exposure.
                  </p>
                )}
                {audit.full.project_type_resolution?.path === 'default' && (
                  <p className="mt-4 rounded-lg border border-[hsl(var(--stm-warn))]/40 bg-[hsl(var(--stm-warn))]/10 p-3 text-xs">
                    {audit.full.project_type_resolution.caveat}
                  </p>
                )}
              </div>

              <ul className="space-y-3">
                {audit.full.results.map((leak, i) => (
                  <li key={leak.name + i} className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${leak.severity === 'headline' ? 'bg-[hsl(var(--stm-loss))] text-[hsl(var(--stm-bg))]' : 'bg-[hsl(var(--stm-ink))]/10 text-[hsl(var(--stm-ink))]/70'}`}>
                            {leak.severity}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${leak.risk_type === 'avoided_loss' ? 'bg-[hsl(var(--stm-warn))]/20 text-[hsl(var(--stm-ink))]/70' : 'bg-[hsl(var(--stm-cobalt))]/10 text-[hsl(var(--stm-cobalt))]'}`}>
                            {leak.risk_type === 'avoided_loss' ? 'avoided loss' : 'captured revenue'}
                          </span>
                        </div>
                        <h4 className="mt-2 font-display text-xl">{leak.name}</h4>
                        {leak.benchmark && (
                          <p className="mt-1 text-sm text-[hsl(var(--stm-ink))]/60">{leak.benchmark}</p>
                        )}
                      </div>
                      <p className="font-display text-2xl text-[hsl(var(--stm-loss))]">
                        {leak.monthly_dollars == null ? '—' : `${fmtMoney(leak.monthly_dollars)}/mo`}
                      </p>
                    </div>
                    {leak.reason && <p className="mt-3 text-sm text-[hsl(var(--stm-ink))]/70">{leak.reason}</p>}
                    {leak.inputs?.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/50">Inputs & sources</summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {leak.inputs.map((inp, j) => (
                            <li key={j} className="flex flex-wrap gap-x-3 text-[hsl(var(--stm-ink))]/70">
                              <span className="font-mono">{inp.name}</span>
                              <span>= {inp.value ?? '—'}</span>
                              <span className="font-mono text-[10px] uppercase text-[hsl(var(--stm-ink))]/40">{inp.source ?? 'unknown'}</span>
                              {inp.caveat && <span className="w-full text-[hsl(var(--stm-ink))]/50">↳ {inp.caveat}</span>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>

              {audit.full.competitor_block && (
                <div className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-6 md:p-8">
                  <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]">You vs the top 3 near you</p>
                  <p className="mb-4 text-sm text-[hsl(var(--stm-ink))]/60">Search: <span className="font-mono">{audit.full.competitor_block.keyword}</span></p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between border-b border-[hsl(var(--stm-ink))]/10 pb-2">
                      <span className="font-medium">You ({businessName || 'your business'})</span>
                      <span className="font-mono">
                        {audit.full.competitor_block.you_rank == null
                          ? 'not ranking'
                          : `#${audit.full.competitor_block.you_rank}`}
                      </span>
                    </li>
                    {(audit.full.competitor_block.top_competitors || []).slice(0, 3).map((c: any, i) => (
                      <li key={i} className="flex justify-between border-b border-[hsl(var(--stm-ink))]/10 pb-2 text-[hsl(var(--stm-ink))]/70">
                        <span>{c.name ?? c.place_id ?? `Competitor ${i + 1}`}</span>
                        <span className="font-mono">#{c.rank ?? i + 1}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href="mailto:hello@supremeteam.media?subject=Book%2015%20minutes"
                className="mt-4 block rounded-2xl bg-[hsl(var(--stm-cobalt))] p-8 text-center text-[hsl(var(--stm-bg))] shadow-lg md:p-12"
              >
                <p className="font-display text-2xl md:text-3xl leading-snug">{closingCta}</p>
                <span className="mt-4 inline-block rounded-full bg-[hsl(var(--stm-bg))] px-6 py-2 text-sm font-medium text-[hsl(var(--stm-cobalt))]">Book 15 minutes →</span>
              </a>
            </div>
          )}

          <p className="mt-16 border-t border-[hsl(var(--stm-ink))]/10 pt-6 font-mono text-xs text-[hsl(var(--stm-ink))]/50">
            Dollar figures are estimates from public signals and industry benchmarks — a live audit uses YOUR numbers.
          </p>
        </div>
      </main>
    </>
  );
}