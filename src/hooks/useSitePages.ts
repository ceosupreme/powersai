import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simple public pages for every service and every place we serve. Each page
 * is a row (service_pages, city_pages); the public can only read published
 * rows, so adding or changing a page is a row edit, never code.
 */
export type IncludedItem = { title: string; body: string };

export type ServicePageRow = {
  slug: string;
  name: string;
  group_key: string;
  group_label: string;
  family_path: string;
  sort_order: number;
  icon: string | null;
  eyebrow: string | null;
  headline: string;
  headline_accent: string | null;
  summary: string | null;
  intro: string;
  included: IncludedItem[];
  audience_heading: string | null;
  audience_body: string | null;
  industries: string[];
  related: string[];
  meta_title: string | null;
  meta_description: string | null;
};

export type CityPageRow = {
  slug: string;
  name: string;
  eyebrow: string | null;
  region: string;
  is_coastal: boolean;
  sort_order: number;
  headline: string;
  headline_accent: string | null;
  intro: string;
  checkup_city: string;
  nearby: string[];
  industries: string[];
  meta_title: string | null;
  meta_description: string | null;
};

const SERVICE_FIELDS = "slug,name,group_key,group_label,family_path,sort_order,icon,eyebrow,headline,headline_accent,summary,intro,included,audience_heading,audience_body,industries,related,meta_title,meta_description";
const CITY_FIELDS = "slug,name,eyebrow,region,is_coastal,sort_order,headline,headline_accent,intro,checkup_city,nearby,industries,meta_title,meta_description";

const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asService = (r: Record<string, unknown>) => ({ ...r, included: list<IncludedItem>(r.included), industries: list<string>(r.industries), related: list<string>(r.related) }) as ServicePageRow;
const asCity = (r: Record<string, unknown>) => ({ ...r, nearby: list<string>(r.nearby), industries: list<string>(r.industries) }) as CityPageRow;

/** Every published service, in menu order. */
export function useServicePages() {
  return useQuery({
    queryKey: ["service-pages"],
    staleTime: 300_000,
    queryFn: async (): Promise<ServicePageRow[]> => {
      const { data, error } = await supabase.from("service_pages").select(SERVICE_FIELDS).eq("published", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => asService(r as Record<string, unknown>));
    },
  });
}

/** Every published city and area, in map order (north to south). */
export function useCityPages() {
  return useQuery({
    queryKey: ["city-pages"],
    staleTime: 300_000,
    queryFn: async (): Promise<CityPageRow[]> => {
      const { data, error } = await supabase.from("city_pages").select(CITY_FIELDS).eq("published", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => asCity(r as Record<string, unknown>));
    },
  });
}

/** Group services by their menu group, keeping the order they arrive in. */
export function groupServices(rows: ServicePageRow[]) {
  const groups: { key: string; label: string; items: ServicePageRow[] }[] = [];
  for (const row of rows) {
    let group = groups.find((g) => g.key === row.group_key);
    if (!group) { group = { key: row.group_key, label: row.group_label, items: [] }; groups.push(group); }
    group.items.push(row);
  }
  return groups;
}

/** Group places by region, keeping the order they arrive in. */
export function groupCities(rows: CityPageRow[]) {
  const groups: { region: string; items: CityPageRow[] }[] = [];
  for (const row of rows) {
    let group = groups.find((g) => g.region === row.region);
    if (!group) { group = { region: row.region, items: [] }; groups.push(group); }
    group.items.push(row);
  }
  return groups;
}
