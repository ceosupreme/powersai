import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PortfolioMediaType = "image" | "video" | "link" | "embed" | "case_study";
export type PortfolioStatus = "draft" | "published";

export interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  client_or_vertical: string | null;
  category: string;
  media_type: PortfolioMediaType;
  image_url: string | null;
  video_url: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  case_study_body: string | null;
  featured: boolean;
  sort_order: number;
  status: PortfolioStatus;
  created_at: string;
  updated_at: string;
}

const KEY = ["portfolio-items"] as const;
const PUBLIC_KEY = ["portfolio-items", "published"] as const;

export function usePublishedPortfolioItems() {
  return useQuery({
    queryKey: PUBLIC_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("portfolio_items")
        .select("*")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PortfolioItem[];
    },
  });
}

export function usePublishedPortfolioItemBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-items", "slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("portfolio_items")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PortfolioItem | null;
    },
  });
}

export function useAdminPortfolioItems() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("portfolio_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PortfolioItem[];
    },
  });
}

export function useUpsertPortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PortfolioItem> & { title: string; slug: string; media_type: PortfolioMediaType; category: string }) => {
      const payload = { ...input, updated_at: new Date().toISOString() };
      const { data, error } = await (supabase as any)
        .from("portfolio_items")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as PortfolioItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
}

export function useDeletePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("portfolio_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
}

export function useReorderPortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await (supabase as any)
        .from("portfolio_items")
        .update({ sort_order })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
    },
    onError: (e: any) => toast.error(e.message ?? "Reorder failed"),
  });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}