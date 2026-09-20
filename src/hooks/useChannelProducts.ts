import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ChannelProduct {
  id: string;
  name: string;
  price: number | null;
  funnel_stage: string | null;
  lead_magnet: string | null;
  sales_page_url: string | null;
  status: string | null;
  monthly_sales: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ["channel-products"];
const channelsKey = (productId: string) => ["channel-products", productId, "channels"];

export function useChannelProducts() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ChannelProduct[]> => {
      const { data, error } = await supabase
        .from("channel_products" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ChannelProduct[]).map((r) => ({
        ...r,
        price: r.price == null ? null : Number(r.price),
        monthly_sales: r.monthly_sales == null ? null : Number(r.monthly_sales),
      }));
    },
  });
}

export function useProductChannels(productId: string | null | undefined) {
  return useQuery({
    queryKey: productId ? channelsKey(productId) : ["channel-products", "none", "channels"],
    enabled: !!productId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("channel_product_channels" as any)
        .select("project_id")
        .eq("product_id", productId!);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => r.project_id as string);
    },
  });
}

export function useChannelProductMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: async (input: Partial<ChannelProduct> & { name: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const payload: any = { ...input, created_by: user.id };
      const { data, error } = await supabase
        .from("channel_products" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ChannelProduct;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ChannelProduct> }) => {
      const { data, error } = await supabase
        .from("channel_products" as any)
        .update(patch as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ChannelProduct;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channel_products" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setChannels = useMutation({
    mutationFn: async ({ productId, projectIds }: { productId: string; projectIds: string[] }) => {
      const { data: existing, error: readErr } = await supabase
        .from("channel_product_channels" as any)
        .select("project_id")
        .eq("product_id", productId);
      if (readErr) throw readErr;
      const have = new Set(((existing ?? []) as any[]).map((r) => r.project_id as string));
      const want = new Set(projectIds);
      const toAdd = [...want].filter((id) => !have.has(id));
      const toRemove = [...have].filter((id) => !want.has(id));
      if (toAdd.length) {
        const { error } = await supabase
          .from("channel_product_channels" as any)
          .insert(toAdd.map((project_id) => ({ product_id: productId, project_id })));
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("channel_product_channels" as any)
          .delete()
          .eq("product_id", productId)
          .in("project_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: channelsKey(vars.productId) });
    },
  });

  return { create, update, remove, setChannels };
}

export const FUNNEL_STAGES = ["lead_magnet", "tripwire", "core", "upsell", "continuity"] as const;
export const PRODUCT_STATUSES = [
  "idea",
  "scored",
  "brief",
  "drafting",
  "needs cover",
  "proof ordered",
  "ready to upload",
  "live",
  "twin listed",
  "cut",
] as const;

export function useContentChannels() {
  return useQuery({
    queryKey: ["content-channels"],
    queryFn: async (): Promise<{ id: string; bar_name: string }[]> => {
      const { data, error } = await (supabase as any)
        .from("venues")
        .select("id, bar_name")
        .eq("project_type", "content_channel")
        .order("bar_name");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}
/** All product→project links with project names, for the Brands column. */
export function useAllProductBrands() {
  return useQuery({
    queryKey: ["channel-products", "brands"],
    queryFn: async (): Promise<Record<string, { id: string; name: string }[]>> => {
      const { data: links, error } = await supabase
        .from("channel_product_channels" as any)
        .select("product_id, project_id");
      if (error) throw error;
      const rows = (links ?? []) as any[];
      const projectIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean))];
      let nameById = new Map<string, string>();
      if (projectIds.length) {
        const { data: venues } = await supabase
          .from("venues")
          .select("id,name")
          .in("id", projectIds);
        nameById = new Map(((venues ?? []) as any[]).map((v) => [v.id, v.name]));
      }
      const out: Record<string, { id: string; name: string }[]> = {};
      for (const r of rows) {
        const entry = { id: r.project_id as string, name: nameById.get(r.project_id) ?? "Unknown" };
        out[r.product_id] = [...(out[r.product_id] ?? []), entry];
      }
      return out;
    },
  });
}
