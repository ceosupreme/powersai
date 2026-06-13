import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklySnapshotData {
  netSales: number | null;
  laborCost: number | null;
  laborHours: number | null;
  laborPct: number | null;
  splh: number | null;
  tips: number | null;
  tipsPct: number | null;
  discounts: number | null;
  voidAmount: number | null;
  overtimeHours: number | null;
  avgTicket: number | null;
  turnTime: number | null;
  ordersCount: number | null;
  guestsCount: number | null;
  rowCount: number;
  venueCount: number;
  requestedVenueCount: number;
}

interface UseWeeklySnapshotDataParams {
  barId?: string | null;
  barIds?: string[];
  weekStart?: string;
}

export function useWeeklySnapshotData({ barId, barIds, weekStart }: UseWeeklySnapshotDataParams) {
  const targetBarIds = useMemo(() => {
    const ids = barIds && barIds.length > 0 ? barIds : barId ? [barId] : [];
    return Array.from(new Set(ids.filter(Boolean)));
  }, [barId, barIds]);

  const snapshotQuery = useQuery({
    queryKey: ['weekly-snapshot', targetBarIds, weekStart],
    queryFn: async (): Promise<WeeklySnapshotData> => {
      if (!targetBarIds.length || !weekStart) {
        return emptySnapshot;
      }

      const { data: weeks, error: weeksError } = await supabase
        .from('weeks')
        .select('id, bar_id')
        .in('bar_id', targetBarIds)
        .eq('week_start', weekStart);

      if (weeksError) throw weeksError;
      if (!weeks || weeks.length === 0) {
        return {
          ...emptySnapshot,
          requestedVenueCount: targetBarIds.length,
        };
      }

      const weekIds = weeks.map((week) => week.id);
      const { data, error } = await supabase
        .from('weekly_core')
        .select('week_id, net_sales, labor_cost_total, labor_hours_total, tips_amount, transactions, weekly_guests, overtime_hours, void_amount, discount_amount, turn_time_avg_min, labor_pct, splh, tip_pct, aov')
        .in('week_id', weekIds);

      if (error) throw error;
      if (!data || data.length === 0) {
        return {
          ...emptySnapshot,
          venueCount: weeks.length,
          requestedVenueCount: targetBarIds.length,
        };
      }

      const netSales = sumNullable(data, 'net_sales');
      const laborCost = sumNullable(data, 'labor_cost_total');
      const laborHours = sumNullable(data, 'labor_hours_total');
      const tips = sumNullable(data, 'tips_amount');
      const ordersCount = sumNullable(data, 'transactions');
      const guestsCount = sumNullable(data, 'weekly_guests');
      const overtimeHours = sumNullable(data, 'overtime_hours');
      const voidAmount = sumNullable(data, 'void_amount');
      const discounts = sumNullable(data, 'discount_amount');

      const turnTimeRows = data.filter(
        (row) => row.turn_time_avg_min != null && row.transactions != null && Number(row.transactions) > 0,
      );

      let turnTime: number | null = null;
      if (turnTimeRows.length > 0) {
        const weightedTurnTime = turnTimeRows.reduce(
          (acc, row) => {
            const orders = Number(row.transactions) || 0;
            return {
              weightedSum: acc.weightedSum + Number(row.turn_time_avg_min) * orders,
              totalWeight: acc.totalWeight + orders,
            };
          },
          { weightedSum: 0, totalWeight: 0 },
        );

        turnTime = weightedTurnTime.totalWeight > 0
          ? weightedTurnTime.weightedSum / weightedTurnTime.totalWeight
          : null;
      }

      // Single-venue: use pre-computed API values directly (data integrity policy)
      // Multi-venue: derive from sums (correct aggregation for ratios across different volumes)
      const isSingleVenue = data.length === 1;

      const laborPct = isSingleVenue
        ? (data[0].labor_pct != null ? Number(data[0].labor_pct) : null)
        : (netSales != null && laborCost != null && netSales > 0 ? (laborCost / netSales) * 100 : null);

      const splh = isSingleVenue
        ? (data[0].splh != null ? Number(data[0].splh) : null)
        : (netSales != null && laborHours != null && laborHours > 0 ? netSales / laborHours : null);

      const tipsPct = isSingleVenue
        ? (data[0].tip_pct != null ? Number(data[0].tip_pct) : null)
        : (netSales != null && tips != null && netSales > 0 ? (tips / netSales) * 100 : null);

      const avgTicket = isSingleVenue
        ? (data[0].aov != null ? Number(data[0].aov) : null)
        : (netSales != null && ordersCount != null && ordersCount > 0 ? netSales / ordersCount : null);

      return {
        netSales,
        laborCost,
        laborHours,
        laborPct,
        splh,
        tips,
        tipsPct,
        discounts,
        voidAmount,
        overtimeHours,
        avgTicket,
        turnTime,
        ordersCount,
        guestsCount,
        rowCount: data.length,
        venueCount: weeks.length,
        requestedVenueCount: targetBarIds.length,
      };
    },
    enabled: targetBarIds.length > 0 && !!weekStart,
  });

  return {
    data: snapshotQuery.data || null,
    isLoading: snapshotQuery.isLoading,
    error: snapshotQuery.error,
  };
}

const emptySnapshot: WeeklySnapshotData = {
  netSales: null,
  laborCost: null,
  laborHours: null,
  laborPct: null,
  splh: null,
  tips: null,
  tipsPct: null,
  discounts: null,
  voidAmount: null,
  overtimeHours: null,
  avgTicket: null,
  turnTime: null,
  ordersCount: null,
  guestsCount: null,
  rowCount: 0,
  venueCount: 0,
  requestedVenueCount: 0,
};

function sumNullable(rows: Record<string, unknown>[], key: string): number | null {
  let hasValue = false;
  let total = 0;

  for (const row of rows) {
    const value = row[key];
    if (value == null) continue;
    hasValue = true;
    total += Number(value) || 0;
  }

  return hasValue ? total : null;
}

