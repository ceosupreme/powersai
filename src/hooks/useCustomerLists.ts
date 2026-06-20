import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerList {
  id: string;
  project_id: string;
  name: string;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerListMember {
  id: string;
  list_id: string;
  project_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  last_visit_at: string | null;
  tags: string[];
  segment: string | null;
}

export function useCustomerLists(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["customer-lists", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_customer_lists")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerList[];
    },
  });
}

export function useCustomerListMembers(listId: string | null | undefined) {
  return useQuery({
    queryKey: ["customer-list-members", listId],
    enabled: !!listId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_customer_list_members")
        .select("*")
        .eq("list_id", listId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CustomerListMember[];
    },
  });
}

export function useCreateCustomerList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; source?: string; notes?: string }) => {
      const { data, error } = await (supabase as any)
        .from("project_customer_lists")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as CustomerList;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["customer-lists", d.project_id] }),
  });
}

export function useImportCustomerListMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      list_id: string;
      project_id: string;
      members: Array<{ name?: string; email?: string; phone?: string; last_visit_at?: string }>;
    }) => {
      const rows = input.members.map((m) => ({
        list_id: input.list_id,
        project_id: input.project_id,
        name: m.name ?? null,
        email: m.email ?? null,
        phone: m.phone ?? null,
        last_visit_at: m.last_visit_at ?? null,
      }));
      if (!rows.length) return 0;
      const { error } = await (supabase as any)
        .from("project_customer_list_members")
        .insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["customer-list-members", v.list_id] }),
  });
}

export function useStartReactivation() {
  return useMutation({
    mutationFn: async (input: { list_id: string; offer?: string; name?: string; channel?: "email" | "sms" }) => {
      const { data, error } = await (supabase as any).functions.invoke("reactivation-generate", {
        body: input,
      });
      if (error) throw error;
      return data;
    },
  });
}