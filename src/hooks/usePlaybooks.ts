import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { methodKey, parseKeyPoints } from '@/lib/pipelineComposer';

const T = (t: string) => (supabase as any).from(t);

export interface PlaybookRow {
  id: string; title: string; subcategory: string | null; version: string | null; status: string | null;
  effective_date: string | null; expiry_date: string | null; last_reviewed_at: string | null; tags: string[] | null;
  description: string | null; summary: string | null; key_points: string | null; external_url: string | null;
  full_text: string | null; venue_id: string | null; superseded_by: string | null;
}

export interface NicheBrand { venue_id: string; brand: string; role: 'core' | 'angle' | string; angle?: string }
export interface NicheKP {
  kind?: string; group?: string; planned?: boolean; brands?: NicheBrand[];
  starts_from?: unknown[]; money_map?: { key: string; rank?: number; why?: string }[];
  content_map?: { format: string; series?: string; level?: number | string }[]; notes?: string;
}
export const parseNiche = (raw: string | null) => parseKeyPoints(raw) as unknown as NicheKP;
export const keyOf = (r: { tags: string[] | null }) => methodKey(r);

const COLS = 'id,title,subcategory,version,status,effective_date,expiry_date,last_reviewed_at,tags,description,summary,key_points,external_url,full_text,venue_id,superseded_by';
const SUBS = ['product_type', 'destination', 'monetization', 'niche', 'promotion', 'platform_requirement', 'brand_rules', 'play'];

/** Every playbook row, including superseded and archived (for version history). */
export function usePlaybookLibrary(enabled = true) {
  return useQuery({
    queryKey: ['playbooks', 'library'],
    enabled,
    queryFn: async (): Promise<PlaybookRow[]> => {
      const out: PlaybookRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await T('knowledge_base').select(COLS).in('subcategory', SUBS)
          .order('title').range(from, from + 999);
        if (error) throw error;
        out.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
      }
      return out;
    },
  });
}

export interface PlaybookJob {
  id: string; project_id: string; title: string; status: string; current_step: number | null;
  target_id: string | null; target_key: string | null; money_destination: string | null; created_at: string;
}

export function usePlaybookJobs(opts: { projectId?: string | null; playbookId?: string | null; key?: string | null }) {
  const enabled = !!(opts.projectId || opts.playbookId);
  return useQuery({
    queryKey: ['playbooks', 'jobs', opts.projectId ?? null, opts.playbookId ?? null, opts.key ?? null],
    enabled,
    queryFn: async (): Promise<PlaybookJob[]> => {
      let q = T('production_jobs').select('id,project_id,title,status,current_step,target_id,target_key,money_destination,created_at')
        .eq('kind', 'playbook').order('created_at', { ascending: false });
      if (opts.projectId) q = q.eq('project_id', opts.projectId);
      if (opts.playbookId) q = q.or(opts.key ? `target_id.eq.${opts.playbookId},target_key.eq.${opts.key}` : `target_id.eq.${opts.playbookId}`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface PlaybookSource {
  id: string; playbook_id: string | null; suggested_keys: string[]; kind: string; title: string; url: string | null;
  content: string | null; status: string; merged_version: string | null; merge_notes: string | null; created_at: string;
}

export function usePlaybookSources(id: string | null, key: string | null) {
  return useQuery({
    queryKey: ['playbooks', 'sources', id, key],
    enabled: !!id,
    queryFn: async (): Promise<PlaybookSource[]> => {
      const filter = key && /^[\w-]+$/.test(key) ? `playbook_id.eq.${id},suggested_keys.cs.{${key}}` : `playbook_id.eq.${id}`;
      const { data, error } = await T('playbook_sources')
        .select('id,playbook_id,suggested_keys,kind,title,url,content,status,merged_version,merge_notes,created_at')
        .or(filter).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddPlaybookSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { kind: string; title: string; url: string | null; content: string | null; playbook_id: string | null; suggested_keys: string[] }) => {
      const { error } = await T('playbook_sources').insert({ ...v, status: 'new', added_by: 'owner' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playbooks', 'sources'] }),
  });
}

export const JOB_STATUS_WORD: Record<string, string> = {
  ready: 'Ready', running: 'Running', blocked: 'Blocked', awaiting_decision: 'Waiting on a decision',
  review: 'In review', finished: 'Finished', parked: 'Parked',
};
export const jobStatusWord = (s: string) => JOB_STATUS_WORD[s] ?? s.replace(/_/g, ' ');
