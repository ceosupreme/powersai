import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFoundationScores } from '@/components/foundation-audit/useFoundationScores';
import { useBrandChannels, useProjectJobs } from '@/hooks/useBrandWorkspace';
import { jobStatusWord, keyOf, parseNiche, usePlaybookJobs, usePlaybookLibrary, type PlaybookRow } from '@/hooks/usePlaybooks';
import { countWords, countsLine, isHiddenPlaybook, platformPlaybookKey, playbookStatus, todayPT, venueTags } from '@/lib/playbookStatus';
import { PlaybookWordBadge } from '@/components/playbooks/PlaybookWordBadge';

const CHANNEL_WORD: Record<string, string> = { live: 'Live', dormant: 'Dormant', empty: 'Empty', planned: 'Planned', needs_access: 'Needs access' };
const LANE_WORD: Record<string, string> = { satisfied: 'On', partial: 'Partly on', missing: 'Not on yet' };
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function PbLink({ row, today }: { row: PlaybookRow; today: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Link to={`/playbooks?open=${row.id}`} className="text-sm text-primary underline break-words">{row.title}</Link>
      <PlaybookWordBadge word={playbookStatus(row, today)} />
    </span>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-foreground/20 bg-card p-4">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function PlaybooksTab({ projectId }: { projectId: string }) {
  const today = todayPT();
  const lib = usePlaybookLibrary();
  const pbJobs = usePlaybookJobs({ projectId });
  const jobs = useProjectJobs(projectId);
  const channels = useBrandChannels(projectId);
  const { result, isLoading: lanesLoading } = useFoundationScores(projectId) as any;

  const live = useMemo(() => (lib.data ?? []).filter((r) => !isHiddenPlaybook(r)), [lib.data]);
  const byId = useMemo(() => new Map(live.map((r) => [r.id, r])), [live]);
  const destByKey = useMemo(() => {
    const m = new Map<string, PlaybookRow>();
    for (const r of live) if (r.subcategory === 'destination' && (r.status === 'active' || r.status === 'draft')) {
      const k = keyOf(r); if (k && !m.has(k)) m.set(k, r);
    }
    return m;
  }, [live]);

  const niches = useMemo(() => live.filter((r) => r.subcategory === 'niche' && venueTags(r.tags).includes(projectId)).map((r) => {
    const b = (parseNiche(r.key_points).brands ?? []).find((x) => x.venue_id === projectId);
    return { row: r, role: b?.role === 'core' ? 'core' : 'angle', angle: b?.angle ?? null };
  }).sort((a, b) => (a.role === 'core' ? 0 : 1) - (b.role === 'core' ? 0 : 1) || a.row.title.localeCompare(b.row.title)), [live, projectId]);

  const platforms = (channels.data ?? []).map((c) => {
    const k = platformPlaybookKey(c.platform);
    const row = (c.destination_method_id ? byId.get(c.destination_method_id) : undefined) ?? (k ? destByKey.get(k) : undefined) ?? null;
    return { c, row };
  });

  const lanes: any[] = ((result?.categories ?? []) as any[]).flatMap((c) => c.items)
    .filter((i) => i.item_key.startsWith('lane_') && ['satisfied', 'partial', 'missing'].includes(i.status));
  const laneGroups = useMemo(() => {
    const g = new Map<string, { row: PlaybookRow | null; lanes: any[] }>();
    for (const l of lanes) {
      const row = live.find((r) => r.subcategory === 'monetization' && (r.tags ?? []).includes(`lane:${l.item_key}`)) ?? null;
      const k = row?.id ?? '__none';
      g.set(k, { row, lanes: [...(g.get(k)?.lanes ?? []), l] });
    }
    return [...g.values()].sort((a, b) => (a.row ? 0 : 1) - (b.row ? 0 : 1));
  }, [lanes, live]);

  const formats = useMemo(() => {
    const ids = new Set<string>();
    for (const j of jobs.data ?? []) for (const e of j.recipe ?? []) if (byId.get(e.id)?.subcategory === 'product_type') ids.add(e.id);
    return [...ids].map((id) => byId.get(id)!).sort((a, b) => a.title.localeCompare(b.title));
  }, [jobs.data, byId]);

  const reliedOn = useMemo(() => {
    const m = new Map<string, PlaybookRow>();
    for (const n of niches) m.set(n.row.id, n.row);
    for (const p of platforms) if (p.row) m.set(p.row.id, p.row);
    for (const g of laneGroups) if (g.row) m.set(g.row.id, g.row);
    for (const f of formats) m.set(f.id, f);
    return [...m.values()];
  }, [niches, platforms, laneGroups, formats]);

  if (lib.isLoading || channels.isLoading || lanesLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (lib.isError) return <p className="text-sm text-destructive">Playbooks could not be loaded. <button className="underline" onClick={() => lib.refetch()}>Try again</button></p>;

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-foreground/30 bg-muted/40 p-4 text-base font-medium">
        This brand relies on {reliedOn.length} playbook{reliedOn.length === 1 ? '' : 's'}: {countsLine(countWords(reliedOn, today))}.
      </p>

      <Block title="Waiting on">
        {pbJobs.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (pbJobs.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No playbook is being written for this brand.</p>
        ) : (
          <ul className="space-y-2">{pbJobs.data!.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{j.title}</span>
                <span className="block text-xs text-muted-foreground">{jobStatusWord(j.status)} · Step {j.current_step ?? '—'}</span>
              </span>
              <Button size="sm" variant="outline" asChild><Link to={`/project/${projectId}/jobs/${j.id}`}>Pipeline</Link></Button>
            </li>
          ))}</ul>
        )}
      </Block>

      <Block title="Niches">
        {niches.length === 0 ? <p className="text-sm text-muted-foreground">No niche playbooks tagged for this brand.</p> : (
          <ul className="space-y-2">{niches.map((n) => (
            <li key={n.row.id} className="rounded-md border border-border p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <PbLink row={n.row} today={today} />
                <Badge variant="secondary" className="text-[10px]">{n.role === 'core' ? 'Core' : 'Angle'}</Badge>
              </div>
              {n.angle && <p className="text-xs text-muted-foreground">{n.angle}</p>}
            </li>
          ))}</ul>
        )}
      </Block>

      <Block title="Platforms">
        {platforms.length === 0 ? <p className="text-sm text-muted-foreground">No channels on file.</p> : (
          <ul className="divide-y divide-border">{platforms.map(({ c, row }) => (
            <li key={c.id} className="grid gap-1 py-2 sm:grid-cols-[1.2fr_0.6fr_1.6fr] sm:items-center">
              <span className="text-sm font-medium">{pretty(c.platform)}{c.handle ? ` · ${c.handle}` : ''}</span>
              <span className="text-xs">{CHANNEL_WORD[c.status] ?? c.status}</span>
              <span>{row ? <PbLink row={row} today={today} /> : <span className="text-xs text-muted-foreground">No playbook</span>}</span>
            </li>
          ))}</ul>
        )}
      </Block>

      <Block title="Money paths">
        {laneGroups.length === 0 ? <p className="text-sm text-muted-foreground">No money lanes on, partly on or missing.</p> : (
          <div className="space-y-3">{laneGroups.map((g) => (
            <div key={g.row?.id ?? 'none'} className="rounded-md border border-border p-3">
              <div className="mb-1.5">{g.row ? <PbLink row={g.row} today={today} /> : <span className="text-sm font-semibold">No playbook yet</span>}</div>
              <ul className="space-y-0.5">{g.lanes.map((l) => (
                <li key={l.item_key} className="flex justify-between gap-2 text-sm"><span>{l.label}</span><span className="text-xs text-muted-foreground shrink-0">{LANE_WORD[l.status]}</span></li>
              ))}</ul>
            </div>
          ))}</div>
        )}
      </Block>

      <Block title="Formats">
        {formats.length === 0 ? <p className="text-sm text-muted-foreground">No product types in this brand's pipelines yet.</p> : (
          <ul className="space-y-1.5">{formats.map((f) => <li key={f.id}><PbLink row={f} today={today} /></li>)}</ul>
        )}
      </Block>
    </div>
  );
}
