import { useState, useMemo, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TrendArrow } from '@/components/shared/TrendArrow';
import { Users, ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeePerformanceWeek } from '@/hooks/useEmployeePerformanceWeek';
import type { EmpPerfViolator } from '@/hooks/useEmployeePerformanceWeek';
import { EmployeeViolationsTrendChart } from './EmployeeViolationsTrendChart';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface NameMatch {
  pattern: string; // lowercased
  id: string;
}

function buildMatches(violators: EmpPerfViolator[]): NameMatch[] {
  const matches: NameMatch[] = [];
  const firstNameCounts = new Map<string, number>();
  // Pass 1: count first names for uniqueness gate
  for (const v of violators) {
    const full = (v.preferredName || v.employeeName).trim();
    const first = full.split(/\s+/)[0]?.toLowerCase();
    if (first) firstNameCounts.set(first, (firstNameCounts.get(first) || 0) + 1);
  }
  // Pass 2: emit candidates
  const seen = new Set<string>();
  for (const v of violators) {
    const candidates: string[] = [];
    if (v.preferredName) candidates.push(v.preferredName);
    if (v.employeeName) candidates.push(v.employeeName);
    const full = (v.preferredName || v.employeeName).trim();
    const parts = full.split(/\s+/);
    if (parts.length >= 2) candidates.push(`${parts[0]} ${parts[parts.length - 1]}`);
    const first = parts[0];
    if (first && (firstNameCounts.get(first.toLowerCase()) ?? 0) === 1) candidates.push(first);
    for (const c of candidates) {
      const key = `${v.id}|${c.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ pattern: c, id: v.id });
    }
  }
  // Longest first so multi-word names match before bare first names
  matches.sort((a, b) => b.pattern.length - a.pattern.length);
  return matches;
}

function LinkifyEmployees({ text, violators }: { text: string; violators: EmpPerfViolator[] }) {
  const matches = useMemo(() => buildMatches(violators || []), [violators]);
  if (!text) return null;
  if (matches.length === 0) return <>{text}</>;

  // Build a single regex that matches any candidate, capture index → id
  const groups = matches.map(m => `(${escapeRegex(m.pattern)})`).join('|');
  const re = new RegExp(`\\b(?:${groups})\\b`, 'gi');

  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) out.push(text.slice(lastIndex, m.index));
    // Find which alternative matched (1-indexed)
    let idx = -1;
    for (let i = 1; i < m.length; i++) {
      if (m[i] !== undefined) { idx = i - 1; break; }
    }
    const id = idx >= 0 ? matches[idx].id : null;
    if (id) {
      out.push(
        <Link
          key={`${m.index}-${id}`}
          to={`/employees/${id}`}
          className="text-primary hover:underline font-medium"
        >
          {m[0]}
        </Link>
      );
    } else {
      out.push(m[0]);
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

interface WeekLike {
  id: string;
  bar_id: string;
  week_start: string;
  week_end: string;
}

interface Props {
  supabaseBarId: string | undefined | null;
  currentWeek: WeekLike | null;
  venueName?: string;
}

const fmtDollars = (v: number) => {
  if (v >= 100) return `$${Math.round(v).toLocaleString()}`;
  return `$${v.toFixed(2)}`;
};

export const EmployeePerformanceCard = ({ supabaseBarId, currentWeek, venueName }: Props) => {
  const [open, setOpen] = useState(false);

  const {
    current,
    previous,
    trend4,
    isLoading,
    shortBrief,
    longBrief,
    isQuiet,
    isLoadingBrief,
  } = useEmployeePerformanceWeek({ supabaseBarId, currentWeek, venueName });

  const isReady = !isLoading && !!current && current.activeEmployees > 0;

  if (!isReady) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <Users className="w-5 h-5 text-muted-foreground" />
        <span className="font-semibold text-sm text-foreground">Employee Performance</span>
        <span className="text-xs text-muted-foreground">
          — no active employees tracked for this venue this week
        </span>
      </div>
    );
  }

  const dir: 'up' | 'down' | 'flat' =
    current!.violations > (previous?.violations ?? 0) ? 'up'
    : current!.violations < (previous?.violations ?? 0) ? 'down'
    : 'flat';

  // Inverted semantic: more violations = bad → render destructive arrow.
  // TrendArrow renders "up" as signal-green by default; we want the opposite.
  // So we map: more violations → 'down' visually-bad (destructive), fewer → 'up' good.
  const visualDir: 'up' | 'down' | 'flat' =
    dir === 'up' ? 'down' : dir === 'down' ? 'up' : 'flat';

  const exposureHot = current!.exposure > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div
          className={cn(
            'bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 hover:border-primary/30 transition-all cursor-pointer',
            open && 'rounded-b-none border-b-0'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Users className="w-5 h-5 text-primary shrink-0" />
            <span className="font-semibold text-sm text-foreground">Employee Performance</span>
            <span className="text-[10px] text-muted-foreground truncate">
              {current!.activeEmployees} active employees
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Violations</span>
              <span className="text-lg font-mono font-bold text-foreground">{current!.violations}</span>
              <TrendArrow direction={visualDir} />
            </div>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
                exposureHot
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span className="text-[10px] uppercase tracking-wide">Exposure</span>
              <span className="font-mono">{fmtDollars(current!.exposure)}</span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Collapsed-state narrative strip: short brief, quiet line, or loading */}
      {!open && (shortBrief || isQuiet || isLoadingBrief) && (
        <div className="bg-card border border-border border-t-0 rounded-b-xl px-4 py-3 text-left">
          {isQuiet ? (
            <p className="text-sm text-muted-foreground italic">
              No significant employee performance changes this week.
            </p>
          ) : shortBrief ? (
            <p className="text-sm text-foreground/90 leading-relaxed">
              <LinkifyEmployees text={shortBrief} violators={current!.violatorIndex} />
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Generating analysis…</p>
          )}
        </div>
      )}

      <CollapsibleContent>
        <div className="bg-card border border-border border-t-0 rounded-b-xl p-4 space-y-5">
          {shortBrief && !isQuiet && (
            <p className="text-sm text-foreground/90 leading-relaxed">
              <LinkifyEmployees text={shortBrief} violators={current!.violatorIndex} />
            </p>
          )}

          {/* 5 KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Tile label="Hours worked" value={current!.hoursWorked.toLocaleString()} />
            <Tile label="OT hours" value={current!.otHours.toString()} />
            <Tile label="Violations" value={current!.violations.toString()} />
            <Tile
              label="Premium pay exposure"
              value={fmtDollars(current!.exposure)}
              valueClass={exposureHot ? 'text-destructive' : undefined}
              sub={current!.missingWageAlerts > 0
                ? <span className="text-orange-400">+{current!.missingWageAlerts} alerts missing wage</span>
                : null}
            />
            <Tile label="Active employees" value={current!.activeEmployees.toString()} />
          </div>

          {/* 4-week trend */}
          <EmployeeViolationsTrendChart trend4={trend4} />

          {/* Long narrative or quiet-week placeholder */}
          {isQuiet ? (
            <p className="text-sm text-muted-foreground italic">
              No significant employee performance changes this week.
            </p>
          ) : longBrief ? (
            <p className="text-sm text-foreground/90 leading-relaxed">
              <LinkifyEmployees text={longBrief} violators={current!.violatorIndex} />
            </p>
          ) : isLoadingBrief ? (
            <p className="text-xs text-muted-foreground italic">Generating analysis…</p>
          ) : null}

          {/* Footer link */}
          <div className="flex justify-end pt-1">
            <Link
              to="/employees?sort=violations_week&dir=desc"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all employees <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

interface TileProps {
  label: string;
  value: string;
  valueClass?: string;
  sub?: React.ReactNode;
}

function Tile({ label, value, valueClass, sub }: TileProps) {
  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-lg font-mono font-bold mt-0.5 text-foreground', valueClass)}>{value}</div>
      {sub ? <div className="text-[10px] mt-0.5">{sub}</div> : null}
    </div>
  );
}
