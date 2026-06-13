import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { todayPacific } from "@/lib/utils";

export type CrmCompany = {
  id: string; name: string; website: string | null; industry: string | null;
  notes: string | null; status: "prospect"|"active"|"past"|"archived";
  linked_project_id: string | null; created_by: string; created_at: string;
  archived: boolean; archived_at: string | null; archive_reason: string | null;
};
export type CrmContact = {
  id: string; company_id: string | null; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; title: string | null; notes: string | null;
  is_primary: boolean; created_by: string;
  archived: boolean; archived_at: string | null; archive_reason: string | null;
};
export type CrmDealStage = "lead"|"pitch"|"proposal"|"won"|"lost";
export type CrmDeal = {
  id: string; company_id: string; title: string; stage: CrmDealStage;
  value: number | null; currency: string; expected_close: string | null;
  won_at: string | null; lost_at: string | null; notes: string | null;
  sort_order: number; created_by: string;
  archived: boolean; archived_at: string | null; archive_reason: string | null;
};
export type CrmInteractionType = "call"|"email"|"meeting"|"note";
export type CrmInteraction = {
  id: string; company_id: string; contact_id: string | null; deal_id: string | null;
  type: CrmInteractionType; occurred_at: string; summary: string | null;
  follow_up_date: string | null; created_by: string;
};

export const STAGES: CrmDealStage[] = ["lead","pitch","proposal","won","lost"];

export function useCompanies(opts: { includeArchived?: boolean; onlyArchived?: boolean } = {}) {
  return useQuery({
    queryKey: ["crm","companies", opts.onlyArchived ? "archived" : opts.includeArchived ? "all" : "active"],
    queryFn: async () => {
      let q = supabase.from("crm_companies").select("*").order("created_at", { ascending: false });
      if (opts.onlyArchived) q = q.eq("archived", true);
      else if (!opts.includeArchived) q = q.eq("archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmCompany[];
    },
  });
}

export function useCompany(id: string | null) {
  return useQuery({
    queryKey: ["crm","companies", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("crm_companies").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as CrmCompany | null;
    },
    enabled: !!id,
  });
}

export function useContacts(companyId?: string | null | "unassigned", opts: { includeArchived?: boolean } = {}) {
  return useQuery({
    queryKey: ["crm","contacts", companyId ?? "all", opts.includeArchived ? "all" : "active"],
    queryFn: async () => {
      let q = supabase.from("crm_contacts").select("*").order("created_at", { ascending: false });
      if (companyId === "unassigned") q = q.is("company_id", null);
      else if (companyId) q = q.eq("company_id", companyId);
      if (!opts.includeArchived) q = q.eq("archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmContact[];
    },
  });
}

export function useDeals(opts: { includeArchived?: boolean; onlyArchived?: boolean } = {}) {
  return useQuery({
    queryKey: ["crm","deals", opts.onlyArchived ? "archived" : opts.includeArchived ? "all" : "active"],
    queryFn: async () => {
      let q = supabase.from("crm_deals").select("*").order("sort_order", { ascending: true });
      if (opts.onlyArchived) q = q.eq("archived", true);
      else if (!opts.includeArchived) q = q.eq("archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmDeal[];
    },
  });
}

export function useInteractions(companyId: string | null) {
  return useQuery({
    queryKey: ["crm","interactions", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("crm_interactions").select("*").eq("company_id", companyId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmInteraction[];
    },
    enabled: !!companyId,
  });
}

export function useFollowUpsDue() {
  return useQuery({
    queryKey: ["crm","followups-due"],
    queryFn: async () => {
      const today = todayPacific();
      const { data, error } = await supabase
        .from("crm_interactions")
        .select("*")
        .not("follow_up_date", "is", null)
        .lte("follow_up_date", today)
        .order("follow_up_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmInteraction[];
    },
  });
}

/** Link-count types — each line is OMITTED from the dialog when the relationship doesn't exist. */
export type CompanyLinkCounts = {
  contacts: number;        // ON DELETE SET NULL  → "unlinked but kept"
  deals: number;           // ON DELETE CASCADE   → "permanently deleted"
  interactions: number;    // ON DELETE CASCADE   → "permanently deleted"
};
export type ContactLinkCounts = {
  interactions: number;    // ON DELETE SET NULL  → "unlinked but kept"
  // NOTE: crm_contacts has NO direct FK to crm_deals — deals are intentionally omitted, not zeroed.
};

export function useCompanyLinkCounts(companyId: string | null) {
  return useQuery({
    queryKey: ["crm","link-counts","company", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyLinkCounts> => {
      const [c, d, i] = await Promise.all([
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("crm_deals").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("crm_interactions").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
      ]);
      if (c.error) throw c.error;
      if (d.error) throw d.error;
      if (i.error) throw i.error;
      return { contacts: c.count ?? 0, deals: d.count ?? 0, interactions: i.count ?? 0 };
    },
  });
}

export function useContactLinkCounts(contactId: string | null) {
  return useQuery({
    queryKey: ["crm","link-counts","contact", contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<ContactLinkCounts> => {
      const { count, error } = await supabase
        .from("crm_interactions").select("id", { count: "exact", head: true }).eq("contact_id", contactId!);
      if (error) throw error;
      return { interactions: count ?? 0 };
    },
  });
}

function useUserId(): string | null { return useAuth().user?.id ?? null; }

export function useCrmMutations() {
  const qc = useQueryClient();
  const userId = useUserId();
  const inv = (keys: string[][]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const invAllCrm = () => qc.invalidateQueries({ queryKey: ["crm"] });

  return {
    createCompany: useMutation({
      mutationFn: async (input: Partial<CrmCompany> & { name: string }) => {
        const { data, error } = await supabase.from("crm_companies")
          .insert({ ...input, created_by: userId! }).select().single();
        if (error) throw error;
        return data as CrmCompany;
      },
      onSuccess: () => inv([["crm","companies"]]),
    }),
    updateCompany: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<CrmCompany> }) => {
        const { error } = await supabase.from("crm_companies").update(patch).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => inv([["crm","companies"]]),
    }),
    archiveCompany: useMutation({
      mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
        const { error } = await supabase.from("crm_companies")
          .update({ archived: true, archived_at: new Date().toISOString(), archive_reason: reason ?? null })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    restoreCompany: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("crm_companies")
          .update({ archived: false, archived_at: null, archive_reason: null }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    deleteCompany: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("crm_companies").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    createContact: useMutation({
      mutationFn: async (input: Partial<CrmContact>) => {
        const { error } = await supabase.from("crm_contacts")
          .insert({ ...input, created_by: userId! });
        if (error) throw error;
      },
      onSuccess: () => inv([["crm","contacts"]]),
    }),
    archiveContact: useMutation({
      mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
        const { error } = await supabase.from("crm_contacts")
          .update({ archived: true, archived_at: new Date().toISOString(), archive_reason: reason ?? null })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    restoreContact: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("crm_contacts")
          .update({ archived: false, archived_at: null, archive_reason: null }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    deleteContact: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    createDeal: useMutation({
      mutationFn: async (input: Partial<CrmDeal> & { company_id: string; title: string }) => {
        const { error } = await supabase.from("crm_deals")
          .insert({ ...input, created_by: userId! });
        if (error) throw error;
      },
      onSuccess: () => inv([["crm","deals"]]),
    }),
    archiveDeal: useMutation({
      mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
        const { error } = await supabase.from("crm_deals")
          .update({ archived: true, archived_at: new Date().toISOString(), archive_reason: reason ?? null })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    restoreDeal: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("crm_deals")
          .update({ archived: false, archived_at: null, archive_reason: null }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    deleteDeal: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("crm_deals").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invAllCrm(),
    }),
    moveDealStage: useMutation({
      mutationFn: async ({ id, stage }: { id: string; stage: CrmDealStage }) => {
        const patch: Partial<CrmDeal> = { stage };
        if (stage === "won") patch.won_at = new Date().toISOString();
        if (stage === "lost") patch.lost_at = new Date().toISOString();
        const { error } = await supabase.from("crm_deals").update(patch).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => inv([["crm","deals"]]),
    }),
    logInteraction: useMutation({
      mutationFn: async (input: Partial<CrmInteraction> & { company_id: string; type: CrmInteractionType }) => {
        const { error } = await supabase.from("crm_interactions")
          .insert({ ...input, created_by: userId! });
        if (error) throw error;
      },
      onSuccess: () => inv([["crm","interactions"], ["crm","followups-due"]]),
    }),
    graduateCompany: useMutation({
      mutationFn: async (company: CrmCompany) => {
        if (company.linked_project_id) return company.linked_project_id;
        // NOTE: when project-type awareness lands, default project_type='client' here.
        const { data: venue, error: vErr } = await supabase
          .from("venues").insert({ name: company.name }).select("id").single();
        if (vErr) throw vErr;
        const { error: cErr } = await supabase.from("crm_companies")
          .update({ linked_project_id: venue.id, status: "active" }).eq("id", company.id);
        if (cErr) throw cErr;
        return venue.id as string;
      },
      onSuccess: () => inv([["crm","companies"]]),
    }),
  };
}