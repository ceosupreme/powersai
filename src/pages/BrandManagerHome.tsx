import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CircleHelp, ClipboardList, Film, FolderOpen, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNextTen, type NextTenRow } from '@/hooks/useNextTen';
import { useBrandWorkSummary, useProjectJobs } from '@/hooks/useBrandWorkspace';
import { useContentItems, type ContentItem } from '@/hooks/useContentItems';
import { ContentItemDialog } from '@/components/content/ContentItemDialog';
import { AssetsTab } from '@/components/brand-workspace/BrandWorkspace';
import { GuidedTaskDialog } from '@/components/brand-workspace/GuidedTaskDialog';
import { pipelineHref } from '@/lib/ownerWork';
import { formatCurrency } from '@/utils/formatting';

export default function BrandManagerHome() {
  const { selectedBar, accessibleBars } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const id = selectedBar?.id || null;
  const name = selectedBar?.bar_name || 'Your brand';
  const section = params.get('tab') || 'today';
  const next = useNextTen(id, name);
  const summary = useBrandWorkSummary(id);
  const jobs = useProjectJobs(id);
  const posts = useContentItems(id);
  const [openedStep, setOpenedStep] = useState<NextTenRow | null>(null);
  const [editingPost, setEditingPost] = useState<ContentItem | null>(null);
  const [postDialog, setPostDialog] = useState(false);

  const actions = (next.data?.rows ?? []).filter((row) => row.source === 'Action');
  const first = actions[0];
  const upcoming = actions.slice(1, 4);
  const availableJobs = (jobs.data ?? []).filter((j) => j.status !== 'finished');

  const go = (tab: string) => {
    const p = new URLSearchParams(params);
    if (tab === 'today') p.delete('tab');
    else p.set('tab', tab);
    setParams(p);
  };
  const begin = (row: NextTenRow) => {
    if (row.jobId) navigate(pipelineHref(row.projectId, row.jobId));
    else if (row.source === 'Action') setOpenedStep(row);
    else if (row.source === 'Lane') navigate(`/project/${row.projectId}?tab=avenues`);
    else if (row.source === 'Product') navigate(`/project/${row.projectId}?tab=products`);
  };

  if (!id) {
    return <Card><CardHeader><CardTitle>Welcome to Supreme Team HQ</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>{accessibleBars.length === 0
          ? 'No brand has been assigned to your account yet. Ask your administrator to grant access before starting work.'
          : 'Choose your brand at the top to see its plan.'}</p>
        <p className="text-muted-foreground">No business data is shown until an authorized brand is selected.</p>
      </CardContent>
    </Card>;
  }

  return <div className="space-y-5">
    <header className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-primary">{name}</p>
      <h1 className="text-2xl sm:text-3xl font-bold">{section === 'plan' ? 'My plan' : section === 'posts' ? 'Posts and videos' : section === 'files' ? 'Files' : 'Today'}</h1>
      <p className="text-sm text-muted-foreground">
        {section === 'plan' ? 'The work underway, what comes next, and the steps you can complete.' :
          section === 'posts' ? 'Create and update content. An HQ stage is not proof a social platform published it.' :
          section === 'files' ? 'Your brand documents, assets and useful links.' :
          'Your top actionable priority and the work coming next.'}
      </p>
    </header>
    {section === 'today' && <>
      {next.isError && <p role="alert" className="text-sm text-destructive">Your priority list could not be loaded. <Button variant="link" onClick={() => next.refetch()}>Try again</Button></p>}
      <Card className="border-primary/40">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Your next step</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {next.isLoading ? <p className="text-sm">Looking up your next task…</p> :
            first ? <>
              <h2 className="text-xl font-semibold">{first.step}</h2>
              <p className="text-sm text-muted-foreground">{first.note || 'Open the step to see its instructions and expected result.'}</p>
              {first.dueDate && <p className="text-xs text-muted-foreground">Due {first.dueDate.slice(0, 10)}</p>}
              <Button onClick={() => begin(first)}>Start this step <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </> :
            <div className="space-y-2 text-sm">
              <p>No actionable steps are available from the sources checked.</p>
              {!!next.data?.unavailable.length && <p className="text-amber-600">Some sources could not be checked: {next.data.unavailable.join(', ')}.</p>}
              <Button variant="outline" onClick={() => go('plan')}>Review my plan</Button>
            </div>}
        </CardContent>
      </Card>
      {upcoming.length > 0 && <Card><CardHeader><CardTitle className="text-base">Coming up</CardTitle></CardHeader><CardContent className="divide-y">
        {upcoming.map((r) => <div key={r.key} className="flex items-start justify-between gap-3 py-3">
          <div><p className="text-sm font-medium">{r.step}</p><p className="text-xs text-muted-foreground">{r.note || 'Next action'}</p></div>
          <Button size="sm" variant="outline" onClick={() => begin(r)}>Open</Button>
        </div>)}
      </CardContent></Card>}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Recorded revenue this month', value: summary.data?.revenueMonth == null ? '—' : formatCurrency(summary.data.revenueMonth) },
          { label: 'Audience followers on file', value: summary.data?.followers == null ? '—' : summary.data.followers.toLocaleString() },
          { label: 'Published this month', value: summary.data?.publishedThisMonth == null ? '—' : String(summary.data.publishedThisMonth) },
        ].map((stat) => <Card key={stat.label} className="p-3"><p className="text-lg font-semibold tabular-nums break-words">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.label}</p></Card>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => go('plan')}><ClipboardList className="h-4 w-4 mr-2" />My plan</Button>
        <Button variant="outline" onClick={() => go('posts')}><Film className="h-4 w-4 mr-2" />Posts and videos</Button>
      </div>
    </>}
    {section === 'plan' && <>
      <Card><CardHeader><CardTitle className="text-base">Work in progress</CardTitle></CardHeader><CardContent className="space-y-3">
        {jobs.isLoading ? <p className="text-sm">Loading plans…</p> : jobs.isError ? <p role="alert" className="text-destructive text-sm">Plans could not be loaded. <Button variant="link" onClick={() => jobs.refetch()}>Try again</Button></p> :
          availableJobs.length === 0 ? <p className="text-sm text-muted-foreground">No active plans on this brand.</p> :
          availableJobs.map((j) => <Link key={j.id} to={pipelineHref(id,j.id)}
            className="flex justify-between gap-3 rounded-lg border p-3 hover:border-primary">
            <div><p className="font-medium text-sm">{j.title}</p><p className="text-xs text-muted-foreground">Status: {j.status === 'parked' ? 'Paused' : 'In progress'}</p></div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </Link>)}
      </CardContent></Card>
      {actions.length > 0 && <Card><CardHeader><CardTitle className="text-base">Your next actionable steps</CardTitle></CardHeader><CardContent className="space-y-2">
        {actions.map((row) => <div key={row.key} className="flex items-start gap-3 justify-between border-b pb-3 last:border-0">
          <div className="min-w-0"><p className="text-sm font-medium">{row.step}</p><p className="text-xs text-muted-foreground">{row.note || 'View instructions and finish the step'}</p></div>
          <Button variant="outline" size="sm" onClick={() => begin(row)}>Start</Button>
        </div>)}
      </CardContent></Card>}
    </>}
    {section === 'posts' && <>
      <div className="flex justify-end">
        <Button onClick={() => { setEditingPost(null); setPostDialog(true); }}><Plus className="h-4 w-4 mr-2" />New post or video</Button>
      </div>
      {posts.isLoading ? <p>Loading posts…</p> : posts.isError ? <p role="alert" className="text-sm text-destructive">Posts could not be loaded. <Button variant="link" onClick={() => posts.refetch()}>Try again</Button></p> :
        posts.data?.length ? <div className="space-y-3">
          {posts.data.map((post) => <Card key={post.id}><CardContent className="p-4 flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">{post.title}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline">{post.stage === 'scheduled' ? 'Scheduled in HQ — verify externally' : post.stage}</Badge><span>{post.format?.replace(/_/g,' ')}</span></div>
              {post.hook && <p className="text-sm text-muted-foreground line-clamp-2">{post.hook}</p>}
            </div>
            <Button size="sm" variant="outline" onClick={() => { setEditingPost(post); setPostDialog(true); }}>Open</Button>
          </CardContent></Card>)}
        </div> : <Card className="p-5 text-sm text-muted-foreground">No posts or videos are recorded for this brand yet.</Card>}
      <ContentItemDialog open={postDialog} onOpenChange={setPostDialog} projectId={id} item={editingPost} />
    </>}
    {section === 'files' && <AssetsTab projectId={id} />}
    {!['today','plan','posts','files'].includes(section) && <Card className="p-5">
      <p className="text-sm">This section is not recognized.</p>
      <Button variant="outline" onClick={() => go('today')}>Return to Today</Button>
    </Card>}
    <GuidedTaskDialog row={openedStep} onClose={() => setOpenedStep(null)} />
  </div>;
}
