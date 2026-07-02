import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AccentColor = "rust" | "gold" | "green";
export type LanderStatus = "draft" | "published";

export interface LeakCard { title: string; line: string; dollar_note: string }
export interface FaqEntry { q: string; a: string }

export interface VerticalLandingPage {
  id: string;
  slug: string;
  display_name: string;
  status: LanderStatus;
  sort_order: number;
  project_type_id: string | null;
  headline: string;
  headline_accent_word: string;
  accent_color: AccentColor;
  subline: string;
  stat_value: string;
  stat_label: string;
  leaks: LeakCard[];
  faq: FaqEntry[];
  proof_line: string;
  cta_primary_label: string;
  cta_primary_url: string;
  cta_secondary_label: string | null;
  cta_secondary_url: string | null;
  meta_title: string;
  meta_description: string;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
}

const PUBLIC_KEY = ["vertical-landers", "published"] as const;
const ADMIN_KEY = ["vertical-landers", "admin"] as const;

export function usePublishedVerticalLanders() {
  return useQuery({
    queryKey: PUBLIC_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vertical_landing_pages")
        .select("slug,display_name,sort_order")
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pick<VerticalLandingPage, "slug" | "display_name" | "sort_order">[];
    },
    staleTime: 60_000,
  });
}

export function useAdminVerticalLanders() {
  return useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vertical_landing_pages")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VerticalLandingPage[];
    },
  });
}

export function useUpsertVerticalLander() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<VerticalLandingPage> & { slug: string; display_name: string }) => {
      const payload = { ...input, updated_at: new Date().toISOString() };
      const { data, error } = await (supabase as any)
        .from("vertical_landing_pages")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as VerticalLandingPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
}

export function useDeleteVerticalLander() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("vertical_landing_pages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
}

export function slugifyLander(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}