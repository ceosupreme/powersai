import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseWeekScorecard {
  id: string;
  week_id: string;
  bar_id: string;
  overall_score: number | null;
  overall_grade: string | null;
  confidence: number | null;
  trend_4wk: string | null;
  revenue_score: number | null;
  labor_score: number | null;
  operations_score: number | null;
  guest_score: number | null;
  r1_actual: number | null; r1_score: number | null;
  r2_actual: number | null; r2_score: number | null;
  r3_actual: number | null; r3_score: number | null;
  r4_actual: number | null; r4_score: number | null;
  l1_actual: number | null; l1_score: number | null;
  l2_actual: number | null; l2_score: number | null;
  l3_actual: number | null; l3_score: number | null;
  l4_actual: number | null; l4_score: number | null;
  l5_actual: number | null; l5_score: number | null;
  o1_actual: number | null; o1_score: number | null;
  o2_actual: number | null; o2_score: number | null;
  o3_actual: number | null; o3_score: number | null;
  o4_actual: number | null; o4_score: number | null;
  o5_actual: number | null; o5_score: number | null;
  g1_actual: number | null; g1_score: number | null;
  g2_actual: number | null; g2_score: number | null;
  g3_actual: number | null; g3_score: number | null;
  g4_actual: number | null; g4_score: number | null;
  g5_actual: number | null; g5_score: number | null;
  monday_briefing: string | null;
  wins: string | null;
  key_drivers: string | null;
  generated_at: string | null;
}

export interface SupabaseWeek {
  id: string;
  week_id: string;
  bar_id: string;
  week_start: string;
  week_end: string;
  status: string | null;
  scorecard: SupabaseWeekScorecard | null;
}

/**
 * Fetches weeks + weekly_scorecard from Supabase for a given bar UUID.
 * Returns weeks sorted by week_start desc.
 */
export function useSupabaseWeeks(barId: string | undefined) {
  return useQuery<SupabaseWeek[]>({
    queryKey: ['supabase', 'weeks', barId],
    queryFn: async () => {
      if (!barId) return [];

      const { data: weeks, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('bar_id', barId)
        .order('week_start', { ascending: false });

      if (error) throw error;
      if (!weeks?.length) return [];

      // Fetch scorecards for these weeks
      const weekIds = weeks.map(w => w.id);
      const { data: scorecards, error: scError } = await supabase
        .from('weekly_scorecard')
        .select('*')
        .in('week_id', weekIds);

      if (scError) throw scError;

      const scorecardByWeek = new Map(
        (scorecards || []).map(sc => [sc.week_id, sc])
      );

      return weeks.map(w => ({
        id: w.id,
        week_id: w.week_id,
        bar_id: w.bar_id,
        week_start: w.week_start,
        week_end: w.week_end,
        status: w.status,
        scorecard: (scorecardByWeek.get(w.id) as SupabaseWeekScorecard) || null,
      }));
    },
    enabled: !!barId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches weekly_core records for a list of week IDs from Supabase.
 * Used for trend charts.
 */
export function useSupabaseWeeklyCores(weekIds: string[]) {
  return useQuery({
    queryKey: ['supabase', 'weekly_cores', weekIds],
    queryFn: async () => {
      if (!weekIds.length) return [];
      const { data, error } = await supabase
        .from('weekly_core')
        .select('*')
        .in('week_id', weekIds);
      if (error) throw error;
      return data || [];
    },
    enabled: weekIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches the active period_config row for a bar.
 * Returns a flat record of target values.
 */
export function usePeriodConfig(barId: string | undefined) {
  return useQuery<Record<string, unknown> | null>({
    queryKey: ['supabase', 'period_config', barId],
    queryFn: async () => {
      if (!barId) return null;
      const today = new Date().toISOString().split('T')[0];
      // Try to find active config where today falls within effective range
      const { data, error } = await supabase
        .from('period_config')
        .select('*')
        .eq('bar_id', barId)
        .lte('effective_start', today)
        .gte('effective_end', today)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return data as unknown as Record<string, unknown>;

      // Fallback: get the latest period_config for this bar
      const { data: latest, error: latestErr } = await supabase
        .from('period_config')
        .select('*')
        .eq('bar_id', barId)
        .order('effective_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestErr) throw latestErr;
      return (latest as unknown as Record<string, unknown>) || null;
    },
    enabled: !!barId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches the prior-year weekly_core row for the same calendar week.
 * Given a week_start date like "2026-03-23", looks up the week starting ~52 weeks prior.
 */
export function usePriorYearCore(barId: string | undefined, currentWeekStart: string | undefined) {
  return useQuery<Record<string, unknown> | null>({
    queryKey: ['supabase', 'prior_year_core', barId, currentWeekStart],
    queryFn: async () => {
      if (!barId || !currentWeekStart) return null;

      // Compute prior year week_start (subtract ~364 days = 52 weeks)
      const currentDate = new Date(currentWeekStart + 'T00:00:00Z');
      const priorDate = new Date(currentDate);
      priorDate.setUTCDate(priorDate.getUTCDate() - 364);
      const priorWeekStart = priorDate.toISOString().split('T')[0];

      // Find the week within ±3 days of the prior year date
      const minDate = new Date(priorDate);
      minDate.setUTCDate(minDate.getUTCDate() - 3);
      const maxDate = new Date(priorDate);
      maxDate.setUTCDate(maxDate.getUTCDate() + 3);

      const { data: weeks, error: wErr } = await supabase
        .from('weeks')
        .select('id, week_start')
        .eq('bar_id', barId)
        .gte('week_start', minDate.toISOString().split('T')[0])
        .lte('week_start', maxDate.toISOString().split('T')[0])
        .limit(1);

      if (wErr) throw wErr;
      if (!weeks?.length) return null;

      const priorWeekId = weeks[0].id;
      const { data: core, error: cErr } = await supabase
        .from('weekly_core')
        .select('*')
        .eq('week_id', priorWeekId)
        .eq('bar_id', barId)
        .maybeSingle();

      if (cErr) throw cErr;
      return (core as unknown as Record<string, unknown>) || null;
    },
    enabled: !!barId && !!currentWeekStart,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
