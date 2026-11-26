import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AgentHandoffRow } from '@/lib/agentDesk';

export const AGENT_DESK_KEY = ['agent-desk'] as const;

export interface BrandOption { id: string; name: string }

export function useAgentDesk() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const rowsQuery = useQuery({
    queryKey: AGENT_DESK_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agent_handoffs')
        .select('id,created_at,updated_at,from_agent,to_agent,kind,title,status,schedule,due_at,claimed_at,completed_at,last_run_at,parent_id,venue_id,brand_ids,owner_question,notes,spec,result,result_links,action_item_id,content_item_id,studio_lease_expires_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AgentHandoffRow[];
    },
  });

  const brandsQuery = useQuery({
    queryKey: ['agent-desk-brands'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('id,name').order('name');
      if (error) throw error;
      return (data ?? []) as BrandOption[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: AGENT_DESK_KEY });

  const runRpc = async (fn: string, args: Record<string, unknown>, successMsg: string) => {
    const { data, error } = await (supabase as any).rpc(fn, args);
    if (error) throw new Error(error.message || 'Action failed');
    await invalidate();
    toast({ title: successMsg });
    return data;
  };

  const answer = useMutation({
    mutationFn: (p: { id: string; answer: string }) =>
      runRpc('agent_desk_answer', { p_id: p.id, p_answer: p.answer }, 'Answer sent back to agent'),
    onError: (e: Error) => toast({ title: 'Could not send answer', description: e.message, variant: 'destructive' }),
  });

  const sendBack = useMutation({
    mutationFn: (p: { id: string; note: string }) =>
      runRpc('agent_desk_send_back', { p_id: p.id, p_note: p.note }, 'Sent back to agent'),
    onError: (e: Error) => toast({ title: 'Could not send back', description: e.message, variant: 'destructive' }),
  });

  const reassign = useMutation({
    mutationFn: (p: { id: string; toAgent: string; note?: string }) =>
      runRpc('agent_desk_reassign', { p_id: p.id, p_to_agent: p.toAgent, p_note: p.note || null }, 'Handed to new agent'),
    onError: (e: Error) => toast({ title: 'Could not hand over', description: e.message, variant: 'destructive' }),
  });

  const cancel = useMutation({
    mutationFn: (p: { id: string; reason?: string }) =>
      runRpc('agent_desk_cancel', { p_id: p.id, p_reason: p.reason || null }, 'Task cancelled'),
    onError: (e: Error) => toast({ title: 'Could not cancel', description: e.message, variant: 'destructive' }),
  });

  const markDone = useMutation({
    mutationFn: (p: { id: string; url: string; label?: string; summary?: string }) =>
      runRpc('agent_desk_mark_done', { p_id: p.id, p_url: p.url, p_label: p.label || null, p_summary: p.summary || null }, 'Marked done with proof'),
    onError: (e: Error) => toast({ title: 'Could not mark done', description: e.message, variant: 'destructive' }),
  });

  const markPosted = useMutation({
    mutationFn: (p: { id: string; url: string; platform: string }) =>
      runRpc('agent_desk_mark_posted', { p_id: p.id, p_url: p.url, p_platform: p.platform }, 'Marked as posted'),
    onError: (e: Error) => toast({ title: 'Could not mark posted', description: e.message, variant: 'destructive' }),
  });

  const retryGroup = useMutation({
    mutationFn: (p: { ids: string[]; note?: string }) =>
      runRpc('agent_desk_retry', { p_ids: p.ids, p_note: p.note || null }, 'Retry sent to agent'),
    onError: (e: Error) => toast({ title: 'Could not retry group', description: e.message, variant: 'destructive' }),
  });

  return {
    rows: rowsQuery.data ?? [],
    brands: brandsQuery.data ?? [],
    isLoading: rowsQuery.isLoading,
    error: rowsQuery.error,
    refetch: rowsQuery.refetch,
    actions: { answer, sendBack, reassign, cancel, markDone, markPosted, retryGroup },
  };
}