import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProposalContent, ProposalRow } from '@/components/proposals/types';

export interface ProposalListFilter {
  companyId?: string | null;
  venueId?: string | null;
}

const KEY = (f: ProposalListFilter) => ['proposals', f] as const;

/**
 * Preflight: guarantee a live user JWT before any RLS-checked write.
 * `proposals` INSERT/UPDATE/DELETE policies all reduce to `has_role(auth.uid(),'admin')`.
 * If the session has silently expired, PostgREST sends the request as anon and
 * RLS returns 42501 with HTTP 401 — surfacing as "row-level security policy"
 * even though the user IS admin. Refresh, or throw a typed error the UI can
 * present clearly.
 */
async function ensureLiveSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) {
    const e: any = new Error('Your session expired. Sign in again to save.');
    e.code = 'no_session';
    throw e;
  }
  const expSec = s.expires_at ?? 0;
  if (expSec * 1000 - Date.now() < 60_000) {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      const e: any = new Error('Your session expired. Sign in again to save.');
      e.code = 'no_session';
      throw e;
    }
  }
}

function rowFromDb(r: any): ProposalRow {
  return {
    id: r.id,
    company_id: r.company_id ?? null,
    venue_id: r.venue_id ?? null,
    leak_stack_run_id: r.leak_stack_run_id ?? null,
    title: r.title,
    content: (r.content ?? {}) as ProposalContent,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function useProposals(filter: ProposalListFilter) {
  return useQuery({
    queryKey: KEY(filter),
    enabled: !!(filter.companyId || filter.venueId),
    queryFn: async (): Promise<ProposalRow[]> => {
      let q: any = (supabase as any).from('proposals').select('*').order('created_at', { ascending: false });
      if (filter.companyId) q = q.eq('company_id', filter.companyId);
      if (filter.venueId) q = q.eq('venue_id', filter.venueId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(rowFromDb);
    },
    staleTime: 30_000,
  });
}

export function useProposalMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['proposals'] });

  const create = useMutation({
    mutationFn: async (input: {
      company_id: string | null;
      venue_id: string | null;
      leak_stack_run_id: string | null;
      title: string;
      content: ProposalContent;
    }): Promise<ProposalRow> => {
      const { data, error } = await (supabase as any)
        .from('proposals')
        .insert({ ...input, status: 'draft' })
        .select('*')
        .single();
      if (error) throw error;
      return rowFromDb(data);
    },
    onSuccess: inv,
  });

  const patchContent = useMutation({
    mutationFn: async ({ id, content, title }: { id: string; content: ProposalContent; title?: string }) => {
      const patch: any = { content };
      if (title !== undefined) patch.title = title;
      const { error } = await (supabase as any).from('proposals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'sent' }) => {
      const { error } = await (supabase as any).from('proposals').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('proposals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  return { create, patchContent, setStatus, remove };
}