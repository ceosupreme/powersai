import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronDown, LayoutGrid, Table2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePortfolioData, PortfolioVenue, GMRanking } from '@/hooks/usePortfolioData';
import { useRole } from '@/context/RoleContext';
import { useApp } from '@/context/AppContext';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';
import { OwnerBarDetail } from '@/components/portfolio/OwnerBarDetail';
import { VenueComparisonTable } from '@/components/portfolio/VenueComparisonTable';
import { PortfolioGetStartedCard } from '@/components/portfolio/PortfolioGetStartedCard';
import { WeeklySnapshotWidget } from '@/components/weekly-review/WeeklySnapshotWidget';
import { formatCurrency, formatPercent } from '@/utils/formatting';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

function PillarMiniBar({ label, score }: { label: string; score: number | null }) {
  if (score == null) {
    return (
      <div className="flex-1 text-center">
        <div className="h-6 rounded text-xs flex items-center justify-center font-medium bg-muted text-muted-foreground">--</div>
        <span className="text-[10px] text-muted-foreground mt-0.5 block">{label}</span>
      </div>
    );
  }

  const grade = getGradeFromScore(score);
  const color = getGradeColor(grade);

  return (
    <div className="flex-1 text-center">
      <div
        className="h-6 rounded text-xs flex items-center justify-center font-medium"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {grade}
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5 block">{label}</span>
    </div>
  );
}

function getVenueStatusDotClass(venue: PortfolioVenue) {
  if (venue.statusTone === 'critical') {
    return 'bg-destructive animate-pulse-critical';
  }

  if (venue.statusTone === 'high') {
    return 'bg-orange';
  }

  if (venue.statusTone === 'medium') {
    return 'bg-gold';
  }

  return 'bg-signal-green';
}

function VenueScorecard({
  venue,
  onClick,
}: {
  venue: PortfolioVenue;
  onClick: () => void;
}) {
  const gradeColor = venue.grade ? getGradeColor(venue.grade) : undefined;
  const hasScore = venue.score != null;
  const isLowConfidence = (venue.confidence ?? 100) < 40;

  const statusDotClass = getVenueStatusDotClass(venue);

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-card border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors',
        isLowConfidence ? 'border-orange/30' : 'border-border'
      )}
    >
      {statusDotClass && (
        <span
          aria-hidden="true"
          className={cn('absolute right-4 top-4 h-2.5 w-2.5 rounded-full', statusDotClass)}
        />
      )}

      <div className="flex items-center justify-between mb-3 pr-5">
        <h3 className="font-semibold text-foreground truncate">{venue.name}</h3>
        {isLowConfidence && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange/15 text-orange font-medium shrink-0 ml-2">No POS</span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        {hasScore && !isLowConfidence ? (
          <>
            <span className="text-3xl font-bold" style={{ color: gradeColor }}>{venue.score}</span>
            <span className="text-xl font-bold" style={{ color: gradeColor }}>{venue.grade}</span>
            {venue.scoreWoW != null && (
              <span className={cn('text-sm', venue.scoreWoW >= 0 ? 'text-signal-green' : 'text-destructive')}>
                {venue.scoreWoW > 0 ? '↑' : venue.scoreWoW < 0 ? '↓' : '—'}
                {venue.scoreWoW !== 0 && Math.abs(venue.scoreWoW)} WoW
              </span>
            )}
          </>
        ) : isLowConfidence ? (
          <span className="text-2xl font-bold text-muted-foreground">—</span>
        ) : (
          <span className="text-3xl font-bold text-muted-foreground">--</span>
        )}
      </div>

      <div className="mb-2">
        <span className="text-lg text-foreground">
          {venue.weeklyRevenue != null ? formatCurrency(venue.weeklyRevenue) : '--'}
        </span>
        {venue.revenueChange != null && (
          <span className={cn('text-sm ml-2', venue.revenueChange >= 0 ? 'text-signal-green' : 'text-destructive')}>
            {venue.revenueChange >= 0 ? '+' : ''}{formatPercent(venue.revenueChange)}
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-3">
        <PillarMiniBar label="R" score={venue.revenueScore} />
        <PillarMiniBar label="L" score={venue.laborScore} />
        <PillarMiniBar label="O" score={venue.operationsScore} />
        <PillarMiniBar label="G" score={venue.guestScore} />
      </div>

      <div className="mt-3 text-primary text-sm font-medium">View →</div>
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const PLACEHOLDER_VENUES = [
  'Aero Club', 'Club Marina', 'Hearth House',
  'Sycamore Den', 'The Hills', 'Waterfront Bar & Grill', 'Werewolf'
];

function ComingSoonVenueCard({ name }: { name: string }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-lg p-4 opacity-50">
      <h3 className="font-semibold text-foreground mb-3 truncate">{name}</h3>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm italic text-muted-foreground">Coming Soon</span>
      </div>
      <div className="mb-3">
        <span className="text-lg text-muted-foreground">--</span>
      </div>
      <div className="flex gap-1 mb-3">
        <PillarMiniBar label="R" score={null} />
        <PillarMiniBar label="L" score={null} />
        <PillarMiniBar label="O" score={null} />
        <PillarMiniBar label="G" score={null} />
      </div>
    </div>
  );
}

function formatCompactCurrency(value: number | null | undefined) {
  if (value == null) return '—';
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

function shortenVenueName(name: string) {
  const map: Record<string, string> = {
    'Aero Club': 'Aero',
    'Club Marina': 'CM',
    'Harbor Town': 'HTP',
    'Hearth House': 'Hearth',
    'Sycamore Den': 'Syc',
    'The Hills': 'Hills',
    'Waterfront Bar & Grill': 'WF',
    'Werewolf': 'WW',
  };

  return map[name] || name;
}

function RevenueByVenueSection({
  bars,
  selectedWeekLabel,
}: {
  bars: { id: string; bar_name: string }[];
  selectedWeekLabel: string | null;
}) {
  const { selectedWeek } = useApp();

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ['portfolio-revenue-by-venue', bars.map((bar) => bar.id), selectedWeek?.week_start],
    queryFn: async () => {
      if (!bars.length || !selectedWeek?.week_start) return [];

      const priorWeekStart = format(subWeeks(new Date(`${selectedWeek.week_start}T00:00:00`), 1), 'yyyy-MM-dd');
      const barIds = bars.map((bar) => bar.id);

      const { data: weeks, error: weeksError } = await supabase
        .from('weeks')
        .select('id, bar_id, week_start')
        .in('bar_id', barIds)
        .in('week_start', [selectedWeek.week_start, priorWeekStart]);

      if (weeksError) throw weeksError;
      if (!weeks?.length) return [];

      const weekIds = weeks.map((week) => week.id);
      const { data: cores, error: coresError } = await supabase
        .from('weekly_core')
        .select('week_id, net_sales')
        .in('week_id', weekIds);

      if (coresError) throw coresError;

      const coreByWeekId = new Map((cores || []).map((core) => [core.week_id, core.net_sales ?? 0]));
      const currentWeekByBar = new Map(
        weeks
          .filter((week) => week.week_start === selectedWeek.week_start)
          .map((week) => [week.bar_id, week.id])
      );
      const priorWeekByBar = new Map(
        weeks
          .filter((week) => week.week_start === priorWeekStart)
          .map((week) => [week.bar_id, week.id])
      );

      return bars
        .map((bar) => {
          const currentSales = coreByWeekId.get(currentWeekByBar.get(bar.id) || '') ?? 0;
          const priorSales = coreByWeekId.get(priorWeekByBar.get(bar.id) || '') ?? 0;
          const changePct = priorSales > 0 ? ((currentSales - priorSales) / priorSales) * 100 : null;

          return {
            id: bar.id,
            name: shortenVenueName(bar.bar_name),
            fullName: bar.bar_name,
            thisWeek: currentSales,
            priorWeek: priorSales,
            thisWeekLabel: formatCompactCurrency(currentSales),
            priorWeekLabel: formatCompactCurrency(priorSales),
            changePct,
            changeLabel: changePct == null ? '—' : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
          };
        })
        .sort((a, b) => b.thisWeek - a.thisWeek);
    },
    enabled: bars.length > 0 && !!selectedWeek?.week_start,
    staleTime: 5 * 60 * 1000,
  });

  const hasData = chartData.some((item) => item.thisWeek > 0 || item.priorWeek > 0);

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown className="w-4 h-4" />
        <BarChart3 className="w-4 h-4" />
        <span className="text-sm font-medium">Revenue by Venue {selectedWeekLabel ? `— ${selectedWeekLabel}` : ''}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-lg" />
        ) : !hasData ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Revenue comparison will appear here once weekly sales data is available.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-4 md:p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">
                Revenue by Venue {selectedWeekLabel ? `— ${selectedWeekLabel}` : ''}
              </h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
                  <span>This Week</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-muted-foreground/35 inline-block" />
                  <span>Prior Week</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} barGap={8} margin={{ top: 28, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(value / 1000)}K`}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.25)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'thisWeek' ? 'This Week' : 'Prior Week']}
                  labelFormatter={(label) => chartData.find((item) => item.name === label)?.fullName ?? label}
                />
                <Legend formatter={(value) => value === 'thisWeek' ? 'This Week' : 'Prior Week'} />
                <Bar dataKey="thisWeek" name="thisWeek" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="thisWeekLabel" position="top" fill="hsl(var(--foreground))" fontSize={11} />
                  <LabelList
                    dataKey="changeLabel"
                    content={(props: any) => {
                      const { x, y, width, value, payload } = props;
                      if (!payload || !value) return null;
                      const tone = payload.changePct == null
                        ? 'hsl(var(--muted-foreground))'
                        : payload.changePct >= 0
                          ? 'hsl(var(--signal-green))'
                          : 'hsl(var(--destructive))';
                      return (
                        <text x={x + width / 2} y={y - 12} textAnchor="middle" fontSize={11} fill={tone}>
                          {value}
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Bar dataKey="priorWeek" name="priorWeek" fill="hsl(var(--muted-foreground) / 0.35)" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="priorWeekLabel" position="top" fill="hsl(var(--muted-foreground))" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PortfolioOverview() {
  const navigate = useNavigate();
  const { setCurrentVenue, currentVenue } = useRole();
  const { accessibleBars, setSelectedBar, selectedWeek } = useApp();
  const { venues, gmRankings, isLoading } = usePortfolioData();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const selectedSingleBar = useMemo(() => {
    if (currentVenue) {
      const bar = accessibleBars.find((venue) => venue.id === currentVenue.id);
      return bar || null;
    }
    return null;
  }, [currentVenue, accessibleBars]);

  const portfolioStats = useMemo(() => {
    if (venues.length === 0) {
      return { totalRevenue: 0, revenueChangePct: 0 };
    }

    const totalRevenue = venues.reduce((sum, venue) => sum + (venue.weeklyRevenue ?? 0), 0);
    const revenueVenues = venues.filter((venue) => venue.revenueChange != null);
    const revenueChangePct = revenueVenues.length > 0
      ? revenueVenues.reduce((sum, venue) => sum + (venue.revenueChange ?? 0), 0) / revenueVenues.length
      : 0;

    return { totalRevenue, revenueChangePct };
  }, [venues]);

  const venuesNeedingAttention = useMemo(() => {
    return venues.filter((venue) => {
      const pillars = [venue.revenueScore, venue.laborScore, venue.operationsScore, venue.guestScore];
      return pillars.some((score) => score != null && ['D', 'F'].includes(getGradeFromScore(score)));
    });
  }, [venues]);

  const selectedWeekLabel = useMemo(() => {
    if (!selectedWeek) return null;
    const [sy, sm, sd] = selectedWeek.week_start.split('-').map(Number);
    const [ey, em, ed] = selectedWeek.week_end.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    return `${format(start, 'MMM d')} – ${format(end, 'd')}`;
  }, [selectedWeek]);

  const lowestVenue = useMemo(() => {
    const scored = venues.filter((venue) => venue.score != null);
    if (scored.length === 0) return null;

    const lowest = scored.reduce((min, venue) => (venue.score! < min.score! ? venue : min));
    const pillars = [
      { name: 'Revenue', score: lowest.revenueScore },
      { name: 'Labor', score: lowest.laborScore },
      { name: 'Ops', score: lowest.operationsScore },
      { name: 'Guest', score: lowest.guestScore },
    ]
      .filter((pillar) => pillar.score != null)
      .sort((a, b) => a.score! - b.score!);

    const worstPillar = pillars[0];
    const worstGrade = worstPillar ? getGradeFromScore(worstPillar.score!) : null;

    return {
      id: lowest.id,
      name: lowest.name,
      worstPillarName: worstPillar?.name ?? null,
      worstPillarGrade: worstGrade,
      isOnTrack: !worstGrade || !['D', 'F'].includes(worstGrade),
    };
  }, [venues]);

  const portfolioConfidence = useMemo(() => {
    if (venues.length === 0) return 0;
    const confidentVenues = venues.filter((venue) => venue.confidence != null);
    if (confidentVenues.length === 0) return 0;
    return Math.round(confidentVenues.reduce((sum, venue) => sum + (venue.confidence ?? 0), 0) / confidentVenues.length);
  }, [venues]);

  function handleVenueDrillIn(venueId: string) {
    const matchingBar = accessibleBars.find((bar) => bar.id === venueId);
    if (matchingBar) {
      setSelectedBar(matchingBar);
    }
    setCurrentVenue(venueId);
    navigate('/weekly-review');
  }

  const remainingPlaceholders = useMemo(
    () => PLACEHOLDER_VENUES.filter((name) => !venues.some((venue) => venue.name.toLowerCase() === name.toLowerCase())),
    [venues]
  );

  if (selectedSingleBar) {
    return (
      <OwnerBarDetail
        barId={selectedSingleBar.id}
        barName={selectedSingleBar.bar_name || 'Venue'}
        onBack={() => setCurrentVenue(null)}
      />
    );
  }

  if (isLoading) return <PortfolioSkeleton />;

  return (
    <div className="space-y-6">
      <PortfolioGetStartedCard />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Portfolio Overview</h1>
        </div>
        {selectedWeekLabel && (
          <span className="text-muted-foreground text-sm">Week of {selectedWeekLabel}</span>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-muted-foreground text-sm">Revenue {selectedWeekLabel ? `(${selectedWeekLabel})` : ''}</p>
            <p className="text-2xl font-bold text-foreground">
              {portfolioStats.totalRevenue > 0 ? formatCurrency(portfolioStats.totalRevenue) : '—'}
            </p>
            {portfolioStats.totalRevenue > 0 ? (
              <p className={cn('text-sm', portfolioStats.revenueChangePct >= 0 ? 'text-signal-green' : 'text-destructive')}>
                {portfolioStats.revenueChangePct >= 0 ? '+' : ''}{formatPercent(portfolioStats.revenueChangePct)} vs last week
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting data</p>
            )}
          </div>

          <div
            className="cursor-pointer group"
            onClick={() => document.getElementById('venue-scorecards')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <p className="text-muted-foreground text-sm group-hover:text-foreground transition-colors">Needs Attention</p>
            <p className={cn('text-2xl font-bold', venuesNeedingAttention.length > 0 ? 'text-destructive' : 'text-signal-green')}>
              {venuesNeedingAttention.length > 0 ? venuesNeedingAttention.length : '0 ✓'}
            </p>
            <p className="text-xs text-muted-foreground">
              {venuesNeedingAttention.length > 0
                ? `${venuesNeedingAttention.map((venue) => venue.name).slice(0, 2).join(', ')}${venuesNeedingAttention.length > 2 ? ` +${venuesNeedingAttention.length - 2}` : ''}`
                : 'All pillars C or above'}
            </p>
          </div>

          <div
            className={cn('group', lowestVenue && !lowestVenue.isOnTrack && 'cursor-pointer')}
            onClick={() => {
              if (lowestVenue && !lowestVenue.isOnTrack) {
                handleVenueDrillIn(lowestVenue.id);
              }
            }}
          >
            <p className="text-muted-foreground text-sm">Lowest Venue</p>
            {lowestVenue ? (
              <>
                <p className="text-lg font-bold text-foreground truncate">{lowestVenue.name}</p>
                {lowestVenue.isOnTrack ? (
                  <p className="text-sm text-signal-green">On Track ✓</p>
                ) : (
                  <p className="text-sm text-destructive font-medium">
                    {lowestVenue.worstPillarName}: {lowestVenue.worstPillarGrade}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground">No scored venues</p>
              </>
            )}
          </div>

          <div>
            <p className="text-muted-foreground text-sm">Data Confidence</p>
            <p
              className={cn(
                'text-2xl font-bold',
                portfolioConfidence >= 90 ? 'text-signal-green' : portfolioConfidence >= 70 ? 'text-gold' : 'text-destructive'
              )}
            >
              {portfolioConfidence}%
            </p>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              {['Toast POS', '7shifts', 'Asana'].map((name) => (
                <span key={name} className="inline-flex items-center gap-1 text-[10px] text-signal-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-green inline-block" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section>
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ChevronDown className="w-4 h-4" />
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="font-medium">Portfolio Snapshot{selectedWeekLabel ? ` — ${selectedWeekLabel}` : ''}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <WeeklySnapshotWidget
              barIds={accessibleBars.map((bar) => bar.id)}
              weekStart={selectedWeek?.week_start}
              title="Portfolio Snapshot"
            />
          </CollapsibleContent>
        </Collapsible>
      </section>

      <section id="venue-scorecards">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Venue Scorecards{selectedWeekLabel ? ` — ${selectedWeekLabel}` : ''}</h2>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'cards' | 'table')} size="sm" variant="outline">
            <ToggleGroupItem value="cards" aria-label="Cards view">
              <LayoutGrid className="w-4 h-4 mr-1" /> Cards
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view">
              <Table2 className="w-4 h-4 mr-1" /> Table
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {viewMode === 'cards' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {venues.map((venue) => (
                <VenueScorecard
                  key={venue.id}
                  venue={venue}
                  onClick={() => handleVenueDrillIn(venue.id)}
                />
              ))}
            </div>
            {remainingPlaceholders.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="w-full bg-card border border-dashed border-border rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="w-4 h-4" />
                  <span>📋 {remainingPlaceholders.length} venues onboarding: {remainingPlaceholders.join(', ')}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {remainingPlaceholders.map((name) => (
                      <ComingSoonVenueCard key={name} name={name} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ) : (
          <VenueComparisonTable venues={venues} onVenueClick={handleVenueDrillIn} />
        )}
      </section>

      {gmRankings.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">GM Performance{selectedWeekLabel ? ` — Week of ${selectedWeekLabel.split('–')[0].trim()}` : ' (12-Week Rolling)'}</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">GM</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Venue</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Avg Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Trend</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">This Week</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Task Comp %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gmRankings.map((gm, index) => (
                    <tr
                      key={gm.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleVenueDrillIn(gm.id)}
                    >
                      <td className="px-4 py-3 text-foreground">{index + 1}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{gm.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{gm.venue.name}</td>
                      <td className="px-4 py-3 text-foreground">{gm.avgScore ?? '--'}</td>
                      <td className="px-4 py-3">
                        {gm.trend != null ? (
                          <span className={gm.trend > 0 ? 'text-signal-green' : gm.trend < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                            {gm.trend > 0 ? '↑' : gm.trend < 0 ? '↓' : '—'}
                            {gm.trend !== 0 && ` ${Math.abs(gm.trend)}`}
                          </span>
                        ) : <span className="text-muted-foreground">--</span>}
                      </td>
                      <td className="px-4 py-3">
                        {gm.thisWeekScore != null && gm.thisWeekGrade ? (
                          <span style={{ color: getGradeColor(gm.thisWeekGrade) }}>
                            {gm.thisWeekScore} {gm.thisWeekGrade}
                            {(gm.thisWeekGrade === 'D' || gm.thisWeekGrade === 'F') && ' ⚠️'}
                          </span>
                        ) : <span className="text-muted-foreground">--</span>}
                      </td>
                      <td className="px-4 py-3">
                        {gm.taskCompletionPct != null ? (
                          <span className={cn('font-medium', gm.taskCompletionPct >= 80 ? 'text-signal-green' : gm.taskCompletionPct >= 50 ? 'text-gold' : 'text-destructive')}>
                            {gm.taskCompletionPct}%
                          </span>
                        ) : <span className="text-muted-foreground">--</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <RevenueByVenueSection bars={accessibleBars.map((bar) => ({ id: bar.id, bar_name: bar.bar_name }))} selectedWeekLabel={selectedWeekLabel} />
    </div>
  );
}
