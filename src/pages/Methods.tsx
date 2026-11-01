import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { parseKeyPoints, skillOf } from '@/lib/pipelineComposer';

const SUBS = ['product_type', 'destination', 'monetization', 'promotion', 'platform_requirement'] as const;
const STATUSES = ['draft', 'active', 'under_review', 'archived', 'superseded'];
const statusWord = (s: string | null) => (s === 'draft' ? 'planned' : (s ?? '—').replace(/_/g, ' '));
const subWord = (s: string | null) => (s ?? '—').replace(/_/g, ' ');

interface MethodRow {
  id: string; title: string; subcategory: string | null; version: string | null; status: string | null;
  effective_date: string | null; expiry_date: string | null; last_reviewed_at: string | null; tags: string[] | null;
  description: string | null; summary: string | null; key_points: string | null; external_url: string | null;
}

const todayPT = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
export const needsReview = (expiry: string | null, today = todayPT()) => !!expiry && expiry < today;

export default function Methods() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [sub, setSub] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useQuery({
    queryKey: ['methods-library'],
    queryFn: async (): Promise<MethodRow[]> => {
      const { data, error } = await (supabase as any).from('knowledge_base')
        .select('id,title,subcategory,version,status,effective_date,expiry_date,last_reviewed_at,tags,description,summary,key_points,external_url')
        .in('subcategory', SUBS as unknown as string[]).order('subcategory').order('title');
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = useMemo(() => (rows.data ?? []).filter((r) =>
    (sub === 'all' || r.subcategory === sub) && r.title.toLowerCase().includes(q.trim().toLowerCase())), [rows.data, sub, q]);
  const open = (rows.data ?? []).find((r) => r.id === openId) ?? null;
  const today = todayPT();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6 md:pb-24">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-6 w-6" /></div>
        <h1 className="text-3xl font-semibold md:text-4xl">Methods</h1>
      </header>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" aria-label="Search methods" />
        <Select value={sub} onValueChange={setSub}>
          <SelectTrigger className="sm:w-56" aria-label="Filter by kind"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {SUBS.map((s) => <SelectItem key={s} value={s} className="capitalize">{subWord(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {rows.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> :
        rows.isError ? <p className="text-sm text-destructive">Methods could not be loaded. <button className="underline" onClick={() => rows.refetch()}>Try again</button></p> :
        list.length === 0 ? <p className="text-sm text-muted-foreground">No methods match.</p> : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {list.map((r) => {
              const stale = needsReview(r.expiry_date, today);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)}
                    className="grid w-full gap-1 p-3 text-left hover:bg-muted/30 md:grid-cols-[2fr_1fr_0.6fr_0.8fr_0.9fr_0.9fr_1fr] md:items-center md:gap-3">
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground break-words">{r.title}</span>
                      <span className="block text-xs capitalize text-muted-foreground">{subWord(r.subcategory)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{skillOf(r.tags) ?? 'No skill listed'}</span>
                    <span className="text-sm">{r.version ? `v${r.version}` : '—'}</span>
                    <span className="text-sm capitalize">{statusWord(r.status)}</span>
                    <span className="text-xs text-muted-foreground">Effective {r.effective_date ?? '—'}</span>
                    <span className="text-xs text-muted-foreground">Review by {r.expiry_date ?? '—'}</span>
                    <span>{stale && <Badge variant="destructive" className="text-[10px]">NEEDS REVIEW</Badge>}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.title}</SheetTitle>
                <SheetDescription className="capitalize">
                  {subWord(open.subcategory)} · {open.version ? `v${open.version}` : 'no version'} · {statusWord(open.status)}
                  {needsReview(open.expiry_date, today) ? ' · NEEDS REVIEW' : ''}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                {open.description && <p className="whitespace-pre-wrap">{open.description}</p>}
                {open.summary && <p className="whitespace-pre-wrap text-muted-foreground">{open.summary}</p>}
                <MethodSteps raw={open.key_points} />
                {open.external_url && (
                  <Button asChild className="w-full"><a href={open.external_url} target="_blank" rel="noreferrer">Open source</a></Button>
                )}
                {isAdmin && <AdminEditor key={open.id} row={open} onSaved={() => qc.invalidateQueries({ queryKey: ['methods-library'] })} />}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MethodSteps({ raw }: { raw: string | null }) {
  const kp = parseKeyPoints(raw);
  const steps = kp.steps ?? [];
  if (!steps.length && !(kp.adds ?? []).length) {
    return raw && !kp.kind && !kp.planned ? <pre className="whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs">{raw}</pre>
      : <p className="text-muted-foreground">{kp.planned ? 'Planned. Steps not written yet.' : 'No steps written.'}</p>;
  }
  return (
    <div className="space-y-3">
      {steps.length > 0 && (
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="rounded-md border border-border p-2">
              <p className="font-medium">{s.n ?? i + 1}. {s.title}</p>
              <p className="text-xs text-muted-foreground">Who: {s.owner === 'claude' ? 'Claude' : s.owner === 'tool' ? 'Tool (you)' : 'You'}</p>
              {s.check && <p className="text-xs">Check: {s.check}</p>}
            </li>
          ))}
        </ol>
      )}
      {(kp.adds ?? []).length > 0 && (
        <div><p className="font-semibold">Adds to a pipeline</p>
          <ul className="list-disc pl-5">{kp.adds!.map((a, i) => <li key={i}>{a.title} ({a.owner === 'claude' ? 'Claude' : 'You'})</li>)}</ul></div>
      )}
    </div>
  );
}

function AdminEditor({ row, onSaved }: { row: MethodRow; onSaved: () => void }) {
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
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{statusWord(s)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button className="w-full" disabled={saving} onClick={save}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
    </fieldset>
  );
}
