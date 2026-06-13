import { useState } from 'react';
import { updateInsightCardApproval } from '@/services/insightsSupabase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { TaskPriority } from '@/types/tasks';
import { createAsanaTask, isAsanaConfigured } from '@/services/asana';

export const useInsightApproval = () => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const handleApprove = async (
    cardId: string,
    assigneeId?: string,
    _barCode?: string, // deprecated — resolved internally now
    note?: string,
    dueDate?: string,
    asanaGid?: string,
    mentionGids?: string[],
  ) => {
    if (processingIds.has(cardId)) return;
    setProcessingIds((prev) => new Set(prev).add(cardId));

    try {
      let nativeTaskId: string | undefined;
      let nativeTaskUrl: string | undefined;
      let asanaTaskGid: string | undefined;
      let asanaTaskUrl: string | undefined;

      // Prefix search: actionItems are cached under ['actionItems', barId|'all']
      const allCaches = queryClient.getQueriesData<any[]>({ queryKey: ['actionItems'] });
      const allCards = allCaches.flatMap(([, data]) => data || []);
      const card = allCards.find((c: any) => c.id === cardId);
      console.log('[InsightApproval] card resolved:', cardId, !!card, 'from', allCaches.length, 'cache entries');

      if (!card) {
        throw new Error('Could not find card details in cache. Please refresh and try again.');
      }

      const priorityMap: Record<string, TaskPriority> = {
        Critical: 'Critical',
        High: 'High',
        Medium: 'Medium',
        Low: 'Low',
      };

      // Resolve the venue UUID from the card's bar_id
      const cardBarId = card.bar_id;

      // Resolve the correct bar_code from the venues table using card.bar_id
      let resolvedBarCode: string | undefined;
      if (cardBarId) {
        const { data: venueRow } = await supabase
          .from('venues')
          .select('bar_code')
          .eq('id', cardBarId)
          .maybeSingle();
        resolvedBarCode = venueRow?.bar_code || undefined;
      }

      // Determine effective title — fallback to insight_title for standalone insights
      const effectiveTitle = (card.action_title || '').trim() || card.insight_title || 'Untitled Action';
      const isStandalone = !(card.action_title || '').trim();

      // Determine local assignee vs Asana-only assignee
      let localAssigneeId: string | null = null;
      const effectiveAsanaGid = asanaGid || undefined;

      if (assigneeId) {
        const isUuid = assigneeId.includes('-');
        if (isUuid) {
          const { data: leaderContact } = await supabase
            .from('venue_leadership_contacts')
            .select('profile_id')
            .eq('id', assigneeId)
            .maybeSingle();

          localAssigneeId = leaderContact?.profile_id || assigneeId;
        }
      }

      // Fetch venue's Asana write destination using the card's bar_id
      const { data: venueConfig } = await supabase
        .from('venues')
        .select('id, asana_write_project_gid, asana_write_section_gid')
        .eq('id', cardBarId)
        .maybeSingle();

      const venueUuid = venueConfig?.id || cardBarId;
      const effectiveDueDate = dueDate || card.due_date;

      const [nativeResult, asanaResult] = await Promise.allSettled([
        supabase
          .from('tasks')
          .insert({
            bar_id: venueUuid,
            action_card_id: cardId,
            title: effectiveTitle,
            description: `${card.insight_title}\n\nWhat Happened:\n${card.problem_detail}\n\nAction:\n${effectiveTitle}`,
            assignee_id: localAssigneeId,
            created_by: session?.user?.id,
            due_date: effectiveDueDate ? effectiveDueDate.split('T')[0] : null,
            priority: priorityMap[card.priority] || 'Medium',
            status: 'Todo',
            estimated_minutes: card.estimated_minutes || null,
          })
          .select('id')
          .single(),
        isAsanaConfigured()
          ? (() => {
              let taskNotes = `${card.insight_title}\n\nWhat Happened:\n${card.problem_detail}\n\nAction:\n${effectiveTitle}`;
              if (note) taskNotes += `\n\nNote:\n${note}`;
              return createAsanaTask({
                title: effectiveTitle,
                notes: taskNotes,
                dueDate: effectiveDueDate,
                assigneeGid: effectiveAsanaGid,
                barCode: resolvedBarCode,
                projectGid: venueConfig?.asana_write_project_gid || undefined,
                sectionGid: venueConfig?.asana_write_section_gid || undefined,
              });
            })()
          : Promise.resolve(null),
      ]);

      if (nativeResult.status === 'fulfilled' && nativeResult.value.data) {
        nativeTaskId = nativeResult.value.data.id;
        nativeTaskUrl = `/tasks?taskId=${nativeResult.value.data.id}`;
        console.log('[InsightApproval] native task created:', nativeTaskId);
        await supabase.from('task_activity').insert({
          task_id: nativeResult.value.data.id,
          user_id: session?.user?.id,
          action: 'created from ActionCard approval',
        });
      } else if (nativeResult.status === 'rejected') {
        console.error('[InsightApproval] Native task creation failed:', nativeResult.reason);
      } else if (nativeResult.status === 'fulfilled' && nativeResult.value.error) {
        console.error('[InsightApproval] Native task creation error:', nativeResult.value.error);
      }

      if (asanaResult.status === 'fulfilled' && asanaResult.value) {
        asanaTaskGid = asanaResult.value.gid;
        asanaTaskUrl = asanaResult.value.permalink_url;
        console.log('[InsightApproval] Asana task created:', asanaTaskGid, asanaTaskUrl);

        // Optional @mention comment on the new Asana task
        if (mentionGids && mentionGids.length > 0 && asanaTaskGid) {
          try {
            const mentionAnchors = mentionGids.map((g) => `<a data-asana-gid="${g}"/>`).join(' ');
            const noteEsc = (note || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const html_text = `<body>${noteEsc ? noteEsc + '\n' : ''}${mentionAnchors}</body>`;
            const { error: mentionErr } = await supabase.functions.invoke('asana-proxy', {
              body: { action: 'post_comment', params: { task_gid: asanaTaskGid, html_text } },
            });
            if (mentionErr) {
              console.warn('[InsightApproval] Mention comment failed:', mentionErr.message);
              toast({ title: 'Mention not posted', description: 'Task created but @mention comment failed.', variant: 'destructive' });
            }
          } catch (e) {
            console.warn('[InsightApproval] Mention comment crashed:', e);
          }
        }
      } else if (asanaResult.status === 'rejected') {
        console.error('[InsightApproval] Asana task creation failed:', asanaResult.reason);
      }

      // Only mark approved if at least one task was created
      if (!nativeTaskId && !asanaTaskGid) {
        throw new Error('Neither local task nor Asana task could be created. Card was NOT marked approved.');
      }

      // Update the correct table based on whether this is a standalone insight or an action item
      if (isStandalone) {
        // Standalone insight — update the insights table directly
        const { error: insightUpdateError } = await supabase
          .from('insights')
          .update({
            status: 'Actioned',
            approved_by_id: session?.user?.id ?? null,
            approved_at: new Date().toISOString(),
          })
          .eq('id', cardId);
        if (insightUpdateError) {
          console.error('[InsightApproval] Failed to update insight status:', insightUpdateError);
        }
      } else {
        // Action item — update the action_items table
        await updateInsightCardApproval(cardId, {
          approval_status: 'Approved',
          asana_task_gid: asanaTaskGid || nativeTaskId,
          asana_task_url: nativeTaskUrl || asanaTaskUrl,
          due_date: dueDate || undefined,
          approved_by_id: session?.user?.id,
          mention_gids: mentionGids,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });

      toast({
        title: 'Action approved',
        description: asanaTaskGid ? 'Task created in Asana' : 'Task created successfully',
      });
    } catch (error) {
      console.error('Failed to approve card:', error);
      toast({
        title: 'Approval failed',
        description: error instanceof Error ? error.message : 'Could not approve the action card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  const handleReject = async (cardId: string, reason?: string) => {
    if (processingIds.has(cardId)) return;
    setProcessingIds((prev) => new Set(prev).add(cardId));

    try {
      const allCaches = queryClient.getQueriesData<any[]>({ queryKey: ['actionItems'] });
      const allCards = allCaches.flatMap(([, data]) => data || []);
      const card = allCards.find((c: any) => c.id === cardId);

      if (card && !card.action_title) {
        const { error } = await supabase
          .from('insights')
          .update({
            status: 'Dismissed',
            rejected_by_id: session?.user?.id ?? null,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason ?? null,
          })
          .eq('id', cardId);
        if (error) throw error;
      } else {
        await updateInsightCardApproval(cardId, {
          approval_status: 'Rejected',
          rejected_by_id: session?.user?.id,
          rejection_reason: reason,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
    } catch (error) {
      console.error('Failed to reject card:', error);
      toast({
        title: 'Rejection failed',
        description: error instanceof Error ? error.message : 'Could not reject the action card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  return {
    processingIds,
    handleApprove,
    handleReject,
  };
};
