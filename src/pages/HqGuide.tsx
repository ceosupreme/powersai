import { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, Printer, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { buildGuide, openableRoute, searchGuide, type GuideArticle, type GuideBlock } from '@/lib/hqGuide';

const FILES = import.meta.glob('../content/guide/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const { articles: ARTICLES, parts: PARTS } = buildGuide(FILES);

/**
 * Printing renders the whole guide into a node directly under <body>, so the
 * app's layout, scroll containers and dark theme never clip or recolor paper.
 */
const PRINT_CSS = `
.hq-guide-print { display: none; }
@media print {
  @page { size: Letter; margin: 0.6in 0.55in; }
  html, body { background: #fff !important; }
  body > *:not(.hq-guide-print) { display: none !important; }
  .hq-guide-print { display: block !important; background: #fff; font-size: 11pt; line-height: 1.45; }
  .hq-guide-print, .hq-guide-print * { color: #111827 !important; }
  .hq-guide-print .hq-guide-break { break-before: page; page-break-before: always; }
  .hq-guide-print h1, .hq-guide-print h2, .hq-guide-print h3 { break-after: avoid; page-break-after: avoid; }
  .hq-guide-print li { break-inside: avoid; page-break-inside: avoid; }
}`;

function PrintableGuide() {
  return (
    <div className="hq-guide-print" aria-hidden="true">
      <h1 className="text-3xl font-bold">Supreme Team HQ Guide</h1>
      <p className="mt-2 text-sm">How every part of HQ works, screen by screen.</p>
      <h2 className="mt-6 text-lg font-semibold">Contents</h2>
      {PARTS.map((p) => (
        <div key={p.name} className="mt-3">
          <p className="font-semibold">{p.name}</p>
          <ul className="list-disc pl-5 text-sm">{p.articles.map((a) => <li key={a.slug}>{a.title}</li>)}</ul>
        </div>
      ))}
      {PARTS.map((p) => (
        <Fragment key={p.name}>
          {p.articles.map((a) => <div key={a.slug} className="hq-guide-break"><ArticleView a={a} /></div>)}
        </Fragment>
      ))}
    </div>
  );
}

function Blocks({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ('items' in b) {
          const List = b.type === 'ol' ? 'ol' : 'ul';
          return (
            <List key={i} className={`my-2 space-y-1.5 pl-5 text-[15px] leading-relaxed text-foreground/90 ${b.type === 'ol' ? 'list-decimal' : 'list-disc'}`}>
              {b.items.map((item, j) => <li key={j} className="pl-1">{item}</li>)}
            </List>
          );
        }
        if (b.type === 'h2') return <h2 key={i} className="mt-7 mb-2 text-lg font-semibold text-foreground">{b.text}</h2>;
        if (b.type === 'h3') return <h3 key={i} className="mt-5 mb-1.5 text-base font-semibold text-foreground">{b.text}</h3>;
        return <p key={i} className="my-2 text-[15px] leading-relaxed text-foreground/90">{b.text}</p>;
      })}
    </>
  );
}

function ArticleView({ a }: { a: GuideArticle }) {
  const open = openableRoute(a.route);
  return (
    <article>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.part}</p>
      <h1 className="mt-1 text-2xl font-bold leading-tight text-foreground">{a.title}</h1>
      {a.summary && <p className="mt-3 text-base leading-relaxed text-foreground">{a.summary}</p>}
      {open && (
        <Button asChild size="sm" variant="outline" className="mt-4 print:hidden">
          <Link to={open}><ExternalLink className="mr-1.5 h-4 w-4" />Open this screen</Link>
        </Button>
      )}
      <Blocks blocks={a.blocks} />
    </article>
  );
}

export default function HqGuide() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [tocOpen, setTocOpen] = useState(false);
  const slug = params.get('a') ?? ARTICLES[0]?.slug ?? '';
  const current = ARTICLES.find((a) => a.slug === slug) ?? ARTICLES[0];
  const index = current ? ARTICLES.indexOf(current) : -1;
  const results = useMemo(() => searchGuide(ARTICLES, q), [q]);
  const resultSet = useMemo(() => new Set(results.map((r) => r.slug)), [results]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  const go = (s: string) => { setParams({ a: s }); setTocOpen(false); };

  const toc = (
    <nav aria-label="Guide contents" className="space-y-4">
      {PARTS.map((p) => {
        const items = p.articles.filter((a) => resultSet.has(a.slug));
        if (!items.length) return null;
        return (
          <div key={p.name}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.name}</p>
            <ul className="space-y-0.5">
              {items.map((a) => (
                <li key={a.slug}>
                  <button
                    type="button"
                    onClick={() => go(a.slug)}
                    aria-current={a.slug === current?.slug ? 'page' : undefined}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm leading-snug ${a.slug === current?.slug ? 'bg-primary/10 font-medium text-foreground' : 'text-foreground/80 hover:bg-muted'}`}
                  >
                    {a.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {!results.length && <p className="text-sm text-muted-foreground">Nothing matches "{q}".</p>}
    </nav>
  );

  if (!current) {
    return <div className="p-6 text-sm text-muted-foreground">The guide has no articles yet.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-6">
      <style>{PRINT_CSS}</style>
      {createPortal(<PrintableGuide />, document.body)}

      <header className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">HQ Guide</h1>
            <p className="text-sm text-muted-foreground">How every part of HQ works, screen by screen. {ARTICLES.length} articles.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Print the whole guide</Button>
      </header>

      <div className="relative mt-4 print:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the guide, for example: setup score, pipeline, screenshots" className="pl-9" aria-label="Search the guide" />
      </div>

      <div className="mt-3 md:hidden print:hidden">
        <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => setTocOpen((v) => !v)} aria-expanded={tocOpen}>
          <span>Contents{q ? ` (${results.length} found)` : ''}</span><span>{tocOpen ? 'Hide' : 'Show'}</span>
        </Button>
        {tocOpen && <div className="mt-3 rounded-lg border bg-card p-3">{toc}</div>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr] print:hidden">
        <aside className="hidden md:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">{toc}</div>
        </aside>
        <main className="min-w-0 rounded-xl border bg-card p-5 md:p-8">
          <ArticleView a={current} />
          <div className="mt-10 flex items-center justify-between gap-3 border-t pt-4">
            {index > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => go(ARTICLES[index - 1].slug)} className="max-w-[48%] justify-start">
                <ChevronLeft className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">{ARTICLES[index - 1].title}</span>
              </Button>
            ) : <span />}
            {index < ARTICLES.length - 1 && (
              <Button variant="ghost" size="sm" onClick={() => go(ARTICLES[index + 1].slug)} className="max-w-[48%] justify-end">
                <span className="truncate">{ARTICLES[index + 1].title}</span><ChevronRight className="ml-1 h-4 w-4 shrink-0" />
              </Button>
            )}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Looking for the older help articles? They are still in the <Link to="/help" className="underline">Help Center</Link>.</p>
        </main>
      </div>
    </div>
  );
}
