import { useQuery } from '@tanstack/react-query';
import { ActionCard, ApprovalStatus, Week } from '@/types/venue';
import { supabase } from '@/integrations/supabase/client';

// Normalize approval_status
const normalizeApprovalStatus = (status: string | undefined): ApprovalStatus => {
  if (status === 'Pending') return 'Proposed';
  if (status === 'Approved' || status === 'Rejected' || status === 'Proposed') {
    return status as ApprovalStatus;
  }
  return 'Proposed';
};

export const useAllActionCards = (weeks: Week[]) => {
  const weekIds = weeks.map(w => w.id);

  return useQuery({
    queryKey: ['allActionCards', weekIds],
    queryFn: async () => {
      if (weekIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .in('week_id', weekIds);
      
      if (error) throw error;
      
      return (data || []).map((card: any) => {
        const week = weeks.find((w) => w.id === card.week_id);
        return {
          ...card,
          approval_status: normalizeApprovalStatus(card.approval_status),
          weekStart: week?.week_start,
          weekEnd: week?.week_end,
          weekId: week?.id,
        };
      });
    },
    enabled: weekIds.length > 0,
  });
};

export type ActionCardWithWeek = ActionCard & {
  weekStart?: string;
  weekEnd?: string;
  weekId?: string;
};
