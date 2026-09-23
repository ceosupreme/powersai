import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CONTENT_MODES = ["growth", "baseline", "parked"] as const;
export type ContentMode = (typeof CONTENT_MODES)[number];
export const CONTENT_MODE_LABELS: Record<ContentMode, string> = {
  growth: "Growth",
  baseline: "Baseline",
  parked: "Parked",
};

export const OWNERSHIP_OPTIONS = ["owned", "client", "family", "partner"] as const;
export type Ownership = (typeof OWNERSHIP_OPTIONS)[number];
export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  owned: "Owned",
  client: "Client",
  family: "Family",
  partner: "Partner",
};

export const PLACEMENT_CHANNELS = [
  "instagram", "facebook", "pinterest", "tiktok", "youtube",
  "blog", "email", "x", "linkedin", "other",
] as const;
export type PlacementChannel = (typeof PLACEMENT_CHANNELS)[number];

export interface ContentSource {
  id: string; project_id: string; title: string; source_type: string;
  url: string | null; summary: string | null; version: number;
  parent_source_id: string | null; status: string;
  created_at: string; updated_at: string;
}
export interface ContentFamily {
  id: string; project_id: string; source_id: string | null; title: string;
  purpose: string | null; status: string; created_at: string; updated_at: string;
}
export interface ContentPlacement {
  id: string; content_item_id: string; project_id: string; channel: string;
  account_label: string | null; status: string; scheduled_for: string | null;
  live_url: string | null; platform_post_id: string | null; verified_at: string | null;
  failure_reason: string | null; idempotency_key: string | null;
}

export interface BrandProject {
  id: string; name: string; project_type: string | null;
  focus_status: string | null; ownership: string | null;
  content_mode: ContentMode;
}

export interface BoardItem {
  id: string; project_id: string; title: string; format: string | null;
  stage: string; family_id: string | null; purpose: string | null;
  founder_minutes: number | null; due_date: string | null;
  family: ContentFamily | null;
  placements: ContentPlacement[];
}

const T = (name: string) => supabase.from(name as any) as any;

/** Every internal brand (non-client) project that is switched on, with its content mode. */
export function useBrandProjects() {
  return useQuery({
    queryKey: ["brand-projects-production"],
    queryFn: async (): Promise<BrandProject[]> => {
      const { data: venues, error } = await T("venues")
        .select("id,name,project_type,focus_status,ownership,is_active")
        .order("name");
      if (error) throw error;
      const rows = (venues ?? []).filter(
        (v: any) => v.is_active !== false && (v.project_type ?? "client") !== "client",
      );
      if (rows.length === 0) return [];
      const { data: kits, error: kitErr } = await T("brand_kits")
        .select("project_id,content_mode")
        .in("project_id", rows.map((r: any) => r.id));
      if (kitErr) throw kitErr;
      const modeBy = new Map<string, ContentMode>();
      (kits ?? []).forEach((k: any) => modeBy.set(k.project_id, (k.content_mode ?? "baseline") as ContentMode));
      return rows.map((v: any) => ({
        id: v.id, name: v.name, project_type: v.project_type,
        focus_status: v.focus_status, ownership: v.ownership,
        content_mode: modeBy.get(v.id) ?? "baseline",
      }));
    },
  });
}

/** All content items across internal brands, with family and placements attached. */
export function useProductionBoardItems(projectIds: string[]) {
  const key = [...projectIds].sort().join(",");
  return useQuery({
    queryKey: ["production-board-items", key],
    enabled: projectIds.length > 0,
    queryFn: async (): Promise<BoardItem[]> => {
      const { data: items, error } = await T("content_items")
        .select("id,project_id,title,format,stage,family_id,purpose,founder_minutes,due_date")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (items ?? []) as any[];
      if (rows.length === 0) return [];

      const familyIds = [...new Set(rows.map((r) => r.family_id).filter(Boolean))];
      const [famRes, placeRes] = await Promise.all([
        familyIds.length
          ? T("content_families").select("*").in("id", familyIds)
          : Promise.resolve({ data: [], error: null }),
        T("content_placements").select("*").in("content_item_id", rows.map((r) => r.id)),
      ]);
      if (famRes.error) throw famRes.error;
      if (placeRes.error) throw placeRes.error;

      const famBy = new Map<string, ContentFamily>();
      (famRes.data ?? []).forEach((f: any) => famBy.set(f.id, f));
      const placeBy = new Map<string, ContentPlacement[]>();
      (placeRes.data ?? []).forEach((p: any) => {
        const list = placeBy.get(p.content_item_id) ?? [];
        list.push(p);
        placeBy.set(p.content_item_id, list);
      });

      return rows.map((r) => ({
        ...r,
        family: r.family_id ? famBy.get(r.family_id) ?? null : null,
        placements: placeBy.get(r.id) ?? [],
      })) as BoardItem[];
    },
  });
}

export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await T("content_items").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-board-items"] });
      qc.invalidateQueries({ queryKey: ["content-items"] });
    },
  });
}

export function useSaveContentMode(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mode: ContentMode) => {
      if (!projectId) throw new Error("No project selected");
      const { data: existing } = await T("brand_kits")
        .select("id").eq("project_id", projectId).maybeSingle();
      if (existing?.id) {
        const { error } = await T("brand_kits").update({ content_mode: mode }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await T("brand_kits")
          .insert({ project_id: projectId, created_by: userRes.user?.id, content_mode: mode });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-kit"] });
      qc.invalidateQueries({ queryKey: ["brand-projects-production"] });
    },
  });
}

/** Everything built from one source — the correction trace. */
export function useContentSourceTrace(sourceId: string | null) {
  return useQuery({
    queryKey: ["content-source-trace", sourceId],
    enabled: !!sourceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("trace_content_source", {
        _source_id: sourceId,
      });
      if (error) throw error;
      return (data ?? []) as {
        entity_kind: string; entity_id: string; entity_label: string | null;
        entity_status: string | null; parent_id: string | null;
      }[];
    },
  });
}
