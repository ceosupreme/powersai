import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  parseDailyPostPackage,
  parseDailyPostPlacement,
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
      let q = T("content_items")
        .select("id,project_id,title,due_date,quality_score,quality_notes,purpose_type,brief,venues(name)")
        .eq("purpose_type", "daily_post")
        .order("due_date", { ascending: false })
        .limit(400);
      if (projectIds && projectIds.length > 0) {
        q = q.in("project_id", projectIds);
      }
      const { data: items, error } = await q;
      if (error) throw error;
      const rows = (items ?? []) as any[];
      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      const { data: plRows, error: plErr } = await T("content_placements")
        .select("id,content_item_id,project_id,channel,status,scheduled_for,live_url,verified_at,receipt")
        .in("content_item_id", ids);
      if (plErr) throw plErr;

      const byItem = new Map<string, DailyPostPlacement[]>();
      for (const r of (plRows ?? []) as any[]) {
        const parsed = parseDailyPostPlacement(r);
        const list = byItem.get(parsed.content_item_id) ?? [];
        list.push(parsed);
        byItem.set(parsed.content_item_id, list);
      }

      const packages = rows.map((r) =>
        parseDailyPostPackage(r, byItem.get(r.id) ?? [], r.venues?.name ?? "Brand"),
      );
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
    },
  });
}