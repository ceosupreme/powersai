import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';

import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { MetricsCharts } from '@/components/dashboard/MetricsCharts';

import { ScoreHero } from '@/components/weekly-review/ScoreHero';
import { HeadlineKPIs } from '@/components/weekly-review/HeadlineKPIs';
import { WinsWatchouts } from '@/components/weekly-review/WinsWatchouts';
import { SalesLaborChart } from '@/components/weekly-review/SalesLaborChart';
import { ActionPlanModule } from '@/components/weekly-review/ActionPlanModule';
import { PillarRows } from '@/components/weekly-review/PillarRows';
import { TaskPerformanceCard } from '@/components/weekly-review/TaskPerformanceCard';
import { EmployeePerformanceCard } from '@/components/weekly-review/EmployeePerformanceCard';

import { useActionItems } from '@/hooks/useActionItems';
import { useVenueGM } from '@/hooks/useVenueGM';
import { useInsightApproval } from '@/hooks/useInsightApproval';
import { useSupabaseWeeks, useSupabaseWeeklyCores, usePeriodConfig, usePriorYearCore } from '@/hooks/useSupabaseWeekData';
import { useDailyMetricsForWeek } from '@/hooks/useDailyMetricsForWeek';
import { useWeekDataCompleteness } from '@/hooks/useWeekDataCompleteness';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ClipboardList, ChevronDown, BarChart3, Share2, Copy, Printer, Mail } from 'lucide-react';
import { sortByPriority, formatDateRange } from '@/lib/utils';
import { getGradeFromScore } from '@/utils/scoring';
import { useToast } from '@/hooks/use-toast';

const WeeklyReview = () => {
  const { selectedWeek, selectedBar, isLoading: appLoading, supabaseBarId } = useApp();
  const { toast } = useToast();
  const { gmName: venueGmName } = useVenueGM(supabaseBarId);
  const currentTargets = undefined;

  // Supabase scorecard
  const { data: supabaseWeeks = [], isLoading: supabaseLoading } = useSupabaseWeeks(supabaseBarId || undefined);
  const currentSupabaseWeek = useMemo(() => {
    if (!supabaseWeeks.length) return null;
    const today = new Date().toISOString().split('T')[0];
    const completeWeeks = supabaseWeeks.filter(sw => sw.week_end < today);
    if (selectedWeek) {
      const match = completeWeeks.find(sw => sw.week_start === selectedWeek.week_start);
      if (match) return match;
    }
    return completeWeeks[0] || supabaseWeeks[0];
  }, [selectedWeek, supabaseWeeks]);
  const scorecard = currentSupabaseWeek?.scorecard || null;

  // Previous week for trend deltas
  const prevScorecard = useMemo(() => {
    if (!currentSupabaseWeek || supabaseWeeks.length < 2) return null;
    const currentIdx = supabaseWeeks.findIndex(w => w.id === currentSupabaseWeek.id);
    const prevWeek = supabaseWeeks[currentIdx + 1];
    return prevWeek?.scorecard || null;
  }, [currentSupabaseWeek, supabaseWeeks]);

  // Daily metrics for hover breakdowns
  const { data: dailyData } = useDailyMetricsForWeek(supabaseBarId, currentSupabaseWeek?.week_start, currentSupabaseWeek?.week_end);

  // Prior year core + period config for variance
  const { data: priorYearCore } = usePriorYearCore(supabaseBarId || undefined, currentSupabaseWeek?.week_start);
  const { data: periodConfig } = usePeriodConfig(supabaseBarId || undefined);

  // Weekly core history for charts
  const weekIds = useMemo(() => supabaseWeeks.map(w => w.id), [supabaseWeeks]);
  const { data: weeklyCores = [] } = useSupabaseWeeklyCores(weekIds);
  const sortedCoreHistory = useMemo((): any[] => {
    const weekStartMap = new Map(supabaseWeeks.map(w => [w.id, w.week_start]));
    return [...weeklyCores]
      .map((core: any) => ({
        ...core,
        week_start: weekStartMap.get(core.week_id) || '',
      }))
      .filter((core: any) => core.week_start)
      .sort((a: any, b: any) => a.week_start.localeCompare(b.week_start));
  }, [weeklyCores, supabaseWeeks]);

  // Current and previous weekly_core for KPI snapshots
  const currentCore = useMemo(() => {
    if (!currentSupabaseWeek) return null;
    return weeklyCores.find((c: any) => c.week_id === currentSupabaseWeek.id) as Record<string, unknown> | null || null;
  }, [weeklyCores, currentSupabaseWeek]);

  const previousCore = useMemo(() => {
    if (!currentSupabaseWeek || supabaseWeeks.length < 2) return null;
    const currentIdx = supabaseWeeks.findIndex(w => w.id === currentSupabaseWeek.id);
    const prevWeek = supabaseWeeks[currentIdx + 1];
    if (!prevWeek) return null;
    return weeklyCores.find((c: any) => c.week_id === prevWeek.id) as Record<string, unknown> | null || null;
  }, [weeklyCores, currentSupabaseWeek, supabaseWeeks]);

  // Week data completeness (must be before any early returns)
  const { data: completeness } = useWeekDataCompleteness(
    selectedBar?.bar_id,
    currentSupabaseWeek?.week_start || selectedWeek?.week_start,
    currentSupabaseWeek?.week_end || selectedWeek?.week_end
  );

  // Action items
  const { data: allCards = [] } = useActionItems(supabaseBarId || undefined);
  const { handleApprove, handleReject, processingIds } = useInsightApproval();

  const currentWeekCards = useMemo(() => {
    const proposed = allCards.filter(c => c.approval_status === 'Proposed');
    if (!selectedWeek) return proposed;

    // Primary: match by weekId
    const byWeek = proposed.filter(c => c.weekId === selectedWeek.id);
    if (byWeek.length > 0) return byWeek;

    // Fallback: match by source_date within the selected week's date range
    const weekStart = selectedWeek.week_start;
    const weekEnd = selectedWeek.week_end;
    if (weekStart && weekEnd) {
      const byDate = proposed.filter(c => {
        const src = c.weekStart;
        return src && src >= weekStart && src <= weekEnd;
      });
      if (byDate.length > 0) return byDate;
    }

    // No matches for this week — return empty instead of everything
    return [];
  }, [allCards, selectedWeek]);

  const sortedCards = useMemo(() => {
    const approved = currentWeekCards.filter(c => c.approval_status === 'Approved');
    const proposed = sortByPriority(currentWeekCards.filter(c => c.approval_status === 'Proposed'));
    return [...approved, ...proposed];
  }, [currentWeekCards]);

  const oneLiner = useMemo(() => {
    if (!scorecard) return 'Weekly summary loading...';
    const score = scorecard.overall_score;
    const grade = score != null ? getGradeFromScore(score) : null;
    const prefix = score != null && grade ? `Scored ${score}/100 (${grade})` : '';

    if (prevScorecard && scorecard) {
      const pillars = [
        { name: 'Revenue', curr: scorecard.revenue_score, prev: prevScorecard.revenue_score },
        { name: 'Labor', curr: scorecard.labor_score, prev: prevScorecard.labor_score },
        { name: 'Operations', curr: scorecard.operations_score, prev: prevScorecard.operations_score },
        { name: 'Guest Exp', curr: scorecard.guest_score, prev: prevScorecard.guest_score },
      ]
        .filter(p => p.curr != null && p.prev != null)
        .map(p => ({ ...p, delta: (p.curr ?? 0) - (p.prev ?? 0) }))
        .sort((a, b) => b.delta - a.delta);

      if (pillars.length >= 2) {
        const best = pillars[0];
        const worst = pillars[pillars.length - 1];
        const bestDir = best.delta >= 0 ? `+${best.delta} pts` : `${best.delta} pts`;
        const worstDir = worst.delta >= 0 ? `+${worst.delta} pts` : `${worst.delta} pts`;
        return `${prefix} — ${best.name} ${bestDir}, ${worst.name} ${worstDir}.`;
      }
    }

    return prefix || 'Weekly summary loading...';
  }, [scorecard, prevScorecard]);

  const watchouts = useMemo(() =>
    sortByPriority(currentWeekCards.filter(c => c.approval_status === 'Proposed')),
    [currentWeekCards]
  );

  // --- Share handlers ---
  function toPraise(win: string): string {
    let simplified = win.replace(/^[•\-]\s*/, '').replace(/indicators?\s+(improved|increased|decreased)\s+across\s+/i, '').replace(/suggesting\s+better\s+/i, '').replace(/,?\s*which\s+suggests?\s+/i, ', ').trim();
    if (simplified.length > 80) { const cut = simplified.indexOf(','); if (cut > 20) simplified = simplified.substring(0, cut).trim(); }
    simplified = simplified.charAt(0).toLowerCase() + simplified.slice(1);
    return `Great job from the team — ${simplified}`;
  }

  const buildShareText = () => {
    const score = scorecard?.overall_score;
    const grade = score != null ? getGradeFromScore(score) : null;
    const header = score != null && grade ? `Score: ${score}/100 (${grade})` : '';

    const pillarEntries = [
      { name: 'Revenue', curr: scorecard?.revenue_score, prev: prevScorecard?.revenue_score },
      { name: 'Labor', curr: scorecard?.labor_score, prev: prevScorecard?.labor_score },
      { name: 'Operations', curr: scorecard?.operations_score, prev: prevScorecard?.operations_score },
      { name: 'Guest Exp', curr: scorecard?.guest_score, prev: prevScorecard?.guest_score },
    ];
    const pillarLines = pillarEntries
      .filter(p => p.curr != null)
      .map(p => {
        const delta = p.curr != null && p.prev != null ? p.curr - p.prev : null;
        const deltaStr = delta != null ? ` (${delta >= 0 ? '+' : ''}${delta} pts)` : '';
        return `  ${p.name}: ${p.curr}${deltaStr}`;
      })
      .join('\n');

    const winsList = scorecard?.wins ? scorecard.wins.split('\n').map(l => l.replace(/^[•\-]\s*/, '').trim()).filter(Boolean) : [];
    const winsText = winsList.map(w => `• ${w}`).join('\n');
    const warningsText = watchouts.length > 0
      ? watchouts.map(w => `• [${w.priority || 'Medium'}] ${w.action_title}`).join('\n')
      : '• None';
    const approvedActions = sortedCards.filter(c => c.approval_status === 'Approved');
    const actionsText = approvedActions.length > 0
      ? approvedActions.map(a => `• ${a.action_title}`).join('\n')
      : '• None';
    const praiseText = winsList.map(toPraise).map(p => `• ${p}`).join('\n');

    return [
      `📊 Weekly Review${selectedBar ? ` - ${selectedBar.bar_name}` : ''} - Week of ${weekRange}`,
      '', header, '',
      '📈 Pillar Scores', pillarLines, '',
      '🏆 Wins', winsText, '',
      '⚠️ Warnings', warningsText, '',
      '🎯 Focus Actions', actionsText, '',
      '🎉 Recognition', praiseText,
    ].join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildShareText());
    toast({ title: 'Copied to clipboard', description: 'Weekly review copied for your meeting.' });
  };
  const handlePrint = () => window.print();
  const handleEmail = () => {
    const subject = encodeURIComponent(`Weekly Review${selectedBar ? ` - ${selectedBar.bar_name}` : ''} - Week of ${weekRange}`);
    const body = encodeURIComponent(buildShareText());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (appLoading || supabaseLoading) {
    return <LoadingState message="Loading weekly review..." />;
  }

  if (!selectedWeek || !scorecard) {
    return <EmptyState message="No weekly data available" title="No weekly data available" description="Select a bar and week to view your weekly review scorecard." />;
  }

  const weekRange = formatDateRange(
    currentSupabaseWeek?.week_start || selectedWeek.week_start,
    currentSupabaseWeek?.week_end || selectedWeek.week_end
  );

  const isLowConfidence = scorecard.confidence != null && scorecard.confidence < 50;

  return (
    <>
      {/* Incomplete-week banner — daily_metrics rows missing for this week */}
      {completeness?.isIncomplete && (
        <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/40">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-sm text-foreground">
            <strong>Incomplete week — missing {completeness.missingCount} day{completeness.missingCount === 1 ? '' : 's'}.</strong>{' '}
            Some daily data hasn't synced yet ({completeness.daysAvailable} of {completeness.daysExpected} days available). Totals shown are partial.
          </span>
        </div>
      )}

      {/* Low confidence banner */}
      {isLowConfidence && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-muted border border-border">
          <span className="text-sm text-foreground">⚠️ <strong>Limited Data</strong> — This venue is missing POS sales data for this week. Scores are based only on scheduling, tasks, and reviews. Revenue and guest metrics may show as N/A.</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-sans font-semibold text-foreground">Weekly Review</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Week of {weekRange}
            {selectedBar && <> · {selectedBar.bar_name}</>}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopy}><Copy className="w-4 h-4 mr-2" /> Copy for Meeting</DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</DropdownMenuItem>
            <DropdownMenuItem onClick={handleEmail}><Mail className="w-4 h-4 mr-2" /> Email</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 1. Score Hero */}
      <section className="mb-4">
        <ScoreHero scorecard={scorecard} prevScorecard={prevScorecard} oneLiner={oneLiner} />
      </section>

      {/* 2. Headline KPIs */}
      <section className="mb-4">
        <HeadlineKPIs scorecard={scorecard} priorYearCore={priorYearCore} periodConfig={periodConfig} />
      </section>

      {/* 3. Task Performance (GM Asana tasks) — directly under KPIs */}
      <section className="mb-4">
        <TaskPerformanceCard
          supabaseBarId={supabaseBarId || undefined}
          currentWeek={currentSupabaseWeek}
          weeklyCores={sortedCoreHistory}
          supabaseWeeks={supabaseWeeks}
          venueName={selectedBar?.bar_name}
          gmName={venueGmName || undefined}
        />
      </section>

      {/* 3b. Employee Performance */}
      <section className="mb-4">
        <EmployeePerformanceCard
          supabaseBarId={supabaseBarId || undefined}
          currentWeek={currentSupabaseWeek}
          venueName={selectedBar?.bar_name}
        />
      </section>

      {/* 4. Wins + Warnings */}
      <section className="mb-4">
        <WinsWatchouts wins={scorecard.wins} watchouts={watchouts} />
      </section>


      {/* 6. Action Plan (merged module) */}
      <section className="mb-4">
        <ActionPlanModule
          actions={sortedCards}
          onApprove={handleApprove}
          onReject={handleReject}
          processingIds={processingIds}
          barCode={selectedBar?.bar_id}
        />
      </section>

      {/* 7. Performance by Pillar */}
      <section className="mb-4">
        <PillarRows
          scorecard={scorecard}
          coreHistory={sortedCoreHistory}
          currentWeekCards={currentWeekCards}
          currentCore={currentCore}
          previousCore={previousCore}
          onApprove={handleApprove}
          onReject={handleReject}
          processingIds={processingIds}
          barCode={selectedBar?.bar_id}
          dailyMetrics={dailyData}
          priorYearCore={priorYearCore}
          periodConfig={periodConfig}
          barId={supabaseBarId}
          weekId={currentSupabaseWeek?.id}
          weekStart={currentSupabaseWeek?.week_start || selectedWeek.week_start}
          weekRange={weekRange}
          venueName={selectedBar?.bar_name}
          gmName={venueGmName}
        />
      </section>

      {/* 8. Weekly Snapshot moved to Portfolio Overview */}

      {/* 9. 12-Week Trends (collapsed) */}
      <section className="mb-4">
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronDown className="w-4 h-4" />
            <BarChart3 className="w-4 h-4" />
            <span>12-Week Trends</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            {sortedCoreHistory.length > 0 ? (
              <MetricsCharts coreHistory={sortedCoreHistory} revenueTarget={currentTargets?.weekly_revenue_target} />
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-sm">Trend charts will appear once enough weekly data has been collected.</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* 10. Sales vs Labor */}
      <section className="mb-4">
        <SalesLaborChart
          supabaseBarId={supabaseBarId}
          weekStart={currentSupabaseWeek?.week_start || selectedWeek.week_start}
          weekEnd={currentSupabaseWeek?.week_end || selectedWeek.week_end}
          laborTarget={currentTargets?.labor_pct_target}
        />
      </section>
    </>
  );
};

export default WeeklyReview;
