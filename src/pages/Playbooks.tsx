import { useApp } from "@/context/AppContext";
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { parseKeyPoints, skillOf } from '@/lib/pipelineComposer';
import {
  NICHE_GROUPS, SHELVES, appliesToBrand, countWords, countsLine, isHiddenPlaybook, nicheGroupLabel,
  playbookStatus, sourceKindWord, sourceStatusWord, todayPT, venueTags,
} from '@/lib/playbookStatus';
import {
  jobStatusWord, keyOf, parseNiche, usePlaybookJobs, usePlaybookLibrary, usePlaybookSources, type PlaybookRow,
} from '@/hooks/usePlaybooks';
import { PlaybookWordBadge } from '@/components/playbooks/PlaybookWordBadge';
import { AddMaterialDialog, INBOX_URL } from '@/components/playbooks/AddMaterialDialog';
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { compareName, compareOptional, dateValue } from '@/lib/collectionSort';
import { Label } from '@/components/ui/label';

const STATUSES = ['draft', 'active', 'under_review', 'superseded', 'archived'];
const STATUS_OPTION_WORD: Record<string, string> = { draft: 'Planned', active: 'Active', under_review: 'Under review', superseded: 'Superseded', archived: 'Archived' };
const PLAYS_EMPTY = 'Plays are proven combinations. They appear here when a 30-day check shows something worked.';

const nicheBrands = (r: PlaybookRow) => {
  const b = parseNiche(r.key_points).brands ?? [];
  return [...b].sort((x, y) => (x.role === 'core' ? 0 : 1) - (y.role === 'core' ? 0 : 1));
};

export default function Playbooks() {
  const lib = usePlaybookLibrary();
  const [params, setParams] = useSearchParams();
  const [shelf, setShelf] = useState<string>(params.get('shelf') ?? 'formats');
  const [q, setQ] = useState('');
  const { selectedBar, accessibleBars, setSelectedBar, clearSelectedBar } = useApp();
  const brand = selectedBar?.id ?? 'all';
  const setBrand = (id: string) => { if(id === 'all') clearSelectedBar(); else { const b = accessibleBars.find(b=>b.id===id); if(b) setSelectedBar(b); } };
  const [group, setGroup] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [sort, setSort] = useState('name');
  const [readiness, setReadiness] = useState('all');
  const today = todayPT();
  const openId = params.get('open');

  const visible = useMemo(() => (lib.data ?? []).filter((r) => !isHiddenPlaybook(r)), [lib.data]);

  const shelfDef = SHELVES.find((s) => s.key === shelf) ?? SHELVES[0];
  const inShelf = (r: PlaybookRow, s = shelfDef) => (s.subs as readonly string[]).includes(r.subcategory ?? '');
  const list = useMemo(() => visible.filter((r) => inShelf(r)
    && r.title.toLowerCase().includes(q.trim().toLowerCase())
    && (brand === 'all' || appliesToBrand(r, brand))
    && (readiness === 'all' || playbookStatus(r, today).toLowerCase() === readiness)
    && (shelf !== 'niches' || group === 'all' || nicheGroupLabel(parseNiche(r.key_points).group) === group))
    .sort((a, b) => {
      if (sort === 'review') return compareOptional(dateValue(a.expiry_date), dateValue(b.expiry_date)) || compareName(a.title, b.title);
      if (sort === 'readiness') {
        const rank: Record<string, number> = { Written: 0, Thin: 1, Planned: 2 };
        return (rank[playbookStatus(a, today)] ?? 3) - (rank[playbookStatus(b, today)] ?? 3) || compareName(a.title, b.title);
      }
      return compareName(a.title, b.title);
    }), // eslint-disable-line react-hooks/exhaustive-deps
  [visible, shelf, q, brand, group, readiness, sort, today]);

  const sections = useMemo(() => {
    if (shelf !== 'niches') return [{ title: null as string | null, rows: list }];
    const by = new Map<string, PlaybookRow[]>();
    for (const r of list) {
      const g = nicheGroupLabel(parseNiche(r.key_points).group);
      by.set(g, [...(by.get(g) ?? []), r]);
    }
    const order = [...NICHE_GROUPS, ...[...by.keys()].filter((g) => !NICHE_GROUPS.includes(g))];
    return order.filter((g) => by.has(g)).map((g) => ({ title: g, rows: by.get(g)! }));
  }, [list, shelf]);

  const open = (lib.data ?? []).find((r) => r.id === openId) ?? null;
  const setOpen = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set('open', id); else p.delete('open');
    setParams(p, { replace: !id });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6 md:pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-6 w-6" /></div>
          <div><h1 className="text-3xl font-semibold">Playbooks</h1><p className="text-sm text-muted-foreground">All brands · find a method, check its readiness, and start with clear steps.</p></div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" />Add your material</Button>
          <a href={INBOX_URL} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Or drop files in the Playbook Inbox folder</a>
        </div>
      </header>

      <div role="group" aria-label="Playbook categories" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
        {SHELVES.map((s) => {
          const c = countWords(visible.filter((r) => inShelf(r, s)), today);
          const active = s.key === shelf;
          return (
            <button key={s.key} aria-pressed={active} type="button"
              onClick={() => { setShelf(s.key); setGroup('all'); }}
              className={cn('min-w-0 rounded-lg border px-3 py-3 text-left min-h-11',
                active ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/20' : 'border-border bg-card text-foreground hover:bg-accent')}>
              <span className="block text-sm font-semibold">{s.label}</span>
              <span className="block text-xs mt-1">{countsLine(c)}</span>
            </button>
          );
        })}
      </div>

      <CollectionToolbar query={q} onQuery={setQ} placeholder="Find a playbook…" sort={sort} onSort={setSort} count={list.length}
        options={[{value:'name',label:'Title · A to Z'},{value:'readiness',label:'Written first'},{value:'review',label:'Review date · earliest first'}]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="space-y-1.5"><Label htmlFor="playbook-brand">Brand</Label>
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger id="playbook-brand" className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {[...accessibleBars].sort((a,b)=>a.bar_name.localeCompare(b.bar_name)).map((b) => <SelectItem key={b.id} value={b.id}>{b.bar_name}</SelectItem>)}
          </SelectContent>
        </Select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="playbook-readiness">Readiness</Label>
          <Select value={readiness} onValueChange={setReadiness}>
            <SelectTrigger id="playbook-readiness" className="sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Any readiness</SelectItem><SelectItem value="written">Written</SelectItem><SelectItem value="thin">Thin</SelectItem><SelectItem value="planned">Planned</SelectItem></SelectContent>
          </Select>
        </div>
        {shelf === 'niches' && (
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className="sm:w-56" aria-label="Filter by group"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {NICHE_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(q || brand !== 'all' || readiness !== 'all' || group !== 'all') && <Button variant="ghost" className="self-end" onClick={() => { setQ(''); setBrand('all'); setReadiness('all'); setGroup('all'); }}>Clear filters</Button>}
      </div>

      {lib.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> :
        lib.isError ? <p className="text-sm text-destructive">Playbooks could not be loaded. <button className="underline" onClick={() => lib.refetch()}>Try again</button></p> :
          list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              {shelf === 'plays' && !q && brand === 'all' ? PLAYS_EMPTY : 'No playbooks match.'}
            </p>
          ) : (
            <div className="space-y-5">
              {sections.map((sec) => (
                <section key={sec.title ?? 'all'}>
                  {sec.title && <h2 className="mb-2 text-lg font-semibold">{sec.title} <span className="text-sm font-normal text-muted-foreground">({sec.rows.length})</span></h2>}
                  <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {sec.rows.map((r) => (
                      <li key={r.id}>
                        <button type="button" onClick={() => setOpen(r.id)}
                          className="grid w-full gap-1 p-3 text-left hover:bg-muted/30 md:grid-cols-[2fr_0.8fr_0.5fr_0.9fr_1fr] md:items-center md:gap-3">
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground break-words">{r.title}</span>
                            {r.subcategory === 'niche' && nicheBrands(r).length > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                {nicheBrands(r).map((b) => `${b.brand}${b.role === 'core' ? ' (core)' : ''}`).join(', ')}
                              </span>
                            )}
                          </span>
                          <span><PlaybookWordBadge word={playbookStatus(r, today)} /></span>
                          <span className="text-sm">{r.version ? `v${r.version}` : '—'}</span>
                          <span className="text-xs text-muted-foreground">Review by {r.expiry_date ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">{skillOf(r.tags) ?? 'No skill or pack'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && <PlaybookDetail row={open} library={lib.data ?? []} onOpen={setOpen} />}
        </SheetContent>
      </Sheet>
      <AddMaterialDialog open={addOpen} onClose={() => setAddOpen(false)} library={lib.data ?? []} />
    </div>
  );
}

function PlaybookDetail({ row, library, onOpen }: { row: PlaybookRow; library: PlaybookRow[]; onOpen: (id: string) => void }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const today = todayPT();
  const key = keyOf(row);
  const jobs = usePlaybookJobs({ playbookId: row.id, key });
  const [addOpen, setAddOpen] = useState(false);
  const word = playbookStatus(row, today);
  const kp = parseKeyPoints(row.key_points) as any;
  const niche = row.subcategory === 'niche' ? parseNiche(row.key_points) : null;
  const history = key ? library.filter((r) => keyOf(r) === key)
    .sort((a, b) => (b.effective_date ?? '').localeCompare(a.effective_date ?? '') || (b.version ?? '').localeCompare(a.version ?? '', undefined, { numeric: true })) : [row];

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-6">{row.title}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-2">
            <PlaybookWordBadge word={word} />
            <span>{row.version ? `Version ${row.version}` : 'No version'}</span>
            <span>· Review by {row.expiry_date ?? '—'}</span>
          </div>
        </SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-5 text-sm">
        {row.description && <p className="whitespace-pre-wrap">{row.description}</p>}
        {row.summary && <p className="whitespace-pre-wrap text-muted-foreground">{row.summary}</p>}
        {row.external_url && <Button asChild className="w-full"><a href={row.external_url} target="_blank" rel="noreferrer">Open readable copy</a></Button>}

        <StepList title="Steps" items={kp.steps} />
        <StepList title="Setup" items={kp.setup} />
        <StepList title="Adds to a pipeline" items={kp.adds} />

        {niche && (niche.brands ?? []).length > 0 && (
          <section>
            <h3 className="mb-1 font-semibold">Brand angles</h3>
            <ul className="space-y-1.5">
              {nicheBrands(row).map((b, i) => (
                <li key={i} className="rounded-md border border-border p-2">
                  <p className="font-medium">{b.brand} <Badge variant="outline" className="ml-1 text-[10px]">{b.role === 'core' ? 'Core' : 'Angle'}</Badge></p>
                  {b.angle && <p className="text-xs text-muted-foreground">{b.angle}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {niche && (niche.money_map ?? []).length > 0 && (
          <section>
            <h3 className="mb-1 font-semibold">Money map</h3>
            <ol className="space-y-1">{[...niche.money_map!].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map((m, i) => (
              <li key={i}><span className="font-medium">{m.rank ?? i + 1}. {m.key.replace(/_/g, ' ')}</span>{m.why && <span className="text-muted-foreground"> · {m.why}</span>}</li>
            ))}</ol>
          </section>
        )}
        {niche && (niche.content_map ?? []).length > 0 && (
          <section>
            <h3 className="mb-1 font-semibold">Content map</h3>
            <ul className="space-y-1">{niche.content_map!.map((c, i) => (
              <li key={i}>{c.format.replace(/_/g, ' ')}{c.series ? ` · ${c.series}` : ''}{c.level != null ? ` · Level ${c.level}` : ''}</li>
            ))}</ul>
          </section>
        )}
        {niche?.notes && <p className="whitespace-pre-wrap text-muted-foreground">{niche.notes}</p>}

        {row.full_text && (
          <section>
            <h3 className="mb-1 font-semibold">Full playbook</h3>
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed">{row.full_text}</div>
          </section>
        )}

        <section>
          <h3 className="mb-1 font-semibold">Being written or updated</h3>
          {jobs.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (jobs.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No job is working on this playbook.</p>
          ) : (
            <ul className="space-y-1.5">{jobs.data!.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2">
                <span className="min-w-0">{j.title} <span className="text-xs text-muted-foreground">· {jobStatusWord(j.status)}</span></span>
                <Button size="sm" variant="outline" asChild><Link to={`/project/${j.project_id}/jobs/${j.id}`}>Pipeline</Link></Button>
              </li>
            ))}</ul>
          )}
        </section>

        <section>
          <h3 className="mb-1 font-semibold">Version history</h3>
          <ul className="divide-y divide-border rounded-md border border-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 p-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span>{h.version ? `v${h.version}` : '—'}</span>
                  <PlaybookWordBadge word={playbookStatus(h, today)} />
                  <span className="text-xs text-muted-foreground">Effective {h.effective_date ?? '—'}</span>
                </span>
                {h.id === row.id ? <span className="text-xs text-muted-foreground">Open now</span>
                  : <Button size="sm" variant="ghost" onClick={() => onOpen(h.id)}>Open</Button>}
              </li>
            ))}
          </ul>
        </section>

        <SourcesPanel id={row.id} k={key} onAdd={() => setAddOpen(true)} />

        {isAdmin && <AdminEditor key={row.id} row={row} onSaved={() => qc.invalidateQueries({ queryKey: ['playbooks', 'library'] })} />}
      </div>
      <AddMaterialDialog open={addOpen} onClose={() => setAddOpen(false)} fixed={row} />
    </>
  );
}

function StepList({ title, items }: { title: string; items?: { n?: number; title: string; owner?: string; check?: string }[] }) {
  if (!Array.isArray(items) || !items.length) return null;
  const who = (o?: string) => (o === 'claude' ? 'Claude' : o === 'tool' ? 'Tool (you)' : 'You');
  return (
    <section>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <ol className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="rounded-md border border-border p-2">
            <p className="font-medium">{s.n ?? i + 1}. {s.title}</p>
            <p className="text-xs text-muted-foreground">Who: {who(s.owner)}</p>
            {s.check && <p className="text-xs">Check: {s.check}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SourcesPanel({ id, k, onAdd }: { id: string; k: string | null; onAdd: () => void }) {
  const src = usePlaybookSources(id, k);
  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold">Sources</h3>
        <Button size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" />Add your material</Button>
      </div>
      {src.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : src.isError ? (
        <p className="text-xs text-destructive">Sources could not be loaded.</p>
      ) : (src.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No sources yet.</p> : (
        <ul className="space-y-2">
          {src.data!.map((s) => (
            <li key={s.id} className="rounded-md border border-border bg-card p-2">
              <p className="font-medium break-words">
                {s.url ? <a className="text-primary underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
              </p>
              <p className="text-xs text-muted-foreground">{sourceKindWord(s.kind)} · {s.created_at.slice(0, 10)} · <span className="text-foreground">{sourceStatusWord(s)}</span></p>
              {s.status === 'merged' && s.merge_notes && <p className="mt-1 whitespace-pre-wrap text-xs">{s.merge_notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AdminEditor({ row, onSaved }: { row: PlaybookRow; onSaved: () => void }) {
  const [version, setVersion] = useState(row.version ?? '');
  const [expiry, setExpiry] = useState(row.expiry_date ?? '');
  const [status, setStatus] = useState(row.status ?? 'draft');
  const [reviewed, setReviewed] = useState(row.last_reviewed_at?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from('knowledge_base').update({
      version: version.trim() || null, expiry_date: expiry || null, status,
      last_reviewed_at: reviewed ? new Date(`${reviewed}T12:00:00`).toISOString() : null,
    }).eq('id', row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    onSaved();
  };
  return (
    <fieldset className="space-y-2 border-t border-border pt-4">
      <legend className="text-sm font-semibold">Edit (admin)</legend>
      <label className="block text-xs">Version<Input value={version} onChange={(e) => setVersion(e.target.value)} /></label>
      <label className="block text-xs">Review by<Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
      <label className="block text-xs">Last reviewed<Input type="date" value={reviewed} onChange={(e) => setReviewed(e.target.value)} /></label>
      <div className="text-xs">Status
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_OPTION_WORD[s]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button className="w-full" disabled={saving} onClick={save}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
    </fieldset>
  );
}
