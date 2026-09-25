import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FLAGSHIP_SLUGS, type VerticalSlug } from "@/components/marketing/vertical-flagship/config";
import FlagshipVertical from "./FlagshipVertical";
import VerticalLanding from "./VerticalLanding";
import VerticalV2 from "./VerticalV2";
import NotFound from "./NotFound";

const ALIASES: Record<string, string> = { "bars-restaurants": "restaurants", taquerias: "tacos", "plumbing-hvac": "plumbing" };

export default function VerticalResolver() {
  const { slug: raw = "" } = useParams<{ slug: string }>();
  const slug = ALIASES[raw] ?? raw;
  const { data: row, isLoading } = useQuery({
    queryKey: ["vertical-lander", "resolve", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("vertical_landing_pages").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) return null;
      return data ?? null;
    },
    staleTime: 60_000,
  });
  if (isLoading) return <div className="stm-studio min-h-screen" aria-busy="true" />;
  if (row && Number(row.page_version ?? 1) >= 2) return <VerticalV2 row={row} slug={slug} />;
  if (FLAGSHIP_SLUGS.includes(slug as VerticalSlug)) return <FlagshipVertical slug={slug as VerticalSlug} />;
  if (row) return <VerticalLanding />;
  return <NotFound />;
}
