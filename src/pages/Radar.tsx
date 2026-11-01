import { useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Radar as RadarIcon, BookOpen, Library, Lightbulb, History, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchRadarSources, fetchRadarBriefs, fetchRadarRuns, groupRadarBriefs, radarEvidence, radarShelf, researchUrl } from '@/lib/radarData';

function dateLabel(value: string | null, time = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } as const : {}),
  }).format(date);
}

function Summary({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <div className="space-y-2">
    <p id={id} className={`whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground ${expanded ? '' : 'line-clamp-4'}`}>{text || '—'}</p>
    {text && <Button variant="ghost" size="sm" className="-ml-2" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}{expanded ? 'Show less' : 'Expand summary'}
    </Button>}
  </div>;
}

function ResearchLink({ url, children }: { url: string | null; children: ReactNode }) {
  const href = researchUrl(url);
  return href ? <Button asChild variant="link" className="h-auto p-0 text-sm"><a href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button> : null;
}

function SectionState({ loading, error, empty }: { loading: boolean; error: boolean; empty: boolean }) {
  if (loading) return <p role="status" className="py-6 text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p role="alert" className="py-6 text-sm text-destructive">Research could not be loaded. Please try again later.</p>;
  if (empty) return <p className="py-6 text-sm text-muted-foreground">No records yet.</p>;
  return null;
}

export default function Radar() {
  const { user } = useAuth();
  const profiles = useQuery({ queryKey: ['radar', user?.id, 'profiles'], queryFn: () => fetchRadarSources('niche_profile'), enabled: !!user });
  const dimensions = useQuery({ queryKey: ['radar', user?.id, 'dimensions'], queryFn: () => fetchRadarSources('radar_dimension'), enabled: !!user });
  const briefs = useQuery({ queryKey: ['radar', user?.id, 'briefs'], queryFn: fetchRadarBriefs, enabled: !!user });
  const runs = useQuery({ queryKey: ['radar', user?.id, 'runs'], queryFn: fetchRadarRuns, enabled: !!user });
  const groups = groupRadarBriefs(briefs.data ?? []);

  return <div className="mx-auto max-w-7xl space-y-10 p-4 pb-24 md:p-6 md:pb-24">
    <header className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><RadarIcon className="h-6 w-6" /></div>
      <h1 className="text-3xl font-semibold md:text-4xl">Radar</h1>
    </header>

    <section aria-labelledby="radar-profiles" className="space-y-5">
      <h2 id="radar-profiles" className="flex items-center gap-3 text-2xl font-semibold md:text-3xl"><BookOpen className="h-6 w-6 shrink-0 text-primary" />Niche Profiles</h2>
      <SectionState loading={profiles.isLoading} error={profiles.isError} empty={!profiles.data?.length} />
      <div className="grid gap-4 lg:grid-cols-2">{profiles.data?.map(profile => <Card key={profile.id} className="min-w-0 border-t-2 border-t-primary">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium text-primary">{profile.venues?.name ?? '—'}</span><span className="text-muted-foreground">Updated {dateLabel(profile.updated_at)}</span></div>
          <h3 className="break-words text-xl font-semibold">{profile.title}</h3>
          <Summary text={profile.summary} /><ResearchLink url={profile.url}>Full research doc</ResearchLink>
        </CardContent>
      </Card>)}</div>
    </section>

    <section aria-labelledby="radar-dimensions" className="space-y-5 border-t border-border pt-8">
      <h2 id="radar-dimensions" className="flex items-center gap-3 text-2xl font-semibold md:text-3xl"><Library className="h-6 w-6 shrink-0 text-warning" />Dimension Library</h2>
      <SectionState loading={dimensions.isLoading} error={dimensions.isError} empty={!dimensions.data?.length} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dimensions.data?.map(dimension => {
        const shelf = radarShelf(dimension.title);
        return <Card key={dimension.id} className="min-w-0 bg-muted/40"><CardContent className="space-y-4 p-5">
          <Badge variant="outline" className={shelf === 'PROVEN' ? 'border-signal-green/30 bg-signal-green/10 text-signal-green' : shelf === 'EMERGING' ? 'border-warning/30 bg-warning/10 text-warning' : 'text-muted-foreground'}>{shelf}</Badge>
          <h3 className="break-words text-lg font-semibold">{dimension.title}</h3><Summary text={dimension.summary} /><ResearchLink url={dimension.url}>Evidence</ResearchLink>
        </CardContent></Card>;
      })}</div>
    </section>

    <section aria-labelledby="radar-briefs" className="space-y-5 border-t border-border pt-8">
      <h2 id="radar-briefs" className="flex items-center gap-3 text-2xl font-semibold md:text-3xl"><Lightbulb className="h-6 w-6 shrink-0 text-primary" />Radar Briefs</h2>
      <SectionState loading={briefs.isLoading} error={briefs.isError} empty={!briefs.data?.length} />
      {groups.map(group => <div key={group.id} className="space-y-4">
        <h3 className="break-words border-b border-border pb-3 text-xl font-semibold">{group.brand}</h3>
        <div className="grid gap-4 lg:grid-cols-2">{group.items.map(brief => <Card key={brief.id} className="min-w-0"><CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-4">
            <div className="w-16 shrink-0 text-center"><div className="text-4xl font-semibold tabular-nums text-primary md:text-5xl">{brief.idea_score ?? '—'}</div><div className="mt-1 text-xs text-muted-foreground">Idea score</div></div>
            <div className="min-w-0 space-y-2"><h4 className="break-words text-xl font-semibold">{brief.title}</h4><Badge variant="secondary">{brief.stage || '—'}</Badge></div>
          </div>
          <dl className="space-y-3 text-sm"><div><dt className="font-medium">Hook</dt><dd className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{brief.hook || '—'}</dd></div><div><dt className="font-medium">Primary keyword</dt><dd className="mt-1 break-words text-muted-foreground">{brief.primary_keyword || '—'}</dd></div></dl>
          <div className="border-t border-border pt-3"><p className="mb-2 text-sm font-medium">Evidence</p><ul className="space-y-2 text-sm leading-5 text-muted-foreground">{radarEvidence(brief.idea_evidence).map((entry, i) => <li key={i} className="break-words">{entry.url ? <a href={entry.url} target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-4 hover:text-primary">{entry.note}</a> : entry.note}</li>)}</ul>{!radarEvidence(brief.idea_evidence).length && <p className="text-sm text-muted-foreground">—</p>}</div>
        </CardContent></Card>)}</div>
      </div>)}
    </section>

    <section aria-labelledby="radar-runs" className="space-y-5 border-t border-border pt-8">
      <h2 id="radar-runs" className="flex items-center gap-3 text-2xl font-semibold md:text-3xl"><History className="h-6 w-6 shrink-0 text-muted-foreground" />Run Log</h2>
      <SectionState loading={runs.isLoading} error={runs.isError} empty={!runs.data?.length} />
      {Boolean(runs.data?.length) && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr>{['Brand', 'Completed', 'Items fetched', 'Status'].map(label => <th key={label} scope="col" className="px-2 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{runs.data?.map(run => <tr key={run.id}><th scope="row" className="px-2 py-4 font-medium">{run.venues?.name ?? '—'}</th><td className="px-2 py-4">{dateLabel(run.completed_at, true)}</td><td className="px-2 py-4 tabular-nums">{run.items_fetched ?? '—'}</td><td className="px-2 py-4"><Badge variant="outline">{run.status || '—'}</Badge></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}