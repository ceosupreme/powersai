import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ContentTemplate, StudioItem, StudioPatch, StudioTask, StudioTaskType } from '@/lib/contentStudio';

const table = (name: string) => (supabase as any).from(name);
const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);
const itemColumns = 'id,project_id,title,format,stage,hook,cta,brief,purpose,purpose_type,idea_score,idea_evidence,quality_score,quality_fails,approved_at,created_at,updated_at';
async function pages<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 500) return rows;
  }
}

export function useStudioTemplates() {
  return useQuery({ queryKey: ['content-studio', 'templates'], queryFn: () => pages<ContentTemplate>((from, to) => table('content_templates')
    .select('id,slug,version,title,description,project_id,status,default_tier,recipe,created_at').neq('status', 'retired').order('title').order('version', { ascending: false }).range(from, to)) });
}
export function useStudioCanManage(projectId: string) {
  return useQuery({ queryKey: ['content-studio', 'can-manage', projectId], enabled: !!projectId, queryFn: async (): Promise<boolean> => {
    const { data, error } = await rpc('user_can_manage_project', { _project_id: projectId });
    if (error) throw error; return data === true;
  } });
}
export function useStudioIdeas(projectId: string | null) {
  return useQuery({ queryKey: ['content-studio', 'ideas', projectId], enabled: !!projectId,
    queryFn: () => pages<StudioItem>((from, to) => table('content_items').select(itemColumns).eq('project_id', projectId).order('updated_at', { ascending: false }).order('id').range(from, to)) });
}
export function useStudioItem(itemId: string | null) {
  return useQuery({ queryKey: ['content-studio', 'item', itemId], enabled: !!itemId, queryFn: () => loadStudioItem(itemId!) });
}
export async function loadStudioItem(itemId: string): Promise<StudioItem> {
  const { data, error } = await table('content_items').select(itemColumns).eq('id', itemId).single();
  if (error) throw error; return data;
}
export function useStudioJob(itemId: string) {
  return useQuery({ queryKey: ['content-studio', 'job', itemId], queryFn: async (): Promise<{ id: string; title: string; status: string } | null> => {
    const { data, error } = await table('production_jobs').select('id,title,status').eq('target_type', 'content_items').eq('target_id', itemId).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error; return data;
  } });
}
export function useStudioTasks(itemId: string) {
  return useQuery({ queryKey: ['content-studio', 'tasks', itemId], queryFn: async (): Promise<StudioTask[]> => {
    const { data, error } = await rpc('hq_studio_tasks', { p_content_id: itemId });
    if (error) throw error; return data ?? [];
  }, refetchInterval: query => (query.state.data ?? []).some(t => ['new', 'queued', 'pending', 'claimed', 'running', 'in_progress'].includes(t.status)) ? 15000 : false });
}
export function useStudioContext(projectId: string) {
  return useQuery({ queryKey: ['content-studio', 'context', projectId], queryFn: async () => {
    const [sources, pains, results] = await Promise.all([
      pages<any>((from, to) => table('content_sources').select('id,title,source_type,url,summary,updated_at').eq('project_id', projectId).order('updated_at', { ascending: false }).order('id').range(from, to)),
      pages<any>((from, to) => table('audience_pains').select('id,pain_text,pillar,source_links,pain_score,status').eq('project_id', projectId).order('pain_score', { ascending: false, nullsFirst: false }).order('id').range(from, to)),
      pages<any>((from, to) => table('post_results').select('id,post_url,platform,hook_text,topic,angle,outlier_multiple,views,notes').eq('venue_id', projectId).order('created_at', { ascending: false }).order('id').range(from, to)),
    ]);
    return { sources, pains, results };
  } });
}
export function useStudioResults(itemId: string) {
  return useQuery({ queryKey: ['content-studio', 'results', itemId], queryFn: async () => {
    const [results, placements] = await Promise.all([
      rpc('hq_studio_results', { p_content_id: itemId }),
      table('content_placements').select('id,channel,live_url,status').eq('content_item_id', itemId).eq('status', 'published').order('created_at', { ascending: false }),
    ]);
    if (results.error) throw results.error; if (placements.error) throw placements.error;
    return { results: (results.data ?? []) as any[], placements: (placements.data ?? []) as { id: string; channel: string; live_url: string; status: string }[] };
  } });
}
export function useStudioMutations() {
  const qc = useQueryClient();
  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['content-studio'] }), qc.invalidateQueries({ queryKey: ['content-items'] }),
    qc.invalidateQueries({ queryKey: ['production-board-items'] }), qc.invalidateQueries({ queryKey: ['brand-workspace'] }),
  ]);
  const save = useMutation({ mutationFn: async ({ itemId, revision, patch }: { itemId: string; revision: number; patch: StudioPatch }): Promise<StudioItem> => {
    const { data, error } = await rpc('hq_studio_save', { p_content_id: itemId, p_expected_revision: revision, p_patch: patch });
    if (error) throw error; return data;
  }, onSuccess: data => { qc.setQueryData(['content-studio', 'item', data.id], data); void invalidate(); } });
  const request = useMutation({ mutationFn: async ({ itemId, revision, taskType, instructions, idempotencyKey }: { itemId: string; revision: number; taskType: StudioTaskType; instructions: string; idempotencyKey: string }): Promise<StudioTask> => {
    const { data, error } = await rpc('hq_studio_request', { p_content_id: itemId, p_expected_revision: revision,
      p_task_type: taskType, p_idempotency_key: idempotencyKey, p_instructions: instructions });
    if (error) throw error; return data;
  }, onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: async (taskId: string) => {
    const { data, error } = await rpc('hq_studio_cancel', { p_handoff_id: taskId });
    if (error) throw error; return data;
  }, onSuccess: invalidate });
  const run = useMutation({ mutationFn: async (taskId: string): Promise<{ task_id: string; status: string; summary?: string }> => {
    const { data, error } = await supabase.functions.invoke('content-studio-run', { body: { task_id: taskId } });
    if (error) {
      if (error.context instanceof Response) {
        let detail: any; try { detail = await error.context.json(); } catch { /* Keep the SDK error if no JSON was returned. */ }
        if (detail?.error || detail?.message) throw new Error(detail.error || detail.message);
      }
      throw error;
    }
    if (!data?.status) throw new Error('The worker did not return a saved result status. Check the request below.');
    return data;
  }, onSuccess: invalidate });
  const recordResult = useMutation({ mutationFn: async ({ itemId, placementId, metrics }: { itemId: string; placementId: string | null; metrics: Record<string, unknown> }) => {
    const { data, error } = await rpc('hq_studio_record_result', { p_content_id: itemId, p_placement_id: placementId, p_metrics: metrics });
    if (error) throw error; return data;
  }, onSuccess: invalidate });
  const template = useMutation({ mutationFn: async (input: { title: string; project_id: string; recipe: ContentTemplate['recipe']; description: string; default_tier: 'guided' | 'one_tap' }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Sign in to save a template.');
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'content-format'}-${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await table('content_templates').insert({ ...input, slug, version: 1, status: 'draft', created_by: auth.user.id }).select('*').single();
    if (error) throw error; return data as ContentTemplate;
  }, onSuccess: invalidate });
  const makeAvailable = useMutation({ mutationFn: async (templateId: string) => {
    const { data, error } = await table('content_templates').update({ status: 'ready' }).eq('id', templateId).eq('status', 'draft').select('id').single();
    if (error) throw error; return data;
  }, onSuccess: invalidate });
  return { save, request, cancel, run, recordResult, template, makeAvailable, invalidate };
}

export async function studioContentForJob(jobId: string): Promise<string> {
  const { data, error } = await table('production_jobs').select('target_id,target_type').eq('id', jobId).single();
  if (error) throw error;
  if (!data?.target_id || data.target_type !== 'content_items') throw new Error('The work plan has no linked content item. Open the pipeline to check it.');
  return data.target_id;
}
