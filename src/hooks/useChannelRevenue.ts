import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ChannelRevenue {
  id: string;
  project_id: string;
  revenue_type: string;
  amount: number;
  period_month: string; // YYYY-MM-DD (first of month)
  product_id: string | null;
  source_note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NewChannelRevenue = Omit<
  ChannelRevenue,
  "id" | "created_at" | "updated_at" | "created_by"
>;

const key = (projectId: string | null | undefined) => ["channel-revenue", projectId];

export function useChannelRevenue(projectId: string | null | undefined) {
  return useQuery({
    queryKey: key(projectId),
    enabled: !!projectId,
    queryFn: async (): Promise<ChannelRevenue[]> => {
      const { data, error } = await supabase
        .from("channel_revenue" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("period_month", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ChannelRevenue[]).map((r) => ({
        ...r,
        amount: Number(r.amount),
      }));
    },
  });
}

export function useChannelRevenueMutations(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: key(projectId) });

  const create = useMutation({
    mutationFn: async (input: Partial<NewChannelRevenue> & { revenue_type: string; amount: number; period_month: string }) => {
      if (!projectId) throw new Error("No channel selected");
      if (!user?.id) throw new Error("Not signed in");
      const payload: any = {
        ...input,
        project_id: projectId,
        created_by: user.id,
      };
      const { data, error } = await supabase
        .from("channel_revenue" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ChannelRevenue> }) => {
      const { data, error } = await supabase
        .from("channel_revenue" as any)
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
      const { error } = await supabase.from("channel_revenue" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export const REVENUE_TYPES = ["ad", "affiliate", "course", "sponsor", "merch", "coaching"] as const;
export const REVENUE_TYPE_LABELS: Record<string, string> = {
  ad: "Ad Revenue",
  affiliate: "Affiliate",
  course: "Course",
  sponsor: "Sponsor",
  merch: "Merch",
  coaching: "Coaching",
};

export function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

// "2026-06" or "2026-06-01" -> "2026-06-01"
export function monthToFirstDay(monthStr: string): string {
  if (!monthStr) return monthStr;
  const [y, m] = monthStr.split("-");
  return `${y}-${m.padStart(2, "0")}-01`;
}

// "2026-06-01" -> "Jun 2026"
export function formatMonth(periodMonth: string): string {
  const [y, m] = periodMonth.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}