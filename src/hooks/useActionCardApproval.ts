import { useState } from 'react';
import { ActionCard } from '@/types/venue';
import { updateInsightCardApproval } from '@/services/insightsSupabase';
import { createAsanaTask, isAsanaConfigured } from '@/services/asana';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

interface UseActionCardApprovalProps {
  proposedCards: ActionCard[];
  setProposedCards: React.Dispatch<React.SetStateAction<ActionCard[]>>;
  approvedCards: ActionCard[];
  setApprovedCards: React.Dispatch<React.SetStateAction<ActionCard[]>>;
}

export const useActionCardApproval = ({
  proposedCards,
  setProposedCards,
  approvedCards,
  setApprovedCards,
}: UseActionCardApprovalProps) => {
  const [processingCard, setProcessingCard] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const handleApprove = async (cardId: string, assigneeId?: string, barCode?: string, venueAsanaConfig?: { projectGid?: string; sectionGid?: string }) => {
    const card = proposedCards.find(c => c.id === cardId);
    if (!card) return;

    setProcessingCard(cardId);

    const originalProposed = [...proposedCards];
    const originalApproved = [...approvedCards];
    
    setProposedCards(prev => prev.filter(c => c.id !== cardId));

    try {
      let asanaTaskGid: string | undefined;
      let asanaTaskUrl: string | undefined;

      const isAsanaGid = assigneeId && !assigneeId.includes('-');
      const asanaAssigneeGid = isAsanaGid ? assigneeId : undefined;

      if (isAsanaConfigured()) {
        try {
          const taskNotes = `${card.insight_title}\n\nProblem:\n${card.problem_detail}\n\nAction:\n${card.action_title}`;
          const asanaTask = await createAsanaTask({
            title: card.action_title,
            notes: taskNotes,
            dueDate: card.due_date,
            assigneeGid: asanaAssigneeGid,
            barCode,
            projectGid: venueAsanaConfig?.projectGid,
            sectionGid: venueAsanaConfig?.sectionGid,
          });
          asanaTaskGid = asanaTask.gid;
          asanaTaskUrl = asanaTask.permalink_url;
        } catch (asanaError) {
          console.error('Asana task creation failed:', asanaError);
          toast({
            title: 'Asana sync failed',
            description: 'Card approved but Asana task was not created.',
            variant: 'destructive',
          });
        }
      }

      // Update in Supabase
      await updateInsightCardApproval(cardId, {
        approval_status: 'Approved',
        asana_task_gid: asanaTaskGid,
        asana_task_url: asanaTaskUrl,
        approved_by_id: session?.user?.id,
      });

      // Also create local task in Supabase
      try {
        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: card.action_title,
            description: `${card.insight_title}\n\n${card.problem_detail}`,
            status: 'Todo',
            priority: 'Medium',
            bar_id: barCode || 'default',
            due_date: card.due_date ? card.due_date.split('T')[0] : null,
            action_card_id: cardId,
          });

        if (taskError) {
          console.error('Failed to create local task:', taskError);
        }
      } catch (localTaskError) {
        console.error('Error creating local task:', localTaskError);
      }

      setApprovedCards(prev => [...prev, { ...card, approval_status: 'Approved' }]);
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });

      toast({
        title: 'Action approved',
        description: asanaTaskUrl ? 'Task created in Asana and locally' : 'Card marked as approved',
      });
    } catch (error) {
      console.error('Failed to approve card:', error);
      setProposedCards(originalProposed);
      setApprovedCards(originalApproved);
      toast({
        title: 'Approval failed',
        description: 'Could not approve the action card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingCard(null);
    }
  };

  const handleReject = async (cardId: string, reason?: string) => {
    const card = proposedCards.find(c => c.id === cardId);
    if (!card) return;

    setProcessingCard(cardId);

    const originalProposed = [...proposedCards];
    setProposedCards(prev => prev.filter(c => c.id !== cardId));

    try {
      await updateInsightCardApproval(cardId, {
        approval_status: 'Rejected',
        rejected_by_id: session?.user?.id,
        rejection_reason: reason,
      });

      queryClient.invalidateQueries({ queryKey: ['actionItems'] });

      toast({
        title: 'Action rejected',
        description: 'Card has been rejected.',
      });
    } catch (error) {
      console.error('Failed to reject card:', error);
      setProposedCards(originalProposed);
      toast({
        title: 'Rejection failed',
        description: 'Could not reject the action card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingCard(null);
    }
  };

  return {
    processingCard,
    handleApprove,
    handleReject,
  };
};
