// Action Packs store — DB-backed (Prompt 23) with the same API surface as the
// previous in-memory implementation so call sites stay stable.
//
// Pattern: useActionPacksLoader(venueId) fetches from Supabase and seeds the
// module-level cache. Sync selectors read from the cache. Mutations apply
// optimistically to the cache and persist to the DB; on failure we refetch.

import { useEffect, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActionPack, ActionPackAsset, AssetApproval, AssetStatus } from './types';

type State = { packs: ActionPack[]; loadedVenues: Set<string> };

let state: State = { packs: [], loadedVenues: new Set() };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());
const set = (next: State) => { state = next; emit(); };

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => state;

export const useActionPacksStore = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

// ────────────────────────────────────────────────────────────────
// DB ⇄ store mapping
// ────────────────────────────────────────────────────────────────
type DbPackRow = {
  id: string; venue_id: string; finding_id: string | null;
  generated_at: string; source: string; brand_voice: string;
};
type DbAssetRow = {
  id: string; pack_id: string; venue_id: string;
  finding_id: string; finding_type: string; kind: string;
  title: string; body: string; meta: any; variant: number | null;
  status: string; approval: string;
  approval_assignee_id: string | null; approval_due_date: string | null; approval_notes: string | null;
  regeneration_count: number;
  created_at: string; edited_at: string | null;
};

const assetFromRow = (a: DbAssetRow): ActionPackAsset => ({
  id: a.id,
  packId: a.pack_id,
  findingId: a.finding_id,
  findingType: a.finding_type as ActionPackAsset['findingType'],
  kind: a.kind as ActionPackAsset['kind'],
  title: a.title,
  body: a.body,
  meta: a.meta && typeof a.meta === 'object' && Object.keys(a.meta).length ? a.meta : undefined,
  variant: a.variant ?? undefined,
  status: a.status as AssetStatus,
  approval: a.approval as AssetApproval,
  approvalAssigneeId: a.approval_assignee_id ?? undefined,
  approvalDueDate: a.approval_due_date ?? undefined,
  approvalNotes: a.approval_notes ?? undefined,
  createdAt: a.created_at,
  editedAt: a.edited_at ?? undefined,
  regenerationCount: a.regeneration_count ?? 0,
});

const mergeVenue = (venueId: string, packs: DbPackRow[], assets: DbAssetRow[]) => {
  const byPack = new Map<string, ActionPackAsset[]>();
  assets.forEach(a => {
    const list = byPack.get(a.pack_id) ?? [];
    list.push(assetFromRow(a));
    byPack.set(a.pack_id, list);
  });
  const merged: ActionPack[] = packs.map(p => ({
    id: p.id,
    findingId: p.finding_id ?? '',
    venueId: p.venue_id,
    generatedAt: p.generated_at,
    source: (p.source === 'mock' ? 'mock' : 'ai'),
    brandVoice: (p.brand_voice === 'detected' ? 'detected' : 'casual_professional_default'),
    assets: byPack.get(p.id) ?? [],
  }));
  // Replace this venue's packs in state.
  const others = state.packs.filter(p => p.venueId !== venueId);
  const loaded = new Set(state.loadedVenues);
  loaded.add(venueId);
  set({ packs: [...others, ...merged], loadedVenues: loaded });
};

// ────────────────────────────────────────────────────────────────
// Loader hook — call once near the top of any view that uses the store
// ────────────────────────────────────────────────────────────────
export const useActionPacksLoader = (venueId: string | null | undefined) => {
  const q = useQuery({
    queryKey: ['growth-audit', 'action-packs', venueId ?? 'none'],
    enabled: !!venueId,
    queryFn: async () => {
      const [packsRes, assetsRes] = await Promise.all([
        supabase.from('growth_action_packs').select('id,venue_id,finding_id,generated_at,source,brand_voice')
          .eq('venue_id', venueId!).order('generated_at', { ascending: false }),
        supabase.from('growth_action_pack_assets').select('*').eq('venue_id', venueId!),
      ]);
      if (packsRes.error) throw packsRes.error;
      if (assetsRes.error) throw assetsRes.error;
      return { packs: packsRes.data as DbPackRow[], assets: assetsRes.data as DbAssetRow[] };
    },
    staleTime: 30 * 1000,
  });
  useEffect(() => {
    if (q.data && venueId) mergeVenue(venueId, q.data.packs, q.data.assets);
  }, [q.data, venueId]);
  return q;
};

// ────────────────────────────────────────────────────────────────
// Mutations — optimistic store update + DB write-through
// ────────────────────────────────────────────────────────────────

const updateAssetInStore = (assetId: string, next: Partial<ActionPackAsset>) => {
  set({
    ...state,
    packs: state.packs.map(p => ({
      ...p,
      assets: p.assets.map(a => a.id === assetId ? { ...a, ...next } : a),
    })),
  });
};

export const upsertPack = (pack: ActionPack) => {
  // The edge function persists on its side; we just merge into the cache.
  const others = state.packs.filter(p => p.id !== pack.id && p.findingId !== pack.findingId);
  set({ ...state, packs: [...others, pack] });
};

export const replaceAsset = (assetId: string, next: Partial<ActionPackAsset>) => {
  updateAssetInStore(assetId, next);
  // Persist content / meta / regen count if present.
  const dbPatch: Record<string, unknown> = {};
  if (next.body !== undefined) dbPatch.body = next.body;
  if (next.title !== undefined) dbPatch.title = next.title;
  if (next.meta !== undefined) dbPatch.meta = next.meta ?? {};
  if (next.regenerationCount !== undefined) dbPatch.regeneration_count = next.regenerationCount;
  if (next.editedAt !== undefined) dbPatch.edited_at = next.editedAt;
  if (Object.keys(dbPatch).length === 0) return;
  void supabase.from('growth_action_pack_assets').update(dbPatch).eq('id', assetId)
    .then(({ error }) => { if (error) console.error('[action-packs] replaceAsset persist failed', error); });
};

export const setAssetStatus = (assetId: string, status: AssetStatus) => {
  updateAssetInStore(assetId, { status });
  void supabase.from('growth_action_pack_assets').update({ status }).eq('id', assetId)
    .then(({ error }) => { if (error) console.error('[action-packs] setAssetStatus persist failed', error); });
};

export const editAsset = (assetId: string, body: string) => {
  const editedAt = new Date().toISOString();
  updateAssetInStore(assetId, { body, editedAt });
  void supabase.from('growth_action_pack_assets').update({ body, edited_at: editedAt }).eq('id', assetId)
    .then(({ error }) => { if (error) console.error('[action-packs] editAsset persist failed', error); });
};

export const archiveAssets = (ids: string[]) => {
  if (!ids.length) return;
  set({
    ...state,
    packs: state.packs.map(p => ({
      ...p,
      assets: p.assets.map(a => ids.includes(a.id) ? { ...a, status: 'Archived' as AssetStatus } : a),
    })),
  });
  void supabase.from('growth_action_pack_assets').update({ status: 'Archived' }).in('id', ids)
    .then(({ error }) => { if (error) console.error('[action-packs] archiveAssets persist failed', error); });
};

export const approveAssets = (
  ids: string[],
  payload: { assigneeId?: string; dueDate?: string; notes?: string },
) => {
  if (!ids.length) return;
  set({
    ...state,
    packs: state.packs.map(p => ({
      ...p,
      assets: p.assets.map(a => ids.includes(a.id)
        ? {
            ...a,
            approval: 'Approved' as AssetApproval,
            status: a.status === 'Draft' ? ('In Use' as AssetStatus) : a.status,
            approvalAssigneeId: payload.assigneeId,
            approvalDueDate: payload.dueDate,
            approvalNotes: payload.notes,
          }
        : a),
    })),
  });
  const dbPatch: Record<string, unknown> = {
    approval: 'Approved',
    approval_assignee_id: payload.assigneeId ?? null,
    approval_due_date: payload.dueDate ?? null,
    approval_notes: payload.notes ?? null,
  };
  // Promote Draft → In Use; leave other statuses alone. Two updates keep it simple.
  void supabase.from('growth_action_pack_assets').update({ ...dbPatch, status: 'In Use' })
    .in('id', ids).eq('status', 'Draft')
    .then(({ error }) => { if (error) console.error('[action-packs] approveAssets/Draft persist failed', error); });
  void supabase.from('growth_action_pack_assets').update(dbPatch)
    .in('id', ids).neq('status', 'Draft')
    .then(({ error }) => { if (error) console.error('[action-packs] approveAssets persist failed', error); });
};

export const rejectAsset = (assetId: string) => {
  updateAssetInStore(assetId, { approval: 'Rejected' });
  void supabase.from('growth_action_pack_assets').update({ approval: 'Rejected' }).eq('id', assetId)
    .then(({ error }) => { if (error) console.error('[action-packs] rejectAsset persist failed', error); });
};

// ────────────────────────────────────────────────────────────────
// Selectors (sync, read from cache)
// ────────────────────────────────────────────────────────────────
export const selectPackForFinding = (findingId: string): ActionPack | undefined =>
  state.packs.find(p => p.findingId === findingId);

export const selectAssetsForVenue = (venueId: string): ActionPackAsset[] =>
  state.packs.filter(p => p.venueId === venueId).flatMap(p => p.assets);
