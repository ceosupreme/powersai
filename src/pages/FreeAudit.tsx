import { useEffect, useRef, useState } from 'react';
import { usePublicAudit, type AuditStatus, type OperationFootprint } from '@/hooks/usePublicAudit';
import { Link, useNavigate } from 'react-router-dom';
import { BookingCta } from '@/components/marketing/BookingCta';
import { WebsiteCheckCard } from '@/components/marketing/WebsiteCheckCard';
import { sanitizeBiz } from '@/pages/VerticalLanding';
import { trackSiteEvent } from '@/lib/studioAnalytics';
import { StudioHeader } from '@/components/marketing/studio/StudioHeader';
import { StudioFooter } from '@/components/marketing/studio/StudioFooter';
import { useStudioHead } from '@/components/marketing/studio/useStudioHead';
import { ROUTE_META } from '@/config/routeMeta';
import { ScoreCard } from '@/components/marketing/checkup/ScoreCard';
import { computeOnlineScore, findingCopy, findingTitle } from '@/components/marketing/checkup/checkupReport';

const STAGES: { key: AuditStatus; label: string }[] = [
  { key: 'resolving', label: 'Finding your Google Business Profile' },
  { key: 'snapshotting', label: 'Scanning your website, reviews, and map ranking' },
  { key: 'auditing', label: 'Checking the basics and where you can grow' },
  { key: 'ranking', label: "Putting dollar figures on what's slipping" },
  { key: 'complete', label: 'Ready' },
];

const ORDER: Record<AuditStatus, number> = {
  queued: 0, resolving: 1, snapshotting: 2, auditing: 3, ranking: 4, complete: 5, failed: 5,
};

const FOOTPRINTS: { value: OperationFootprint; label: string }[] = [
  { value: 'solo_owner', label: 'Solo' },
  { value: 'small_crew_2_5', label: '2 to 5 people' },
  { value: 'crew_6_plus', label: '6 or more people' },
  { value: 'multi_location', label: 'Multi-location' },
];

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '$—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

// Kept in sync with unlock-public-audit/index.ts EMAIL_RE.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function FreeAudit() {
  useStudioHead({ ...ROUTE_META['/free-audit'], path: '/free-audit' });
  const audit = usePublicAudit();
  const search = new URLSearchParams(window.location.search);
  const initialBiz = sanitizeBiz(search.get('biz')) ?? '';
  const src = search.get('src');
  const sourceVertical = src?.match(/^for-([a-z0-9-]{2,40})$/)?.[1] ?? null;
  // A city can arrive with the name from the homepage checkup form.
  const initialCity = (search.get('city') ?? '').replace(/[^\p{L}\p{N}\s,.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState(initialBiz);
  const [city, setCity] = useState(initialCity);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [footprint, setFootprint] = useState<OperationFootprint>('small_crew_2_5');
  const [honeypot, setHoneypot] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [email, setEmail] = useState('');
  const [unlockName, setUnlockName] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const emailValid = EMAIL_RE.test(email.trim());

  const nameMissing = businessName.trim().length === 0;
  const cityMissing = city.trim().length === 0;
  const canSubmit = !nameMissing && !cityMissing && !audit.submitting;
  const missingMessage = nameMissing && cityMissing
    ? 'Add your business name and city to run the checkup.'
    : nameMissing ? 'Add your business name to run the checkup.'
    : cityMissing ? 'Add your city to run the checkup.' : null;
  const showMissing = triedSubmit && !!missingMessage;
  const errorRing = '!border-2 !border-[#D93B2B] !bg-[#FFF5F4]';
  const running = audit.status && audit.status !== 'complete' && audit.status !== 'failed';
  const currentStageIdx = audit.status ? ORDER[audit.status] : -1;
  const firstFinding = audit.full?.results[0];
  // What the report is about: the business type it matched, whether that type
  // has cost estimates, and the online score (results from version 2 on).
  const shown = audit.full ?? audit.redacted;
  const matchedKey = shown?.project_type_resolution?.matched_key ?? null;
  const unknownType = shown?.project_type_resolution?.path === 'default';
  const categoryLabel = shown?.project_type_resolution?.gbp_category ?? shown?.listing?.category ?? null;
  const unknownTypeLine = `We don't have cost estimates for your type of business yet${categoryLabel ? ` (Google lists you as ${categoryLabel})` : ''}.`;
  const score = shown && Number(shown.result_version ?? 0) >= 2
    ? computeOnlineScore({ listing: shown.listing, google: shown.google, website: shown.website, matchedKey })
    : null;
  const estimateNote = 'These dollar figures are estimates based on typical numbers for a business your type and size, not your books.';

  // Started from the homepage checkup form (?start=1 with a name and city):
  // run the same check this page's own form runs, once, then drop the flag
  // from the address so a refresh doesn't start a second check.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('start') !== '1') return;
    autoStarted.current = true;
    params.delete('start');
    const qs = params.toString();
    navigate(`/free-audit${qs ? `?${qs}` : ''}`, { replace: true });
    if (!initialBiz || !initialCity) return;
    audit.run({
      business_name: initialBiz,
      city: initialCity,
      operation_footprint: footprint,
      company_website: '',
    }, { src, sourceVertical, biz: initialBiz });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completionLogged = useRef(false);
  const contextQuery = new URLSearchParams();
  if (src) contextQuery.set('src', src);
  if (businessName.trim()) contextQuery.set('biz', businessName.trim());
  const recommendationHref = `/?${contextQuery.toString()}#contact`;

  useEffect(() => {
    if (audit.status !== 'complete' || completionLogged.current) return;
    completionLogged.current = true;
    trackSiteEvent({ event_type: 'audit_complete', label: 'free_audit', vertical: sourceVertical ?? undefined, src: src ?? undefined });
  }, [audit.status, sourceVertical, src]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return; // bot
    if (!canSubmit) { setTriedSubmit(true); return; }
    audit.run({
      business_name: businessName.trim(),
      city: city.trim(),
      website_url: websiteUrl.trim() || undefined,
      operation_footprint: footprint,
      company_website: honeypot,
    }, { src, sourceVertical, biz: businessName.trim() });
  }

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      setEmailTouched(true);
      return;
    }
    await audit.unlock(email.trim(), unlockName.trim() || undefined);
  }

  return (
    <div className="stm-studio check-page min-h-screen">
      <StudioHeader />
      <main>
        <div className="check-shell mx-auto max-w-4xl px-6">
          <header className="check-intro">
            <p className="home-eyebrow">Free business checkup</p>
            <h1 className="home-section-title">See how your business <em>shows up on Google.</em></h1>
            <p className="check-lede">Two minutes. It reads your Google listing, your site and your reviews and shows what is slipping and what it may be costing you.</p>
            {initialBiz && <p className="check-context">Checking for {initialBiz}</p>}
          </header>

          {/* Intake */}
          {!running && !audit.redacted && (
            <form onSubmit={onSubmit} noValidate className="check-form rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-6 md:p-8 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/60">Business name *</span>
                  <input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    aria-invalid={showMissing && nameMissing}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 text-base focus:border-[hsl(var(--stm-cobalt))] focus:outline-none ${showMissing && nameMissing ? errorRing : 'border-[hsl(var(--stm-ink))]/15'}`}
                    maxLength={200}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/60">City *</span>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    aria-invalid={showMissing && cityMissing}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 text-base focus:border-[hsl(var(--stm-cobalt))] focus:outline-none ${showMissing && cityMissing ? errorRing : 'border-[hsl(var(--stm-ink))]/15'}`}
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
                    maxLength={500}
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--stm-ink))]/50">Just the domain is fine. Leave it blank and we’ll use the one on your Google listing.</p>
                </label>
                <div className="md:col-span-2">
                  <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/60">Size of the operation *</span>
                  <div className="flex flex-wrap gap-2">
                    {FOOTPRINTS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        aria-pressed={footprint === f.value}
                        onClick={() => setFootprint(f.value)}
                        className="check-size rounded-full px-4 py-2 text-sm"
                      >
                        {footprint === f.value && <span aria-hidden="true" className="check-size-tick">✓</span>}
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
                  disabled={audit.submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--stm-cobalt))] px-7 py-3.5 text-sm font-medium text-[hsl(var(--stm-bg))] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
                >
                  {audit.submitting ? 'Starting…' : "Show me what I'm missing"}
                </button>
                <span className="hidden font-mono text-xs text-[hsl(var(--stm-ink))]/50 md:inline">About two minutes</span>
              </div>
              {showMissing && (
                <p role="alert" className="mt-5 rounded-xl border border-[#D93B2B]/40 bg-[#FDECEA] px-4 py-3 text-base font-semibold text-[#B42318]">{missingMessage}</p>
              )}
              {audit.error && <p className="mt-4 text-sm text-[hsl(var(--stm-loss))]">{audit.error}</p>}
            </form>
          )}

          {/* Progress theater */}
          {(running || audit.status === 'failed') && (
            <div className="check-progress mt-2 rounded-2xl bg-[hsl(var(--stm-cobalt))] p-6 font-mono text-sm text-[hsl(var(--stm-bg))] shadow-lg md:p-8" role="status" aria-live="polite">
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-bg))]/70">Live read · {businessName || 'your business'}</p>
              {/* The steps as a short circuit: finished steps light up gold, the current one glows with a
                  signal running toward the next. Same step logic as before; only the look changed. */}
              <ol className="check-circuit">
                {STAGES.map((stage) => {
                  const done = ORDER[stage.key] < currentStageIdx || audit.status === 'complete';
                  const active = ORDER[stage.key] === currentStageIdx && audit.status !== 'complete';
                  const stopped = active && audit.status === 'failed';
                  const state = stopped ? 'is-stopped' : done ? 'is-done' : active ? 'is-active' : 'is-next';
                  return (
                    <li key={stage.key} className={`check-node ${state}`}>
                      <span className="check-led" aria-hidden="true" />
                      <span className="check-step">{stage.label}{active && !stopped ? '…' : ''}</span>
                      <span className="sr-only">{stopped ? ' (stopped)' : done ? ' (done)' : active ? ' (in progress)' : ''}</span>
                    </li>
                  );
                })}
              </ol>
              {audit.status === 'failed' && (
                <div className="mt-5 border-t border-[hsl(var(--stm-bg))]/20 pt-4">
                  <p className="text-[hsl(var(--stm-warn))]">
                    {(() => {
                      const lines = (audit.statusDetail ?? '').trim().split('\n').filter(Boolean);
                      const last = lines[lines.length - 1] ?? '';
                      const cleaned = last.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').replace(/^Pipeline failed:\s*/i, '');
                      // Plain reasons only; technical server lines never reach the visitor.
                      return cleaned && !/degraded|api|http|\b\d{3}\b|shell|dedupe|sync|token|timeout|pipeline|function/i.test(cleaned)
                        ? `We couldn't finish this: ${cleaned}. Your business wasn't touched.`
                        : "We couldn't finish this. Your business wasn't touched.";
                    })()}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => audit.reset()}
                      className="rounded-full bg-[hsl(var(--stm-cobalt))] px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      Try again
                    </button>
                    <Link
                      to={recommendationHref}
                      className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--stm-bg))]/70 underline-offset-4 hover:underline"
                    >
                      Or talk to a human
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Redacted result: the free part, before the email ask. */}
          {audit.redacted && !audit.full && (
            <div className="check-results mt-2 space-y-8">
              {score && <ScoreCard score={score} />}

              {unknownType ? (
                <div className="check-interpretation"><span className="home-eyebrow">First read</span>
                  <p>{unknownTypeLine} Your score and website check are here, and the full report shows how you rank against the top 3 near you. On a short call we'll put numbers on what's costing you customers.</p>
                  <div className="mt-5"><BookingCta src={src} biz={businessName} /></div>
                </div>
              ) : (
                <div className="check-interpretation"><span className="home-eyebrow">First read</span><p>{audit.redacted.leak_count === 0 ? 'No gaps were detected in this check. Keep protecting what is already working.' : `${audit.redacted.leak_count} gap${audit.redacted.leak_count === 1 ? ' needs' : 's need'} a closer look. ${audit.redacted.top_leaks[0] ? `Start with ${findingTitle(audit.redacted.top_leaks[0], matchedKey).toLowerCase()}. The full list shows where to focus next.` : 'Open the full list to see where to focus first.'}`} {estimateNote}</p></div>
              )}

              {!unknownType && (
                <div className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-8 md:p-10 shadow-sm">
                  <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]">Money you're likely missing</p>
                  {(audit.redacted.total_monthly_dollars ?? 0) > 0 ? (
                    <>
                      <p className="font-display text-6xl md:text-8xl leading-[0.95] text-[hsl(var(--stm-loss))]">
                        {fmtMoney(audit.redacted.total_monthly_dollars)}
                        <span className="ml-2 text-2xl md:text-3xl text-[hsl(var(--stm-ink))]/50">a month</span>
                      </p>
                      <p className="mt-4 text-lg text-[hsl(var(--stm-ink))]/70">
                        {audit.redacted.leak_count} distinct gap{audit.redacted.leak_count === 1 ? '' : 's'} detected.
                      </p>
                    </>
                  ) : audit.redacted.leak_count > 0 ? (
                    <>
                      <p className="font-display text-4xl md:text-6xl leading-[1.05] text-[hsl(var(--stm-ink))]">
                        {audit.redacted.leak_count} gap{audit.redacted.leak_count === 1 ? '' : 's'} found
                      </p>
                      <p className="mt-4 text-lg text-[hsl(var(--stm-ink))]/70">
                        A short call with your numbers puts dollars on them.
                      </p>
                      <div className="mt-6"><BookingCta src={src} biz={businessName} /></div>
                    </>
                  ) : (
                    <p className="font-display text-4xl md:text-6xl leading-[1.05] text-[hsl(var(--stm-ink))]">
                      No gaps detected.
                    </p>
                  )}
                  {audit.redacted.top_leaks.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {audit.redacted.top_leaks.map((n) => (
                        <span key={n} className="rounded-full border border-[#D2D8E1] bg-[#F5F7FA] px-3 py-1 text-sm font-medium text-[#0B1530]">{findingTitle(n, matchedKey)}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Their website: free to see, before the email ask. */}
              {audit.redacted.website && <WebsiteCheckCard site={audit.redacted.website} typeKey={unknownType ? null : matchedKey} />}

              {/* Locked rows — only render if there are real remaining leaks beyond the top-3 tease. */}
              {!unknownType && (() => {
                const remaining = Math.max(0, audit.redacted.leak_count - audit.redacted.top_leaks.length);
                if (remaining === 0) return null;
                return (
                  <div className="rounded-2xl border border-dashed border-[hsl(var(--stm-ink))]/15 bg-white/50 p-6">
                    <p className="mb-3 font-mono text-xs uppercase tracking-wider text-[hsl(var(--stm-ink))]/50">
                      + {remaining} more gap{remaining === 1 ? '' : 's'} in the full list
                    </p>
                    <div className="h-16 rounded bg-gradient-to-b from-[hsl(var(--stm-ink))]/5 to-transparent" aria-hidden="true" />
                  </div>
                );
              })()}

              {/* Unlock */}
              <form onSubmit={onUnlock} className="rounded-2xl bg-[hsl(var(--stm-ink))] p-8 text-[hsl(var(--stm-bg))] shadow-lg md:p-10">
                <h3 className="font-display text-3xl md:text-4xl">{unknownType ? 'See the full report.' : 'See the full list.'}</h3>
                <p className="mt-2 text-[hsl(var(--stm-bg))]/70">{unknownType ? 'How you rank against the top 3 near you on Google, shown right here.' : 'Every gap, what it means and what fixes it, shown right here.'}</p>
                <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="text"
                    value={unlockName}
                    onChange={(e) => setUnlockName(e.target.value)}
                    placeholder="Name (optional)"
                    className="rounded-lg border border-[hsl(var(--stm-bg))]/20 bg-transparent px-3 py-2.5 text-[hsl(var(--stm-bg))] placeholder-[hsl(var(--stm-bg))]/40 focus:border-[hsl(var(--stm-cobalt))] focus:outline-none"
                    maxLength={200}
                  />
                  <input
                    type="email"
                    required
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@business.com"
                    className={`rounded-lg border bg-transparent px-3 py-2.5 text-[hsl(var(--stm-bg))] placeholder-[hsl(var(--stm-bg))]/40 focus:outline-none ${
                      emailTouched && email && !emailValid
                        ? 'border-[hsl(var(--stm-loss))] focus:border-[hsl(var(--stm-loss))]'
                        : 'border-[hsl(var(--stm-bg))]/20 focus:border-[hsl(var(--stm-cobalt))]'
                    }`}
                    maxLength={255}
                  />
                  <button
                    type="submit"
                    disabled={audit.unlocking || !emailValid}
                    className="rounded-full bg-[hsl(var(--stm-cobalt))] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {audit.unlocking ? 'Sending…' : unknownType ? 'Show me the full report' : 'Show me the full list'}
                  </button>
                </div>
                {emailTouched && email && !emailValid && (
                  <p className="mt-3 text-sm text-[hsl(var(--stm-loss))]">Enter a valid email address.</p>
                )}
                {audit.error && (
                  <p className="mt-3 text-sm text-[hsl(var(--stm-loss))]">{audit.error}</p>
                )}
              </form>
            </div>
          )}

          {/* Full result */}
          {audit.full && (
            <div className="check-results mt-2 space-y-8">
              {score && <ScoreCard score={score} />}

              <div className="check-interpretation"><span className="home-eyebrow">What this means</span><p>{unknownType
                ? `${unknownTypeLine} Below is how you rank against the top 3 near you and how your website checks out. On a short call we'll put numbers on what's costing you customers.`
                : `${firstFinding ? (() => { const c = findingCopy(firstFinding.name, matchedKey); return `${c.title} is the first place to look.${c.means ? ` ${c.means}` : ''} `; })() : 'No gaps were detected in this check. '}${audit.full.results.length > 1 ? `${audit.full.results.length - 1} other area${audit.full.results.length === 2 ? '' : 's'} could also use attention. ` : ''}${estimateNote}`}</p></div>

              {!unknownType && (
                <div className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-8 md:p-10 shadow-sm">
                  <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]">The full list</p>
                  {audit.full.total_monthly_dollars > 0 ? (
                    <>
                      <p className="font-display text-5xl md:text-7xl leading-[0.95] text-[hsl(var(--stm-loss))]">
                        {fmtMoney(audit.full.total_monthly_dollars)}
                        <span className="ml-2 text-2xl md:text-3xl text-[hsl(var(--stm-ink))]/50">a month</span>
                      </p>
                      {audit.full.total_risk_exposure_dollars > 0 && (
                        <p className="mt-2 text-lg text-[hsl(var(--stm-ink))]/60">
                          Plus an estimated {fmtMoney(audit.full.total_risk_exposure_dollars)} a month at risk.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-display text-4xl md:text-6xl leading-[1.05] text-[hsl(var(--stm-ink))]">
                      {audit.full.results.length} gap{audit.full.results.length === 1 ? '' : 's'} found. A short call with your numbers puts dollars on them.
                    </p>
                  )}
                </div>
              )}

              {!unknownType && (
                <ul className="space-y-3">
                  {audit.full.results.map((leak, i) => {
                    const copy = findingCopy(leak.name, matchedKey);
                    return (
                      <li key={leak.name + i} className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-5 md:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                          <h4 className="min-w-0 flex-1 font-display text-xl md:text-2xl">{copy.title}</h4>
                          <div className="shrink-0 text-right">
                            {leak.render_state === 'priced_with_your_numbers' || leak.monthly_dollars == null ? (
                              <p className="font-display text-base text-[hsl(var(--stm-ink))]/70 max-w-[10rem]">
                                Found. We'll price it with your numbers.
                              </p>
                            ) : (
                              <p className="font-display text-2xl text-[hsl(var(--stm-loss))]">
                                {fmtMoney(leak.monthly_dollars)}<span className="text-sm text-[hsl(var(--stm-ink))]/50"> a month{leak.risk_type === 'avoided_loss' ? ' at risk' : ''}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        {copy.means && <p className="mt-3 text-base leading-relaxed text-[#334155]">{copy.means}</p>}
                        {copy.fix && (
                          <p className="mt-3 border-t border-[#E6EAF0] pt-3 text-base leading-relaxed text-[#0B1530]">
                            <span className="mr-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8A5A08]">What fixes it</span>{copy.fix}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {audit.full.competitor_block && (() => {
                const cb = audit.full.competitor_block;
                const near = audit.full.google?.searched_near;
                const reviewsText = (rating: number | null | undefined, count: number | null | undefined) =>
                  rating == null && count == null ? '' : `${rating != null ? `${rating.toFixed(1)} stars` : ''}${rating != null && count != null ? ' · ' : ''}${count != null ? `${count.toLocaleString('en-US')} review${count === 1 ? '' : 's'}` : ''}`;
                const rows = [
                  { key: 'you', name: `You (${businessName || 'your business'})`, rank: cb.you_rank, reviews: reviewsText(audit.full.listing?.rating, audit.full.listing?.review_count), you: true },
                  ...(cb.top_competitors || []).slice(0, 3).map((c, i) => ({ key: `c${i}`, name: c.name ?? `Competitor ${i + 1}`, rank: c.rank ?? i + 1, reviews: reviewsText(c.rating, c.review_count), you: false })),
                ];
                return (
                  <div className="rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-6 md:p-8">
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]">You vs the top 3 near you</p>
                    <p className="mb-5 text-base text-[#4A5568]">Google search: <span className="font-semibold text-[#0B1530]">{cb.keyword}</span>{near ? ', searched from your location' : ''}</p>
                    <ul className="divide-y divide-[#E6EAF0]">
                      {rows.map((r) => (
                        <li key={r.key} className="flex items-center justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className={`text-lg leading-snug ${r.you ? 'font-bold text-[#0B1530]' : 'font-medium text-[#0B1530]'}`}>{r.name}</p>
                            {r.reviews && <p className="mt-0.5 text-base text-[#4A5568]">{r.reviews}</p>}
                          </div>
                          <span className={`shrink-0 text-lg font-bold ${r.rank == null ? 'text-[#B42318]' : 'text-[#0B1530]'}`}>{r.rank == null ? 'Not in the top 20' : `#${r.rank}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {audit.full.website && <WebsiteCheckCard site={audit.full.website} typeKey={unknownType ? null : matchedKey} />}

              <div className="mt-4 rounded-2xl bg-[hsl(var(--stm-cobalt))] p-8 text-center text-[hsl(var(--stm-bg))] shadow-lg md:p-12">
                <p className="font-display text-2xl md:text-3xl leading-snug">Want this fixed?</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link to={recommendationHref} className="studio-btn studio-btn-primary">Get my recommendation</Link>
                  <BookingCta src={src} biz={businessName} className="border-[hsl(var(--stm-bg))] text-[hsl(var(--stm-bg))]" />
                </div>
              </div>
            </div>
          )}

          <p className="mt-16 border-t border-[hsl(var(--stm-ink))]/10 pt-6 font-mono text-xs text-[hsl(var(--stm-ink))]/50">
            Dollar figures are estimates based on typical numbers for businesses like yours. A full audit uses your real numbers.
          </p>
        </div>
      </main>
      <StudioFooter />
    </div>
  );
}