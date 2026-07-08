import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { TrendArrow } from '@/components/shared/TrendArrow';
import { CheckSquare, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTaskPerformance } from '@/hooks/useTaskPerformance';

interface WeekLike {
  id: string;
  bar_id: string;
  week_start: string;
  week_end: string;
}

interface CoreLike extends Record<string, unknown> {
  bar_id?: string;
  week_id?: string;
}

interface TaskPerformanceCardProps {
  supabaseBarId: string | undefined | null;
  currentWeek: WeekLike | null;
  weeklyCores: CoreLike[];
  supabaseWeeks: WeekLike[];
  venueName?: string;
  gmName?: string;
}

const pctLabel = (v: number | null) =>
  v == null ? '—' : `${Math.round(v * 100)}%`;

const trendDirection = (
  curr: number | null,
  prev: number | null
): 'up' | 'down' | 'flat' => {
  if (curr == null || prev == null) return 'flat';
  const diff = curr - prev;
  if (Math.abs(diff) < 0.01) return 'flat';
  return diff > 0 ? 'up' : 'down';
};

export const TaskPerformanceCard = ({
  supabaseBarId,
  currentWeek,
  weeklyCores,
  supabaseWeeks,
  venueName,
  gmName,
}: TaskPerformanceCardProps) => {
  const [open, setOpen] = useState(false);

  const {
    current,
    previous,
    trend4,
    shortBrief,
    longBrief,
    isReady,
    isLoadingBrief,
    isGmNotMapped,
  } = useTaskPerformance({
    supabaseBarId,
    currentWeek,
    weeklyCores,
    supabaseWeeks,
    venueName,
    gmName,
  });

  if (isGmNotMapped) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <CheckSquare className="w-5 h-5 text-muted-foreground" />
        <span className="font-semibold text-sm text-foreground">Task Performance</span>
        <span className="text-xs text-muted-foreground">
          — GM not mapped for this venue. Add a GM in Settings → Leadership to enable task tracking.
        </span>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <CheckSquare className="w-5 h-5 text-muted-foreground" />
        <span className="font-semibold text-sm text-foreground">Task Performance</span>
        <span className="text-xs text-muted-foreground">
          — no GM Asana tasks tracked for this project this week
          {current.totalOutstanding != null && current.totalOutstanding > 0
            ? ` (${current.totalOutstanding} outstanding)`
            : current.openBacklog != null && current.openBacklog > 0
              ? ` (${current.openBacklog} open in backlog)`
              : ''}
        </span>
      </div>
    );
  }

  const dir = trendDirection(current.resolutionRate, previous.resolutionRate);
  const inRedHot = current.inRed > 0;

  const chartData = trend4.map((p, i) => ({
    name: p.weekStart.slice(5),
    value: p.resolutionRate == null ? null : Math.round(p.resolutionRate * 100),
    isCurrent: i === trend4.length - 1,
    hasData: p.resolutionRate != null,
  }));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div
          className={cn(
            'bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 hover:border-primary/30 transition-all cursor-pointer',
            open && 'rounded-b-none border-b-0'
          )}
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm text-foreground">Task Performance</span>
            <span className="text-[10px] text-muted-foreground">
              {gmName ? `GM: ${gmName}` : 'GM'}
            </span>
            <span className="text-[9px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              GM tasks only
            </span>
            {current.totalOutstanding != null && current.totalOutstanding > 0 && (
              <span className="text-[10px] text-muted-foreground">
                · {current.totalOutstanding} outstanding
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Resolution</span>
              <span className="text-lg font-mono font-bold text-foreground">
                {pctLabel(current.resolutionRate)}
              </span>
              <TrendArrow direction={dir} />
            </div>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
                inRedHot
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span className="text-[10px] uppercase tracking-wide">In the Red</span>
              <span className="font-mono">{current.inRed}</span>
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

      {/* Short brief always visible if present (renders in the body when open, otherwise as standalone strip) */}
      {!open && shortBrief && (
        <div className="bg-card border border-border border-t-0 rounded-b-xl px-4 py-3">
          <p className="text-sm text-foreground/90 leading-relaxed text-left">{shortBrief}</p>
        </div>
      )}

      <CollapsibleContent>
        <div className="bg-card border border-border border-t-0 rounded-b-xl p-4 space-y-5">
          {shortBrief && (
            <p className="text-sm text-foreground/90 leading-relaxed">{shortBrief}</p>
          )}

          {/* Headline workload row — Chad's mental model: workload + backlog + throughput */}
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Total Assigned"
              value={current.totalAssigned != null ? current.totalAssigned.toString() : '—'}
              tooltip="Cumulative tasks assigned to this GM as of week end"
            />
            <Stat
              label="Outstanding"
              value={current.totalOutstanding != null ? current.totalOutstanding.toString() : '—'}
              tooltip="Open backlog as of week end"
            />
            <Stat
              label="Completed This Week"
              value={current.completedThisWeek != null ? current.completedThisWeek.toString() : '—'}
              tooltip="Tasks closed between week start and week end"
            />
          </div>

          {/* Quality / scoring row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat
              label="In the Red"
              value={current.inRed.toString()}
              valueClass={inRedHot ? 'text-destructive' : undefined}
              tooltip="Snapshot as of Monday score compute"
            />
            <Stat label="Resolution %" value={pctLabel(current.resolutionRate)} />
            <Stat label="On-Time %" value={pctLabel(current.onTimeRate)} />
          </div>

          {/* 4-week trend */}
          {trend4.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Resolution Rate · last {trend4.length} weeks
                  </h4>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  vs 80% target
                </span>
              </div>
              <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="taskPerfGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 11,
                        color: 'hsl(var(--popover-foreground))',
                        boxShadow: '0 10px 25px -5px hsl(0 0% 0% / 0.2)',
                      }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d: any = payload[0].payload;
                        const color = !d.hasData
                          ? 'hsl(var(--muted-foreground))'
                          : d.value >= 80
                            ? 'hsl(var(--signal-green))'
                            : d.value >= 60
                              ? 'hsl(var(--gold))'
                              : 'hsl(var(--destructive))';
                        return (
                          <div className="rounded-lg shadow-lg border border-border bg-popover p-3">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                              {label}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">Resolution</span>
                              <span
                                className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                                style={{
                                  color,
                                  background: `color-mix(in hsl, ${color} 15%, transparent)`,
                                }}
                              >
                                {d.hasData ? `${d.value}%` : '—'}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={80}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="3 3"
                      strokeOpacity={0.4}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="none"
                      fill="url(#taskPerfGradient)"
                      isAnimationActive={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      isAnimationActive={false}
                      connectNulls
                      dot={(props: any) => {
                        const { cx, cy, payload, index } = props;
                        if (cx == null || cy == null) return <g key={index} />;
                        const color = !payload.hasData
                          ? 'hsl(var(--muted-foreground))'
                          : payload.value >= 80
                            ? 'hsl(var(--signal-green))'
                            : payload.value >= 60
                              ? 'hsl(var(--gold))'
                              : 'hsl(var(--destructive))';
                        if (!payload.hasData) {
                          return (
                            <circle
                              key={index}
                              cx={cx}
                              cy={cy}
                              r={3.5}
                              fill="hsl(var(--card))"
                              stroke={color}
                              strokeWidth={1.5}
                              strokeDasharray="2 2"
                            />
                          );
                        }
                        if (payload.isCurrent) {
                          return (
                            <g key={index}>
                              <circle cx={cx} cy={cy} r={6} fill={color} />
                              <circle
                                cx={cx}
                                cy={cy}
                                r={6}
                                fill="none"
                                stroke="hsl(var(--card))"
                                strokeWidth={2}
                              />
                            </g>
                          );
                        }
                        return (
                          <circle key={index} cx={cx} cy={cy} r={4} fill={color} />
                        );
                      }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Long brief */}
          {longBrief ? (
            <p className="text-sm text-foreground/90 leading-relaxed">{longBrief}</p>
          ) : isLoadingBrief ? (
            <p className="text-xs text-muted-foreground italic">Generating analysis…</p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

interface StatProps {
  label: string;
  value: string;
  valueClass?: string;
  tooltip?: string;
}

function Stat({ label, value, valueClass, tooltip }: StatProps) {
  const labelEl = (
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
      <span>{label}</span>
      {tooltip && <Info className="w-3 h-3" />}
    </div>
  );

  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2">
      {tooltip ? (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="cursor-help">{labelEl}</div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-auto max-w-[240px] p-2">
            <p className="text-xs text-foreground">{tooltip}</p>
          </HoverCardContent>
        </HoverCard>
      ) : (
        labelEl
      )}
      <div className={cn('text-lg font-mono font-bold mt-0.5 text-foreground', valueClass)}>
        {value}
      </div>
    </div>
  );
}
