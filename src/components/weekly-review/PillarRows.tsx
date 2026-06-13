import { useState } from 'react';
import { ExpandablePillarCard } from './ExpandablePillarCard';
import { SupabaseWeekScorecard } from '@/hooks/useSupabaseWeekData';
import {
  REVENUE_METRICS,
  LABOR_METRICS,
  OPERATIONS_METRICS,
  GUEST_METRICS,
} from '@/config/pillarMetrics';
import { shouldShowInFeed } from '@/lib/insightVisibility';
import { WeeklyCore, ActionCard } from '@/types/venue';
import { DailyMetricRow } from '@/hooks/useDailyMetricsForWeek';
import { Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PillarRowsProps {
  scorecard: SupabaseWeekScorecard;
  coreHistory: WeeklyCore[];
  currentWeekCards: ActionCard[];
  currentCore?: Record<string, unknown> | null;
  previousCore?: Record<string, unknown> | null;
  onApprove?: (id: string, assigneeId?: string, barCode?: string, note?: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  processingIds: Set<string>;
  barCode?: string;
  dailyMetrics?: DailyMetricRow[];
  priorYearCore?: Record<string, unknown> | null;
  periodConfig?: Record<string, unknown> | null;
  // For metric-detail drawer
  barId?: string | null;
  weekId?: string | null;
  weekStart?: string | null;
  weekRange?: string | null;
  venueName?: string | null;
  gmName?: string | null;
}

type PillarKey = 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience';

/**
 * Filter pillar drill-down cards via the canonical shouldShowInFeed.
 * Pillar-name match is applied first; visibility decision is delegated to
 * the shared visibility module so main feed + drill-down stay aligned.
 */
function filterCardsForPillar(
  cards: ActionCard[],
  pillar: PillarKey,
  showAll: boolean,
): ActionCard[] {
  const inPillar = cards.filter(c => c.pillar === pillar);
  return inPillar.filter(c => {
    const { show } = shouldShowInFeed(
      {
        status: (c as any).status,
        insight_type: (c as any).insight_type,
        source_metric: c.source_metric,
        pillar: c.pillar,
        generated_by: (c as any).generated_by,
      },
      'pillar_drilldown',
      { pillar, showAllToggle: showAll },
    );
    return show;
  });
}

export function PillarRows(props: PillarRowsProps) {
  const {
    scorecard, coreHistory, currentWeekCards, currentCore, previousCore,
    onApprove, onReject, processingIds, barCode, dailyMetrics, priorYearCore, periodConfig,
    barId, weekId, weekStart, weekRange, venueName, gmName,
  } = props;

  const [showAll, setShowAll] = useState(false);

  const shared = {
    scorecard, coreHistory, currentCore, previousCore,
    onApprove, onReject, processingIds, barCode,
    dailyMetrics, priorYearCore, periodConfig,
    barId, weekId, weekStart, weekRange, venueName, gmName,
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Performance by Pillar</h2>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="show-all-pillar-insights" className="text-xs text-muted-foreground cursor-pointer">
            Show all pillar insights
          </Label>
          <Switch
            id="show-all-pillar-insights"
            checked={showAll}
            onCheckedChange={setShowAll}
          />
        </div>
      </div>
      <div className="space-y-2">
        <ExpandablePillarCard pillar="revenue" pillarScore={scorecard.revenue_score} metrics={REVENUE_METRICS} actionCards={filterCardsForPillar(currentWeekCards, 'Revenue', showAll)} {...shared} />
        <ExpandablePillarCard pillar="labor" pillarScore={scorecard.labor_score} metrics={LABOR_METRICS} actionCards={filterCardsForPillar(currentWeekCards, 'Labor', showAll)} {...shared} />
        <ExpandablePillarCard pillar="operations" pillarScore={scorecard.operations_score} metrics={OPERATIONS_METRICS} actionCards={filterCardsForPillar(currentWeekCards, 'Operations', showAll)} {...shared} />
        <ExpandablePillarCard pillar="guest" pillarScore={scorecard.guest_score} metrics={GUEST_METRICS} actionCards={filterCardsForPillar(currentWeekCards, 'Guest Experience', showAll)} {...shared} />
      </div>
    </div>
  );
}
