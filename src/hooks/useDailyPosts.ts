import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages, fetchRowsIn } from '@/lib/batchFetch';
import {
  parseDailyPostPackage,
  parseDailyPostPlacement,
  parseBoardPostPackage,
  rankDailyPosts,
  type DailyPostPackage,
  type DailyPostPlacement,
} from "@/lib/dailyPosts";

const T = (name: string) => (supabase as any).from(name);

export function useDailyPosts(projectIds?: string[]) {
  const key = projectIds ? [...projectIds].sort().join(",") : "all";
  return useQuery({
    queryKey: ["daily-posts", key],
    enabled: projectIds === undefined || projectIds.length > 0,
    queryFn: async (): Promise<DailyPostPackage[]> => {
      const rows = await fetchAllPages(() => {
        let q = T('content_items').select('id,project_id,title,due_date,quality_score,quality_notes,quality_fails,purpose_type,brief,stage,format,cta,approved_at,published_at,created_at,venues(name,project_type)', { count: 'exact' })
          .or('purpose_type.eq.daily_post,stage.in.(script,design,thumbnail,scheduled,published)');
        if (projectIds?.length) q = q.in('project_id', projectIds);
        return q;
      });
      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      const plRows = await fetchRowsIn('content_placements', 'id,content_item_id,project_id,channel,status,scheduled_for,live_url,verified_at,receipt', 'content_item_id', ids);

      const byItem = new Map<string, DailyPostPlacement[]>();
      for (const r of (plRows ?? []) as any[]) {
        const parsed = parseDailyPostPlacement(r);
        const list = byItem.get(parsed.content_item_id) ?? [];
        list.push(parsed);
        byItem.set(parsed.content_item_id, list);
      }

      const packages = rows.map((r) => r.purpose_type === 'daily_post'
        ? parseDailyPostPackage(r, byItem.get(r.id) ?? [], r.venues?.name ?? 'Brand')
        : r.venues?.project_type === 'client' ? null : parseBoardPostPackage(r, byItem.get(r.id) ?? [], r.venues?.name ?? 'Brand'))
        .filter((p): p is DailyPostPackage => !!p);
      return rankDailyPosts(packages);
    },
    staleTime: 60_000,
  });
}

export function useMarkDailyPostPosted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { placementId: string; liveUrl?: string | null; note?: string | null }) => {
      const { data, error } = await (supabase as any).rpc("hq_mark_daily_post_posted", {
        _placement_id: args.placementId,
        _live_url: args.liveUrl ?? null,
        _note: args.note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-posts"] });
      qc.invalidateQueries({ queryKey: ["agent-desk"] });
      qc.invalidateQueries({ queryKey: ["production-board-items"] });
      qc.invalidateQueries({ queryKey: ['brand-pulses'] });
      qc.invalidateQueries({ queryKey: ['brand-work-summary'] });
      qc.invalidateQueries({ queryKey: ['brand-workspace'] });
    },
  });
}

export function useUndoDailyPost() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ placementId, postedAt }: { placementId: string; postedAt: string }) => {
    const { data, error } = await supabase.rpc('hq_undo_daily_post', { _placement_id: placementId, _posted_at: postedAt });
    if (error) throw error;
    return data;
  }, onSuccess: () => { for (const key of ['daily-posts','agent-desk','production-board-items','brand-pulses','brand-work-summary','brand-workspace']) qc.invalidateQueries({ queryKey: [key] }); } });
}