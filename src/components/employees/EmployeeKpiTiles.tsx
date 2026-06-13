import { Users, AlertTriangle, DollarSign, Clock, UserPlus, ArrowUp, ArrowDown } from 'lucide-react';
import type { EmployeeRow } from '@/hooks/useEmployees';
import type { EmployeeKpis } from '@/hooks/useEmployeeKpis';
import { formatTenure } from './utils';

export type ActiveTile = 'active' | 'compliance' | 'newhires' | null;

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'muted';

const toneStyles: Record<Tone, { value: string; border: string; bg: string }> = {
  neutral: { value: 'text-foreground',           border: 'border-l-border',          bg: '' },
  good:    { value: 'text-emerald-400',          border: 'border-l-emerald-500/60',  bg: 'bg-emerald-500/5' },
  warn:    { value: 'text-yellow-400',           border: 'border-l-yellow-500/60',   bg: 'bg-yellow-500/5' },
  bad:     { value: 'text-red-400',              border: 'border-l-red-500/60',      bg: 'bg-red-500/5' },
  info:    { value: 'text-blue-400',             border: 'border-l-blue-500/60',     bg: 'bg-blue-500/5' },
  muted:   { value: 'text-muted-foreground',     border: 'border-l-border',          bg: '' },
};

const Tile = ({
  label,
  value,
  sub,
  onClick,
  active,
  Icon,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  Icon: typeof Users;
  tone?: Tone;
}) => {
  const clickable = !!onClick;
  const ringClass = active ? 'ring-1 ring-primary/50' : '';
  const hoverClass = clickable ? 'hover:bg-muted/30 cursor-pointer' : '';
  const t = toneStyles[tone];
  const Wrap: any = clickable ? 'button' : 'div';
  return (
    <Wrap
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      className={`bg-card border border-border border-l-2 ${t.border} ${t.bg} rounded-xl p-4 text-left transition-colors ${hoverClass} ${ringClass}`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1.5 tabular-nums ${t.value}`}>{value}</div>
      {sub ? <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div> : null}
    </Wrap>
  );
};

const PREMIUM_PAY_THRESHOLD = 500;

export const EmployeeKpiTiles = ({ employees, kpis, activeTile, onTileClick }: {
  employees: EmployeeRow[];
  kpis: EmployeeKpis | undefined;
  activeTile: ActiveTile;
  onTileClick: (tile: ActiveTile) => void;
}) => {
  const activeEmployees = employees.filter(e => e.is_active);
  const activeCount = activeEmployees.length;

  // Premium pay exposure
  let exposure = 0;
  let missingWageAlerts = 0;
  if (kpis) {
    for (const emp of activeEmployees) {
      const cnt = kpis.missedMealCounts.get(emp.id) || 0;
      if (cnt === 0) continue;
      if (emp.hourly_wage === null || emp.hourly_wage === undefined) {
        missingWageAlerts += cnt;
      } else {
        exposure += cnt * Number(emp.hourly_wage);
      }
    }
  }

  // Avg tenure
  const tenureVals = activeEmployees.map(e => e.tenure_days).filter((v): v is number => v !== null);
  const avgTenure = tenureVals.length
    ? Math.round(tenureVals.reduce((s, v) => s + v, 0) / tenureVals.length)
    : null;

  // New hires
  const newHires = employees.filter(e => e.tenure_days !== null && e.tenure_days < 30).length;

  // Compliance trend
  const cur = kpis?.current30Count ?? 0;
  const prior = kpis?.prior30Count ?? 0;
  const delta = cur - prior;
  let trendNode: React.ReactNode = null;
  if (kpis) {
    if (delta > 0) {
      trendNode = (
        <span className="inline-flex items-center gap-0.5 text-orange-400">
          <ArrowUp className="w-3 h-3" /> {delta} more vs. prior 30d
        </span>
      );
    } else if (delta < 0) {
      trendNode = (
        <span className="inline-flex items-center gap-0.5 text-emerald-400">
          <ArrowDown className="w-3 h-3" /> {Math.abs(delta)} fewer vs. prior 30d
        </span>
      );
    } else {
      trendNode = <span className="text-muted-foreground">no change vs. prior 30d</span>;
    }
  }

  // Tone selection
  const complianceTone: Tone = !kpis
    ? 'neutral'
    : cur === 0 ? 'good' : cur <= 2 ? 'warn' : 'bad';

  const exposureTone: Tone = !kpis
    ? 'muted'
    : exposure >= PREMIUM_PAY_THRESHOLD
      ? 'bad'
      : exposure > 0 || missingWageAlerts > 0
        ? 'warn'
        : 'good';

  const tenureTone: Tone = avgTenure === null
    ? 'muted'
    : avgTenure > 30 ? 'good' : 'warn';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Tile
        Icon={Users}
        label="Active employees"
        value={activeCount}
        onClick={() => onTileClick('active')}
        active={activeTile === 'active'}
        tone="neutral"
      />
      <Tile
        Icon={AlertTriangle}
        label="Compliance · 30d"
        value={cur}
        sub={trendNode}
        onClick={() => onTileClick('compliance')}
        active={activeTile === 'compliance'}
        tone={complianceTone}
      />
      <Tile
        Icon={DollarSign}
        label="Premium pay exposure"
        value={kpis ? `$${exposure.toFixed(2)}` : '—'}
        sub={
          missingWageAlerts > 0 ? (
            <span className="text-orange-400">+{missingWageAlerts} alerts missing wage</span>
          ) : null
        }
        tone={exposureTone}
      />
      <Tile
        Icon={Clock}
        label="Avg tenure"
        value={formatTenure(avgTenure)}
        tone={tenureTone}
      />
      <Tile
        Icon={UserPlus}
        label="New hires · 30d"
        value={newHires}
        onClick={() => onTileClick('newhires')}
        active={activeTile === 'newhires'}
        tone="info"
      />
    </div>
  );
};
