import { useState, useCallback } from 'react';
import { Action } from '@/types/venue';
import { updateActionItemApproval } from '@/services/supabaseData';
import { createAsanaTask, isAsanaConfigured } from '@/services/asana';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface UseActionApprovalProps {
  proposedActions: Action[];
  setProposedActions: React.Dispatch<React.SetStateAction<Action[]>>;
  approvedActions: Action[];
  setApprovedActions: React.Dispatch<React.SetStateAction<Action[]>>;
}

export function useActionApproval({
  proposedActions,
  setProposedActions,
  approvedActions,
  setApprovedActions,
}: UseActionApprovalProps) {
  const { toast } = useToast();
  const { session } = useAuth();
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleApprove = useCallback(async (actionId: string, assigneeGid?: string, venueAsanaConfig?: { projectGid?: string; sectionGid?: string }) => {
    setProcessingAction(actionId);
    const action = proposedActions.find(a => a.id === actionId);
    if (!action) {
      setProcessingAction(null);
      return;
    }

    // Optimistic UI update
    setProposedActions(prev => prev.filter(a => a.id !== actionId));
    setApprovedActions(prev => [...prev, { ...action, approval_status: 'Approved', approved_at: new Date().toISOString() }]);

    try {
      let asanaTaskGid: string | undefined;
      let asanaTaskUrl: string | undefined;

      if (isAsanaConfigured()) {
        const asanaTask = await createAsanaTask({
          title: `[BarPulse] ${action.title}`,
          notes: `${action.details || ''}\n\n---\nEstimated: ${action.estimated_minutes} min\nSource: BarPulse Action ${action.Name}`,
          dueDate: action.due_date_suggested,
          assigneeGid,
          projectGid: venueAsanaConfig?.projectGid,
          sectionGid: venueAsanaConfig?.sectionGid,
        });
        asanaTaskGid = asanaTask.gid;
        asanaTaskUrl = asanaTask.permalink_url;

        setApprovedActions(prev => 
          prev.map(a => a.id === actionId ? { ...a, asana_task_gid: asanaTaskGid, asana_task_url: asanaTaskUrl } : a)
        );
      }

      // Update in Supabase
      await updateActionItemApproval(actionId, {
        approval_status: 'Approved',
        ...(asanaTaskGid && { asana_task_gid: asanaTaskGid }),
        ...(asanaTaskUrl && { asana_task_url: asanaTaskUrl }),
        approved_by_id: session?.user?.id,
      });

      toast({ 
        title: isAsanaConfigured() ? 'Task created in Asana' : 'Action approved',
        description: action.title,
      });
    } catch (error) {
      // Rollback
      setApprovedActions(prev => prev.filter(a => a.id !== actionId));
      setProposedActions(prev => [...prev, action]);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: 'Failed to approve', 
        description: errorMessage,
        variant: 'destructive' 
      });
    } finally {
      setProcessingAction(null);
    }
  }, [proposedActions, setProposedActions, setApprovedActions, toast, session?.user?.id]);

  const handleReject = useCallback(async (actionId: string, reason?: string) => {
    setProcessingAction(actionId);
    const action = proposedActions.find(a => a.id === actionId);
    setProposedActions(prev => prev.filter(a => a.id !== actionId));

    try {
      await updateActionItemApproval(actionId, {
        approval_status: 'Rejected',
        rejected_by_id: session?.user?.id,
        rejection_reason: reason,
      });
      toast({ title: 'Action rejected', description: action?.title });
    } catch (error) {
      if (action) setProposedActions(prev => [...prev, action]);
      toast({ title: 'Failed to reject', variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  }, [proposedActions, setProposedActions, toast, session?.user?.id]);

  return {
    processingAction,
    handleApprove,
    handleReject,
  };
}
