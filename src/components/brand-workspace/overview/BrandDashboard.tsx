import { ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, Bot, CheckCircle2, ChevronDown, CircleDollarSign, ExternalLink, Flag, History, ListChecks,
  MessageCircleQuestion, Rocket, Send, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatting';
import { getGradeColor, getGradeFromScore } from '@/utils/scoring';
import { TaskAskSheet, TaskExplanationBody, usePhoneSheetSide } from '@/components/tasks/TaskExplainer';
import { STATUS_WORD, typeLabel, type PulseStatus } from '@/lib/brandPulse';
import type { BrandPulse, PulseFeedItem } from '@/hooks/useBrandPulse';
import { useAssetMap } from '@/hooks/useBrandSetup';
import { STATE_WORDS } from '@/lib/brandSetup';
import { useFoundationScores } from '@/components/foundation-audit/useFoundationScores';
import { platformLabel, relativeTime } from '@/lib/ownerWork';
import { compactNumber } from '@/lib/playbookStatus';

export type Subject = 'setup' | 'output' | 'audience' | 'money';
export const SUBJECT: Record<Subject, { label: string; icon: typeof ListChecks; text: string; bg: string; border: string; bar: string; color: string }> = {
  setup: { label: 'Setup', icon: ListChecks, text: 'text-subject-setup', bg: 'bg-subject-setup/10', border: 'border-subject-setup/40', bar: 'bg-subject-setup', color: 'hsl(var(--subject-setup))' },
  output: { label: 'Output', icon: Send, text: 'text-subject-output', bg: 'bg-subject-output/10', border: 'border-subject-output/40', bar: 'bg-subject-output', color: 'hsl(var(--subject-output))' },
  audience: { label: 'Audience', icon: Users, text: 'text-subject-audience', bg: 'bg-subject-audience/10', border: 'border-subject-audience/40', bar: 'bg-subject-audience', color: 'hsl(var(--subject-audience))' },
  money: { label: 'Money', icon: CircleDollarSign, text: 'text-subject-money', bg: 'bg-subject-money/10', border: 'border-subject-money/40', bar: 'bg-subject-money', color: 'hsl(var(--subject-money))' },
};
const MONEY_SHADES = ['hsl(var(--subject-money))', 'hsl(var(--subject-output))', 'hsl(var(--gold))', 'hsl(var(--subject-audience))', 'hsl(var(--subject-setup))'];

export const STATUS_CHIP: Record<PulseStatus, string> = {
  green: 'border-signal-green/50 bg-signal-green/15 text-signal-green',
  amber: 'border-gold/50 bg-gold/15 text-gold',
  red: 'border-destructive/50 bg-destructive/15 text-destructive',
};
export function StatusChip({ status, className }: { status: PulseStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-semibold', STATUS_CHIP[status], className)}>
      <span aria-hidden className={cn('h-2 w-2 rounded-full', status === 'green' ? 'bg-signal-green' : status === 'amber' ? 'bg-gold' : 'bg-destructive')} />
      {STATUS_WORD[status]}
    </Badge>
  );
}

const ink = 'hsl(var(--muted-foreground))';
const tooltipStyle = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))', fontSize: 13 };

export function ScoreRing({ score, size = 72 }: { score: number | null | undefined; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const color = score == null ? ink : getGradeColor(getGradeFromScore(score));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={score == null ? 'No score yet' : `Score ${score} of 100`} role="img">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums" style={{ color }}>{score ?? '—'}</span>
    </div>
  );
}

export function PathSegments({ segments, current }: { segments: boolean[]; current: number | null }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {segments.map((done, i) => (
        <span key={i} className={cn('h-2.5 flex-1 rounded-full', done ? 'bg-primary' : current === i + 1 ? 'bg-primary/40 ring-1 ring-primary' : 'bg-muted')} />
      ))}
    </div>
  );
}

function Meter({ pct, className }: { pct: number; className: string }) {
  return <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', className)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

/** Section heading with an icon and the subject color. */
export function SectionHeading({ icon: Icon, title, tone = 'text-primary', aside }: { icon: typeof ListChecks; title: string; tone?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-muted', tone)}><Icon className="h-4 w-4" /></span>
        {title}
      </h2>
      {aside}
    </div>
  );
}

/** Long content stays short until asked for. */
export function ShowMore({ children, height = 'max-h-[26rem]' }: { children: ReactNode; height?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={cn('relative', !open && cn(height, 'overflow-hidden'))}>
        {children}
        {!open && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />}
      </div>
      <Button type="button" variant="ghost" className="mt-1 min-h-11 w-full" onClick={() => setOpen((v) => !v)}>
        {open ? 'Show less' : 'Show more'} <ChevronDown className={cn('ml-1 h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
    </div>
  );
}

// ---------- Tiles ----------
interface TileModel { tracking: boolean; value: string; sub: string; meter?: number; chart?: ReactNode; off?: { text: string; tab: string; cta: string } }

function tileModels(p: BrandPulse): Record<Subject, TileModel> {
  const o = p.output, a = p.audience, m = p.money;
  return {
    setup: p.setup.needed > 0
      ? { tracking: true, value: `${p.setup.pct}%`, sub: p.setup.gaps === 0 ? 'Nothing missing' : `${p.setup.gaps} piece${p.setup.gaps === 1 ? '' : 's'} missing`, meter: p.setup.pct ?? 0 }
      : { tracking: false, value: '', sub: '', off: { text: 'Turns on when a brand profile is picked, so HQ knows which accounts this brand needs.', tab: 'setup', cta: 'Open Accounts to set up' } },
    output: o.pieces.length > 0 || o.target != null
      ? { tracking: true, value: o.target != null ? `${o.published7} of ${o.target}` : String(o.published7), sub: o.target != null ? 'published this week vs target' : 'published in 7 days', meter: o.target ? (o.published7 / o.target) * 100 : undefined,
          chart: o.pieces.length ? <MiniBars data={o.weeks} color={SUBJECT.output.color} /> : undefined }
      : { tracking: false, value: '', sub: '', off: { text: 'Turns on when a post gets a live link, or a social account gets a posts-per-week target.', tab: 'channels', cta: 'Open Social accounts' } },
    audience: a.total != null
      ? { tracking: true, value: compactNumber(a.total), sub: a.change == null ? 'followers' : `${a.change >= 0 ? '+' : ''}${compactNumber(a.change)} since last count`,
          chart: a.points.length >= 2 ? <MiniLine data={a.points} color={SUBJECT.audience.color} /> : undefined }
      : { tracking: false, value: '', sub: '', off: { text: 'Turns on when a follower count is saved on one of the brand\u2019s social accounts.', tab: 'channels', cta: 'Open Social accounts' } },
    money: m.total != null || p.leads
      ? { tracking: true, value: m.total != null ? formatCurrency(m.total) : `${p.leads!.last30} leads`, sub: m.total != null ? (p.leads ? `${p.leads.last30} leads · ${p.leads.openProposals} open proposals` : 'recorded recently') : `30 days · ${p.leads!.openProposals} open proposals`,
          chart: m.types.length > 1 ? <TypeStrip types={m.types} /> : undefined }
      : { tracking: false, value: '', sub: '', off: { text: 'Turns on when income that actually arrived is recorded under Ways to make money.', tab: 'avenues', cta: 'Open Ways to make money' } },
  };
}

function MiniBars({ data, color }: { data: { label: string; count: number }[]; color: string }) {
  return <div className="h-12 mt-2" aria-hidden><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
function MiniLine({ data, color }: { data: { date: string; total: number }[]; color: string }) {
  return <div className="h-12 mt-2" aria-hidden><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><YAxis hide domain={['dataMin', 'dataMax']} /><Line type="linear" dataKey="total" stroke={color} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>;
}
function TypeStrip({ types }: { types: { type: string; amount: number }[] }) {
  const total = types.reduce((s, t) => s + Math.max(0, t.amount), 0) || 1;
  return <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>{types.map((t, i) => <span key={t.type} style={{ width: `${(Math.max(0, t.amount) / total) * 100}%`, background: MONEY_SHADES[i % MONEY_SHADES.length] }} />)}</div>;
}

export function SubjectTiles({ pulse, onOpen, onOpenTab }: { pulse: BrandPulse; onOpen: (s: Subject) => void; onOpenTab: (tab: string) => void }) {
  const models = tileModels(pulse);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {(Object.keys(SUBJECT) as Subject[]).map((k) => {
        const s = SUBJECT[k]; const t = models[k]; const Icon = s.icon;
        if (!t.tracking) return (
          <div key={k} className={cn('rounded-xl border border-dashed p-3 flex flex-col gap-2', s.border)}>
            <p className={cn('flex items-center gap-1.5 text-sm font-semibold', s.text)}><Icon className="h-4 w-4" />{s.label}</p>
            <p className="text-sm font-medium text-foreground">Not tracking yet</p>
            <p className="text-sm text-muted-foreground leading-snug">{t.off!.text}</p>
            <Button variant="link" className={cn('h-auto min-h-11 justify-start p-0 text-left whitespace-normal', s.text)} onClick={() => onOpenTab(t.off!.tab)}>{t.off!.cta}</Button>
          </div>
        );
        return (
          <button key={k} type="button" onClick={() => onOpen(k)} aria-label={`${s.label}: ${t.value}, ${t.sub}. Open details`}
            className={cn('flex flex-col justify-start rounded-xl border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', s.border, s.bg)}>
            <p className={cn('flex items-center gap-1.5 text-sm font-semibold', s.text)}><Icon className="h-4 w-4" />{s.label}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-foreground break-words">{t.value}</p>
            <p className="text-sm text-muted-foreground leading-snug">{t.sub}</p>
            {t.meter != null && <div className="mt-2"><Meter pct={t.meter} className={s.bar} /></div>}
            {t.chart}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Breakdown sheet ----------
const PURPOSE: Record<Subject, string> = {
  setup: 'How many of the accounts and profiles this brand needs are actually in place. Missing pieces are places customers cannot find or reach the brand.',
  output: 'How many pieces went live each week. Steady publishing is what keeps the brand visible and gives the audience something to follow.',
  audience: 'Total followers across the brand\u2019s social accounts. It shows whether the work is reaching more people over time.',
  money: 'Income recorded for this brand, split by where it came from. It shows which ways of making money are actually paying.',
};

function numbersText(s: Subject, p: BrandPulse): string {
  if (s === 'setup') return `Setup ${p.setup.pct ?? '—'}% complete: ${p.setup.inPlace} of ${p.setup.needed} pieces in place, ${p.setup.gaps} missing.`;
  if (s === 'output') return `Published in the last 7 days: ${p.output.published7}${p.output.target != null ? ` against a weekly target of ${p.output.target}` : ' (no weekly target set)'}. Weekly counts, oldest first: ${p.output.weeks.map((w) => `${w.label}: ${w.count}`).join(', ')}. Scheduled next: ${p.output.scheduled.length}.`;
  if (s === 'audience') return `Total followers: ${p.audience.total ?? 'not recorded'}; change since last count: ${p.audience.change ?? 'not recorded'}. Per channel: ${p.audience.channels.map((c) => `${platformLabel(c.platform)} ${c.handle ?? ''} ${c.latest ?? 'not recorded'}`).join('; ')}.`;
  return `Money since ${p.money.since}: ${p.money.total == null ? 'none recorded' : p.money.total.toFixed(2)}. By type: ${p.money.types.map((t) => `${typeLabel(t.type)} ${t.amount.toFixed(2)}`).join(', ') || 'none'}.${p.leads ? ` Leads in the last 30 days: ${p.leads.last30}; open proposals: ${p.leads.openProposals}.` : ''}`;
}

export function SubjectSheet({ subject, pulse, projectId, brandName, listSize, onClose, onOpenTab }: {
  subject: Subject | null; pulse: BrandPulse; projectId: string; brandName: string; listSize: number | null; onClose: () => void; onOpenTab: (tab: string) => void;
}) {
  const side = usePhoneSheetSide();
  const [asking, setAsking] = useState(false);
  if (!subject) return null;
  const s = SUBJECT[subject]; const Icon = s.icon;
  return (
    <>
      <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent side={side} className={cn('flex flex-col gap-4 overflow-y-auto', side === 'bottom' ? 'max-h-[88vh] rounded-t-2xl' : 'w-full sm:max-w-lg')}>
          <SheetHeader className="text-left">
            <SheetTitle className={cn('flex items-center gap-2 text-lg', s.text)}><Icon className="h-5 w-5" />{s.label}</SheetTitle>
            <SheetDescription className="text-sm text-foreground/80">{PURPOSE[subject]}</SheetDescription>
          </SheetHeader>
          {subject === 'setup' && <SetupBreakdown pulse={pulse} projectId={projectId} onOpenTab={onOpenTab} />}
          {subject === 'output' && <OutputBreakdown pulse={pulse} />}
          {subject === 'audience' && <AudienceBreakdown pulse={pulse} listSize={listSize} />}
          {subject === 'money' && <MoneyBreakdown pulse={pulse} projectId={projectId} />}
          <Button variant="outline" className="min-h-11" onClick={() => setAsking(true)}><MessageCircleQuestion className="h-4 w-4 mr-1.5" />Ask about this</Button>
        </SheetContent>
      </Sheet>
      {asking && (
        <TaskAskSheet
          heading={`Ask about ${s.label.toLowerCase()}`}
          starters={['What do these numbers mean?', 'What should we do next to improve this?', 'What is missing to track this properly?']}
          task={{ title: `${s.label} for ${brandName}`, detail: numbersText(subject, pulse), why: PURPOSE[subject], projectId, hideYourPart: true, status: 'Dashboard section' }}
          onClose={() => setAsking(false)}
        />
      )}
    </>
  );
}

function SetupBreakdown({ pulse, projectId, onOpenTab }: { pulse: BrandPulse; projectId: string; onOpenTab: (t: string) => void }) {
  const map = useAssetMap(projectId);
  const rows = (map.data ?? []).filter((r: any) => r.needed);
  const missing = rows.filter((r: any) => r.state !== 'on_file' && r.state !== 'skipped' && r.state !== 'later');
  const ready = rows.filter((r: any) => r.state === 'on_file');
  return (
    <div className="space-y-3">
      <div><p className="text-3xl font-bold tabular-nums">{pulse.setup.pct}%</p><Meter pct={pulse.setup.pct ?? 0} className={SUBJECT.setup.bar} />
        <p className="mt-1 text-sm text-muted-foreground">{pulse.setup.inPlace} of {pulse.setup.needed} in place</p></div>
      <ul className="space-y-1">
        {missing.map((r: any) => (
          <li key={r.asset_key}><button type="button" onClick={() => onOpenTab('setup')} className="flex w-full min-h-11 items-center gap-3 rounded-md px-2 text-left hover:bg-muted">
            <span aria-hidden className="h-5 w-5 rounded border-2 border-subject-setup/60 shrink-0" />
            <span className="flex-1 text-sm">{r.label}</span><span className="text-xs text-muted-foreground">{STATE_WORDS[r.state] ?? r.state}</span></button></li>
        ))}
        {ready.map((r: any) => (
          <li key={r.asset_key} className="flex min-h-11 items-center gap-3 px-2 text-sm text-muted-foreground"><CheckCircle2 className="h-5 w-5 text-subject-setup shrink-0" />{r.label}</li>
        ))}
      </ul>
      <Button className="min-h-11 w-full" onClick={() => onOpenTab('setup')}>Open Accounts to set up</Button>
    </div>
  );
}

function OutputBreakdown({ pulse }: { pulse: BrandPulse }) {
  const o = pulse.output;
  return (
    <div className="space-y-4">
      {o.pieces.length > 0 ? (
        <div className="h-48"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={o.weeks} margin={{ left: -24, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: ink }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: ink }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Published']} labelFormatter={(l) => `Week of ${l}`} />
            <Bar dataKey="count" fill={SUBJECT.output.color} radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
      ) : <p className="text-sm text-muted-foreground">Nothing has a live link yet, so there is no weekly chart.</p>}
      <div>
        <p className="text-sm font-semibold mb-1">Published</p>
        {o.pieces.length === 0 ? <p className="text-sm text-muted-foreground">None recorded yet.</p> : (
          <ul className="divide-y divide-border">{o.pieces.slice(0, 12).map((p) => (
            <li key={`${p.key}-${p.week}`} className="py-2 flex items-center gap-3 min-h-11">
              <div className="min-w-0 flex-1"><p className="text-sm truncate">{p.title}</p><p className="text-xs text-muted-foreground">{p.where ? `${p.where} · ` : ''}{relativeTime(p.at)}</p></div>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-subject-output p-2" aria-label="Open the post"><ExternalLink className="h-4 w-4" /></a>}
            </li>))}</ul>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold mb-1">Scheduled next</p>
        {o.scheduled.length === 0 ? <p className="text-sm text-muted-foreground">Nothing is scheduled.</p> : (
          <ul className="space-y-1">{o.scheduled.map((x) => <li key={x.key} className="text-sm">{x.title}<span className="text-muted-foreground"> · {x.where ? `${x.where} · ` : ''}{relativeTime(x.at)}</span></li>)}</ul>
        )}
      </div>
    </div>
  );
}

function AudienceBreakdown({ pulse, listSize }: { pulse: BrandPulse; listSize: number | null }) {
  const a = pulse.audience;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3"><p className="text-3xl font-bold tabular-nums">{a.total == null ? '—' : a.total.toLocaleString()}</p>
        {a.change != null && <span className={cn('text-sm', a.change >= 0 ? 'text-signal-green' : 'text-destructive')}>{a.change >= 0 ? '+' : ''}{a.change.toLocaleString()} since last count</span>}</div>
      {a.points.length >= 2 ? (
        <div className="h-48"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={a.points} margin={{ left: -8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: ink }} tickFormatter={(d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: ink }} tickFormatter={(v: number) => v.toLocaleString()} domain={['dataMin', 'dataMax']} allowDecimals={false} tickCount={4} tickLine={false} axisLine={false} width={52} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), 'Followers']} />
            <Line type="linear" dataKey="total" stroke={SUBJECT.audience.color} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart></ResponsiveContainer></div>
      ) : <p className="text-sm text-muted-foreground">Only one follower count is saved so far, so there is no trend line yet.</p>}
      {listSize != null && <p className="text-sm">Email list: <strong>{listSize.toLocaleString()}</strong></p>}
      <ul className="divide-y divide-border">
        {a.channels.map((c) => {
          const diff = c.latest != null && c.previous != null ? c.latest - c.previous : null;
          return (
            <li key={c.id} className="py-2 flex items-center gap-3 min-h-11">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{platformLabel(c.platform)}{c.handle ? ` · ${c.handle}` : ''}</p>
                <p className="text-xs text-muted-foreground">Last post {c.last_post_at ? relativeTime(c.last_post_at) : 'not recorded'}</p></div>
              <div className="text-right"><p className="text-sm font-semibold tabular-nums">{c.latest == null ? '—' : compactNumber(c.latest)}</p>
                {diff != null && diff !== 0 && <p className={cn('text-xs flex items-center justify-end', diff > 0 ? 'text-signal-green' : 'text-destructive')}>{diff > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{compactNumber(Math.abs(diff))}</p>}</div>
              {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="p-2 text-subject-audience" aria-label="Open the account"><ExternalLink className="h-4 w-4" /></a>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MoneyBreakdown({ pulse, projectId }: { pulse: BrandPulse; projectId: string }) {
  const m = pulse.money;
  const foundation = useFoundationScores(projectId);
  const lanes = useMemo(() => ((foundation.result?.categories ?? []) as any[]).flatMap((g) => g.items ?? []).filter((x: any) => String(x.item_key).startsWith('lane_')), [foundation.result]);
  const off = lanes.filter((x: any) => x.status !== 'satisfied');
  const types = m.types.map((t) => t.type);
  return (
    <div className="space-y-4">
      {m.total != null && <p className="text-3xl font-bold tabular-nums">{formatCurrency(m.total)}<span className="ml-2 text-sm font-normal text-muted-foreground">since {m.since}</span></p>}
      {pulse.leads && <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-subject-money/40 p-3"><p className="text-2xl font-bold">{pulse.leads.last30}</p><p className="text-sm text-muted-foreground">leads, last 30 days</p></div>
        <div className="rounded-lg border border-subject-money/40 p-3"><p className="text-2xl font-bold">{pulse.leads.openProposals}</p><p className="text-sm text-muted-foreground">open proposals</p></div>
      </div>}
      {m.months.length >= 2 ? (
        <div className="h-48"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={m.months} margin={{ left: -8, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: ink }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: ink }} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatCurrency(v), typeLabel(n)]} />
            {types.map((t, i) => <Bar key={t} dataKey={t} stackId="m" fill={MONEY_SHADES[i % MONEY_SHADES.length]} />)}
          </BarChart></ResponsiveContainer></div>
      ) : m.types.length > 0 ? (
        <div><TypeStrip types={m.types} /></div>
      ) : null}
      {m.types.length > 0 && <ul className="space-y-1">{m.types.map((t, i) => (
        <li key={t.type} className="flex items-center gap-2 text-sm"><span className="h-3 w-3 rounded-sm" style={{ background: MONEY_SHADES[i % MONEY_SHADES.length] }} />
          <span className="flex-1">{typeLabel(t.type)}</span><span className="tabular-nums font-medium">{formatCurrency(t.amount)}</span></li>))}</ul>}
      {m.rows.length > 0 && <div><p className="text-sm font-semibold mb-1">Entries</p><ul className="divide-y divide-border">{m.rows.map((r) => (
        <li key={r.key} className="py-2 text-sm flex gap-3"><span className="flex-1">{typeLabel(r.type)} · {r.month}{r.note ? <span className="block text-xs text-muted-foreground">{r.note}</span> : null}</span><span className="tabular-nums">{formatCurrency(r.amount)}</span></li>))}</ul></div>}
      {off.length > 0 && <div><p className="text-sm font-semibold mb-1">Ways to make money not turned on yet</p>
        <ul className="space-y-1">{off.slice(0, 10).map((l: any) => <li key={l.item_key} className="text-sm text-muted-foreground">• {l.label ?? l.title ?? l.item_key}</li>)}</ul></div>}
    </div>
  );
}

// ---------- Latest work ----------
const KIND_ICON = { task: CheckCircle2, published: Rocket, path: Flag };
export function LatestWork({ feed, projectId, onOpenTab }: { feed: PulseFeedItem[]; projectId: string; onOpenTab: (t: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState<PulseFeedItem | null>(null);
  if (!feed.length) return <p className="text-sm text-muted-foreground">Nothing finished, published or moved on the path for this brand in the last 60 days.</p>;
  return (
    <>
      <ol className="divide-y divide-border rounded-xl border border-border bg-card">
        {feed.map((f) => {
          const Icon = KIND_ICON[f.kind]; const isOpen = open === f.key;
          const agent = f.who === 'Claude' || f.who === 'AI agent';
          return (
            <li key={f.key}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : f.key)} className="flex w-full min-h-14 items-start gap-3 p-3 text-left hover:bg-muted/40">
                <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', f.kind === 'published' ? 'text-subject-output' : f.kind === 'path' ? 'text-primary' : 'text-signal-green')} />
                <span className="min-w-0 flex-1"><span className="block text-sm text-foreground break-words">{f.text}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">{agent && <Bot className="h-3 w-3" />}{f.who} · {relativeTime(f.at)}</span></span>
                <ChevronDown className={cn('h-4 w-4 mt-1 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && <div className="px-3 pb-3">
                {f.kind === 'task' ? <TaskExplanationBody task={{ title: f.text, detail: f.detail, why: f.why, ownerKind: f.ownerKind, minutes: f.minutes, pillar: f.pillar, status: 'Done', projectId, hideYourPart: true }} onAsk={() => setAsking(f)} />
                  : <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                      {f.detail && <p className="whitespace-pre-wrap">{f.detail}</p>}
                      {f.url && <a className="inline-flex min-h-11 items-center gap-1 text-primary underline" href={f.url} target="_blank" rel="noreferrer">Open {f.kind === 'published' ? 'the post' : 'the proof'} <ExternalLink className="h-3.5 w-3.5" /></a>}
                      {f.kind === 'path' && <Button variant="outline" className="min-h-11" onClick={() => onOpenTab('path')}>Open Business path</Button>}
                      {f.kind === 'published' && <Button variant="outline" className="min-h-11" onClick={() => onOpenTab('content')}>Open Posts and videos</Button>}
                    </div>}
              </div>}
            </li>
          );
        })}
      </ol>
      {asking && <TaskAskSheet task={{ title: asking.text, detail: asking.detail, why: asking.why, projectId, status: 'Done', hideYourPart: true }} onClose={() => setAsking(null)} />}
    </>
  );
}

export const FEED_ICON = History;
