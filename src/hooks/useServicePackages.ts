import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PrimaryChannel = "door_opener" | "email" | "phone" | "meeting";

export interface ServicePackageItem {
  id: string;
  package_id: string;
  label: string;
  sort_order: number;
}

export interface ServicePackage {
  id: string;
  name: string;
  tier: string | null;
  primary_channel: PrimaryChannel | null;
  one_time_price: number;
  monthly_price: number;
  currency: string;
  price_note: string | null;
  description: string | null;
  fulfillment_bundle_id: string | null;
  is_active: boolean;
  sort_order: number;
  items?: ServicePackageItem[];
}

const KEY = ["service-packages"];

export function useServicePackages(opts: { activeOnly?: boolean } = {}) {
  return useQuery({
    queryKey: [...KEY, { activeOnly: !!opts.activeOnly }],
    queryFn: async (): Promise<ServicePackage[]> => {
      let q = (supabase as any)
        .from("service_packages")
        .select("*, items:service_package_items(*)")
        .order("sort_order", { ascending: true });
      if (opts.activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        items: (p.items ?? []).sort(
          (a: ServicePackageItem, b: ServicePackageItem) => a.sort_order - b.sort_order,
        ),
      })) as ServicePackage[];
    },
  });
}

export function useServicePackageMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  const createPackage = useMutation({
    mutationFn: async (input: Partial<ServicePackage> & { name: string }) => {
      const { data, error } = await (supabase as any)
        .from("service_packages")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: inv,
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ServicePackage> }) => {
      const { error } = await (supabase as any)
        .from("service_packages")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("service_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const addItem = useMutation({
    mutationFn: async (input: { package_id: string; label: string; sort_order?: number }) => {
      const { error } = await (supabase as any).from("service_package_items").insert(input);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ServicePackageItem> }) => {
      const { error } = await (supabase as any)
        .from("service_package_items")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("service_package_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  return { createPackage, updatePackage, deletePackage, addItem, updateItem, deleteItem };
}

export const TIERS = ["Tier 0", "Tier 1", "Tier 2", "Tier 3", "Tier 4"] as const;
export const PRIMARY_CHANNELS: PrimaryChannel[] = [
  "door_opener",
  "email",
  "phone",
  "meeting",
];