import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, HelpCircle, BookOpen } from "lucide-react";
import { HELP_ARTICLES, type HelpArticle } from "@/config/helpArticles";

export default function HelpCenter() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<HelpArticle | null>(HELP_ARTICLES[0] ?? null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return HELP_ARTICLES;
    return HELP_ARTICLES.filter((a) => {
      const hay = [
        a.title,
        a.summary,
        a.tags.join(" "),
        a.sections.map((s) => `${s.heading} ${s.body}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [q]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 space-y-4">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-sm text-muted-foreground">Step-by-step guides for the features in this app.</p>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: crm, brand, export, archive, capture, pillar, lead…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <aside className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground p-3">No articles match.</div>
          )}
          {filtered.map((a) => (
            <button
              key={a.slug}
              onClick={() => setSelected(a)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected?.slug === a.slug
                  ? "bg-primary/10 border-primary/40"
                  : "bg-card border-border/60 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2 font-medium text-sm">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                {a.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{a.summary}</div>
            </button>
          ))}
        </aside>

        <main>
          {selected ? (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{selected.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selected.summary}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selected.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {selected.sections.map((s, i) => (
                    <section key={i} className="space-y-1">
                      <h3 className="font-medium text-sm">{s.heading}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{s.body}</p>
                    </section>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-muted-foreground p-6">Pick an article.</div>
          )}
        </main>
      </div>
    </div>
  );
}