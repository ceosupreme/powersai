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

// Frontend-only token metadata (not schema). Single source of truth for
// human-readable fill-dialog labels, example placeholders, and hints.
export interface TokenMeta {
  label: string;
  placeholder?: string;
  hint?: string;
}

export const TOKEN_META: Record<string, TokenMeta> = {
  first: { label: "Their first name", placeholder: "Mike", hint: "From the lead card" },
  biz: { label: "Business name", placeholder: "Harbor Town Pub" },
  vertical: { label: "Vertical (slug)", placeholder: "plumber", hint: "e.g. plumber, bar, mover" },
  vertical_noun: { label: "Vertical (spoken)", placeholder: "plumbing shop", hint: "How you'd say it out loud" },
  leak_$: { label: "Monthly leak amount ($)", placeholder: "4,800", hint: "From their checkup or leak stack run" },
  loom_link: { label: "Your Loom video link", placeholder: "loom.com/share/abc123" },
  one_new_finding: {
    label: "One finding you didn't mention in the video",
    placeholder: "Your Google listing has no hours",
    hint: "Something fresh, not from the Loom",
  },
  book_link: { label: "Booking link", placeholder: "cal.com/stm/intro", hint: "Your Calendly / Cal.com URL" },
  qualify_link: { label: "Qualifier link", placeholder: "/qualify/home-services", hint: "Vertical qualifier path" },
  audit_link: { label: "Checkup link", placeholder: "supremeteammedia.com/free-audit" },
  number: { label: "Number", placeholder: "3", hint: "e.g. days, weeks, calls" },
  time: { label: "Time window", placeholder: "this week", hint: 'Free text — "tomorrow", "Fri 2pm"' },
  a: { label: "Option A", placeholder: "option 1", hint: "For A/B pick-one messages" },
  b: { label: "Option B", placeholder: "option 2" },
};

// Back-compat alias used by older callers.
export const TOKEN_HINTS: Record<string, string> = Object.fromEntries(
  Object.entries(TOKEN_META).map(([k, v]) => [k, v.placeholder ?? ""]),
);

/** Cleaned-up fallback label for unknown tokens. */
export function prettifyToken(name: string): string {
  const cleaned = name
    .replace(/_\$$/i, " amount ($)")
    .replace(/_/g, " ")
    .trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function getTokenMeta(name: string): TokenMeta {
  return TOKEN_META[name] ?? { label: prettifyToken(name) };
}

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