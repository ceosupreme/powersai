import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, ArrowDown, ArrowRight, ArrowUp, Flag, Calendar, Database, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { confidenceTone, getScoreBand, readinessTone, severityTone } from '../scoreBands';
import { CATEGORY_LABEL, type FindingCategoryKey } from '../findings/mockFindings';
import type { ReportSnapshot } from './types';
import './print.css';

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const TrendChip = ({ n }: { n: number }) => {
  const Icon = n > 0 ? ArrowUp : n < 0 ? ArrowDown : ArrowRight;
  const color = n > 0 ? 'text-emerald-600' : n < 0 ? 'text-destructive' : 'text-muted-foreground';
  return <span className={`inline-flex items-center gap-0.5 text-xs ${color}`}><Icon className="w-3 h-3" />{n > 0 ? '+' : ''}{n}</span>;
};

const ReportTypeLabel: Record<ReportSnapshot['config']['type'], string> = {
  profit_leak: 'Profit Leak Audit',
  full: 'Full Report',
  executive: 'Executive Summary',
  category: 'Category Deep Dive',
  custom: 'Custom Report',
};

// ───────────────────── Cover (shared, upgraded report-surface treatment) ─
const Cover = ({ snap }: { snap: ReportSnapshot }) => {
  const label = ReportTypeLabel[snap.config.type];
  const brandLine = snap.config.type === 'profit_leak'
    ? 'Supreme Team Media · Profit Leak Audit'
    : 'Supreme Team Media · Growth Audit';
  return (
    <section className="report-avoid-break relative overflow-hidden rounded-md report-card p-12 min-h-[58vh] flex flex-col justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md" style={{ background: 'hsl(var(--report-accent-soft))', color: 'hsl(var(--report-accent))' }}>
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="report-eyebrow">{brandLine}</div>
      </div>

      <div className="space-y-5">
        <div className="report-eyebrow report-accent-text">{label}</div>
        <h1 className="report-display text-6xl">{snap.config.venueName}</h1>
        <p className="text-base report-ink-muted">
          {fmtDate(snap.config.dateRange.start)} – {fmtDate(snap.config.dateRange.end)}
        </p>
        {snap.config.preparedFor && (
          <p className="text-sm report-ink-muted">
            Prepared for <span className="font-medium" style={{ color: 'hsl(var(--report-ink))' }}>{snap.config.preparedFor}</span>
          </p>
        )}
      </div>

      <div className="text-[11px] report-ink-muted border-t report-rule pt-4">
        Generated {fmtDate(snap.generatedAt)} · Snapshot {snap.id}
      </div>
    </section>
  );
};

// ───────────────────── Executive Summary ─────────────────────
const ExecSummary = ({ snap }: { snap: ReportSnapshot }) => {
  const band = getScoreBand(snap.primary.growthScore);
  const top5 = [...snap.findings]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);
  return (
    <section className="report-page-break space-y-6">
      <header className="flex items-end justify-between border-b border-border/50 pb-3">
        <h2 className="text-2xl font-bold text-foreground">Executive Summary</h2>
        <span className="text-xs text-muted-foreground">Snapshot taken {fmtDate(snap.generatedAt)}</span>
      </header>

      <div className="grid grid-cols-4 gap-4 report-avoid-break">
        <Card className={`p-4 border ${band.border}`}>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Growth Score</div>
          <div className={`mt-1 text-4xl font-bold ${band.text}`}>{snap.primary.growthScore ?? '—'}</div>
          <div className="mt-1 text-xs text-muted-foreground">{band.label} · <TrendChip n={snap.primary.growthTrend} /> vs last audit</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Revenue Opportunity</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{snap.primary.opportunityDollars}</div>
          <div className="mt-1 text-xs text-muted-foreground">{snap.primary.opportunityLevel} potential</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Data Confidence</div>
          <Badge variant="outline" className={`mt-1 ${confidenceTone(snap.primary.dataConfidence)}`}>{snap.primary.dataConfidence}</Badge>
          <div className="mt-2 text-xs text-muted-foreground leading-snug">{snap.primary.dataConfidenceNote}</div>
        </Card>
        <Card className={`p-4 border ${readinessTone(snap.primary.readiness).border}`}>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Ops Readiness</div>
          <Badge variant="outline" className={`mt-1 ${readinessTone(snap.primary.readiness).text} ${readinessTone(snap.primary.readiness).border} bg-transparent`}>
            {snap.primary.readiness}
          </Badge>
          <div className="mt-2 text-xs text-muted-foreground leading-snug">{snap.primary.readinessReason}</div>
        </Card>
      </div>

      <div className="report-avoid-break">
        <h3 className="text-sm font-semibold text-foreground mb-2">Top 5 Findings</h3>
        {top5.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground italic">
            No findings detected yet — run the audit (Overview → Refresh Now) to populate this report.
          </Card>
        ) : (
        <div className="space-y-2">
          {top5.map((f, i) => (
            <Card key={f.id} className="p-3 flex items-start gap-3">
              <div className="text-xs font-bold text-muted-foreground w-5 pt-0.5">{i + 1}.</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{f.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABEL[f.category]}</div>
              </div>
              <Badge variant="outline" className={severityTone(f.severity === 'Critical' ? 'High' : f.severity)}>
                {f.severity}
              </Badge>
            </Card>
          ))}
        </div>
        )}
      </div>
    </section>
  );
};

// ───────────────────── Category Section ─────────────────────
const CategorySection = ({ snap, catKey }: { snap: ReportSnapshot; catKey: FindingCategoryKey }) => {
  const cat = snap.categories.find(c => c.key === catKey);
  if (!cat) return null;
  const band = getScoreBand(cat.score);
  const findings = snap.findings.filter(f => f.category === catKey);
  const top = [...findings].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3);
  const Icon = cat.icon;
  return (
    <section className="report-page-break space-y-4">
      <header className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${band.bg} ${band.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{cat.name}</h2>
            <div className="text-xs text-muted-foreground">{findings.length} finding{findings.length === 1 ? '' : 's'} in this category</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={confidenceTone(cat.confidence)}>{cat.confidence}</Badge>
          <div className={`text-3xl font-bold ${band.text}`}>{cat.score ?? '—'}</div>
          <TrendChip n={cat.trend} />
        </div>
      </header>

      {/* Score bar */}
      <div className="report-avoid-break">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${band.bg.replace('/15', '')}`} style={{ width: `${cat.score ?? 0}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>0</span><span>40 Weak</span><span>60 Moderate</span><span>80 Strong</span><span>100</span>
        </div>
      </div>

      {top.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">No active findings in this category.</div>
      ) : (
        <div className="space-y-3">
          {top.map(f => (
            <Card key={f.id} className="p-4 report-avoid-break">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-foreground flex-1">{f.title}</div>
                <Badge variant="outline" className={severityTone(f.severity === 'Critical' ? 'High' : f.severity)}>{f.severity}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.diagnosis}</p>
              <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-4 gap-3 text-[11px]">
                <div><div className="text-muted-foreground">Upside</div><div className="font-medium text-foreground">{f.revenueUpside}/5</div></div>
                <div><div className="text-muted-foreground">Ease</div><div className="font-medium text-foreground">{f.ease}/5</div></div>
                <div><div className="text-muted-foreground">Confidence</div><div className="font-medium text-foreground">{f.confidence}/5</div></div>
                <div><div className="text-muted-foreground">Priority</div><div className="font-medium text-foreground">{f.priorityScore}</div></div>
              </div>
              <div className="mt-3 text-xs">
                <span className="text-muted-foreground">Recommended action: </span>
                <span className="text-foreground">{f.recommendedAction}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

// ───────────────────── Top 10 Actions ─────────────────────
const TopActions = ({ snap }: { snap: ReportSnapshot }) => {
  const top10 = [...snap.findings].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 10);
  return (
    <section className="report-page-break space-y-4">
      <header className="flex items-end justify-between border-b border-border/50 pb-3">
        <h2 className="text-2xl font-bold text-foreground">Top 10 Recommended Actions</h2>
        <span className="text-xs text-muted-foreground">Sorted by priority score</span>
      </header>
      <div className="space-y-2">
        {top10.map((f, i) => (
          <Card key={f.id} className="p-3 flex items-center gap-3 report-avoid-break">
            <div className="text-sm font-bold text-muted-foreground w-6">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABEL[f.category]} · {f.recommendedAction}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">Upside {f.revenueUpside}/5</Badge>
              <Badge variant="outline" className="text-[10px]">Ease {f.ease}/5</Badge>
              {f.isTrafficDriving && f.gateReason && (
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10">
                  <ShieldAlert className="w-3 h-3 mr-1" />Gated
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

// ───────────────────── 30/60/90 Plan ─────────────────────
const TimelinePlan = ({ snap }: { snap: ReportSnapshot }) => {
  const sorted = [...snap.findings].sort((a, b) => b.priorityScore - a.priorityScore);
  const buckets = [
    { label: '30 days', items: sorted.slice(0, 3), accent: 'border-emerald-500/40 bg-emerald-500/5' },
    { label: '60 days', items: sorted.slice(3, 6), accent: 'border-amber-500/40 bg-amber-500/5' },
    { label: '90 days', items: sorted.slice(6, 9), accent: 'border-orange-500/40 bg-orange-500/5' },
  ];
  return (
    <section className="report-page-break space-y-4">
      <header className="flex items-end justify-between border-b border-border/50 pb-3">
        <h2 className="text-2xl font-bold text-foreground">30 / 60 / 90 Day Plan</h2>
        <span className="text-xs text-muted-foreground">Sequenced rollout</span>
      </header>
      <div className="grid grid-cols-3 gap-4">
        {buckets.map(b => (
          <Card key={b.label} className={`p-4 border ${b.accent} report-avoid-break`}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm font-semibold text-foreground">{b.label}</div>
            </div>
            <ol className="space-y-3">
              {b.items.map((f, i) => (
                <li key={f.id} className="text-xs">
                  <div className="flex items-start gap-2">
                    <Flag className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium text-foreground leading-snug">{f.title}</div>
                      <div className="text-muted-foreground mt-1">{CATEGORY_LABEL[f.category]}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </section>
  );
};

// ───────────────────── Appendix ─────────────────────
const Appendix = ({ snap }: { snap: ReportSnapshot }) => (
  <section className="report-page-break space-y-4">
    <header className="border-b border-border/50 pb-3">
      <h2 className="text-2xl font-bold text-foreground">Appendix</h2>
    </header>
    <Card className="p-4 report-avoid-break">
      <h3 className="text-sm font-semibold text-foreground mb-2">Methodology</h3>
      <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed list-disc pl-5">
        {snap.methodology.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </Card>
    <Card className="p-4 report-avoid-break">
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <Database className="w-4 h-4" />Data Sources
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {snap.dataSources.map(ds => (
          <div key={ds.label} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/40">
            <span className="text-foreground">{ds.label}</span>
            <Badge variant="outline" className="text-[10px]">{ds.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
    <div className="text-[11px] text-muted-foreground pt-2">
      Audit window: {fmtDate(snap.config.dateRange.start)} – {fmtDate(snap.config.dateRange.end)} ·
      Snapshot ID: {snap.id} · Generated {new Date(snap.generatedAt).toLocaleString('en-US')}
    </div>
  </section>
);

// ───────────────────── Renderer ─────────────────────
export const ReportRenderer = ({ snap }: { snap: ReportSnapshot }) => {
  if (snap.config.type === 'profit_leak') return <ProfitLeakReport snap={snap} />;
  const cats = snap.config.type === 'executive' ? [] : snap.config.categories;
  return (
    <div className="report-print-root space-y-10">
      <Cover snap={snap} />
      <ExecSummary snap={snap} />
      {cats.map(k => <CategorySection key={k} snap={snap} catKey={k} />)}
      {snap.config.type !== 'executive' && <TopActions snap={snap} />}
      {snap.config.type === 'executive' && <TopActions snap={snap} />}
      {(snap.config.type === 'full' || snap.config.type === 'custom' || snap.config.type === 'executive') && <TimelinePlan snap={snap} />}
      <Appendix snap={snap} />
    </div>
  );
};

// ═════════════════════ Profit Leak Snapshot ═════════════════════

const UpsideLabel: Record<number, string> = {
  5: 'Very high upside',
  4: 'High upside',
  3: 'Moderate upside',
  2: 'Modest upside',
  1: 'Low upside',
};

const UpsideDots = ({ n }: { n: number }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        className="w-1.5 h-4 rounded-sm"
        style={{ background: i <= n ? 'hsl(var(--report-accent))' : 'hsl(var(--report-rule))' }}
      />
    ))}
  </div>
);

const LeakCard = ({ rank, f }: { rank: number; f: ReportSnapshot['findings'][number] }) => {
  const sevClass = `report-sev-${f.severity}`;
  const hasDiag = !!f.diagnosis && f.diagnosis.trim().length > 0;
  const hasFix = !!f.recommendedAction && f.recommendedAction.trim().length > 0;
  return (
    <article className="report-card report-avoid-break p-6 flex gap-5">
      <div className={`report-sev-bar ${sevClass}`} />
      <div className="flex-1 min-w-0 space-y-4">
        <header className="flex items-start gap-4">
          <div className="report-display text-3xl report-ink-muted w-10 shrink-0">{String(rank).padStart(2, '0')}</div>
          <div className="flex-1 min-w-0">
            <div className="report-eyebrow mb-1">{CATEGORY_LABEL[f.category]} · {f.severity} severity</div>
            <h3 className="report-display text-2xl leading-tight">{f.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <UpsideDots n={f.revenueUpside} />
            <div className="text-[10px] report-ink-muted mt-1 uppercase tracking-wider">{UpsideLabel[f.revenueUpside]}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          <div>
            <div className="report-eyebrow report-alert-text mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> The leak
            </div>
            {hasDiag ? (
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--report-ink))' }}>{f.diagnosis}</p>
            ) : (
              <p className="text-sm italic report-ink-muted">No diagnosis available yet for this finding.</p>
            )}
          </div>
          <div>
            <div className="report-eyebrow report-accent-text mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> The fix
            </div>
            {hasFix ? (
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--report-ink))' }}>{f.recommendedAction}</p>
            ) : (
              <p className="text-sm italic report-ink-muted">No recommended action available yet for this finding.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const Headline = ({ snap }: { snap: ReportSnapshot }) => {
  const band = getScoreBand(snap.primary.growthScore ?? 0);
  const hasScore = typeof snap.primary.growthScore === 'number';
  const hasOpp = !!snap.primary.opportunityDollars && snap.primary.opportunityDollars.trim().length > 0;
  return (
    <section className="report-avoid-break grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="report-card p-8">
        <div className="report-eyebrow">Growth Score</div>
        <div className="mt-3 flex items-baseline gap-3">
          <div className="report-display text-7xl report-accent-text">{hasScore ? snap.primary.growthScore : '—'}</div>
          <div className="report-display text-2xl report-ink-muted">/100</div>
        </div>
        <div className="mt-3 text-sm report-ink-muted">
          {hasScore ? <>Band: <span className={band.text}>{band.label}</span></> : 'No audit data yet'}
        </div>
      </div>
      <div className="report-card p-8" style={{ background: 'hsl(var(--report-accent-soft))' }}>
        <div className="report-eyebrow report-accent-text">Revenue Opportunity / month</div>
        <div className="mt-3 report-money text-7xl">{hasOpp ? snap.primary.opportunityDollars : '—'}</div>
        <div className="mt-3 text-sm" style={{ color: 'hsl(var(--report-ink))' }}>
          {hasOpp ? `${snap.primary.opportunityLevel} potential, recoverable through the leaks below.` : 'Run the audit to estimate recoverable monthly revenue.'}
        </div>
      </div>
    </section>
  );
};

const TopLeaks = ({ snap }: { snap: ReportSnapshot }) => {
  const top5 = [...snap.findings].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5);
  return (
    <section className="report-page-break space-y-5">
      <header className="space-y-1">
        <div className="report-eyebrow">The top five profit leaks</div>
        <h2 className="report-display text-4xl">Where the money is leaving the business</h2>
      </header>
      {top5.length === 0 ? (
        <div className="report-card p-8 text-center">
          <p className="text-sm italic report-ink-muted">
            No active findings yet for this venue. Run the audit (Overview → Refresh Now) to populate this section.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {top5.map((f, i) => <LeakCard key={f.id} rank={i + 1} f={f} />)}
        </div>
      )}
    </section>
  );
};

const FoundationTile = ({ snap }: { snap: ReportSnapshot }) => {
  const f = snap.foundation;
  return (
    <section className="report-avoid-break space-y-4">
      <header className="space-y-1">
        <div className="report-eyebrow">Foundation readiness</div>
        <h2 className="report-display text-3xl">Can the business absorb the fixes?</h2>
      </header>
      {!f ? (
        <div className="report-card p-8">
          <p className="text-sm italic report-ink-muted">
            No Foundation Audit run yet for this venue.
          </p>
        </div>
      ) : (
        <div className="report-card p-7 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="report-eyebrow">Readiness</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="report-display text-5xl report-accent-text">{f.overall ?? '—'}</div>
              <div className="report-display text-xl report-ink-muted">/100</div>
            </div>
            <div className="mt-3 h-1.5 rounded-full" style={{ background: 'hsl(var(--report-rule))' }}>
              <div className="h-full rounded-full" style={{ width: `${f.overall ?? 0}%`, background: 'hsl(var(--report-accent))' }} />
            </div>
            <div className="mt-3 flex gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--report-accent-soft))', color: 'hsl(var(--report-accent))' }}>
                {f.totals.satisfied} satisfied
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--report-alert-soft))', color: 'hsl(var(--report-alert))' }}>
                {f.totals.missing} missing
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="report-eyebrow mb-2">Top 3 recommended fixes</div>
            {f.recommendedActions.length === 0 ? (
              <p className="text-sm italic report-ink-muted">No outstanding foundation gaps — solid base to build on.</p>
            ) : (
              <ol className="space-y-2.5">
                {f.recommendedActions.slice(0, 3).map((it, i) => (
                  <li key={it.item_key} className="flex items-start gap-3 text-sm">
                    <span className="report-display text-lg report-ink-muted w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium" style={{ color: 'hsl(var(--report-ink))' }}>{it.label}</div>
                      <div className="text-[11px] report-ink-muted mt-0.5">{it.category_key}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

const ProfitLeakReport = ({ snap }: { snap: ReportSnapshot }) => (
  <div className="report-print-root report-surface px-6 md:px-12 py-10 space-y-12">
    <div className="max-w-5xl mx-auto space-y-12">
      <Cover snap={snap} />
      <Headline snap={snap} />
      <TopLeaks snap={snap} />
      <FoundationTile snap={snap} />
    </div>
  </div>
);
