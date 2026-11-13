import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandChannels, useBrandKitAssetsView, useProjectProducts } from '@/hooks/useBrandWorkspace';
import { useBusinessPath } from '@/hooks/useBusinessPath';
import { useFoundationScores } from '@/components/foundation-audit/useFoundationScores';
import { platformLabel } from '@/lib/ownerWork';
import { dependencyFinished, displayTitle, firstDue, ownerLabel, type TeamStep, type TeamViewer } from '@/lib/brandTeam';
import { BrandProductPlans } from './BrandProductPlans';
import { BrandRevenueOpportunities } from './BrandRevenueOpportunities';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';

export function BrandTeamAbout({ projectId, goal, steps, viewer, inactive, go }: {
  projectId: string; goal: string | null; steps: TeamStep[]; viewer: TeamViewer;
  inactive: Set<string>; go: (view: string) => void;
}) {
  const path = useBusinessPath(projectId);
  const channels = useBrandChannels(projectId);
  const assets = useBrandKitAssetsView(projectId);
  const products = useProjectProducts(projectId);
  const foundation = useFoundationScores(projectId);
  const [expanded, setExpanded] = useState(false);
  const voice = useQuery({ queryKey: ['brand-team-voice', projectId], queryFn: async () => {
    const { data, error } = await supabase.from('brand_kits').select('brand_voice,bio_short,do_notes,dont_notes')
      .eq('project_id', projectId).eq('archived', false).maybeSingle();
    if (error) throw error;
    return data;
  } });
  const p = path.data;
  const settings = p?.settings;
  const open = steps.filter(s => s.status === 'Open' && s.approval_status !== 'Rejected');
  const byId = new Map(steps.map(s => [s.id, s]));
  const owners = [...new Set(open.map(s => ownerLabel(s, viewer)))];
  const lanes = (foundation.result?.categories ?? []).flatMap((c: any) => c.items ?? []).filter((item: any) => String(item.item_key).startsWith('lane_'));
  const hasVoice = !!(voice.data?.brand_voice || voice.data?.do_notes || voice.data?.dont_notes);
  const hasTarget = settings?.money_goal != null || settings?.hours_per_week != null;
  const gaps = [!goal && 'the goal', path.isSuccess && !hasTarget && 'the target', path.isSuccess && !p?.stages.length && 'where it is',
    !foundation.isLoading && !foundation.error && !lanes.length && 'how it makes money', products.isSuccess && !products.data?.length && 'what it sells',
    channels.isSuccess && !channels.data?.length && 'where it lives', !owners.length && 'who does what', voice.isSuccess && !hasVoice && 'how it sounds',
    assets.isSuccess && !assets.data?.links.length && 'useful links'].filter(Boolean);
  return <div className="space-y-8 divide-y [&>section]:pt-6">
    {goal && <section className="space-y-3"><h2 className="text-xl font-semibold">The goal</h2><p className="whitespace-pre-wrap">{goal}</p></section>}
    {hasTarget && <section className="space-y-3"><h2 className="text-xl font-semibold">The target</h2><div className="grid sm:grid-cols-2 gap-3">
      {settings?.money_goal != null && <Card className="p-4"><p className="text-muted-foreground">Money goal</p><p className="font-semibold break-words">{settings.money_goal}</p></Card>}
      {settings?.hours_per_week != null && <Card className="p-4"><p className="text-muted-foreground">Hours per week</p><p className="font-semibold">{settings.hours_per_week}</p></Card>}
    </div></section>}
    {!!p?.stages.length && <section className="space-y-3"><h2 className="text-xl font-semibold">Where it is</h2>
      <p className="font-medium">{p.current ? `Stage ${p.current.number} of 8 · ${p.current.name}` : 'All stages done'}</p>
      <Progress value={p.total ? p.done / p.total * 100 : 0} aria-label={`${p.done} of ${p.total} steps done`} /><p>{p.done} of {p.total} steps done</p>
      {p.current?.done_when && <p className="whitespace-pre-wrap">Done when: {p.current.done_when}</p>}
      <Button variant="outline" className="min-h-11" onClick={() => go('path')}>See the whole map</Button>
    </section>}
    <BrandRevenueOpportunities projectId={projectId} readOnly />
    <BrandProductPlans projectId={projectId} readOnly />
    {!!channels.data?.length && <section className="space-y-3"><h2 className="text-xl font-semibold">Where it lives</h2>{channels.data.map(c => <div key={c.id} className="border-b py-3 space-y-1">
      <p className="font-medium">{platformLabel(c.platform)}{c.handle ? ` · ${c.handle}` : ''}</p><p className="text-muted-foreground">{c.followers == null ? '—' : c.followers.toLocaleString()} followers · {c.status.replace(/_/g, ' ')}</p>
      {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-primary underline">Open account<ExternalLink className="h-4 w-4" /></a>}
    </div>)}</section>}
    {!!owners.length && <section className="space-y-3"><h2 className="text-xl font-semibold">Who does what</h2>{owners.map(label => {
      const owned = open.filter(s => ownerLabel(s, viewer) === label);
      const next = firstDue(owned.filter(s => (s.approval_status === 'Approved' || s.approval_status === 'Auto') && dependencyFinished(s, byId) && (!s.job_id || !inactive.has(s.job_id))));
      return <div key={label} className="border-b py-3"><p className="font-medium">{label} · {owned.length} open steps</p>{next && <p className="text-muted-foreground">Next: {displayTitle(next)}</p>}</div>;
    })}</section>}
    {hasVoice && <section className="space-y-3"><h2 className="text-xl font-semibold">How it sounds</h2>
      {voice.data?.brand_voice && <><p className="whitespace-pre-wrap">{expanded ? voice.data.brand_voice : voice.data.brand_voice.slice(0, 400)}{!expanded && voice.data.brand_voice.length > 400 ? '…' : ''}</p>
        {voice.data.brand_voice.length > 400 && <Button className="min-h-11" variant="ghost" onClick={() => setExpanded(v => !v)}>{expanded ? 'Read less' : 'Read more'}</Button>}</>}
      {voice.data?.do_notes && <p className="whitespace-pre-wrap"><strong>Do:</strong> {voice.data.do_notes}</p>}
      {voice.data?.dont_notes && <p className="whitespace-pre-wrap"><strong>Don't:</strong> {voice.data.dont_notes}</p>}
    </section>}
    {!!assets.data?.links.length && <section className="space-y-3"><h2 className="text-xl font-semibold">Useful links</h2>{assets.data.links.map((link: any) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 text-primary underline break-all">{link.label || link.url}<ExternalLink className="h-4 w-4 shrink-0" /></a>)}</section>}
    {(path.isError || channels.isError || assets.isError || products.isError || voice.isError || foundation.error) && <p role="alert">Some brand information could not be loaded. Unavailable sections are not counted as empty.</p>}
    {!!gaps.length && <p className="pt-4 text-muted-foreground">Not filled in yet: {gaps.join(', ')}.</p>}
  </div>;
}