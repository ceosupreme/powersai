import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { fetchWeeklyBriefings } from '@/services/supabaseData';
import type { WeeklyBriefingV2 } from '@/types/insights-v2';

export const useWeeklyBriefing = (weekId?: string) => {
  const { selectedBar, selectedWeek } = useApp();
  const targetWeekId = weekId || selectedWeek?.id;
  const barId = selectedBar?.id;

  return useQuery({
    queryKey: ['weeklyBriefing', targetWeekId, barId],
    queryFn: async () => {
      if (!targetWeekId || !barId) return null;
      const briefings = await fetchWeeklyBriefings(barId, targetWeekId);
      return briefings[0] || null;
    },
    enabled: !!targetWeekId && !!barId,
    staleTime: 5 * 60 * 1000,
  });
};

// Parse JSON fields or split by newline for bullet lists
export const parseBriefingList = (jsonField?: string, textField?: string): string[] => {
  if (jsonField) {
    try {
      return JSON.parse(jsonField);
    } catch {
      // Fall through to text parsing
    }
  }
  if (textField) {
    return textField.split('\n').filter(Boolean).map(s => s.trim());
  }
  return [];
};
