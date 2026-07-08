import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OutreachTemplate {
  id: string;
  category: string;
  name: string;
  channel: "sms" | "email" | "dm" | "vm_script";
  subject: string | null;
  body: string;
  vertical: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useOutreachTemplates(includeInactive = false) {
  return useQuery({
    queryKey: ["outreach_templates", { includeInactive }],
    queryFn: async () => {
      let q = (supabase as any).from("outreach_templates").select("*").order("sort_order", { ascending: true });
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OutreachTemplate[];
    },
  });
}

// Frontend-only token hints (not schema).
export const TOKEN_HINTS: Record<string, string> = {
  audit_link: "supremeteammedia.com/free-audit",
  qualify_link: "/qualify/home-services",
};

export function extractTokens(...texts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  for (const t of texts) {
    if (!t) continue;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const key = m[1];
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  return out;
}

export function fillTokens(text: string | null | undefined, values: Record<string, string>): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const v = values[key];
    return v && v.length > 0 ? v : `{{${key}}}`;
  });
}