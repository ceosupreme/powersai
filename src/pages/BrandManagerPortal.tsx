import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, ExternalLink, FileText, MessageCircle, Pencil, Plus, Target } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompleteNextTenRow } from '@/hooks/useNextTen';
import { useBrandKitAssetsView } from '@/hooks/useBrandWorkspace';
import { getSignedUrl } from '@/hooks/useBrandKit';
import { ContentWorkflowDialog } from '@/components/content/ContentWorkflowDialog';
import { BrandWeeklyNumbers } from '@/components/brand-workspace/BrandWeeklyNumbers';
import { BrandProductPlans } from '@/components/brand-workspace/BrandProductPlans';
import { BrandAccountSetup } from '@/components/brand-workspace/BrandAccountSetup';
import { BrandRevenueOpportunities } from '@/components/brand-workspace/BrandRevenueOpportunities';
import type { ManagedBrand } from '@/hooks/useBrandManagerProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Step = {
  id: string; title: string; detail: string | null; facts: string | null;
  status: string; approval_status: string | null; owner_kind: string | null;
  assignee: string | null; assignee_id: string | null; depends_on: string | null;
  job_id: string | null; step_order: number | null; due_date: string | null;
  estimated_minutes: number | null; priority: string | null; output_url: string | null; feedback_note: string | null;
};
type Job = { id: string; title: string; status: string; goal_text: string | null };
type Post = { id: string; title: string; stage: string; format: string | null; hook: string | null; cta: string | null; brief: unknown; due_date: string | null };
type BrandDocument = { id: string; title: string; summary: string | null; full_text: string | null; external_url: string | null; attachment_url: string | null; updated_at: string | null };
type PostDraft = { id: string; title: string; script: string; caption: string };

function factsObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { note: value }; }
  catch { return { note: value }; }
}
function briefObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Record<string, unknown>; }
    catch { return { summary: value }; }
  }
  return {};
}
function plain(value: unknown): string { return typeof value === 'string' ? value : ''; }
function dateLabel(value: string | null): string {
  if (!value) return 'No due date';
  const date = new Date(value.slice(0, 10) + 'T12:00:00');
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function pacificToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
function minutesFor(step: Step): number | null {
  if (step.estimated_minutes != null) return step.estimated_minutes;
  const match = step.title.match(/(?:about\s+)?(\d+)\s+minutes?\b/i);
  return match ? Number(match[1]) : null;
}
function dueText(value: string | null): string {
  if (!value) return 'No due date';
  return value.slice(0, 10) < pacificToday() ? `Overdue · ${dateLabel(value)}` : dateLabel(value);
}
function weekStart(value: string | null): string {
  if (!value) return 'undated';
  const date = new Date(value.slice(0, 10) + 'T12:00:00Z');
  if (!Number.isFinite(date.valueOf())) return 'undated';
  const back = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}
function weekLabel(value: string): string {
  if (value === 'undated') return 'No due date';
  const d = new Date(value + 'T12:00:00Z');
  return 'Week of ' + d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}
function chooseFirst(steps: Step[]): Step | undefined {
  return [...steps].sort((a, b) =>
    (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
    (a.priority ?? '').localeCompare(b.priority ?? '') ||
    (a.step_order ?? 9999) - (b.step_order ?? 9999)
  )[0];
}

export default function BrandManagerPortal({ brands }: { brands: ManagedBrand[] }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const complete = useCompleteNextTenRow();
  const [params, setParams] = useSearchParams();
  const brand = brands.find((b) => b.id === params.get('brand')) ?? brands[0];
  const view = params.get('view') ?? 'today';
  const stepId = params.get('step');
  const postId = params.get('post');
  const docId = params.get('doc');
  const [helpKind, setHelpKind] = useState<'blocked' | 'change' | null>(null);
  const [helpNote, setHelpNote] = useState('');
  const [helpBusy, setHelpBusy] = useState(false);
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null);
  const [postBusy, setPostBusy] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostFormat, setNewPostFormat] = useState('short');
  const [newPostBusy, setNewPostBusy] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);

  const go = (nextView: string, extra: Record<string, string> = {}) => {
    const next = new URLSearchParams({ view: nextView, brand: brand.id, ...extra });
    setParams(next);
    setHelpKind(null);
    setHelpNote('');
  };
  const stepsQuery = useQuery({
    queryKey: ['brand-manager-steps', brand.id],
    queryFn: async (): Promise<Step[]> => {
      const { data, error } = await supabase.from('action_items')
        .select('id,title,detail,facts,status,approval_status,owner_kind,assignee,assignee_id,depends_on,job_id,step_order,due_date,estimated_minutes,priority,output_url,feedback_note')
        .or(`bar_id.eq.${brand.id},venue_id.eq.${brand.id}`)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Step[];
    },
  });
  const jobsQuery = useQuery({
    queryKey: ['brand-manager-jobs', brand.id],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await (supabase as any).from('production_jobs')
        .select('id,title,status,goal_text').eq('project_id', brand.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: view === 'plan' || view === 'today' || view === 'step',
  });
  const postsQuery = useQuery({
    queryKey: ['brand-manager-posts', brand.id],
    queryFn: async (): Promise<Post[]> => {
      const { data, error } = await (supabase as any).from('content_items')
        .select('id,title,stage,format,hook,cta,brief,due_date')
        .eq('project_id', brand.id).order('created_at', { ascending: false }).limit(150);
      if (error) throw error;
      return data ?? [];
    },
    enabled: view === 'posts',
  });
  const brandFiles = useBrandKitAssetsView(view === 'files' || view === 'step' ? brand.id : null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const openBrandFile = async (storagePath: string) => {
    setOpeningFile(storagePath);
    try {
      const url = await getSignedUrl(storagePath);
      if (!url || !/^https?:\/\//.test(url)) throw new Error('The file has no valid download link.');
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not open this file.');
    } finally { setOpeningFile(null); }
  };
  const docsQuery = useQuery({
    queryKey: ['brand-manager-docs', brand.id],
    queryFn: async (): Promise<BrandDocument[]> => {
      const { data, error } = await (supabase as any).from('knowledge_base')
        .select('id,title,summary,full_text,external_url,attachment_url,updated_at')
        .eq('venue_id', brand.id).eq('subcategory', 'document').order('title');
      if (error) throw error;
      return data ?? [];
    },
    enabled: view === 'files',
  });
  const numbers = useQuery({
    queryKey: ['brand-manager-numbers', brand.id],
    queryFn: async () => {
      const [channels, revenue] = await Promise.all([
        (supabase as any).from('brand_channels').select('followers').eq('project_id', brand.id),
        (supabase as any).from('channel_revenue').select('amount,period_month').eq('project_id', brand.id),
      ]);
      if (channels.error) throw channels.error;
      if (revenue.error) throw revenue.error;
      const month = pacificToday().slice(0, 7);
      const entries = (revenue.data ?? []).filter((r: any) => String(r.period_month ?? '').slice(0, 7) === month);
      return {
        followers: (channels.data ?? []).reduce((sum: number, r: any) => sum + (Number(r.followers) || 0), 0),
        revenue: entries.length ? entries.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0) : null,
      };
    },
    enabled: view === 'today',
  });

  const steps = stepsQuery.data ?? [];
  const byId = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps]);
  const fullName = (profile?.full_name ?? '').trim().toLowerCase();
  const mine = steps.filter(s => s.owner_kind === 'owner' && (
    s.assignee_id === user?.id || (!!fullName && s.assignee?.trim().toLowerCase() === fullName)
  ));
  const inactiveJobs = new Set((jobsQuery.data ?? [])
    .filter(j => j.status === 'parked' || j.status === 'finished').map(j => j.id));
  const pending = mine.filter(s => (!s.job_id || !inactiveJobs.has(s.job_id))
    && s.status !== 'Done' && s.approval_status !== 'Rejected');
  const eligible = pending.filter(s => s.approval_status === 'Approved' && (!s.depends_on || byId.get(s.depends_on)?.status === 'Done'));
  const nextStep = chooseFirst(eligible);
  const selectedStep = steps.find(s => s.id === stepId);
  const nextJob = jobsQuery.data?.find(j => j.id === nextStep?.job_id);
  const activeJob = jobsQuery.data?.find(j => j.id === selectedStep?.job_id);
  const selectedPost = postsQuery.data?.find(p => p.id === postId);
  const selectedDocument = docsQuery.data?.find(d => d.id === docId);
  const archivedStep = !!selectedStep?.job_id && inactiveJobs.has(selectedStep.job_id);
  const editableStep = !!selectedStep && !!user && !archivedStep && (selectedStep.assignee_id === user.id ||
    (!!fullName && selectedStep.assignee?.trim().toLowerCase() === fullName));

  useEffect(() => {
    setProgressNote(selectedStep?.feedback_note ?? '');
    setResultUrl(selectedStep?.output_url ?? '');
  }, [selectedStep?.id, selectedStep?.feedback_note, selectedStep?.output_url]);

  const saveProgress = async () => {
    if (!selectedStep || !editableStep) return toast.error('This task is not assigned to you.');
    if (resultUrl.trim()) {
      try {
        const url = new URL(resultUrl.trim());
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      } catch { return toast.error('Use a valid link starting with https:// or leave the result link empty.'); }
    }
    setSavingProgress(true);
    try {
      const { data, error } = await supabase.from('action_items')
        .update({ feedback_note: progressNote.trim() || null, output_url: resultUrl.trim() || null })
        .eq('id', selectedStep.id).or('bar_id.eq.' + brand.id + ',venue_id.eq.' + brand.id).select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Could not save progress for this task.');
      await stepsQuery.refetch();
      toast.success('Your progress is saved. This step is still open.');
    } catch (error: any) { toast.error(error?.message ?? 'Could not save your progress.'); }
    finally { setSavingProgress(false); }
  };

  const done = async (step: Step) => {
    if (step.job_id && inactiveJobs.has(step.job_id)) return toast.error('This plan is archived or finished; its steps are kept as history.');
    if (!user || step.assignee_id !== user.id && step.assignee?.trim().toLowerCase() !== fullName) return toast.error('This step is not assigned to you.');
    if (step.status === 'Done' || step.approval_status !== 'Approved' || (step.depends_on && byId.get(step.depends_on)?.status !== 'Done')) {
      return toast.error('This step is waiting for approval or an earlier step to finish.');
    }
    try {
      await complete.mutateAsync({ key: `action-${step.id}`, source: 'Action', refId: step.id, step: step.title, projectId: brand.id, projectName: brand.name, rank: 0 });
      const refreshed = await stepsQuery.refetch();
      const current = refreshed.data ?? [];
      const currentById = new Map(current.map(s => [s.id, s]));
      const candidates = current.filter(s =>
        s.status !== 'Done' && s.approval_status === 'Approved' &&
        s.owner_kind === 'owner' &&
        (s.assignee_id === user.id || (!!fullName && s.assignee?.trim().toLowerCase() === fullName)) &&
        (!s.depends_on || currentById.get(s.depends_on)?.status === 'Done')
      );
      const following = chooseFirst(candidates);
      if (following) {
        toast.success('Step completed. Opening your next available step.');
        go('step', { step: following.id });
      } else {
        toast.success('Step completed. No other steps are ready right now.');
        go('today');
      }
    } catch (error: any) { toast.error(error?.message ?? 'Could not save this step.'); }
  };

  const askForHelp = async () => {
    if (!user || !selectedStep || !helpKind || !helpNote.trim() || helpBusy) return;
    setHelpBusy(true);
    try {
      const { error } = await (supabase as any).from('action_items').insert({
        bar_id: brand.id, venue_id: brand.id,
        title: `${helpKind === 'blocked' ? 'Help needed' : 'Change requested'}: ${selectedStep.title}`,
        detail: helpNote.trim(), source: 'brand_help', status: 'Open',
        approval_status: 'Proposed', priority: 'P2-High', is_manual: true,
        owner_kind: 'owner', assignee: 'Allmighty', created_by_id: user.id,
        facts: JSON.stringify({ source_step_id: selectedStep.id, source_job_id: selectedStep.job_id, requested_by: user.id, request_kind: helpKind }),
      });
      if (error) throw error;
      toast.success('Your request is saved for administrator review.');
      setHelpKind(null); setHelpNote('');
      await qc.invalidateQueries({ queryKey: ['brand-manager-steps', brand.id] });
    } catch (error: any) { toast.error(error?.message ?? 'Could not save your request.'); }
    finally { setHelpBusy(false); }
  };

  const createPost = async () => {
    if (!user || !newPostTitle.trim() || newPostBusy) return;
    setNewPostBusy(true);
    try {
      const { data, error } = await (supabase as any).from('content_items')
        .insert({
          project_id: brand.id, title: newPostTitle.trim(), format: newPostFormat,
          stage: 'idea', purpose_type: 'teach', brief: {}, created_by: user.id,
        }).select('id').maybeSingle();
      if (error || !data?.id) throw error ?? new Error('The post could not be created.');
      setCreatingPost(false); setNewPostTitle('');
      await qc.invalidateQueries({ queryKey: ['brand-manager-posts', brand.id] });
      go('posts', { post: data.id });
      setSelectedWorkflow(data.id);
      toast.success('Post created. Start with the script, caption and files.');
    } catch (error: any) { toast.error(error?.message ?? 'Could not create a post.'); }
    finally { setNewPostBusy(false); }
  };

  const editPost = (post: Post) => {
    const b = briefObject(post.brief);
    setPostDraft({ id: post.id, title: post.title, script: plain(b.script), caption: plain(b.caption) });
  };
  const savePost = async () => {
    if (!postDraft || !selectedPost || !postDraft.title.trim() || postBusy) return;
    setPostBusy(true);
    try {
      const { data, error } = await (supabase as any).from('content_items')
        .update({ title: postDraft.title.trim(), brief: {
          ...briefObject(selectedPost.brief), script: postDraft.script, caption: postDraft.caption,
        }})
        .eq('id', postDraft.id).eq('project_id', brand.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This post is not available to edit.');
      setPostDraft(null);
      await qc.invalidateQueries({ queryKey: ['brand-manager-posts', brand.id] });
      toast.success('Post saved.');
    } catch (error: any) { toast.error(error?.message ?? 'Could not save this post.'); }
    finally { setPostBusy(false); }
  };

  if (stepsQuery.isLoading) return <p role="status">Loading your brand work…</p>;
  if (stepsQuery.isError) return <Card className="p-5 space-y-3"><p role="alert">We could not load your brand tasks.</p><Button onClick={() => stepsQuery.refetch()}>Try again</Button></Card>;

  return <div className="space-y-6">
    <header className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground">Your current brand</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{brand.name}</h1>
        </div>
        {brands.length > 1 && <label className="text-sm">Switch brand
          <select className="ml-2 rounded-md border bg-background px-3 py-2" value={brand.id}
            onChange={e => { const chosen = brands.find(b => b.id === e.target.value); if(chosen) go('today', {brand: chosen.id}); }}>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>}
      </div>
      {brand.north_star && <p className="flex items-start gap-2 text-sm text-muted-foreground"><Target className="h-4 w-4 mt-0.5 shrink-0" /> Goal: {brand.north_star}</p>}
    </header>

    {view === 'today' && <>
      <Card className="border-primary/40">
        <CardHeader><CardTitle className="text-lg">Your next step</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {nextStep ? <>
            <div>
              <p className="text-lg font-semibold">{nextStep.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plain(factsObject(nextStep.facts).why) ||
                (nextStep.detail ? nextStep.detail.slice(0, 220) + (nextStep.detail.length > 220 ? '…' : '') :
                  'Open this step for its instructions and expected result.')}</p>
              {nextJob?.goal_text && <p className="mt-2 text-sm"><strong>Business result:</strong> {nextJob.goal_text}</p>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex gap-1 items-center"><Clock3 className="h-4 w-4" />{minutesFor(nextStep) == null ? 'Time not estimated' : `About ${minutesFor(nextStep)} minutes`}</span>
              <span>Due: {dueText(nextStep.due_date)}</span>
            </div>
            <Button onClick={() => go('step', {step: nextStep.id})}>Start this step <ArrowRight className="h-4 w-4 ml-2"/></Button>
          </> : <div className="space-y-2">
            <p className="font-medium">No steps are ready for you right now.</p>
            <p className="text-sm text-muted-foreground">{pending.length ? 'Some steps are waiting on earlier work or approval. Check My plan to see what is pending.' : 'No work is assigned to you at the moment. Your plan will appear here when it is assigned.'}</p>
            <Button variant="outline" onClick={() => go('plan')}>Review My plan</Button>
          </div>}
        </CardContent>
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Coming up</h2>
        {eligible.filter(s => s.id !== nextStep?.id).length
          ? eligible.filter(s => s.id !== nextStep?.id).slice(0, 3).map(s => <Card key={s.id} className="p-4 flex items-center justify-between gap-3">
              <div><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{dueText(s.due_date)}</p></div>
              <Button size="sm" variant="outline" onClick={() => go('step', {step: s.id})}>Open</Button>
            </Card>)
          : <p className="text-sm text-muted-foreground">No additional ready steps. Your next tasks will appear here.</p>}
      </section>
      <section className="grid grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-xl font-semibold">{numbers.isError ? '—' : numbers.data?.followers.toLocaleString() ?? '—'}</p><p className="text-xs text-muted-foreground">Followers recorded</p></Card>
        <Card className="p-3"><p className="text-xl font-semibold">{numbers.isError ? '—' : numbers.data?.revenue == null ? '—' : `$${numbers.data.revenue.toLocaleString()}`}</p><p className="text-xs text-muted-foreground">Revenue recorded this month</p></Card>
        <Card className="p-3"><p className="text-xl font-semibold">{mine.filter(s => s.status === 'Done').length}</p><p className="text-xs text-muted-foreground">Steps completed (all time)</p></Card>
      </section>
      <BrandWeeklyNumbers projectId={brand.id} />
    </>}

    {view === 'step' && <section className="space-y-4">
      <Button variant="outline" size="sm" onClick={() => go('plan')}><ArrowLeft className="h-4 w-4 mr-2"/>My plan</Button>
      {!selectedStep ? <Card className="p-5"><p role="alert">This step was not found in your brand. It may have been reassigned.</p></Card> : <>
        <div>
          <p className="text-sm text-muted-foreground">Step {selectedStep.step_order ?? '—'} · {dueText(selectedStep.due_date)}</p>
          <h2 className="text-2xl font-bold mt-1">{selectedStep.title}</h2>
          {plain(factsObject(selectedStep.facts).why) && <p className="mt-2 text-sm text-muted-foreground">
            <strong>Why this matters:</strong> {plain(factsObject(selectedStep.facts).why)}
          </p>}
          {activeJob?.goal_text && <p className="mt-2 text-sm text-muted-foreground"><strong>Business goal:</strong> {activeJob.goal_text}</p>}
        </div>
        {archivedStep && <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">This plan is archived or finished. Its history is preserved, but you cannot complete new work in this plan.</p>}
        <Card><CardHeader><CardTitle className="text-base">What to do</CardTitle></CardHeader><CardContent className="space-y-3">
          {selectedStep.detail
            ? <p className="whitespace-pre-wrap leading-relaxed">{selectedStep.detail}</p>
            : <p className="text-sm text-muted-foreground">Detailed instructions have not been added. You can request clarification below.</p>}
          {selectedStep.due_date && dueText(selectedStep.due_date).startsWith('Overdue') && <p className="text-xs text-amber-700 dark:text-amber-300">This task is overdue. Its instructions may refer to an older plan or menu. Review before completing it, or request an update.</p>}
          {plain(factsObject(selectedStep.facts).expected_output) && <div className="rounded-md bg-muted p-3"><p className="font-medium text-sm">What you should have when finished</p><p className="text-sm mt-1">{plain(factsObject(selectedStep.facts).expected_output)}</p></div>}
          {Array.isArray(factsObject(selectedStep.facts).checks) && (factsObject(selectedStep.facts).checks as unknown[]).length > 0 && <div><p className="font-medium text-sm">Before you finish, check:</p><ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            {(factsObject(selectedStep.facts).checks as unknown[]).map((c,i) => <li key={i}>{String(c)}</li>)}
          </ul></div>}
          {selectedStep.output_url && <a className="inline-flex gap-1 items-center text-primary underline text-sm" href={selectedStep.output_url} target="_blank" rel="noreferrer">Open the work or result <ExternalLink className="h-4 w-4"/></a>}
          {(brandFiles.data?.links ?? []).filter((l: any) =>
            String(l.category).toLowerCase() === 'workspace' && /^https?:\/\//.test(l.url ?? '')
          ).length > 0 && <div className="space-y-2">
            <p className="font-semibold text-sm">Upload or find the files for this step</p>
            {(brandFiles.data?.links ?? []).filter((l: any) =>
              String(l.category).toLowerCase() === 'workspace' && /^https?:\/\//.test(l.url ?? '')
            ).map((l: any) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline mr-3">
              {l.label || 'Open work folder'} <ExternalLink className="h-4 w-4"/>
            </a>)}
            <p className="text-xs text-muted-foreground">Upload in the linked workspace, then paste the file's link in Save your progress below.</p>
          </div>}
        </CardContent></Card>
        <Card className="p-4 space-y-3">
          <div><h3 className="font-semibold">Save your progress</h3>
            <p className="text-xs text-muted-foreground">Keep notes and a link to your work without finishing the step. Your notes stay with this task.</p></div>
          <label className="block space-y-1"><span className="text-sm font-medium">Work notes</span>
            <Textarea rows={3} value={progressNote} onChange={e => setProgressNote(e.target.value)} placeholder="What you've completed, what remains, or what you need…" />
          </label>
          <label className="block space-y-1"><span className="text-sm font-medium">Link to your work (optional)</span>
            <Input type="url" value={resultUrl} onChange={e => setResultUrl(e.target.value)} placeholder="https://…"/>
          </label>
          <Button variant="outline" disabled={savingProgress || !editableStep} onClick={saveProgress}>Save progress (keep step open)</Button>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!editableStep || savingProgress || complete.isPending || selectedStep.status === 'Done' || selectedStep.approval_status !== 'Approved' ||
               (!!selectedStep.depends_on && byId.get(selectedStep.depends_on)?.status !== 'Done')}
            onClick={() => done(selectedStep)}><CheckCircle2 className="h-4 w-4 mr-2"/>All done — next step</Button>
          <Button variant="outline" onClick={() => setHelpKind('blocked')}>I'm stuck</Button>
          <Button variant="outline" onClick={() => setHelpKind('change')}>Something needs changing</Button>
        </div>
        {!archivedStep && selectedStep.status !== 'Done' && <p className="text-sm text-muted-foreground">
          <strong>What happens next:</strong> When you mark this step done, HQ saves the completion
          and opens the next available step assigned to you. If nothing is ready, you return to Today.
        </p>}
        {helpKind && <Card className="p-4 space-y-3">
          <p className="font-medium">{helpKind === 'blocked' ? 'What is stopping you?' : 'What needs to be changed?'}</p>
          <Textarea value={helpNote} onChange={e => setHelpNote(e.target.value)} rows={3} placeholder="Describe what you need…" />
          <div className="flex gap-2"><Button disabled={!helpNote.trim() || helpBusy} onClick={askForHelp}><MessageCircle className="h-4 w-4 mr-2"/>Save request</Button><Button variant="ghost" onClick={() => setHelpKind(null)}>Cancel</Button></div>
        </Card>}
        {selectedStep.status === 'Done' && <p className="inline-flex gap-2 items-center text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4"/>Already completed</p>}
      </>}
    </section>}

    {view === 'plan' && <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">My plan</h2><p className="text-sm text-muted-foreground">Your assigned steps, grouped by work plan and week. Open any step for instructions, saved notes and next actions.</p></div>
      {jobsQuery.isError && <p role="alert">Plans could not be loaded. <Button variant="link" onClick={() => jobsQuery.refetch()}>Try again</Button></p>}
      {mine.length === 0 ? <Card className="p-5"><p>No steps are currently assigned to you.</p></Card> : <>
        {Array.from(new Set(mine.map(s => s.job_id ?? 'other'))).map(group => {
          const items = mine.filter(s => (s.job_id ?? 'other') === group).sort((a,b) => (a.step_order ?? 999) - (b.step_order ?? 999));
          const job = jobsQuery.data?.find(j => j.id === group);
          const weeks = [...new Set(items.map(s => weekStart(s.due_date)))].sort((a,b) => a === 'undated' ? 1 : b === 'undated' ? -1 : a.localeCompare(b));
          return <Card key={group}><CardHeader>
            <CardTitle className="text-base">{job?.title ?? (group === 'other' ? 'Other assigned work' : 'Work plan')}</CardTitle>
            {job?.goal_text && <p className="text-sm text-muted-foreground">Business result: {job.goal_text}</p>}
            {(job?.status === 'parked' || job?.status === 'finished') && <p className="text-xs text-muted-foreground">This plan is {job.status === 'parked' ? 'archived' : 'finished'}. These steps remain visible as history.</p>}
          </CardHeader><CardContent className="space-y-4">
            {weeks.map(week => {
              const within = items.filter(s => weekStart(s.due_date) === week);
              return <section key={week} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 border-b pb-2">
                  <h3 className="text-sm font-semibold">{weekLabel(week)}</h3>
                  <span className="text-xs text-muted-foreground">{within.filter(s => s.status === 'Done').length} of {within.length} done</span>
                </div>
                <div className="divide-y">{within.map(s => <button key={s.id} type="button" className="w-full text-left py-3 flex items-center justify-between gap-3 hover:text-primary" onClick={() => go('step',{step:s.id})}>
                  <span><span className="font-medium">{s.title}</span><span className="block text-xs text-muted-foreground">{dueText(s.due_date)}</span></span>
                  <span className="flex items-center gap-2 shrink-0">{s.status === 'Done' ? <CheckCircle2 className="h-4 w-4 text-green-600"/> : <Badge variant="outline">{s.approval_status !== 'Approved' ? 'Waiting for approval' : 'To do'}</Badge>}<ArrowRight className="h-4 w-4"/></span>
                </button>)}</div>
              </section>;
            })}
          </CardContent></Card>;
        })}
      </>}
      <BrandAccountSetup projectId={brand.id} />
      <BrandProductPlans projectId={brand.id} />
      <BrandRevenueOpportunities projectId={brand.id} />
    </section>}

    {view === 'posts' && <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Posts & videos</h2><p className="text-sm text-muted-foreground">Create a post or open a draft to work on its script, caption, files and scheduling record.</p></div>
        <Button onClick={() => setCreatingPost(v => !v)}><Plus className="h-4 w-4 mr-2"/>Create a post</Button>
      </div>
      {creatingPost && <Card className="p-4 space-y-3">
        <label className="block space-y-1"><span className="text-sm font-medium">What is this post about?</span>
          <Input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} placeholder="e.g. Three mistakes when planning a holiday party"/>
        </label>
        <label className="block space-y-1"><span className="text-sm font-medium">What are you making?</span>
          <select className="w-full rounded-md border bg-background px-3 py-2" value={newPostFormat} onChange={e => setNewPostFormat(e.target.value)}>
            <option value="short">Short video or Reel</option>
            <option value="long_form">Long video</option>
            <option value="post">Social post or graphic</option>
            <option value="article">Article or blog post</option>
            <option value="email">Email</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">This creates a draft in your brand only. It will not be published.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={newPostBusy || !newPostTitle.trim()} onClick={createPost}>Create draft and open</Button>
          <Button variant="ghost" onClick={() => setCreatingPost(false)}>Cancel</Button>
        </div>
      </Card>}
      {postsQuery.isLoading && <p>Loading posts…</p>}
      {postsQuery.isError && <p role="alert">Posts could not be loaded. <Button onClick={() => postsQuery.refetch()}>Try again</Button></p>}
      {selectedPost ? <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => {setPostDraft(null);go('posts');}}><ArrowLeft className="h-4 w-4 mr-1"/>All posts</Button>
        <Card><CardHeader><CardTitle>{selectedPost.title}</CardTitle></CardHeader><CardContent className="space-y-3">
          <Badge variant="outline">{selectedPost.stage}</Badge>
          {selectedPost.hook && <p><strong>Hook:</strong> {selectedPost.hook}</p>}
          {selectedPost.cta && <p><strong>Call to action:</strong> {selectedPost.cta}</p>}
          {plain(briefObject(selectedPost.brief).summary) && <p className="text-sm whitespace-pre-wrap">{plain(briefObject(selectedPost.brief).summary)}</p>}
          <div><p className="text-sm font-semibold">Script</p><p className="text-sm whitespace-pre-wrap mt-1">{plain(briefObject(selectedPost.brief).script) || 'No script saved yet.'}</p></div>
          <div><p className="text-sm font-semibold">Caption</p><p className="text-sm whitespace-pre-wrap mt-1">{plain(briefObject(selectedPost.brief).caption) || 'No caption saved yet.'}</p></div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setSelectedWorkflow(selectedPost.id)}>Open full post workflow</Button>
            <Button variant="outline" onClick={() => editPost(selectedPost)}><Pencil className="h-4 w-4 mr-2"/>Quick edit</Button>
          </div>
        </CardContent></Card>
        {postDraft && <Card className="p-4 space-y-3">
          <label className="block space-y-1"><span className="text-sm font-medium">Title</span><Input value={postDraft.title} onChange={e => setPostDraft({...postDraft,title:e.target.value})}/></label>
          <label className="block space-y-1"><span className="text-sm font-medium">Script</span><Textarea rows={8} value={postDraft.script} onChange={e => setPostDraft({...postDraft,script:e.target.value})}/></label>
          <label className="block space-y-1"><span className="text-sm font-medium">Caption</span><Textarea rows={4} value={postDraft.caption} onChange={e => setPostDraft({...postDraft,caption:e.target.value})}/></label>
          <div className="flex gap-2"><Button disabled={postBusy || !postDraft.title.trim()} onClick={savePost}>Save changes</Button><Button variant="ghost" onClick={() => setPostDraft(null)}>Cancel</Button></div>
        </Card>}
      </div> : postsQuery.data?.length ? <div className="grid sm:grid-cols-2 gap-3">{postsQuery.data.map(post => <button type="button" key={post.id} className="text-left p-4 rounded-lg border bg-card hover:border-primary" onClick={() => go('posts',{post:post.id})}>
        <p className="font-semibold">{post.title}</p><p className="text-xs text-muted-foreground mt-2">{post.stage} · {dateLabel(post.due_date)}</p>
        <span className="inline-flex items-center text-sm mt-3 text-primary">Open post <ArrowRight className="h-4 w-4 ml-1"/></span>
      </button>)}</div> : !postsQuery.isLoading && !postsQuery.isError && <Card className="p-5"><p>No posts or videos are recorded for this brand yet.</p></Card>}
      <p className="text-xs text-muted-foreground">Production stages describe the internal workflow. A Scheduled label alone does not confirm that a post was accepted by a publisher.</p>
    </section>}

    {view === 'files' && <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Files & documents</h2><p className="text-sm text-muted-foreground">Read this brand's reference documents without opening the full administrative library.</p></div>
      {brandFiles.isLoading && <p className="text-sm text-muted-foreground">Loading this brand's files and links…</p>}
      {brandFiles.isError && <p role="alert">Brand files could not be loaded. <Button variant="outline" size="sm" onClick={() => brandFiles.refetch()}>Try again</Button></p>}
      {(brandFiles.data?.links ?? []).length > 0 && <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Your useful links and upload folders</h3>
        <p className="text-xs text-muted-foreground">These are the brand's current saved links. Open them directly, rather than searching through old messages.</p>
        <div className="space-y-2">
          {(brandFiles.data?.links ?? []).filter((l: any) => /^https?:\/\//.test(l.url ?? '')).map((l: any) =>
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex justify-between gap-3 items-center border rounded-md p-3 text-sm text-primary hover:bg-muted/40">
              <span>{l.label || l.url}</span><ExternalLink className="h-4 w-4 shrink-0"/>
            </a>)}
        </div>
      </Card>}
      {(brandFiles.data?.assets ?? []).length > 0 && <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Saved brand files</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {(brandFiles.data?.assets ?? []).map((a: any) =>
            <button key={a.id} type="button" disabled={openingFile === a.storage_path}
              onClick={() => openBrandFile(a.storage_path)}
              className="text-left border rounded-md p-3 hover:border-primary">
              <span className="font-medium text-sm block">{a.file_name}</span>
              {a.description && <span className="text-xs block text-muted-foreground">{a.description}</span>}
              <span className="text-xs text-primary">{openingFile === a.storage_path ? 'Opening…' : 'Open saved file'}</span>
            </button>)}
        </div>
      </Card>}
      {docsQuery.isLoading && <p>Loading documents…</p>}
      {docsQuery.isError && <p role="alert">Documents could not be loaded. <Button onClick={() => docsQuery.refetch()}>Try again</Button></p>}
      {selectedDocument ? <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => go('files')}><ArrowLeft className="h-4 w-4 mr-1"/>All files</Button>
        <Card><CardHeader><CardTitle>{selectedDocument.title}</CardTitle></CardHeader><CardContent className="space-y-3">
          {selectedDocument.summary && <p className="text-sm text-muted-foreground">{selectedDocument.summary}</p>}
          {selectedDocument.full_text ? <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedDocument.full_text}</div>
            : <p className="text-sm text-muted-foreground">This record does not contain readable document text. Use the original link if one is available.</p>}
          {(selectedDocument.external_url || selectedDocument.attachment_url) && <a className="inline-flex gap-2 text-sm underline text-primary" href={(selectedDocument.external_url || selectedDocument.attachment_url)!} target="_blank" rel="noreferrer">Open original <ExternalLink className="h-4 w-4"/></a>}
        </CardContent></Card>
      </div> : docsQuery.data?.length ? <div className="space-y-2">{docsQuery.data.map(doc => <button key={doc.id} type="button" className="flex items-center gap-3 rounded-lg border w-full bg-card p-4 text-left hover:border-primary" onClick={() => go('files',{doc:doc.id})}>
        <FileText className="h-5 w-5 text-primary shrink-0"/><span className="flex-1"><span className="font-medium block">{doc.title}</span>{doc.summary && <span className="text-xs text-muted-foreground line-clamp-2">{doc.summary}</span>}</span><ArrowRight className="h-4 w-4"/>
      </button>)}</div> : !docsQuery.isLoading && !docsQuery.isError && <Card className="p-5"><p>No documents are available to this brand yet.</p></Card>}
    </section>}

    {!['today','step','plan','posts','files'].includes(view) && <Card className="p-5 flex items-center gap-3"><AlertCircle className="h-5 w-5"/><span>This section was not found.</span><Button variant="outline" onClick={() => go('today')}>Go to Today</Button></Card>}
    <ContentWorkflowDialog projectId={brand.id} itemId={selectedWorkflow} onClose={() => setSelectedWorkflow(null)} />
  </div>;
}
