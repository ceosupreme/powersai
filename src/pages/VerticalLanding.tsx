import { useEffect, useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Nav } from "@/components/marketing/site/Nav";
import { Footer } from "@/components/marketing/sections/Footer";
import { useVerticalLanderBySlug, useLanderExtraLeaks } from "@/hooks/useVerticalLander";
import { VerticalHero } from "@/components/marketing/vertical/VerticalHero";
import { LeaksGrid } from "@/components/marketing/vertical/LeaksGrid";
import { PluggedRow } from "@/components/marketing/vertical/PluggedRow";
import { ProofBand } from "@/components/marketing/vertical/ProofBand";
import { FaqBlock } from "@/components/marketing/vertical/FaqBlock";
import { FinalCta } from "@/components/marketing/vertical/FinalCta";

/** Sanitize the ?biz= query param. Trims, strips HTML, keeps letters/numbers/&'.- and caps at 40 chars. */
export function sanitizeBiz(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\p{L}\p{N}\s&'.\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return stripped.length ? stripped : null;
}

/** Append ?src=for-[slug] to a CTA URL, preserving any existing query + hash. */
export function withSrc(url: string, slug: string): string {
  const src = `src=for-${encodeURIComponent(slug)}`;
  // fragment-only link like "/#contact" or "#contact"
  if (url.startsWith("#")) return `/?${src}${url}`;
  const hashIdx = url.indexOf("#");
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : "";
  if (base === "" || base === "/") return `/?${src}${hash}`;
  // path-only: split on ?
  const qIdx = base.indexOf("?");
  if (qIdx < 0) return `${base}?${src}${hash}`;
  return `${base}${qIdx === base.length - 1 ? "" : "&"}${src}${hash}`;
}

export default function VerticalLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading } = useVerticalLanderBySlug(slug);
  const [params] = useSearchParams();
  const biz = useMemo(() => sanitizeBiz(params.get("biz")), [params]);
  const { data: extraLeaks = [] } = useLanderExtraLeaks(page?.project_type_id);

  useEffect(() => {
    if (!page) return;
    const prevTitle = document.title;
    document.title = page.meta_title;
    const ensureMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("content");
      el.setAttribute("content", content);
      return () => { if (prev !== null) el!.setAttribute("content", prev); };
    };
    const restores = [
      ensureMeta("description", page.meta_description),
      ensureMeta("og:title", page.meta_title, "property"),
      ensureMeta("og:description", page.meta_description, "property"),
    ];
    if (page.og_image_url) restores.push(ensureMeta("og:image", page.og_image_url, "property"));
    return () => {
      document.title = prevTitle;
      restores.forEach((r) => r());
    };
  }, [page]);

  if (isLoading) {
    return (
      <div className="stm-marketing relative min-h-screen">
        <div aria-hidden className="grain fixed inset-0 z-0" />
        <Nav />
        <main className="relative z-10 flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#465CFF] border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!page) return <Navigate to="/404" replace />;

  return (
    <div className="stm-marketing relative min-h-screen">
      <div aria-hidden className="grain fixed inset-0 z-0" />
      <Nav />
      <main className="relative z-10">
        <VerticalHero page={page} biz={biz} withSrc={(u) => withSrc(u, page.slug)} />
        <LeaksGrid leaks={page.leaks} extras={extraLeaks} />
        <PluggedRow />
        <ProofBand proofLine={page.proof_line} />
        <FaqBlock faq={page.faq} />
        <FinalCta page={page} withSrc={(u) => withSrc(u, page.slug)} />
      </main>
      <Footer />
    </div>
  );
}