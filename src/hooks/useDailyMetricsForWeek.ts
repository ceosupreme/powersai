import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyMetricRow {
  date: string;
  dayLabel: string;
  netSales: number;
  laborPct: number | null;
  laborCostTotal: number | null;
  laborHours: number | null;
  overtimeHours: number | null;
  ordersCount: number | null;
  voids: number | null;
  discounts: number | null;
  tips: number | null;
  refunds: number | null;
  unpaidAmount: number | null;
  guests: number | null;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useDailyMetricsForWeek(supabaseBarId: string | null | undefined, weekStart?: string, weekEnd?: string) {
  // Resolve bar_code from venue UUID
  const barCodeQuery = useQuery({
    queryKey: ['bar-code-daily', supabaseBarId],
    queryFn: async () => {
      if (!supabaseBarId) return null;
      const { data } = await supabase
        .from('venues')
        .select('bar_code')
        .eq('id', supabaseBarId)
        .maybeSingle();
      return data?.bar_code || null;
    },
    enabled: !!supabaseBarId,
    staleTime: 10 * 60 * 1000,
  });

  const barCode = barCodeQuery.data;

  const metricsQuery = useQuery({
    queryKey: ['daily-metrics-week', barCode, weekStart, weekEnd],
    queryFn: async (): Promise<DailyMetricRow[]> => {
      if (!barCode || !weekStart || !weekEnd) return [];

      const { data, error } = await supabase
        .from('daily_metrics')
        .select('date, net_sales, labor_pct, labor_cost_total, labor_hours, overtime_hours, orders_count, voids, discounts, tips, refunds, unpaid_amount, guests')
        .eq('bar_id', barCode)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map(row => {
        const d = new Date(row.date + 'T12:00:00');
        return {
          date: row.date,
          dayLabel: DAY_LABELS[d.getDay()],
          netSales: Number(row.net_sales) || 0,
          laborPct: row.labor_pct != null ? Number(row.labor_pct) : null,
          laborCostTotal: row.labor_cost_total != null ? Number(row.labor_cost_total) : null,
          laborHours: row.labor_hours != null ? Number(row.labor_hours) : null,
          overtimeHours: row.overtime_hours != null ? Number(row.overtime_hours) : null,
          ordersCount: row.orders_count != null ? Number(row.orders_count) : null,
          voids: row.voids != null ? Number(row.voids) : null,
          discounts: row.discounts != null ? Number(row.discounts) : null,
          tips: row.tips != null ? Number(row.tips) : null,
          refunds: row.refunds != null ? Number(row.refunds) : null,
          unpaidAmount: row.unpaid_amount != null ? Number(row.unpaid_amount) : null,
          guests: row.guests != null ? Number(row.guests) : null,
        };
      });
    },
    enabled: !!barCode && !!weekStart && !!weekEnd,
  });

  return {
    data: metricsQuery.data || [],
    isLoading: barCodeQuery.isLoading || metricsQuery.isLoading,
    error: metricsQuery.error,
  };
}
