import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Container } from "./primitives";
export function Testimonials() {
  const { data = [] } = useQuery({ queryKey: ["public-testimonials"], staleTime: 300000, queryFn: async () => { const { data, error } = await supabase.from("testimonials").select("id,name,business,role,quote,sort_order").eq("published", true).order("sort_order", { ascending: true }); if (error) throw error; return data ?? []; } });
  if (!data.length) return null;
  return <section className="testimonials-section" aria-labelledby="testimonials-title"><Container><span className="home-eyebrow">Client words</span><h2 id="testimonials-title" className="home-section-title">What it was like<br/><em>to work together.</em></h2><div className="testimonials-grid">{data.map(item => <figure key={item.id}><blockquote>“{item.quote}”</blockquote><figcaption><strong>{item.name}</strong><span>{[item.business, item.role].filter(Boolean).join(" · ")}</span></figcaption></figure>)}</div></Container></section>;
}