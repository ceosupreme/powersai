import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VerticalLandingPage, FaqEntry } from "./useVerticalLanders";

/* ---------------------------------------------------------------------------
 * JSON shapes stored on vertical_landing_pages / vertical_landing_families.
 * Write future rows exactly in these shapes.
 *
 * tour_features:
 *   [{ title, body, caption, image_url, image_alt }]
 *
 * included_features:
 *   ["string", "string", ...]
 *
 * how_it_works:
 *   [{ title, body }]
 *
 * faq / faq_base:
 *   [{ q, a }]                       (same shape the faq column already uses)
 *
 * price_block:
 *   {
 *     intro: string,
 *     tiers: [{ name, setup_label, monthly_label,
 *               includes: string[], badge, cta_label, cta_url }],
 *     footnote: string
 *   }
 *
 * math_config:
 *   {
 *     intro: string,
 *     footnote: string,
 *     blocks: [{
 *       key, label, formula_text,
 *       inputs: [{ key, label, default, type: "count"|"percent"|"currency",
 *                  min, max, step }]
 *     }]
 *   }
 *   Each block estimate = product of its input values (percent inputs as
 *   fractions). Page total = sum of block estimates.
 * ------------------------------------------------------------------------- */

export interface TourFeature {
  title: string;
  body?: string | null;
  caption?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
}

export interface HowItWorksStep {
  title: string;
  body?: string | null;
}

export type MathInputType = "count" | "percent" | "currency";

export interface MathInput {
  key: string;
  label: string;
  default: number;
  type: MathInputType;
  min?: number | null;
  max?: number | null;
  step?: number | null;
}

export interface MathBlockConfig {
  key: string;
  label: string;
  formula_text?: string | null;
  inputs: MathInput[];
}

export interface MathConfig {
  intro?: string | null;
  footnote?: string | null;
  blocks: MathBlockConfig[];
}

export interface PriceTier {
  name: string;
  setup_label?: string | null;
  monthly_label?: string | null;
  includes?: string[] | null;
  badge?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
}

export interface PriceBlock {
  intro?: string | null;
  tiers: PriceTier[];
  footnote?: string | null;
}

export interface VerticalLandingFamily {
  family_key: string;
  display_name: string;
  tour_features: TourFeature[] | null;
  included_features: string[] | null;
  how_it_works: HowItWorksStep[] | null;
  live_in_line: string | null;
  proof_line: string | null;
  faq_base: FaqEntry[] | null;
  guarantee_line: string | null;
  math_config: MathConfig | null;
  created_at?: string;
  updated_at?: string;
}

export function useVerticalLanderBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["vertical-lander", "slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vertical_landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as VerticalLandingPage | null;
    },
    staleTime: 60_000,
  });
}

export function useVerticalLanderFamily(familyKey: string | null | undefined) {
  return useQuery({
    queryKey: ["vertical-lander", "family", familyKey],
    enabled: !!familyKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vertical_landing_families")
        .select("*")
        .eq("family_key", familyKey)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as VerticalLandingFamily | null;
    },
    staleTime: 60_000,
  });
}

/** Non-empty arrays / non-blank strings only; otherwise treated as absent. */
function present<T>(v: T | null | undefined): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length ? v : null;
  if (typeof v === "string") return v.trim() ? v : null;
  if (typeof v === "object" && Object.keys(v as object).length === 0) return null;
  return v;
}

export interface ResolvedLanderContent {
  tour_features: TourFeature[] | null;
  included_features: string[] | null;
  how_it_works: HowItWorksStep[] | null;
  live_in_line: string | null;
  proof_line: string | null;
  guarantee_line: string | null;
  math_config: MathConfig | null;
  faq: FaqEntry[];
}

/**
 * Page value wins when set, else the family value, else null.
 * FAQ is the exception: family faq_base items come first, then the page's own.
 */
export function resolveLanderContent(
  page: VerticalLandingPage | null | undefined,
  family: VerticalLandingFamily | null | undefined,
): ResolvedLanderContent {
  const p = (page ?? {}) as any;
  const f = (family ?? {}) as any;
  const pick = <T,>(key: string): T | null =>
    (present<T>(p[key]) ?? present<T>(f[key]) ?? null);

  const faqBase = present<FaqEntry[]>(f.faq_base) ?? [];
  const pageFaq = present<FaqEntry[]>(p.faq) ?? [];

  return {
    tour_features: pick<TourFeature[]>("tour_features"),
    included_features: pick<string[]>("included_features"),
    how_it_works: pick<HowItWorksStep[]>("how_it_works"),
    live_in_line: pick<string>("live_in_line"),
    proof_line: pick<string>("proof_line"),
    guarantee_line: pick<string>("guarantee_line"),
    math_config: pick<MathConfig>("math_config"),
    faq: [...faqBase, ...pageFaq],
  };
}

export interface LeakVectorLite {
  name: string;
  benchmark: string | null;
}

export function useLanderExtraLeaks(projectTypeId: string | null | undefined) {
  return useQuery({
    queryKey: ["vertical-lander", "extra-leaks", projectTypeId],
    enabled: !!projectTypeId,
    queryFn: async (): Promise<LeakVectorLite[]> => {
      const { data: typeRow, error: typeErr } = await (supabase as any)
        .from("project_types")
        .select("id")
        .eq("id", projectTypeId)
        .maybeSingle();
      if (typeErr || !typeRow) return [];
      const { data, error } = await (supabase as any)
        .from("project_type_leak_vectors")
        .select("name,benchmark,sort_order")
        .eq("project_type", typeRow.id)
        .order("sort_order", { ascending: true })
        .limit(2);
      if (error) return [];
      return (data ?? []).map((r: any) => ({ name: r.name, benchmark: r.benchmark }));
    },
    staleTime: 60_000,
  });
}
