import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Nav } from "@/components/marketing/site/Nav";
import { Footer } from "@/components/marketing/sections/Footer";
import { Container, MonoLabel } from "@/components/marketing/site/primitives";
import { usePublishedPortfolioItemBySlug } from "@/hooks/usePortfolioItems";

export default function WorkCaseStudy() {
  const { slug } = useParams<{ slug: string }>();
  const { data: item, isLoading } = usePublishedPortfolioItemBySlug(slug);

  useEffect(() => {
    const prev = document.title;
    if (item) document.title = `${item.title} — Supreme Team Media`;
    return () => { document.title = prev; };
  }, [item]);

  return (
    <div className="stm-marketing dark relative min-h-screen">
      <Nav />
      <main className="pt-28 pb-24">
        <Container>
          <Link
            to="/work"
            className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> All work
          </Link>

          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !item ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Case study not found.</p>
          ) : (
            <article className="mx-auto max-w-3xl">
              <MonoLabel className="mb-3 block">{item.category}</MonoLabel>
              <h1 className="font-display text-3xl tracking-tight text-foreground md:text-5xl">
                {item.title}
              </h1>
              {item.client_or_vertical && (
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-accent">
                  {item.client_or_vertical}
                </p>
              )}
              {item.description && (
                <p className="mt-6 text-lg text-muted-foreground">{item.description}</p>
              )}

              {(item.image_url || item.thumbnail_url) && (
                <div className="mt-10 overflow-hidden rounded-sm border border-border bg-panel/40">
                  <img
                    src={item.image_url || item.thumbnail_url || ""}
                    alt={item.title}
                    className="h-auto w-full"
                  />
                </div>
              )}

              {item.external_url && (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center gap-2 text-sm text-accent hover:opacity-80"
                >
                  View live <ExternalLink className="h-4 w-4" />
                </a>
              )}

              {item.case_study_body && (
                <div className="mt-12 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                  {item.case_study_body}
                </div>
              )}
            </article>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}