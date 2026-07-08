import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type InboundLeadStatus = "new" | "reviewed" | "promoted" | "archived";
export type UrgencyClass = "emergency" | "same_day" | "routine" | "estimate" | "maintenance";
export type InboundLead = {
  id: string;
  name: string;
  business_name: string | null;
  email: string;
  message: string;
  status: InboundLeadStatus;
  promoted_company_id: string | null;
  promoted_venue_id: string | null;
  project_type: string | null;
  is_ready: boolean | null;
  conversation_channel: string | null;
  source: string | null;
  urgency_class: UrgencyClass | null;
  urgency_captured_at: string | null;
  first_response_at: string | null;
  captured_for_project_id: string | null;
  phone: string | null;
  created_at: string;
};

export function useInboundLeads(status: InboundLeadStatus = "new") {
  return useQuery({
    queryKey: ["inbound_leads", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_leads")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InboundLead[];
    },
  });
}

/**
 * Project-scoped first-response stats, computed from ALL leads with an
 * `urgency_captured_at` — never from whatever's on-screen. This is the
 * number the "speed guarantee" pitches will reference; it can't shift
 * based on which tab happens to be open.
 *
 * Pass `projectId=null` to compute across every lead the caller can read
 * (RLS still applies).
 */
export function useInboundLeadResponseStats(projectId?: string | null) {
  return useQuery({
    queryKey: ["inbound_leads", "response_stats", projectId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("inbound_leads")
        .select("urgency_class,urgency_captured_at,first_response_at")
        .not("urgency_captured_at", "is", null);
      if (projectId) q = q.eq("captured_for_project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        urgency_class: UrgencyClass | null;
        urgency_captured_at: string | null;
        first_response_at: string | null;
      }>;

      const collect = (subset: typeof rows) => {
        const durationsMs = subset
          .filter((r) => r.first_response_at && r.urgency_captured_at)
          .map((r) =>
            new Date(r.first_response_at!).getTime() -
            new Date(r.urgency_captured_at!).getTime(),
          )
          .filter((n) => Number.isFinite(n) && n >= 0);
        const responded = durationsMs.length;
        const pending = subset.length - responded;
        const avgMs =
          responded === 0
            ? null
            : Math.round(durationsMs.reduce((a, b) => a + b, 0) / responded);
        return { total: subset.length, responded, pending, avgMs };
      };

      return {
        all: collect(rows),
        emergency: collect(rows.filter((r) => r.urgency_class === "emergency")),
      };
    },
  });
}

function splitName(full: string): { first: string | null; last: string | null } {
  const trimmed = full.trim();
  if (!trimmed) return { first: null, last: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function useInboundLeadMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["inbound_leads"] });
    qc.invalidateQueries({ queryKey: ["crm"] });
  };

  return {
    markResponded: useMutation({
      // Idempotent: only stamps first_response_at when it is currently NULL,
      // so a second click can never overwrite the first responder's time.
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from("inbound_leads")
          .update({ first_response_at: new Date().toISOString() })
          .eq("id", id)
          .is("first_response_at", null);
        if (error) throw error;
      },
      onSuccess: inv,
    }),
    markReviewed: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from("inbound_leads")
          .update({ status: "reviewed" })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: inv,
    }),
    archive: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from("inbound_leads")
          .update({ status: "archived" })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: inv,
    }),
    promote: useMutation({
      mutationFn: async (lead: InboundLead) => {
        if (!userId) throw new Error("Sign in required");
        // NOTE: when project-type awareness lands, default project_type='client' here.
        const { data: company, error: cErr } = await supabase
          .from("crm_companies")
          .insert({
            name: (lead.business_name && lead.business_name.trim()) || lead.name,
            status: "prospect",
            created_by: userId,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;

        const { first, last } = splitName(lead.name);
        const { error: ctErr } = await supabase.from("crm_contacts").insert({
          company_id: company.id,
          first_name: first,
          last_name: last,
          email: lead.email,
          is_primary: true,
          created_by: userId,
        });
        if (ctErr) throw ctErr;

        // The original full name remains intact on the inbound_leads row —
        // we only update status + the FK, never the raw `name` column.
        const { error: uErr } = await supabase
          .from("inbound_leads")
          .update({ status: "promoted", promoted_company_id: company.id })
          .eq("id", lead.id);
        if (uErr) throw uErr;

        return company.id;
      },
      onSuccess: inv,
    }),
  };
}