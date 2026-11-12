import type { Database } from '@/integrations/supabase/types';

export type PathStage = Database['public']['Tables']['business_path_stages']['Row'];
export type PathStep = Database['public']['Tables']['business_path_steps']['Row'];
export type PathSettings = Database['public']['Tables']['brand_path_settings']['Row'];
export type PathStatusRow = Database['public']['Tables']['brand_path_step_status']['Row'];
export type PathStatus = 'not_started' | 'in_progress' | 'waiting' | 'done' | 'not_needed';
export const PATH_STATUSES: Record<PathStatus, string> = {
  not_started: 'Not started', in_progress: 'In progress', waiting: 'Waiting', done: 'Done', not_needed: 'Not needed',
};
export const BUSINESS_TYPES = {
  service: 'Service business', local: 'Local business', creator_product: 'Creator or product brand', app: 'App or software',
};
export type StepDraft = { status: PathStatus; note: string | null; evidence_url: string | null };
export type SettingsDraft = Pick<PathSettings, 'business_types' | 'visible_to_managers' | 'money_goal' | 'hours_per_week'>;
export const isPathDone = (status: string) => status === 'done' || status === 'not_needed';
export function validatePathProof(draft: StepDraft) {
  if (draft.status === 'done' && !draft.evidence_url?.trim().startsWith('https://')) {
    throw new Error('Add a proof link (https://...) to mark this step done.');
  }
}
export function savedPathRow<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No saved row came back. Your changes could not be confirmed.');
  return data;
}
export function businessPathProgress(stages: PathStage[], steps: PathStep[], settings: PathSettings | null, rows: PathStatusRow[]) {
  const statuses = new Map(rows.map(row => [row.step_key, row]));
  const types = settings?.business_types ?? [];
  const groups = stages.filter(stage => stage.is_active).sort((a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key)).map((stage, index) => {
    const applicable = steps.filter(step => step.is_active && step.stage_key === stage.key &&
      (step.business_types.includes('all') || step.business_types.some(type => types.includes(type))))
      .sort((a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key))
      .map(step => ({ ...step, saved: statuses.get(step.key), status: (statuses.get(step.key)?.status ?? 'not_started') as PathStatus }));
    const done = applicable.filter(step => isPathDone(step.status)).length;
    return { ...stage, number: index + 1, steps: applicable, done, total: applicable.length, complete: done === applicable.length };
  });
  return { stages: groups, current: groups.find(stage => !stage.complete), done: groups.reduce((sum, stage) => sum + stage.done, 0), total: groups.reduce((sum, stage) => sum + stage.total, 0) };
}