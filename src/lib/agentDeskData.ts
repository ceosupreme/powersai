import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages, fetchRowsIn } from '@/lib/batchFetch';
import { OPEN_AGENT_STATUSES, belongsOnDesk, type AgentHandoffRow } from '@/lib/agentDesk';

export const AGENT_CLOSED_DAYS = 60;
export const AGENT_COLUMNS = 'id,created_at,updated_at,from_agent,to_agent,kind,title,status,schedule,due_at,claimed_at,completed_at,last_run_at,parent_id,venue_id,brand_ids,owner_question,notes,spec,result,result_links,action_item_id,content_item_id,studio_lease_expires_at';

/** RLS always applies. No age limit on unfinished work or made-but-unposted files. */
export async function fetchAgentDeskRows(brandIds?: string[], now = Date.now()): Promise<AgentHandoffRow[]> {
  if (brandIds && !brandIds.length) return [];
  const since = new Date(now - AGENT_CLOSED_DAYS * 86400_000).toISOString();
  const loaded = await fetchAllPages<AgentHandoffRow>(() => {
    let q = supabase.from('agent_handoffs').select(AGENT_COLUMNS, { count: 'exact' })
      .or(`status.in.(${OPEN_AGENT_STATUSES.join(',')}),completed_at.gte.${since},updated_at.gte.${since},and(status.eq.done,spec->>type.eq.social_post)`);
    if (brandIds) q = q.overlaps('brand_ids', brandIds);
    return q;
  });
  const rows = loaded.filter(r => belongsOnDesk(r, since));
  // A recent question may reference a closed task older than the recent window.
  const known = new Set(rows.map((r) => r.id));
  const parents = await fetchRowsIn<AgentHandoffRow>('agent_handoffs', AGENT_COLUMNS, 'id', rows.map((r) => r.parent_id).filter((id) => id && !known.has(id)));
  return [...rows, ...parents];
}

export async function fetchAgentTask(id: string): Promise<AgentHandoffRow | null> {
  const { data, error } = await supabase.from('agent_handoffs').select(AGENT_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as AgentHandoffRow | null;
}

export function fetchAgentHistory(id: string): Promise<AgentHandoffRow[]> {
  return fetchAllPages<AgentHandoffRow>(() => supabase.from('agent_handoffs')
    .select(AGENT_COLUMNS, { count: 'exact' }).eq('parent_id', id), ['created_at', 'id']);
}