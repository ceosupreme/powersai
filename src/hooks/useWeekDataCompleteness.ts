import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WeekCompleteness {
  daysAvailable: number;
  daysExpected: number;
  isIncomplete: boolean;
  missingCount: number;
}

/**
 * Counts daily_metrics rows for (barCode, weekStart..weekEnd) and computes
 * how many days are expected vs available.
 *
 * - For a fully-elapsed week, daysExpected = 7.
 * - For an in-progress week (today falls within Mon..Sun), daysExpected = days
 *   from Monday through yesterday (Pacific).
 *
 * Date math is done with manual ISO parsing per project convention to avoid
 * UTC offset shifts.
 */
function todayPacificISO(): string {
  // Returns YYYY-MM-DD for "today" in America/Los_Angeles.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()); // en-CA gives YYYY-MM-DD
}

function isoDiffDays(startISO: string, endISO: string): number {
  // Inclusive day count between two YYYY-MM-DD strings (parsed as UTC).
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.floor((end - start) / 86400000) + 1;
}

export function useWeekDataCompleteness(
  barCode: string | null | undefined,
  weekStart: string | null | undefined,
  weekEnd: string | null | undefined
) {
  return useQuery<WeekCompleteness>({
    queryKey: ['week-data-completeness', barCode, weekStart, weekEnd],
    queryFn: async () => {
      if (!barCode || !weekStart || !weekEnd) {
        return { daysAvailable: 0, daysExpected: 0, isIncomplete: false, missingCount: 0 };
      }

      const { data, error } = await supabase
        .from('daily_metrics')
        .select('date')
        .eq('bar_id', barCode)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      if (error) throw error;

      const daysAvailable = new Set((data || []).map((r) => r.date as string)).size;

      const today = todayPacificISO();
      let daysExpected: number;
      if (today > weekEnd) {
        // Week fully elapsed
        daysExpected = isoDiffDays(weekStart, weekEnd); // 7 for Mon-Sun
      } else if (today <= weekStart) {
        // Week hasn't started yet (shouldn't normally happen)
        daysExpected = 0;
      } else {
        // In-progress week: expect Mon..yesterday
        // yesterday = today - 1 day (string math via Date UTC)
        const [ty, tm, td] = today.split('-').map(Number);
        const yesterdayUtc = Date.UTC(ty, tm - 1, td) - 86400000;
        const y = new Date(yesterdayUtc);
        const yISO = `${y.getUTCFullYear()}-${String(y.getUTCMonth() + 1).padStart(2, '0')}-${String(y.getUTCDate()).padStart(2, '0')}`;
        daysExpected = Math.max(0, isoDiffDays(weekStart, yISO));
      }

      const missingCount = Math.max(0, daysExpected - daysAvailable);
      return {
        daysAvailable,
        daysExpected,
        isIncomplete: missingCount > 0,
        missingCount,
      };
    },
    enabled: !!barCode && !!weekStart && !!weekEnd,
    staleTime: 5 * 60 * 1000,
  });
}
