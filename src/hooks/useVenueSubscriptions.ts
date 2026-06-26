import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { ServicePackage } from "./useServicePackages";

export type SubscriptionStatus = "active" | "paused" | "ended";

export interface VenueSubscription {
  id: string;
  venue_id: string;
  package_id: string;
  status: SubscriptionStatus;
  one_time_price_agreed: number | null;
  monthly_price_agreed: number | null;
  currency: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  package?: Pick<
    ServicePackage,
    "id" | "name" | "tier" | "primary_channel" | "fulfillment_bundle_id" | "price_note"
  > | null;
}

const KEY = (venueId: string) => ["venue-subscriptions", venueId];

export function useVenueSubscriptions(venueId: string | null | undefined) {
  return useQuery({
    queryKey: KEY(venueId ?? ""),
    enabled: !!venueId,
    queryFn: async (): Promise<VenueSubscription[]> => {
      const { data, error } = await (supabase as any)
        .from("venue_service_subscriptions")
        .select(
          "*, package:service_packages(id,name,tier,primary_channel,fulfillment_bundle_id,price_note)",
        )
        .eq("venue_id", venueId!)
        .order("started_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as VenueSubscription[];
      // Active first, then paused, then ended; preserving started_at desc within group.
      const rank: Record<SubscriptionStatus, number> = { active: 0, paused: 1, ended: 2 };
      return rows.sort((a, b) => rank[a.status] - rank[b.status]);
    },
  });
}

export function useVenueSubscriptionMutations(venueId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const inv = () => qc.invalidateQueries({ queryKey: KEY(venueId) });

  const assign = useMutation({
    mutationFn: async (input: {
      package_id: string;
      one_time_price_agreed: number | null;
      monthly_price_agreed: number | null;
      currency?: string;
      notes?: string | null;
    }) => {
      const payload = {
        venue_id: venueId,
        package_id: input.package_id,
        one_time_price_agreed: input.one_time_price_agreed,
        monthly_price_agreed: input.monthly_price_agreed,
        currency: input.currency ?? "USD",
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      };
      const { error } = await (supabase as any)
        .from("venue_service_subscriptions")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<VenueSubscription> }) => {
      const { error } = await (supabase as any)
        .from("venue_service_subscriptions")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubscriptionStatus }) => {
      const patch: Partial<VenueSubscription> = { status };
      if (status === "ended") patch.ended_at = new Date().toISOString();
      if (status === "active") patch.ended_at = null;
      const { error } = await (supabase as any)
        .from("venue_service_subscriptions")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("venue_service_subscriptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  return { assign, update, setStatus, remove };
}