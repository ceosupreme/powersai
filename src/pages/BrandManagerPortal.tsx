import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, ExternalLink, FileText, MessageCircle, Pencil, Plus, Target } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompleteNextTenRow } from '@/hooks/useNextTen';
import { useBrandKitAssetsView } from '@/hooks/useBrandWorkspace';
import { getSignedUrl } from '@/hooks/useBrandKit';
import { ContentWorkflowDialog } from '@/components/content/ContentWorkflowDialog';
import { BrandWeeklyNumbers } from '@/components/brand-workspace/BrandWeeklyNumbers';
import { BrandAccountSetup } from '@/components/brand-workspace/BrandAccountSetup';
import { BrandManagerFileUpload } from '@/components/brand-workspace/BrandManagerFileUpload';
import type { ManagedBrand } from '@/hooks/useBrandManagerProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BusinessPathTab, pathStageTitle } from '@/components/brand-workspace/BusinessPathTab';
import { useBusinessPath } from '@/hooks/useBusinessPath';
import { PATH_STATUSES, isPathDone } from '@/lib/businessPath';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BrandTeamAbout } from '@/components/brand-workspace/BrandTeamAbout';
import { assignedTo, ownerLabel, dependencyFinished, readyFor, teamStepState, orderedSteps, planPosition, teamPeople, defaultTeamViewer, weeklyCompletion, questionStatus, displayTitle, firstDue, minutesText } from '@/lib/brandTeam';
import { fetchAllPages } from '@/lib/batchFetch';

const PORTAL_TABS = [
  { key: 'today', label: 'Today' }, { key: 'about', label: 'About' }, { key: 'plan', label: 'My plan' },
  { key: 'posts', label: 'Posts & videos' }, { key: 'files', label: 'Files' },
] as const;

const TAB_LINES: Record<string, string> = { today: "Your next step, what's coming, and how the brand is doing.", about: "What this brand is, where it's going, how it earns and who does what.", plan: "Every step in order. Switch to Whole plan to see everyone's part.", posts: "Scripts, captions and drafts for this brand.", files: "Brand documents, links and uploads." };

type Step = {
  id: string; title: string; detail: string | null; facts: string | null;
  status: string; approval_status: string | null; owner_kind: string | null;
  assignee: string | null; assignee_id: string | null; depends_on: string | null;
  job_id: string | null; step_order: number | null; due_date: string | null;
  source: string | null; created_by_id: string | null; method_id: string | null; created_at: string; venue_id: string | null; bar_id: string | null;
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
  return firstDue(steps);
}
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    const overflowY = getComputedStyle(parent).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return null;
}

export default function BrandManagerPortal({ brands, preview = false }: { brands: ManagedBrand[]; preview?: boolean }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const complete = useCompleteNextTenRow();
  const [params, setParams] = useSearchParams();
  const brand = brands.find((b) => b.id === params.get('brand')) ?? brands[0];
  const view = params.get('view') ?? 'today';
  const businessPath = useBusinessPath(brand.id);
  const pathVisible = !!businessPath.data;
  const stageCount = businessPath.data?.stages.length ?? 0;
  const [wholePlan, setWholePlan] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
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
    const next = new URLSearchParams({ view: nextView, brand: brand.id, ...(preview ? { team_view: '1', as: params.get('as') ?? '' } : {}), ...extra });
    setParams(next);
    setHelpKind(null);
    setHelpNote('');
  };
  const stepsQuery = useQuery({
    queryKey: ['brand-manager-steps', brand.id],
    queryFn: async (): Promise<Step[]> => {
      return fetchAllPages<Step>(() => supabase.from('action_items')
        .select('id,title,detail,facts,status,approval_status,owner_kind,assignee,assignee_id,depends_on,job_id,step_order,due_date,estimated_minutes,priority,output_url,feedback_note,source,created_by_id,method_id,created_at,venue_id,bar_id', { count: 'exact' })
        .or(`bar_id.eq.${brand.id},venue_id.eq.${brand.id}`)
        .order('due_date', { ascending: true, nullsFirst: false }));
    },
  });
  const jobsQuery = useQuery({
    queryKey: ['brand-manager-jobs', brand.id],
    queryFn: async (): Promise<Job[]> => {
      return fetchAllPages<Job>(() => supabase.from('production_jobs')
        .select('id,title,status,goal_text', { count: 'exact' }).eq('project_id', brand.id).order('created_at', { ascending: false }));
    },
    enabled: true,
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
  const brandFiles = useBrandKitAssetsView(view === 'files' || view === 'step' || view === 'about' ? brand.id : null);
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
  const signedInViewer = { id: user?.id ?? null, name: profile?.full_name ?? '' };
  const previewViewer = defaultTeamViewer(steps, signedInViewer, params.get('as'));
  const viewer = preview ? previewViewer : signedInViewer;
  const label = (step: Step) => ownerLabel(step, viewer);
  const mine = steps.filter(s => assignedTo(s, viewer));
  const inactiveJobs = new Set((jobsQuery.data ?? [])
    .filter(j => j.status === 'parked' || j.status === 'finished').map(j => j.id));
  const pending = mine.filter(s => (!s.job_id || !inactiveJobs.has(s.job_id))
    && s.status !== 'Done' && s.approval_status !== 'Rejected');
  const eligible = jobsQuery.isSuccess ? pending.filter(s => readyFor(s, viewer, byId, inactiveJobs)) : [];
  const nextStep = chooseFirst(eligible);
  const selectedStep = steps.find(s => s.id === stepId);
  const nextJob = jobsQuery.data?.find(j => j.id === nextStep?.job_id);
  const activeJob = jobsQuery.data?.find(j => j.id === selectedStep?.job_id);
  const selectedPost = postsQuery.data?.find(p => p.id === postId);
  const selectedDocument = docsQuery.data?.find(d => d.id === docId);
  const archivedStep = !!selectedStep?.job_id && inactiveJobs.has(selectedStep.job_id);
  const assignedStep = !!selectedStep && assignedTo(selectedStep, viewer);
  const editableStep = assignedStep && !preview && !archivedStep;
  const week = weeklyCompletion(steps, viewer);
  const dependents = (step: Step) => steps.filter(s => s.depends_on === step.id && s.status !== 'Done');
  const othersWaiting = (step: Step) => dependents(step).filter(s => !assignedTo(s, viewer));
  const ownFollowUp = (step: Step): Step | undefined => dependents(step).find(s => assignedTo(s, viewer));
  const samePlan = selectedStep?.job_id ? orderedSteps(steps.filter(s => s.job_id === selectedStep.job_id)) : [];
  const position = selectedStep ? planPosition(selectedStep, steps) : { position: 0, count: 0 };
  const followingStep = selectedStep ? samePlan[samePlan.findIndex(s => s.id === selectedStep.id) + 1] : undefined;
  const questions = steps.filter(s => s.source === 'brand_help' && !!viewer.id && s.created_by_id === viewer.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
  const method = useQuery({ queryKey: ['brand-team-method', selectedStep?.method_id], enabled: !!selectedStep?.method_id, queryFn: async () => {
    if (!selectedStep?.method_id) return null;
    const { data } = await supabase.from('knowledge_base').select('id,title,summary,full_text,external_url').eq('id', selectedStep.method_id).maybeSingle();
    return data;
  } });
  const brandIds = brands.map(b => b.id);
  const counts = useQuery({ queryKey: ['brand-team-ready-counts', brandIds], enabled: brands.length > 1, queryFn: async () => {
    const [actions, plans] = await Promise.all([
      supabase.from('action_items').select('id,title,status,approval_status,owner_kind,assignee,assignee_id,depends_on,job_id,step_order,due_date,venue_id,bar_id')
        .or(`venue_id.in.(${brandIds.join(',')}),bar_id.in.(${brandIds.join(',')})`),
      supabase.from('production_jobs').select('id,status,project_id').in('project_id', brandIds),
    ]);
    if (actions.error || plans.error) throw actions.error ?? plans.error;
    return { steps: actions.data ?? [], inactive: new Set((plans.data ?? []).filter(p => p.status === 'parked' || p.status === 'finished').map(p => p.id)) };
  } });
  useEffect(() => {
    if (!preview || !stepsQuery.isSuccess || params.get('as') === previewViewer.key) return;
    const next = new URLSearchParams(params); next.set('as', previewViewer.key); setParams(next, { replace: true });
  }, [preview, stepsQuery.isSuccess, previewViewer.key, params, setParams]);

  useEffect(() => {
    setProgressNote(selectedStep?.feedback_note ?? '');
    setResultUrl(selectedStep?.output_url ?? '');
  }, [selectedStep?.id, selectedStep?.feedback_note, selectedStep?.output_url]);

  // Opening a step, post, document or tab from lower on a screen starts the new screen at its top.
  const headerRef = useRef<HTMLElement>(null);
  const screenKey = [brand.id, view, stepId ?? '', postId ?? '', docId ?? '', params.get('path_step') ?? ''].join('|');
  const lastScreen = useRef(screenKey);
  useEffect(() => {
    if (lastScreen.current === screenKey) return;
    lastScreen.current = screenKey;
    const header = headerRef.current;
    if (!header) return;
    const parent = scrollParent(header);
    const past = header.getBoundingClientRect().bottom - (parent ? parent.getBoundingClientRect().top : 0);
    if (past >= 0) return;
    if (parent) parent.scrollBy({ top: past }); else window.scrollBy({ top: past });
  }, [screenKey]);

  const saveProgress = async () => {
    if (preview || !selectedStep || !editableStep) return toast.error('This step is not assigned to you.');
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
      if (error || !data) throw error ?? new Error('Could not save progress for this step.');
      await stepsQuery.refetch();
      toast.success('Your progress is saved. This step is still open.');
    } catch (error: any) { toast.error(error?.message ?? 'Could not save your progress.'); }
    finally { setSavingProgress(false); }
  };

  const done = async (step: Step) => {
    if (preview) return;
    if (step.job_id && inactiveJobs.has(step.job_id)) return toast.error('This plan is archived or finished; its steps are kept as history.');
    if (!user || !assignedTo(step, signedInViewer)) return toast.error('This step is not assigned to you.');
    if (step.status === 'Done' || step.approval_status !== 'Approved' || (step.depends_on && byId.get(step.depends_on)?.status !== 'Done')) {
      return toast.error('This step is waiting for approval or an earlier step to finish.');
    }
    try {
      await complete.mutateAsync({ key: `action-${step.id}`, source: 'Action', refId: step.id, step: step.title, projectId: brand.id, projectName: brand.name, rank: 0 });
      const [refreshed, updatedJobs] = await Promise.all([stepsQuery.refetch(), jobsQuery.refetch()]);
      await qc.invalidateQueries({ queryKey: ['brand-team-ready-counts'] });
      const current = refreshed.data ?? [];
      const latestInactiveJobs = new Set((updatedJobs.data ?? [])
        .filter(j => j.status === 'parked' || j.status === 'finished').map(j => j.id));
      const currentById = new Map(current.map(s => [s.id, s]));
      const candidates = current.filter(s =>
        (!s.job_id || !latestInactiveJobs.has(s.job_id)) &&
        s.status !== 'Done' && s.approval_status === 'Approved' &&
        assignedTo(s, signedInViewer) &&
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
    if (preview || !editableStep || !user || !selectedStep || !helpKind || !helpNote.trim() || helpBusy) return;
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
    if (preview || !user || !newPostTitle.trim() || newPostBusy) return;
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
    if (preview || !postDraft || !selectedPost || !postDraft.title.trim() || postBusy) return;
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
  if (stepsQuery.isError) return <Card className="p-5 space-y-3"><p role="alert">We could not load your brand steps.</p><Button onClick={() => stepsQuery.refetch()}>Try again</Button></Card>;

  return <div className="space-y-6 pb-24 text-base [&_.text-xs]:text-base [&_.text-sm]:text-base [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11 [&_p]:break-words">
    {preview && <section className="rounded-md border bg-muted p-4 space-y-3" aria-label="Team preview">
      <p className="font-semibold">Team view of {brand.name}. This is what a brand person sees.</p>
      <div className="space-y-2"><p id="viewing-as-label">Viewing as</p><Select value={previewViewer.key || 'none'} onValueChange={as => go(view, { as, ...(stepId ? { step: stepId } : {}) })}>
        <SelectTrigger aria-labelledby="viewing-as-label" className="min-h-11 w-full sm:w-72"><SelectValue placeholder="No assigned team members">{previewViewer.name || 'No assigned team members'}</SelectValue></SelectTrigger>
        <SelectContent>{teamPeople(steps).map(person => <SelectItem key={person.key} value={person.key}>{person.name}</SelectItem>)}{!previewViewer.key && <SelectItem value="none">{teamPeople(steps).length ? 'Choose a team member' : 'No assigned team members'}</SelectItem>}</SelectContent>
      </Select></div>
      <div className="flex gap-2 flex-wrap"><Button asChild variant="outline"><Link to="/workspace">Back to my dashboard</Link></Button><Button asChild variant="outline"><Link to={`/project/${brand.id}`}>Open brand page</Link></Button></div>
    </section>}
    <header ref={headerRef} className="space-y-2">
      <div className="flex items-center justify-between gap-x-3 gap-y-1 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Your current brand</p>
          <h1 className="text-2xl sm:text-3xl font-bold break-words">{brand.name}</h1>
        </div>
        <Button asChild size="sm" variant="ghost" className="min-h-11 shrink-0"><Link to={`/project/${brand.id}`}>Brand page <ExternalLink className="h-4 w-4 ml-1" /></Link></Button>
        {brands.length > 1 && <div className="flex flex-wrap gap-2 w-full" aria-label="Choose brand">{brands.map(b => {
          const all = counts.data?.steps ?? []; const by = new Map(all.map(s => [s.id, s]));
          const count = all.filter(s => (s.venue_id === b.id || s.bar_id === b.id) && readyFor(s, viewer, by, counts.data?.inactive ?? new Set())).length;
          return <Button key={b.id} className="min-h-11 h-auto whitespace-normal text-left" variant={b.id === brand.id ? 'default' : 'outline'} onClick={() => go('today', { brand: b.id })}>{b.name}{counts.isSuccess && count > 0 && <Badge variant="secondary" className="ml-2">{count}</Badge>}</Button>;
        })}{counts.isError && <p role="alert">Ready counts could not be loaded.</p>}</div>}
      </div>
      {brand.north_star && view !== 'about' && <div className="flex items-start gap-2 text-muted-foreground"><Target className="h-4 w-4 mt-1 shrink-0" /><div className="min-w-0">
        <p className={goalOpen ? '' : 'line-clamp-2'}>Goal: {brand.north_star}</p>
        {brand.north_star.length > 110 && <Button variant="link" className="h-auto p-0" aria-expanded={goalOpen} onClick={() => setGoalOpen(open => !open)}>{goalOpen ? 'Show less' : 'Show the full goal'}</Button>}
      </div></div>}
      <nav aria-label="Brand workspace views" className="flex flex-wrap gap-2 pt-2">
        {PORTAL_TABS.map(t => <Button key={t.key} type="button" size="sm" className="min-h-11"
          variant={view === t.key ? 'default' : 'outline'} aria-current={view === t.key ? 'page' : undefined}
          onClick={() => go(t.key)}>{t.label}</Button>)}
      </nav>
      {TAB_LINES[view] && <p className={`text-muted-foreground ${view === 'today' ? 'hidden sm:block' : ''}`}>{TAB_LINES[view]}</p>}
    </header>

    {view === 'today' && <>
      {jobsQuery.isError && <p role="alert">Plans could not be loaded. Ready steps cannot be confirmed.<Button variant="link" onClick={() => jobsQuery.refetch()}>Try again</Button></p>}
      <Card className="border-primary/40">
        <CardHeader><CardTitle className="text-lg">Your next step</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {nextStep ? <>
            <div>
              <p className="text-lg font-semibold">{displayTitle(nextStep)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plain(factsObject(nextStep.facts).why) ||
                (nextStep.detail ? nextStep.detail.slice(0, 220) + (nextStep.detail.length > 220 ? '…' : '') :
                  'Open this step for its instructions and expected result.')}</p>
              {nextJob?.goal_text && <p className="mt-2 text-sm"><strong>Business result:</strong> {nextJob.goal_text}</p>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex gap-1 items-center"><Clock3 className="h-4 w-4" />{minutesFor(nextStep) == null ? 'Time not estimated' : minutesText(minutesFor(nextStep) as number)}</span>
              <span>Due: {dueText(nextStep.due_date)}</span>
            </div>
            {othersWaiting(nextStep).length > 0 && <p className="text-muted-foreground"><strong>Waiting on this:</strong> {othersWaiting(nextStep).slice(0, 2).map(s => `${label(s)}: ${displayTitle(s)}`).join('; ')}</p>}
            {ownFollowUp(nextStep) && <p className="text-muted-foreground"><strong>Then you:</strong> {displayTitle(ownFollowUp(nextStep) as Step)}</p>}
            <Button onClick={() => go('step', {step: nextStep.id})}>Start this step <ArrowRight className="h-4 w-4 ml-2"/></Button>
          </> : <div className="space-y-2">
            <p className="font-medium">No steps are ready for you right now.</p>
            {pending.length ? <div className="space-y-2"><h3 className="font-semibold">What you're waiting on</h3>{pending.filter(s => !dependencyFinished(s, byId) || s.approval_status !== 'Approved').slice(0, 3).map(s => {
              const blocking = s.depends_on ? byId.get(s.depends_on) : undefined;
              return <Button key={s.id} variant="outline" className="w-full h-auto py-3 whitespace-normal justify-start text-left" onClick={() => go('step', { step: s.id })}>
                <span>{!dependencyFinished(s, byId) ? `Waiting on ${blocking ? label(blocking) : 'Not assigned'} to finish: ${blocking ? displayTitle(blocking) : 'Earlier step unavailable'}` : `Waiting for Allmighty to approve: ${displayTitle(s)}`}
                {blocking && <span className="block text-muted-foreground">{dueText(blocking.due_date)}</span>}</span>
              </Button>;
            })}</div> : <p className="text-muted-foreground">No work is assigned to you at the moment. Your plan will appear here when it is assigned.</p>}
            <Button variant="outline" onClick={() => go('plan')}>Review My plan</Button>
          </div>}
        </CardContent>
      </Card>
      <section className={`grid grid-cols-2 gap-2 ${businessPath.data ? 'sm:grid-cols-3' : ''}`} aria-label="Your progress">
        <Card className="p-3 space-y-1"><p className="text-muted-foreground leading-tight">This week</p><p className="text-lg font-semibold leading-tight">{week.done} of {week.total}</p><Progress className="h-1.5" value={week.total ? week.done / week.total * 100 : 0} aria-label={`${week.done} of ${week.total} steps done this week`} /></Card>
        <Card className="p-3 space-y-1"><p className="text-muted-foreground leading-tight">Ready now</p><p className="text-lg font-semibold leading-tight">{jobsQuery.isSuccess ? eligible.length : '—'}</p></Card>
        {businessPath.data && <Card className="col-span-2 sm:col-span-1 p-3 space-y-1">
          <p className="leading-tight"><span className="text-muted-foreground sm:block sm:mb-1">Stage </span><span className="text-lg font-semibold">{stageCount ? `${businessPath.data.current?.number ?? stageCount} of ${stageCount}` : '—'}</span>{stageCount > 0 && <span className="text-muted-foreground"> · {businessPath.data.current?.name ?? 'All stages done'}</span>}</p>
          <Progress className="h-1.5" value={businessPath.data.total ? businessPath.data.done / businessPath.data.total * 100 : 0} aria-label={`${businessPath.data.done} of ${businessPath.data.total} path steps done`} />
        </Card>}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Coming up</h2>
        {eligible.filter(s => s.id !== nextStep?.id).length
          ? eligible.filter(s => s.id !== nextStep?.id).slice(0, 3).map(s => <Card key={s.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-medium">{displayTitle(s)}</p><p className="text-xs text-muted-foreground">{dueText(s.due_date)}</p></div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => go('step', {step: s.id})}>Open</Button>
            </Card>)
          : <p className="text-sm text-muted-foreground">No additional ready steps. Your next steps will appear here.</p>}
      </section>
      {!!questions.length && <Card><CardHeader><CardTitle>Questions you sent</CardTitle></CardHeader><CardContent className="space-y-3">{questions.map(q => <Button key={q.id} variant="ghost" className="w-full h-auto py-3 whitespace-normal text-left justify-start" onClick={() => go('step', { step: q.id })}><span><span className="block font-medium">{q.title}</span><span className="block text-muted-foreground">{questionStatus(q)}</span>{q.status === 'Done' && q.approval_status !== 'Rejected' && q.feedback_note && <span className="block line-clamp-3">{q.feedback_note}</span>}</span></Button>)}</CardContent></Card>}
      {pathVisible && businessPath.data && <Card>
        <CardHeader><CardTitle className="text-xl">Your business path</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {businessPath.data.stages.length ? <>
            <h2 className="text-2xl font-bold break-words">{pathStageTitle(businessPath.data)}</h2>
            {businessPath.data.current && <p className="text-base whitespace-pre-wrap">Done when: {businessPath.data.current.done_when}</p>}
            {businessPath.data.current?.steps.filter(step => !isPathDone(step.status)).slice(0, 3).map(step => <Button key={step.key} variant="outline" className="w-full min-h-11 h-auto py-3 justify-between gap-3 whitespace-normal text-left" onClick={() => go('path', { path_step: step.key })}>
              <span className="text-base break-words">{step.title}</span><Badge variant="outline" className="text-sm shrink-0">{PATH_STATUSES[step.status]}</Badge>
            </Button>)}
          </> : <p>The business path hasn't been loaded yet.</p>}
          <Button className="min-h-11" onClick={() => go('path')}>See the whole path</Button>
        </CardContent>
      </Card>}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-xl font-semibold">{numbers.isError ? '—' : numbers.data?.followers.toLocaleString() ?? '—'}</p><p className="text-xs text-muted-foreground">Followers recorded</p></Card>
        <Card className="p-3"><p className="text-xl font-semibold">{numbers.isError ? '—' : numbers.data?.revenue == null ? '—' : `$${numbers.data.revenue.toLocaleString()}`}</p><p className="text-xs text-muted-foreground">Revenue recorded this month</p></Card>
        <Card className="p-3"><p className="text-xl font-semibold">{mine.filter(s => s.status === 'Done').length}</p><p className="text-xs text-muted-foreground">Steps completed (all time)</p></Card>
      </section>
      <BrandWeeklyNumbers projectId={brand.id} readOnly={preview} />
    </>}

    {view === 'path' && <section className="space-y-4">
      <Button className="min-h-11" variant="outline" onClick={() => go('today')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Today</Button>
      {pathVisible && <BusinessPathTab key={brand.id} projectId={brand.id} isAdmin={false} readOnly={preview} openStepKey={params.get('path_step')} />}
    </section>}

    {view === 'step' && <section className="space-y-4">
      <Button variant="outline" size="sm" onClick={() => go('plan')}><ArrowLeft className="h-4 w-4 mr-2"/>My plan</Button>
      {!selectedStep ? <Card className="p-5"><p role="alert">This step was not found in your brand. It may have been reassigned.</p></Card> : <>
        {!assignedStep && <p className="rounded-md border bg-muted p-4">This is {label(selectedStep)}'s step. You can read it, but only they can mark it done.</p>}
        <div>
          <p className="text-sm text-muted-foreground">{selectedStep.job_id ? `${activeJob?.title ?? 'Plan'} · step ${position.position} of ${position.count}` : 'Step'} · {dueText(selectedStep.due_date)}</p>
          <h2 className="text-2xl font-bold mt-1">{displayTitle(selectedStep)}</h2>
          {activeJob?.goal_text && <p className="mt-2 text-sm text-muted-foreground"><strong>Business goal:</strong> {activeJob.goal_text}</p>}
        </div>
        {archivedStep && <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">This plan is archived or finished. Its history is preserved, but you cannot complete new work in this plan.</p>}
        {plain(factsObject(selectedStep.facts).why) && <section className="space-y-2"><h3 className="font-semibold">Why this matters</h3><p className="whitespace-pre-wrap">{plain(factsObject(selectedStep.facts).why)}</p></section>}
        {selectedStep.detail && <section className="space-y-2"><h3 className="font-semibold">What to do</h3><p className="whitespace-pre-wrap leading-relaxed">{selectedStep.detail}</p></section>}
        {method.data && <Collapsible key={method.data.id} className="rounded-md border p-4"><CollapsibleTrigger asChild><Button variant="ghost" className="w-full h-auto min-h-11 whitespace-normal text-left justify-start">How-to guide: {method.data.title}</Button></CollapsibleTrigger><CollapsibleContent className="pt-3 space-y-3">
          {method.data.summary && <p className="whitespace-pre-wrap">{method.data.summary}</p>}{method.data.full_text && <p className="whitespace-pre-wrap">{method.data.full_text}</p>}{method.data.external_url && <a href={method.data.external_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-primary underline">Open original</a>}
        </CollapsibleContent></Collapsible>}
        {plain(factsObject(selectedStep.facts).expected_output) && <section className="space-y-2"><h3 className="font-semibold">Done looks like</h3><p className="whitespace-pre-wrap">{plain(factsObject(selectedStep.facts).expected_output)}</p></section>}
        {Array.isArray(factsObject(selectedStep.facts).checks) && (factsObject(selectedStep.facts).checks as unknown[]).length > 0 && <section className="space-y-2"><h3 className="font-semibold">Before you finish, check</h3><ul className="list-disc pl-5 space-y-2">{(factsObject(selectedStep.facts).checks as unknown[]).map((c, i) => <li key={i}>{String(c)}</li>)}</ul></section>}
        {(dependents(selectedStep).length > 0 || followingStep) && <section className="space-y-2"><h3 className="font-semibold">{othersWaiting(selectedStep).length ? 'Who is waiting on this' : 'What comes next'}</h3>
          {othersWaiting(selectedStep).map(s => <Button key={s.id} variant="ghost" className="w-full h-auto py-3 whitespace-normal justify-start text-left" onClick={() => go('step', { step: s.id })}>{label(s)}: {displayTitle(s)}</Button>)}
          {dependents(selectedStep).filter(s => assignedTo(s, viewer)).map(s => <Button key={s.id} variant="ghost" className="w-full h-auto py-3 whitespace-normal justify-start text-left" onClick={() => go('step', { step: s.id })}>Then you: {displayTitle(s)}</Button>)}
          {dependents(selectedStep).length === 0 && followingStep && <Button variant="ghost" className="w-full h-auto py-3 whitespace-normal justify-start text-left" onClick={() => go('step', { step: followingStep.id })}>Next in this plan: {assignedTo(followingStep, viewer) ? '' : `${label(followingStep)}: `}{displayTitle(followingStep)}</Button>}
        </section>}
        <section className="space-y-3">
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
            {assignedStep && !preview && <p className="text-xs text-muted-foreground">Upload in the linked workspace, then paste the file's link in Save your progress below.</p>}
          </div>}
        </section>
        {assignedStep && !preview && <Card className="p-4 space-y-3">
          <div><h3 className="font-semibold">Save your progress</h3>
            <p className="text-xs text-muted-foreground">Keep notes and a link to your work without finishing the step. Your notes stay with this step.</p></div>
          <label className="block space-y-1"><span className="text-sm font-medium">Work notes</span>
            <Textarea rows={3} value={progressNote} onChange={e => setProgressNote(e.target.value)} placeholder="What you've completed, what remains, or what you need…" />
          </label>
          <label className="block space-y-1"><span className="text-sm font-medium">Link to your work (optional)</span>
            <Input type="url" value={resultUrl} onChange={e => setResultUrl(e.target.value)} placeholder="https://…"/>
          </label>
          <Button variant="outline" disabled={savingProgress || !editableStep} onClick={saveProgress}>Save progress (keep step open)</Button>
        </Card>}
        {preview && <p className="text-muted-foreground">Preview only</p>}
        {assignedStep && !preview && <div className="flex flex-wrap gap-2">
          <Button disabled={!editableStep || savingProgress || complete.isPending || selectedStep.status === 'Done' || selectedStep.approval_status !== 'Approved' ||
               (!!selectedStep.depends_on && byId.get(selectedStep.depends_on)?.status !== 'Done')}
            onClick={() => done(selectedStep)}><CheckCircle2 className="h-4 w-4 mr-2"/>All done — next step</Button>
          <Button variant="outline" onClick={() => setHelpKind('blocked')}>I'm stuck</Button>
          <Button variant="outline" onClick={() => setHelpKind('change')}>Something needs changing</Button>
        </div>}
        {assignedStep && !preview && !archivedStep && selectedStep.status !== 'Done' && <p className="text-sm text-muted-foreground">
          <strong>What happens next:</strong> When you mark this step done, HQ saves the completion
          and opens the next available step assigned to you. If nothing is ready, you return to Today.
        </p>}
        {assignedStep && !preview && helpKind && <Card className="p-4 space-y-3">
          <p className="font-medium">{helpKind === 'blocked' ? 'What is stopping you?' : 'What needs to be changed?'}</p>
          <Textarea value={helpNote} onChange={e => setHelpNote(e.target.value)} rows={3} placeholder="Describe what you need…" />
          <div className="flex gap-2"><Button disabled={!helpNote.trim() || helpBusy} onClick={askForHelp}><MessageCircle className="h-4 w-4 mr-2"/>Save request</Button><Button variant="ghost" onClick={() => setHelpKind(null)}>Cancel</Button></div>
        </Card>}
        {selectedStep.status === 'Done' && <p className="inline-flex gap-2 items-center text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4"/>Already completed</p>}
      </>}
    </section>}

    {view === 'plan' && <section className="space-y-4">
      <ToggleGroup type="single" value={wholePlan ? 'whole' : 'mine'} onValueChange={value => { if(value) setWholePlan(value === 'whole'); }} variant="outline" aria-label="Plan scope"><ToggleGroupItem value="mine" className="min-h-11 px-4">My steps</ToggleGroupItem><ToggleGroupItem value="whole" className="min-h-11 px-4">Whole plan</ToggleGroupItem></ToggleGroup>
      {wholePlan ? <WholePlan steps={steps} jobs={jobsQuery.data ?? []} inactive={inactiveJobs} label={label} go={go} /> : <>
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
                <div className="divide-y">{within.map(s => <Button key={s.id} variant="ghost" className="w-full h-auto whitespace-normal text-left py-3 flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3" onClick={() => go('step',{step:s.id})}>
                  <span><span className="font-medium">{displayTitle(s)}</span><span className="block text-xs text-muted-foreground">{dueText(s.due_date)}</span></span>
                  <span className="flex items-center gap-2 shrink-0">{s.status === 'Done' ? <CheckCircle2 className="h-4 w-4 text-primary"/> : <Badge variant="outline">{teamStepState(s, byId)}</Badge>}<ArrowRight className="h-4 w-4"/></span>
                </Button>)}</div>
              </section>;
            })}
          </CardContent></Card>;
        })}
      </>}
      <BrandAccountSetup projectId={brand.id} readOnly={preview} />
      </>}
    </section>}

    {view === 'about' && <BrandTeamAbout projectId={brand.id} goal={brand.north_star} steps={steps} viewer={viewer} inactive={inactiveJobs} go={go} />}

    {view === 'posts' && <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Posts & videos</h2><p className="text-sm text-muted-foreground">Create a post or open a draft to work on its script, caption, files and scheduling record.</p></div>
        {!preview && <Button onClick={() => setCreatingPost(v => !v)}><Plus className="h-4 w-4 mr-2"/>Create a post</Button>}
      </div>
      {!preview && creatingPost && <Card className="p-4 space-y-3">
        <label className="block space-y-1"><span className="text-sm font-medium">What is this post about?</span>
          <Input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} placeholder="e.g. Three mistakes when planning a holiday party"/>
        </label>
        <label className="block space-y-1"><span className="text-sm font-medium">What are you making?</span>
          <select className="w-full rounded-md border bg-background px-3 py-2" value={newPostFormat} onChange={e => setNewPostFormat(e.target.value)}>
            <option value="short">Short video or Reel</option>
            <option value="long_form">Long video</option>
            <option value="community">Text-only social post</option>
            <option value="post">Graphic social post</option>
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
          {!preview && <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setSelectedWorkflow(selectedPost.id)}>Open full post workflow</Button>
            <Button variant="outline" onClick={() => editPost(selectedPost)}><Pencil className="h-4 w-4 mr-2"/>Quick edit</Button>
          </div>}
        </CardContent></Card>
        {!preview && postDraft && <Card className="p-4 space-y-3">
          <label className="block space-y-1"><span className="text-sm font-medium">Title</span><Input value={postDraft.title} onChange={e => setPostDraft({...postDraft,title:e.target.value})}/></label>
          <label className="block space-y-1"><span className="text-sm font-medium">Script</span><Textarea rows={8} value={postDraft.script} onChange={e => setPostDraft({...postDraft,script:e.target.value})}/></label>
          <label className="block space-y-1"><span className="text-sm font-medium">Caption</span><Textarea rows={4} value={postDraft.caption} onChange={e => setPostDraft({...postDraft,caption:e.target.value})}/></label>
          <div className="flex gap-2"><Button disabled={postBusy || !postDraft.title.trim()} onClick={savePost}>Save changes</Button><Button variant="ghost" onClick={() => setPostDraft(null)}>Cancel</Button></div>
        </Card>}
      </div> : postsQuery.data?.length ? <div className="grid sm:grid-cols-2 gap-3">{postsQuery.data.map(post => <Button variant="outline" key={post.id} className="block h-auto whitespace-normal text-left p-4" onClick={() => go('posts',{post:post.id})}>
        <p className="font-semibold">{post.title}</p><p className="text-xs text-muted-foreground mt-2">{post.stage} · {dateLabel(post.due_date)}</p>
        <span className="inline-flex items-center text-sm mt-3 text-primary">Open post <ArrowRight className="h-4 w-4 ml-1"/></span>
      </Button>)}</div> : !postsQuery.isLoading && !postsQuery.isError && <Card className="p-5"><p>No posts or videos are recorded for this brand yet.</p></Card>}
      <p className="text-xs text-muted-foreground">Production stages describe the internal workflow. A Scheduled label alone does not confirm that a post was accepted by a publisher.</p>
    </section>}

    {view === 'files' && <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Files & documents</h2><p className="text-sm text-muted-foreground">Read the current brand documents, use saved links and upload new brand files without accessing administrative settings.</p></div>
      {!preview && <BrandManagerFileUpload projectId={brand.id} />}
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
            <Button variant="outline" key={a.id} disabled={openingFile === a.storage_path}
              onClick={() => openBrandFile(a.storage_path)}
              className="block h-auto whitespace-normal text-left p-3">
              <span className="font-medium text-sm block">{a.file_name}</span>
              {a.description && <span className="text-xs block text-muted-foreground">{a.description}</span>}
              <span className="text-xs text-primary">{openingFile === a.storage_path ? 'Opening…' : 'Open saved file'}</span>
            </Button>)}
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
          {(selectedDocument.external_url || selectedDocument.attachment_url) && <a className="inline-flex gap-2 text-sm underline text-primary" href={(selectedDocument.external_url || selectedDocument.attachment_url || '')} target="_blank" rel="noreferrer">Open original <ExternalLink className="h-4 w-4"/></a>}
        </CardContent></Card>
      </div> : docsQuery.data?.length ? <div className="space-y-2">{docsQuery.data.map(doc => <Button variant="outline" key={doc.id} className="flex h-auto whitespace-normal items-center gap-3 w-full p-4 text-left" onClick={() => go('files',{doc:doc.id})}>
        <FileText className="h-5 w-5 text-primary shrink-0"/><span className="flex-1"><span className="font-medium block">{doc.title}</span>{doc.summary && <span className="text-xs text-muted-foreground line-clamp-2">{doc.summary}</span>}</span><ArrowRight className="h-4 w-4"/>
      </Button>)}</div> : !docsQuery.isLoading && !docsQuery.isError && <Card className="p-5"><p>No documents are available to this brand yet.</p></Card>}
    </section>}

    {!['today','about','step','plan','posts','files','path'].includes(view) && <Card className="p-5 flex items-center gap-3"><AlertCircle className="h-5 w-5"/><span>This section was not found.</span><Button variant="outline" onClick={() => go('today')}>Go to Today</Button></Card>}
    {!preview && <ContentWorkflowDialog projectId={brand.id} itemId={selectedWorkflow} onClose={() => setSelectedWorkflow(null)} />}
  </div>;
}

function WholePlan({ steps, jobs, inactive, label, go }: { steps: Step[]; jobs: Job[]; inactive: Set<string>; label: (step: Step) => string; go: (view: string, extra?: Record<string, string>) => void }) {
  const byId = new Map(steps.map(s => [s.id, s]));
  const visible = steps.filter(s => s.approval_status !== 'Rejected' && (!s.job_id || !inactive.has(s.job_id)));
  if (!visible.length) return <p>No steps are recorded in the current plan.</p>;
  return <div className="space-y-5">{[...new Set(visible.map(s => s.job_id ?? 'other'))].map(group => {
    const items = orderedSteps(visible.filter(s => (s.job_id ?? 'other') === group));
    const row = (s: Step) => <Button key={s.id} variant="ghost" className="w-full h-auto whitespace-normal py-4 text-left justify-start" onClick={() => go('step', { step: s.id })}><span className="w-full space-y-2"><span className="block font-medium">{displayTitle(s)}</span><span className="block text-muted-foreground">{dueText(s.due_date)}</span><span className="flex flex-wrap gap-2"><Badge variant="secondary">{label(s)}</Badge><Badge variant="outline">{teamStepState(s, byId)}</Badge></span></span></Button>;
    const finished = items.filter(s => s.status === 'Done');
    return <Card key={group}><CardHeader><CardTitle className="text-lg">{jobs.find(j => j.id === group)?.title ?? (group === 'other' ? 'Other steps' : 'Plan')}</CardTitle></CardHeader><CardContent className="divide-y">{items.filter(s => s.status !== 'Done').map(row)}{!!finished.length && <Collapsible><CollapsibleTrigger asChild><Button variant="ghost" className="min-h-11">Show finished ({finished.length})</Button></CollapsibleTrigger><CollapsibleContent>{finished.map(row)}</CollapsibleContent></Collapsible>}</CardContent></Card>;
  })}</div>;
}
