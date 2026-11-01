import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { composePipeline, methodKey } from '@/lib/pipelineComposer';
import { MEDIA_KIT_STEPS, type AssetMapRow } from '@/lib/brandSetup';

const T = (t: string) => (supabase as any).from(t);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const CLOSED_JOB = ['done', 'complete', 'completed', 'cancelled', 'canceled', 'archived'];

export interface SetupSummary { needed_count: number; in_place: number; gaps: number; missing: number; planned: number; needs_access: number; later: number; skipped: number; extra_on_file: number }
export interface ChannelStatRow { id: string; channel_id: string; captured_on: string; followers: number | null; following: number | null; posts: number | null; videos: number | null; views: number | null; likes: number | null; source: string; source_ref: string | null }

export function useAssetMap(projectId: string) {
  return useQuery({
    queryKey: ['brand-setup', 'map', projectId],
    queryFn: async (): Promise<AssetMapRow[]> => {
      const { data, error } = await T('v_brand_asset_map').select('*').eq('venue_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetupSummary(projectId: string) {
  return useQuery({
    queryKey: ['brand-setup', 'summary', projectId],
    queryFn: async (): Promise<SetupSummary | null> => {
      const { data, error } = await T('v_brand_setup_summary').select('*').eq('venue_id', projectId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const n = (k: string) => Number(data[k] ?? 0);
      return { needed_count: n('needed_count'), in_place: n('in_place'), gaps: n('gaps'), missing: n('missing'), planned: n('planned'), needs_access: n('needs_access'), later: n('later'), skipped: n('skipped'), extra_on_file: n('extra_on_file') };
    },
  });
}

export function useBrandProfile(projectId: string) {
  return useQuery({
    queryKey: ['brand-setup', 'profile', projectId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await T('brand_profiles').select('profiles').eq('venue_id', projectId).maybeSingle();
      if (error) throw error;
      return data?.profiles ?? [];
    },
  });
}

/** playbook_key -> knowledge_base id (active or draft rows tagged key:<k>). */
export function usePlaybookIds(keys: string[]) {
  const list = [...new Set(keys.filter(Boolean))].sort();
  return useQuery({
    queryKey: ['brand-setup', 'playbooks', list.join(',')],
    enabled: list.length > 0,
    queryFn: async () => {
      const { data, error } = await T('knowledge_base').select('id,tags,status').in('status', ['active', 'draft']).overlaps('tags', list.map((k) => `key:${k}`));
      if (error) throw error;
      const m = new Map<string, string>();
      for (const r of (data ?? []) as any[]) {
        const k = methodKey(r);
        if (k && (!m.has(k) || r.status === 'active')) m.set(k, r.id);
      }
      return m;
    },
  });
}

/** channel id -> open channel_setup job id. */
export function useOpenSetupJobs(projectId: string) {
  return useQuery({
    queryKey: ['brand-setup', 'jobs', projectId],
    queryFn: async () => {
      const { data, error } = await T('production_jobs').select('id,target_key,status,created_at').eq('project_id', projectId).eq('kind', 'channel_setup').order('created_at', { ascending: false });
      if (error) throw error;
      const m = new Map<string, string>();
      for (const j of (data ?? []) as any[]) if (j.target_key && !CLOSED_JOB.includes(String(j.status)) && !m.has(j.target_key)) m.set(j.target_key, j.id);
      return m;
    },
  });
}

/** Newest stats per channel for a brand, plus the last five per channel. */
export function useChannelStats(channelIds: string[]) {
  const ids = [...channelIds].sort();
  return useQuery({
    queryKey: ['channel-stats', ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await T('channel_stats').select('*').in('channel_id', ids).order('captured_on', { ascending: false }).order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      const m = new Map<string, ChannelStatRow[]>();
      for (const r of (data ?? []) as ChannelStatRow[]) m.set(r.channel_id, [...(m.get(r.channel_id) ?? []), r]);
      return m;
    },
  });
}

export function useSetupRefresh(projectId: string) {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: ['brand-setup'] }),
    qc.invalidateQueries({ queryKey: ['brand-workspace', 'channels', projectId] }),
    qc.invalidateQueries({ queryKey: ['brand-workspace'] }),
    qc.invalidateQueries({ queryKey: ['channel-stats'] }),
    qc.invalidateQueries({ queryKey: ['portfolio-brand-setup'] }),
    qc.invalidateQueries({ queryKey: ['brand-work-summary'] }),
  ]);
}

// ---------- writes ----------
export async function saveBrandProfile(projectId: string, profiles: string[]) {
  const { error } = await T('brand_profiles').upsert({ venue_id: projectId, profiles, updated_at: new Date().toISOString() }, { onConflict: 'venue_id' });
  if (error) throw error;
}

export async function setDecision(projectId: string, assetKey: string, decision: 'needed' | 'later' | 'skip', reason: string | null = null) {
  const { error } = await T('brand_asset_decisions').upsert(
    { venue_id: projectId, asset_key: assetKey, decision, reason, decided_at: new Date().toISOString() },
    { onConflict: 'venue_id,asset_key' },
  );
  if (error) throw error;
}

export async function clearDecision(projectId: string, assetKey: string, only?: string[]) {
  let q = T('brand_asset_decisions').delete().eq('venue_id', projectId).eq('asset_key', assetKey);
  if (only) q = q.in('decision', only);
  const { error } = await q;
  if (error) throw error;
}

export async function insertStats(row: Partial<ChannelStatRow> & { channel_id: string; source: string }) {
  const { error } = await T('channel_stats').upsert({ captured_on: today(), ...row }, { onConflict: 'channel_id,captured_on,source' });
  if (error) throw error;
}

export async function recordExisting(projectId: string, row: AssetMapRow, v: { platform: string; handle: string; url: string; followers: number | null; status: 'live' | 'dormant' }) {
  const patch = { platform: v.platform, handle: v.handle || null, url: v.url || null, status: v.status, account_label: row.label };
  let channelId = row.channel_id;
  if (channelId) {
    const { error } = await T('brand_channels').update(patch).eq('id', channelId);
    if (error) throw error;
  } else {
    const { data, error } = await T('brand_channels').insert({ project_id: projectId, ...patch, content_level: 1, notes: 'Added from the setup map' }).select('id').single();
    if (error) throw error;
    channelId = data.id;
  }
  if (v.followers != null) await insertStats({ channel_id: channelId!, followers: v.followers, source: 'manual' });
  await clearDecision(projectId, row.asset_key, ['later', 'skip']);
}

/** Creates the planned channel when needed, then a channel_setup job. Returns the job id. */
export async function startSetup(projectId: string, row: AssetMapRow): Promise<string> {
  let channelId = row.channel_id;
  if (!channelId) {
    const { data, error } = await T('brand_channels').insert({
      project_id: projectId, platform: row.platforms?.[0] ?? row.asset_key, status: 'planned',
      account_label: row.label, notes: 'Added from the setup map',
    }).select('id').single();
    if (error) throw error;
    channelId = data.id as string;
  }
  const { jobId } = await composePipeline({
    project_id: projectId, kind: 'channel_setup', title: `Set up ${row.label}`,
    target_key: channelId, level: 1,
    channel_method_key: row.playbook_key,
    custom_steps: row.asset_key === 'media_kit' ? MEDIA_KIT_STEPS : null,
  });
  return jobId;
}
