import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BrandKit = {
  id: string;
  project_id: string;
  brand_voice: string | null;
  bio_short: string | null;
  bio_long: string | null;
  primary_font: string | null;
  secondary_font: string | null;
  do_notes: string | null;
  dont_notes: string | null;
};
export type BrandColor = { id: string; kit_id: string; label: string | null; hex: string; role: string | null; sort_order: number };
export type BrandTagline = { id: string; kit_id: string; text: string; context: string | null; sort_order: number };
export type BrandHashtag = { id: string; kit_id: string; tag: string; group_label: string | null; sort_order: number };
export type BrandLink = { id: string; kit_id: string; label: string | null; url: string; category: string | null; sort_order: number };
export type BrandAsset = {
  id: string; kit_id: string; storage_path: string; file_name: string;
  asset_type: string | null; mime_type: string | null; file_size: number | null;
  uploaded_by: string | null; uploaded_at: string;
};

export const BRAND_BUCKET = 'brand-assets';

export function useBrandKitData(projectId: string | null | undefined) {
  const qc = useQueryClient();

  const kitQuery = useQuery({
    queryKey: ['brand-kit', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<BrandKit | null> => {
      const { data, error } = await supabase
        .from('brand_kits').select('*').eq('project_id', projectId!).maybeSingle();
      if (error) throw error;
      return data as BrandKit | null;
    },
  });

  const ensureKit = async (): Promise<string> => {
    if (kitQuery.data?.id) return kitQuery.data.id;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    const { data, error } = await supabase
      .from('brand_kits')
      .insert({ project_id: projectId!, created_by: uid })
      .select('*').single();
    if (error) throw error;
    qc.setQueryData(['brand-kit', projectId], data);
    return (data as BrandKit).id;
  };

  const kitId = kitQuery.data?.id ?? null;

  const colors = useQuery({
    queryKey: ['brand-colors', kitId],
    enabled: !!kitId,
    queryFn: async (): Promise<BrandColor[]> => {
      const { data, error } = await supabase
        .from('brand_kit_colors').select('*').eq('kit_id', kitId!).order('sort_order');
      if (error) throw error;
      return (data ?? []) as BrandColor[];
    },
  });
  const taglines = useQuery({
    queryKey: ['brand-taglines', kitId],
    enabled: !!kitId,
    queryFn: async (): Promise<BrandTagline[]> => {
      const { data, error } = await supabase
        .from('brand_kit_taglines').select('*').eq('kit_id', kitId!).order('sort_order');
      if (error) throw error;
      return (data ?? []) as BrandTagline[];
    },
  });
  const hashtags = useQuery({
    queryKey: ['brand-hashtags', kitId],
    enabled: !!kitId,
    queryFn: async (): Promise<BrandHashtag[]> => {
      const { data, error } = await supabase
        .from('brand_kit_hashtags').select('*').eq('kit_id', kitId!).order('sort_order');
      if (error) throw error;
      return (data ?? []) as BrandHashtag[];
    },
  });
  const links = useQuery({
    queryKey: ['brand-links', kitId],
    enabled: !!kitId,
    queryFn: async (): Promise<BrandLink[]> => {
      const { data, error } = await supabase
        .from('brand_kit_links').select('*').eq('kit_id', kitId!).order('sort_order');
      if (error) throw error;
      return (data ?? []) as BrandLink[];
    },
  });
  const assets = useQuery({
    queryKey: ['brand-assets', kitId],
    enabled: !!kitId,
    queryFn: async (): Promise<BrandAsset[]> => {
      const { data, error } = await supabase
        .from('brand_kit_assets').select('*').eq('kit_id', kitId!).order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BrandAsset[];
    },
  });

  return { kitQuery, kitId, ensureKit, colors, taglines, hashtags, links, assets };
}

export function useSaveKit(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<BrandKit>) => {
      if (!projectId) throw new Error('No project selected');
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const { data: existing } = await supabase
        .from('brand_kits').select('id').eq('project_id', projectId).maybeSingle();
      if (existing?.id) {
        const { data, error } = await supabase
          .from('brand_kits').update(patch).eq('id', existing.id).select('*').single();
        if (error) throw error;
        return data as BrandKit;
      }
      const { data, error } = await supabase
        .from('brand_kits').insert({ project_id: projectId, created_by: uid, ...patch }).select('*').single();
      if (error) throw error;
      return data as BrandKit;
    },
    onSuccess: (data) => {
      qc.setQueryData(['brand-kit', projectId], data);
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Save failed'),
  });
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

// Path contract: `${project_id}/${kit_id}/${uuid}-${safe_filename}`
// project_id MUST be the first segment so storage RLS ::uuid cast on
// (storage.foldername(name))[1] cannot fail on a real upload.
export function buildAssetPath(projectId: string, kitId: string, fileName: string): string {
  const uuid = crypto.randomUUID();
  return `${projectId}/${kitId}/${uuid}-${safeFilename(fileName)}`;
}

export function useUploadAsset(projectId: string | null | undefined, kitId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!projectId || !kitId) throw new Error('Kit not ready');
      // Hard-enforce uuid format on both segments before touching storage.
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(projectId) || !uuidRe.test(kitId)) {
        throw new Error('Invalid project/kit identifier');
      }
      const path = buildAssetPath(projectId, kitId, file.name);
      const { error: upErr } = await supabase.storage.from(BRAND_BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const assetType = file.type.startsWith('image/') ? 'image' : 'file';
      const { data, error } = await supabase.from('brand_kit_assets').insert({
        kit_id: kitId, storage_path: path, file_name: file.name,
        asset_type: assetType, mime_type: file.type || null, file_size: file.size,
        uploaded_by: uid,
      }).select('*').single();
      if (error) {
        await supabase.storage.from(BRAND_BUCKET).remove([path]);
        throw error;
      }
      return data as BrandAsset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-assets', kitId] });
      toast.success('Uploaded');
    },
    onError: (e: any) => toast.error(e.message ?? 'Upload failed'),
  });
}

export function useDeleteAsset(kitId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: BrandAsset) => {
      await supabase.storage.from(BRAND_BUCKET).remove([asset.storage_path]);
      const { error } = await supabase.from('brand_kit_assets').delete().eq('id', asset.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-assets', kitId] }),
    onError: (e: any) => toast.error(e.message ?? 'Delete failed'),
  });
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BRAND_BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Generic child-list mutations */
export function useChildMutations<T extends { id: string; kit_id: string; sort_order: number }>(
  table: 'brand_kit_colors' | 'brand_kit_taglines' | 'brand_kit_hashtags' | 'brand_kit_links',
  kitId: string | null,
  queryKey: string,
) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey, kitId] });

  const add = useMutation({
    mutationFn: async (row: Partial<T> & { kit_id: string }) => {
      const { data, error } = await (supabase.from(table) as any).insert(row).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message ?? 'Add failed'),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<T> }) => {
      const { error } = await (supabase.from(table) as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message ?? 'Update failed'),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message ?? 'Delete failed'),
  });

  return { add, update, remove };
}