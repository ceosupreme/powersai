import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/marketing/site/Nav";
import { Footer } from "@/components/marketing/sections/Footer";
import { Container, MonoLabel } from "@/components/marketing/site/primitives";
import { PortfolioCard } from "@/components/marketing/work/PortfolioCard";
import { usePublishedPortfolioItems } from "@/hooks/usePortfolioItems";
import { cn } from "@/lib/utils";

const ALL = "All";

export default function Work() {
  const { data: items = [], isLoading } = usePublishedPortfolioItems();
  const [active, setActive] = useState<string>(ALL);

  useEffect(() => {
    const prev = document.title;
    document.title = "Work — Supreme Team Media";
    return () => { document.title = prev; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return [ALL, ...Array.from(set).sort()];
  }, [items]);

  const filtered = active === ALL ? items : items.filter((i) => i.category === active);
  const featured = filtered.filter((i) => i.featured);
  const regular = filtered.filter((i) => !i.featured);

  return (
    <div className="stm-marketing dark relative min-h-screen">
      <Nav />
      <main className="pt-28 pb-24">
        <Container>
          <div className="mb-12 max-w-3xl">
            <MonoLabel className="mb-3 block">Selected Work</MonoLabel>
            <h1 className="font-display text-4xl tracking-tight text-foreground md:text-5xl">
              Real systems shipped for real operators.
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              A mix of websites, AI systems, graphics, video, and case studies — what the studio has actually built.
            </p>
          </div>

          {categories.length > 1 && (
            <div className="mb-10 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActive(c)}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors",
                    active === c
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:border-accent/40 hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading work…</p>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet — new pieces ship every few weeks.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((it) => (
                <PortfolioCard key={it.id} item={it} featured />
              ))}
              {regular.map((it) => (
                <PortfolioCard key={it.id} item={it} />
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}