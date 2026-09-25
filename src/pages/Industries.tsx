import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";

const firstSentence = (t: string | null) => { const s = (t ?? "").trim(); const m = s.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : s).trim(); };

export default function Industries() {
  useStudioHead({ title: "Industry Growth Systems | Supreme Team Media", description: "Industry-specific brand, website, marketing, conversion, retention and business systems from Supreme Team Media.", path: "/industries" });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["industries-v2"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("vertical_landing_pages").select("slug,display_name,subline,sort_order,page_version").eq("status", "published").gte("page_version", 2).order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  return <div className="stm-studio industries-page"><StudioHeader/><main><section className="industries-hero"><div className="studio-container"><p className="studio-eyebrow">Industries</p><h1 className="studio-display">Industry-specific growth systems, without forcing every business into the same playbook.</h1><p>Each market has different trust signals, buying cycles, tools, and handoffs. The strategy should reflect them.</p></div></section><section className="industries-grid-section"><div className="studio-container industries-grid">{isLoading && <p className="text-muted-foreground">Loading…</p>}{rows.map((r: any, index: number) => <Link to={`/for/${r.slug}`} key={r.slug} className="industry-tile"><span>{String(index + 1).padStart(2, "0")}</span><h2>{r.display_name}</h2><p>{firstSentence(r.subline)}</p><strong>See the page <ArrowRight aria-hidden size={16}/></strong></Link>)}</div></section></main><StudioFooter/></div>;
}
