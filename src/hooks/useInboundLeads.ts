import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type InboundLeadStatus = "new" | "reviewed" | "promoted" | "archived";
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