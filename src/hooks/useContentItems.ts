import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ContentItem {
  id: string;
  project_id: string;
  title: string;
  format: string | null;
  stage: string;
  hook: string | null;
  cta: string | null;
  primary_keyword: string | null;
  affiliate_link: string | null;
  product_id: string | null;
  due_date: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  is_repurposed: boolean;
  is_monetized: boolean;
  performance: any | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NewContentItem = Omit<
  ContentItem,
  "id" | "created_at" | "updated_at" | "created_by"
>;

const key = (projectId: string | null | undefined) => ["content-items", projectId];

export function useContentItems(projectId: string | null | undefined) {
  return useQuery({
    queryKey: key(projectId),
    enabled: !!projectId,
    queryFn: async (): Promise<ContentItem[]> => {
      const { data, error } = await supabase
        .from("content_items" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContentItem[];
    },
  });
}

export function useContentItemMutations(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => qc.invalidateQueries({ queryKey: key(projectId) });

  const create = useMutation({
    mutationFn: async (input: Partial<NewContentItem> & { title: string }) => {
      if (!projectId) throw new Error("No project selected");
      if (!user?.id) throw new Error("Not signed in");
      const payload: any = {
        ...input,
        project_id: projectId,
        created_by: user.id,
      };
      const { data, error } = await supabase
        .from("content_items" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ContentItem> }) => {
      const { data, error } = await supabase
        .from("content_items" as any)
        .update(patch as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}