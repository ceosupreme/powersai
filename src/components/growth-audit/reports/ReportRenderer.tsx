import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, ArrowDown, ArrowRight, ArrowUp, Flag, Calendar, Database, ShieldAlert } from 'lucide-react';
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
  full: 'Full Report',
  executive: 'Executive Summary',
  category: 'Category Deep Dive',
  custom: 'Custom Report',
};

// ───────────────────── Cover ─────────────────────
const Cover = ({ snap }: { snap: ReportSnapshot }) => (
  <section className="report-avoid-break relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-10 min-h-[60vh] flex flex-col justify-between">
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="text-sm font-semibold tracking-wide text-foreground">Supreme Team Media · Growth Audit</div>
    </div>

    <div className="space-y-4">
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
        {ReportTypeLabel[snap.config.type]}
      </Badge>
      <h1 className="text-5xl font-bold tracking-tight text-foreground">{snap.config.venueName}</h1>
      <p className="text-lg text-muted-foreground">
        Growth Audit · {fmtDate(snap.config.dateRange.start)} – {fmtDate(snap.config.dateRange.end)}
      </p>
      {snap.config.preparedFor && (
        <p className="text-sm text-muted-foreground">Prepared for <span className="text-foreground font-medium">{snap.config.preparedFor}</span></p>
      )}
    </div>

    <div className="text-xs text-muted-foreground border-t border-border/50 pt-4">
      Generated {fmtDate(snap.generatedAt)} · Snapshot {snap.id}
    </div>
  </section>
);

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
          <div className={`mt-1 text-4xl font-bold ${band.text}`}>{snap.primary.growthScore}</div>
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
          <div className={`text-3xl font-bold ${band.text}`}>{cat.score}</div>
          <TrendChip n={cat.trend} />
        </div>
      </header>

      {/* Score bar */}
      <div className="report-avoid-break">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${band.bg.replace('/15', '')}`} style={{ width: `${cat.score}%` }} />
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
