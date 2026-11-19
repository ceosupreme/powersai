import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Clapperboard, ExternalLink, FileText, Lightbulb, Loader2, Plus, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CreatePipelineDialog, type PipelineRequest } from '@/components/pipeline/CreatePipelineDialog';
import { ContentWorkflowDialog } from '@/components/content/ContentWorkflowDialog';
import { FORMATS, FORMAT_LABELS } from '@/components/content/contentStages';
import { StudioFields } from '@/components/content-studio/StudioFields';
import { StudioRequests } from '@/components/content-studio/StudioRequests';
import { StudioResults } from '@/components/content-studio/StudioResults';
import { useBrandProjects } from '@/hooks/useContentProduction';
import { useContentItemMutations } from '@/hooks/useContentItems';
import { loadStudioItem, useStudioCanManage, useStudioContext, useStudioIdeas, useStudioItem, useStudioJob, useStudioMutations, useStudioTasks, useStudioTemplates, studioContentForJob } from '@/hooks/useContentStudio';
import { productTypeForFormat } from '@/lib/pipelineComposer';
import { radarEvidence } from '@/lib/radarData';
import { cn } from '@/lib/utils';
import { draftForItem, draftPatch, missingStudioPicks, recipeFields, STUDIO_DRIVE, STUDIO_STEPS, STUDIO_TIERS, studioFacts, studioHooks, studioLines, studioObject, studioRepeatMatches, studioReviewNotes, studioState, studioTaskType, studioText, studioUrl, templatePicks, templateRecipeFromDraft, visibleStudioTemplates,
  type ContentTemplate, type StudioDraft, type StudioFact, type StudioItem, type StudioPatch, type StudioTaskType, type StudioVariant } from '@/lib/contentStudio';

function errorText(error: any): string {
  const message = error?.message || 'The change could not be saved.';
  if (/revision|conflict|stale/i.test(message)) return 'This piece changed since you opened it. Your edits are still here. Refresh the saved version before trying again.';
  return message;
}
function External({ href, children }: { href: unknown; children: React.ReactNode }) {
  const url = studioUrl(href);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4">{children}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a> : null;
}
function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{help && <span className="block text-xs leading-relaxed text-muted-foreground">{help}</span>}{children}</label>;
}

export default function ContentStudio() {
  const [params, setParams] = useSearchParams();
  const brands = useBrandProjects();
  const templates = useStudioTemplates();
  const templateMutations = useStudioMutations();
  const projectId = params.get('brand') || '';
  const { isAdmin } = useAuth();
  const canManage = useStudioCanManage(projectId);
  const itemId = params.get('item');
  const item = useStudioItem(itemId);
  const ideas = useStudioIdeas(projectId || null);
  const [search, setSearch] = useState('');
  const [shelf, setShelf] = useState('all');
  const [newIdea, setNewIdea] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaSummary, setIdeaSummary] = useState('');
  const [ideaFormat, setIdeaFormat] = useState('reel');
  const [chosenTemplate, setChosenTemplate] = useState<ContentTemplate | null>(null);
  const [picks, setPicks] = useState<Record<string, unknown>>({});
  const [templateTitle, setTemplateTitle] = useState('');
  const [pipeRequest, setPipeRequest] = useState<PipelineRequest | null>(null);
  const [openingJob, setOpeningJob] = useState(false);
  const { create } = useContentItemMutations(projectId);
  const brand = brands.data?.find(b => b.id === projectId);
  const visibleTemplates = visibleStudioTemplates(templates.data ?? [], projectId);
  const repeatMatches = chosenTemplate ? studioRepeatMatches(chosenTemplate, picks, ideas.data ?? []) : [];
  const shelfItems = (ideas.data ?? []).filter(i => {
    const isStudio = !!studioState(i.brief).template_snapshot || studioState(i.brief).revision > 0;
    return (shelf === 'all' || (shelf === 'ideas' ? i.stage === 'idea' && !isStudio : isStudio)) && `${i.title} ${i.purpose ?? ''}`.toLowerCase().includes(search.toLowerCase());
  });
  useEffect(() => {
    if (!projectId && !itemId && brands.data?.length) setParams({ brand: brands.data[0].id }, { replace: true });
  }, [brands.data, projectId, itemId, setParams]);
  const openItem = (id: string, brandId = projectId) => setParams({ brand: brandId, item: id });
  const openCreated = async (jobId: string) => {
    setOpeningJob(true);
    try { openItem(await studioContentForJob(jobId)); }
    catch (error) { toast.error(errorText(error), { action: { label: 'Open work plan', onClick: () => { window.location.href = `/project/${projectId}/jobs/${jobId}`; } } }); }
    finally { setOpeningJob(false); }
  };
  const saveIdea = async () => {
    if (!ideaTitle.trim()) return;
    try {
      const saved = await create.mutateAsync({ title: ideaTitle.trim(), format: ideaFormat, stage: 'idea', brief: { summary: ideaSummary.trim() } } as any) as any;
      await ideas.refetch(); setNewIdea(false); setIdeaTitle(''); setIdeaSummary('');
      toast.success('Idea saved to your bank'); openItem(saved.id);
    } catch (error) { toast.error(errorText(error)); }
  };
  const makeTemplate = () => {
    if (!chosenTemplate) return;
    if (studioLines(studioObject(chosenTemplate.recipe.repeat_guard).keys).length && (ideas.isLoading || ideas.isError)) {
      return toast.error(ideas.isLoading ? 'Checking recent combinations. Try again when your idea bank has loaded.' : 'Recent combinations could not be checked. Refresh your idea bank before creating this piece.');
    }
    const missing = missingStudioPicks(chosenTemplate.recipe, picks);
    if (missing.length) return toast.error(`Choose ${missing.join(', ')} first.`);
    if (repeatMatches.length && !studioText(picks.repeat_override_note).trim()) return toast.error('This combination has been used. Change a choice or add the fresh angle for this version.');
    const title = templateTitle.trim() || chosenTemplate.title;
    const patch: StudioPatch = { template_id: chosenTemplate.id, tier: chosenTemplate.default_tier === 'automated' ? 'guided' : chosenTemplate.default_tier,
      picks, step: 'choices', creative: { format: chosenTemplate.recipe.format || 'reel' } };
    setPipeRequest({ projectId, kind: 'content', title, productType: chosenTemplate.recipe.product_type || productTypeForFormat(chosenTemplate.recipe.format),
      destinations: chosenTemplate.recipe.destinations ?? [],
      newContent: { title, summary: `${chosenTemplate.title}\n${Object.entries(picks).map(([key, value]) => `${key}: ${String(value)}`).join('\n')}`,
        format: chosenTemplate.recipe.format || 'reel', studio: patch, request_key: crypto.randomUUID() },
    });
    setChosenTemplate(null);
  };

  if (itemId) return <div className="mx-auto max-w-7xl p-4 pb-28 md:p-6 md:pb-28">
    {item.isLoading ? <p role="status" className="py-12 text-center text-muted-foreground">Opening your piece…</p> : item.isError || !item.data ? <div className="space-y-4 py-10"><h1 className="text-2xl font-semibold">This piece could not be opened</h1><p className="text-muted-foreground">{errorText(item.error)}</p><Button onClick={() => setParams(projectId ? { brand: projectId } : {})}>Back to Content Studio</Button></div>
      : <StudioEditor key={itemId} item={item.data} brandName={brands.data?.find(b => b.id === item.data.project_id)?.name ?? 'Your brand'} templates={templates.data ?? []}
        onBack={() => setParams({ brand: item.data.project_id })} onRefresh={async () => { await item.refetch(); }} />}
  </div>;

  return <div className="mx-auto max-w-7xl space-y-8 p-4 pb-28 md:p-6 md:pb-28">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl"><div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Clapperboard className="h-5 w-5" />Supreme Team HQ</div><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Content Studio</h1><p className="mt-3 text-muted-foreground">Find the idea. Make it yours. Build the piece.</p></div>
      <Button variant="outline" asChild><Link to="/guide?a=content-studio"><BookOpen className="mr-2 h-4 w-4" />How it works</Link></Button>
    </header>
    <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="w-full space-y-2 sm:w-80"><Label htmlFor="studio-brand">Create for</Label><Select value={projectId} onValueChange={id => { setParams({ brand: id }); setSearch(''); }}><SelectTrigger id="studio-brand"><SelectValue placeholder={brands.isLoading ? 'Loading brands…' : 'Choose your brand'} /></SelectTrigger><SelectContent>{brands.data?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/radar"><Search className="mr-2 h-4 w-4" />Explore Radar</Link></Button><Button disabled={!projectId} onClick={() => setNewIdea(true)}><Plus className="mr-2 h-4 w-4" />Save an idea</Button></div>
    </section>
    {brands.isError && <p role="alert" className="text-destructive">Brands could not be loaded. Refresh to try again.</p>}
    {!brands.isLoading && !brands.data?.length && <p className="text-muted-foreground">No brand is available to your account yet.</p>}
    {openingJob && <p role="status" className="flex items-center gap-2 text-primary"><Loader2 className="h-4 w-4 animate-spin" />Your work plan is saved. Opening the Studio…</p>}
    {!!projectId && <>
      <section className="space-y-4" aria-labelledby="studio-formats"><div><h2 id="studio-formats" className="text-xl font-semibold">Start with a format</h2><p className="mt-1 text-sm text-muted-foreground">The structure is ready. Your choices and new research make each episode different.</p></div>
        {templates.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading templates…</p>}
        {templates.isError && <div role="alert" className="rounded-xl border p-4 text-sm">Templates could not be loaded. <Button variant="link" className="h-auto p-0" onClick={() => templates.refetch()}>Try again</Button></div>}
        {!templates.isLoading && !templates.isError && !visibleTemplates.length && <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No saved formats for this brand yet. Open an idea, develop its choices, then save it as a template.</p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleTemplates.map(template => <Card key={template.id} className="flex flex-col"><CardContent className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2"><Badge variant={template.status === 'validated' ? 'default' : 'secondary'}>{template.status === 'validated' ? 'Performance validated' : template.status === 'ready' ? 'Ready to try' : 'Draft format'}</Badge><span className="text-xs text-muted-foreground">v{template.version}</span></div>
          <div><h3 className="text-lg font-semibold">{template.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{template.description}</p></div>
          <div className="flex flex-wrap gap-1.5">{studioLines(template.recipe.destinations).map(destination => <Badge key={destination} variant="outline" className="capitalize">{destination.replace(/_/g, ' ')}</Badge>)}</div>
          {template.status === 'draft' ? <div className="mt-auto space-y-2"><p className="text-xs text-muted-foreground">Make a reviewed recipe available to try. Performance validation comes from measured results.</p><Button className="w-full" variant="outline" disabled={templateMutations.makeAvailable.isPending || !(isAdmin || (template.project_id && canManage.data))} onClick={async () => {
            try { await templateMutations.makeAvailable.mutateAsync(template.id); toast.success('Format is ready to try'); }
            catch (error) { toast.error(errorText(error)); }
          }}>Make available</Button></div> : <Button className="mt-auto w-full" variant="outline" disabled={!['ready', 'validated'].includes(template.status)} onClick={() => { setChosenTemplate(template); setPicks(templatePicks(template)); setTemplateTitle(''); }}>Create with this format<ArrowRight className="ml-2 h-4 w-4" /></Button>}
        </CardContent></Card>)}</div>
      </section>
      <section className="space-y-4" aria-labelledby="studio-ideas"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="studio-ideas" className="text-xl font-semibold">Your idea bank & works in progress</h2><p className="mt-1 text-sm text-muted-foreground">{brand?.name || 'This brand'}’s existing content and Radar briefs, together.</p></div><Badge variant="outline">{ideas.data?.length ?? 0} saved pieces</Badge></div>
        <div className="flex flex-wrap gap-3"><Input aria-label="Search saved ideas" className="min-w-0 flex-1 sm:max-w-md" placeholder="Find an idea…" value={search} onChange={e => setSearch(e.target.value)} /><Select value={shelf} onValueChange={setShelf}><SelectTrigger className="w-44" aria-label="Filter saved pieces"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All saved pieces</SelectItem><SelectItem value="ideas">Ideas to develop</SelectItem><SelectItem value="studio">Studio drafts</SelectItem></SelectContent></Select></div>
        {ideas.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading your ideas…</p>}{ideas.isError && <p role="alert" className="text-sm text-destructive">Your saved pieces could not be loaded. Try refreshing.</p>}
        {!ideas.isLoading && !ideas.isError && !shelfItems.length && <div className="rounded-xl border border-dashed p-8 text-center"><Lightbulb className="mx-auto mb-3 h-7 w-7 text-primary" /><h3 className="font-medium">{search ? 'No matching ideas' : 'Give your next idea a home'}</h3><p className="mt-2 text-sm text-muted-foreground">Save a thought, a question from your audience or a link worth researching.</p></div>}
        <div className="grid gap-3 lg:grid-cols-2">{shelfItems.map(saved => {
          const state = studioState(saved.brief); const evidence = radarEvidence(saved.idea_evidence as any);
          return <Card key={saved.id}><CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{saved.title}</h3><p className="mt-1 text-xs text-muted-foreground">{state.template_snapshot?.title || FORMAT_LABELS[saved.format as keyof typeof FORMAT_LABELS] || 'Idea'} · Updated {new Date(saved.updated_at).toLocaleDateString()}</p></div><Badge variant="outline" className="shrink-0 capitalize">{saved.stage}</Badge></div>
            {saved.hook && <p className="line-clamp-2 text-sm text-muted-foreground">{saved.hook}</p>}
            {evidence.length > 0 && <p className="text-xs text-muted-foreground">{evidence.length} evidence {evidence.length === 1 ? 'note' : 'notes'}{saved.idea_score != null ? ` · Idea score ${saved.idea_score} (advisory)` : ''}</p>}
            <Button variant="secondary" size="sm" onClick={() => openItem(saved.id)}>Open in Studio<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>
          </CardContent></Card>;
        })}</div>
      </section>
    </>}
    <Dialog open={newIdea} onOpenChange={setNewIdea}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Save an idea</DialogTitle><DialogDescription>Capture it now. Develop the research and work plan when you are ready.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Working title"><Input value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} placeholder="What could this piece be about?" /></Field><Field label="The idea, audience question or source link"><Textarea value={ideaSummary} onChange={e => setIdeaSummary(e.target.value)} rows={5} placeholder="What caught your attention? Why would your audience care?" /></Field><Field label="Starting format"><Select value={ideaFormat} onValueChange={setIdeaFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map(format => <SelectItem key={format} value={format}>{FORMAT_LABELS[format]}</SelectItem>)}</SelectContent></Select></Field><Button className="w-full" disabled={!ideaTitle.trim() || create.isPending} onClick={saveIdea}>{create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save to idea bank</Button></div></DialogContent></Dialog>
    <Dialog open={!!chosenTemplate} onOpenChange={open => !open && setChosenTemplate(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{chosenTemplate?.title}</DialogTitle><DialogDescription>{chosenTemplate?.description}</DialogDescription></DialogHeader><div className="space-y-6"><StudioFields recipe={chosenTemplate?.recipe} picks={picks} onChange={setPicks} />{repeatMatches.length > 0 && <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4"><h3 className="text-sm font-semibold">You have used this combination before</h3><ul className="space-y-1 text-sm text-muted-foreground">{repeatMatches.slice(0, 3).map(previous => <li key={previous.id}>{previous.title}</li>)}</ul><Field label="What will be new this time?" help="Change a choice above, or describe the fresh angle that makes this version worth creating."><Textarea value={studioText(picks.repeat_override_note)} onChange={e => setPicks({ ...picks, repeat_override_note: e.target.value })} rows={3} placeholder="A new route, story, soundtrack, season or point of view…" /></Field></div>}<Field label="Episode or piece title"><Input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder={chosenTemplate?.title} /></Field><p className="text-xs text-muted-foreground">Next, choose the destination and goal in HQ’s shared work plan. Your template version and choices are saved with the new piece.</p><Button className="w-full" onClick={makeTemplate}>Create the work plan<ArrowRight className="ml-2 h-4 w-4" /></Button></div></DialogContent></Dialog>
    <CreatePipelineDialog request={pipeRequest} onClose={() => setPipeRequest(null)} onCreated={jobId => { void openCreated(jobId); }} navigateOnCreated={false} />
  </div>;
}

function StudioEditor({ item, brandName, templates, onBack, onRefresh }: {
  item: StudioItem; brandName: string; templates: ContentTemplate[]; onBack: () => void; onRefresh: () => Promise<void>;
}) {
  const { isAdmin } = useAuth();
  const [draft, setDraft] = useState<StudioDraft>(() => draftForItem(item));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [runnerError, setRunnerError] = useState('');
  const [newTemplateId, setNewTemplateId] = useState<string | undefined>();
  const [instructions, setInstructions] = useState('');
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [pipeRequest, setPipeRequest] = useState<PipelineRequest | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateNote, setTemplateNote] = useState('');
  const [latestSaved, setLatestSaved] = useState(item.updated_at);
  const savedRevision = useRef(studioState(item.brief).revision);
  const lastTaskUpdate = useRef('');
  const requestKeys = useRef<Record<string, string>>({});
  const mutations = useStudioMutations();
  const job = useStudioJob(item.id);
  const tasks = useStudioTasks(item.id);
  const context = useStudioContext(item.project_id);
  const canManage = useStudioCanManage(item.project_id);
  const taskUpdate = (tasks.data ?? []).map(t => `${t.id}:${t.status}:${t.updated_at ?? ''}`).join('|');
  const recipe = draft.template_snapshot?.recipe;
  const facts = studioFacts(draft.research);
  const hooks = studioHooks(draft.decisions);
  const reviewNotes = studioReviewNotes(draft);
  const stepIndex = STUDIO_STEPS.findIndex(s => s.key === draft.step);
  const availableTemplates = visibleStudioTemplates(templates, item.project_id).filter(t => ['ready', 'validated'].includes(t.status));
  const pendingTasks = (tasks.data ?? []).filter(t => ['new', 'queued', 'pending', 'claimed', 'running', 'in_progress'].includes(t.status));
  const edit = (patch: Partial<StudioDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setDirty(true); };
  const editDecision = (key: string, value: unknown) => edit({ decisions: { ...draft.decisions, [key]: value } });
  useEffect(() => {
    if (!dirty && (studioState(item.brief).revision !== savedRevision.current || item.updated_at !== latestSaved)) {
      setDraft(draftForItem(item)); savedRevision.current = studioState(item.brief).revision; setLatestSaved(item.updated_at);
    }
  }, [item, dirty, latestSaved]);
  useEffect(() => {
    if (taskUpdate && lastTaskUpdate.current && taskUpdate !== lastTaskUpdate.current) void onRefresh();
    lastTaskUpdate.current = taskUpdate;
  }, [taskUpdate, onRefresh]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async (): Promise<StudioItem> => {
    if (!draft.title.trim()) throw new Error('Give this piece a working title.');
    if (!draft.template_snapshot?.id) throw new Error('Choose a ready format in Your direction before saving a Studio plan. Your original idea is already saved in the idea bank.');
    if (draft.asset_urls.some(url => url.trim() && !studioUrl(url.trim()))) throw new Error('Use a complete HTTP or HTTPS link for each asset.');
    const patch = draftPatch(draft, item); if (newTemplateId) patch.template_id = newTemplateId;
    const saved = await mutations.save.mutateAsync({ itemId: item.id, revision: draft.revision, patch });
    setDraft(draftForItem(saved)); savedRevision.current = studioState(saved.brief).revision; setLatestSaved(saved.updated_at); setDirty(false); setNewTemplateId(undefined);
    return saved;
  };
  const saveButton = async () => { setBusy(true); try { await save(); toast.success('Studio progress saved'); } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); } };
  const runTask = async (taskId: string) => {
    setRunningTask(taskId); setRunnerError('');
    try {
      const response = await mutations.run.mutateAsync(taskId);
      const refreshed = await tasks.refetch(); await onRefresh();
      const savedTask = refreshed.data?.find(task => task.id === taskId);
      if (response.status === 'done' && savedTask?.status === 'done') toast.success('The worker’s results are saved');
      else if (response.status === 'needs_owner') toast.info('The returned work needs your review. Open the saved request.');
      else if (response.status === 'failed') setRunnerError(response.summary || 'The worker could not finish. Open the request for details, then retry with your current choices.');
      if (response.status !== 'done' || savedTask?.status === 'done') return response;
    } catch (error) { setRunnerError(`${errorText(error)} Your request is saved. Check its status below, retry when the connection is ready, or continue with your own research and writing.`); await tasks.refetch(); }
    finally { setRunningTask(null); }
  };
  const request = async (taskType: StudioTaskType) => {
    setBusy(true);
    try {
      const missing = missingStudioPicks(recipe, draft.picks);
      if (missing.length) throw new Error(`Choose ${missing.join(', ')} before requesting work.`);
      let saved = await save();
      const queue = async (content: StudioItem, type: StudioTaskType) => {
        const revision = studioState(content.brief).revision;
        const requestSlot = `${revision}:${type}`;
        const requestKey = requestKeys.current[requestSlot] ?? `studio:${item.id}:${crypto.randomUUID()}`;
        requestKeys.current[requestSlot] = requestKey;
        const queued = await mutations.request.mutateAsync({ itemId: item.id, revision, taskType: type, instructions, idempotencyKey: requestKey });
        delete requestKeys.current[requestSlot];
        return queued;
      };
      if (taskType === 'draft' && draft.tier === 'one_tap' && !studioFacts(studioState(saved.brief).research).some(fact => fact.kind === 'fact' && studioUrl(fact.source_url))) {
        const researchTask = await queue(saved, 'research');
        toast.info('Preparing research first, then your complete draft');
        const result = await runTask(researchTask.id);
        if (result?.status !== 'done') return;
        saved = await loadStudioItem(item.id);
      }
      const task = await queue(saved, taskType);
      toast.success('Request saved. Awaiting a worker.'); setInstructions('');
      if (taskType === 'research' || taskType === 'draft') void runTask(task.id);
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const refresh = async () => { await Promise.all([tasks.refetch(), onRefresh()]); };
  const startPlan = async () => {
    setBusy(true);
    try {
      await save();
      setPipeRequest({ projectId: item.project_id, kind: 'content', title: draft.title, targetType: 'content_items', targetId: item.id,
        productType: recipe?.product_type || productTypeForFormat(draft.format), destinations: recipe?.destinations ?? [] });
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const applyTemplate = (id: string) => {
    const template = availableTemplates.find(t => t.id === id); if (!template) return;
    setNewTemplateId(id); edit({ template_snapshot: { id, slug: template.slug, version: template.version, title: template.title, recipe: template.recipe },
      tier: template.default_tier === 'automated' ? 'guided' : template.default_tier, picks: { ...templatePicks(template), ...draft.picks }, format: template.recipe.format || draft.format });
  };
  const saveTemplate = async () => {
    setBusy(true);
    try {
      await save();
      await mutations.template.mutateAsync({ title: templateName.trim(), project_id: item.project_id, recipe: templateRecipeFromDraft(draft),
        description: templateNote.trim(), default_tier: draft.tier === 'one_tap' ? 'one_tap' : 'guided' });
      setTemplateOpen(false); toast.success('Draft format saved to the template shelf');
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const updateFact = (id: string, patch: Partial<StudioFact>) => edit({ research: { ...draft.research, facts: facts.map(f => f.id === id ? { ...f, ...patch } : f) } });
  const updateVariant = (id: string, patch: Partial<StudioVariant>) => edit({ variants: draft.variants.map(v => v.id === id ? { ...v, ...patch } : v) });
  const addVariant = () => edit({ variants: [...draft.variants, { id: crypto.randomUUID(), platform: 'instagram', format: 'reel', hook: draft.hook, caption: draft.caption, notes: '', asset_url: '' }] });
  const hasNewSavedVersion = studioState(item.brief).revision !== draft.revision && dirty;
  const requestButton = (type: StudioTaskType, label: string) => <div className="space-y-2"><Button onClick={() => request(type)} disabled={busy || pendingTasks.some(t => studioTaskType(t) === type)}><Sparkles className="mr-2 h-4 w-4" />{pendingTasks.some(t => studioTaskType(t) === type) ? 'Request saved · see status' : label}</Button>{type !== 'production' && <p className="text-xs text-muted-foreground">Uses your connected research and writing tools.</p>}</div>;

  return <div className="space-y-6">
    <header className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" className="-ml-3" disabled={busy} onClick={async () => {
      if (!dirty) return onBack(); setBusy(true); try { await save(); onBack(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
    }}><ArrowLeft className="mr-2 h-4 w-4" />Content Studio</Button><Badge variant="outline">{brandName}</Badge></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><Label htmlFor="studio-title" className="sr-only">Working title</Label><Input id="studio-title" readOnly={!draft.template_snapshot} value={draft.title} onChange={e => edit({ title: e.target.value })} className="h-auto border-0 bg-transparent px-0 py-1 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-3xl" /><p className="mt-1 text-sm text-muted-foreground">{draft.template_snapshot ? `${draft.template_snapshot.title} · version ${draft.template_snapshot.version}` : 'Your original idea'} · {item.stage}</p></div>
        <Button onClick={saveButton} disabled={busy || !dirty || !draft.template_snapshot}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : dirty ? <Save className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}{dirty ? 'Save progress' : 'Saved'}</Button></div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span role="status">{dirty ? 'Unsaved changes' : `Saved ${new Date(latestSaved).toLocaleString()}`}</span>{job.data ? <Link className="text-primary underline" to={`/project/${item.project_id}/jobs/${job.data.id}`}>Open this work plan</Link> : !job.isLoading && <Button variant="link" className="h-auto p-0 text-xs" disabled={busy} onClick={startPlan}>Create the linked work plan</Button>}</div>
    </header>
    {hasNewSavedVersion && <div role="alert" className="space-y-2 rounded-xl border border-primary bg-primary/5 p-4 text-sm"><p>A worker or another editor saved a newer version. Your local edits have been kept. Save a copy of any edits you want to retain, then load the latest results.</p><Button size="sm" variant="outline" onClick={() => { setDraft(draftForItem(item)); savedRevision.current = studioState(item.brief).revision; setDirty(false); }}>Load latest saved version</Button></div>}
    {!draft.template_snapshot && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-primary/5 p-4 text-sm"><p>Your idea is saved. Choose a ready format in Your direction to develop it as a Studio plan.</p>{draft.step !== 'choices' && <Button size="sm" variant="outline" onClick={() => edit({ step: 'choices' })}>Choose a format</Button>}</div>}
    <nav aria-label="Content creation steps" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{STUDIO_STEPS.map((step, i) => <button type="button" key={step.key} disabled={!draft.template_snapshot && step.key !== 'choices'} onClick={() => draft.template_snapshot && edit({ step: step.key })} aria-current={draft.step === step.key ? 'step' : undefined}
      className={cn('rounded-lg border px-3 py-3 text-left text-sm transition-colors', draft.step === step.key ? 'border-primary bg-primary/10 text-primary' : 'bg-card text-muted-foreground hover:text-foreground')}><span className="mr-2 text-xs opacity-70">0{i + 1}</span>{step.title}</button>)}</nav>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <main className="min-w-0 space-y-6 rounded-xl border bg-card p-4 md:p-6"><div><h1 className="text-xl font-semibold">{STUDIO_STEPS[stepIndex]?.title}</h1><p className="mt-1 text-sm text-muted-foreground">{STUDIO_STEPS[stepIndex]?.help}</p></div>
        {draft.step === 'choices' && <div className="space-y-6">
          {!studioState(item.brief).template_snapshot && <Field label="Choose a ready format" help="The format supplies the research and production recipe. Your choice is saved with this piece’s first Studio plan."><Select value={newTemplateId} onValueChange={applyTemplate}><SelectTrigger><SelectValue placeholder="Choose a format" /></SelectTrigger><SelectContent>{availableTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.title} · v{t.version}</SelectItem>)}</SelectContent></Select>{!availableTemplates.length && <p className="text-xs text-muted-foreground">No ready formats for this brand yet. Return to the template shelf and make a completed draft recipe available.</p>}</Field>}
          {recipeFields(recipe).length > 0 ? <StudioFields recipe={recipe} picks={draft.picks} onChange={picks => edit({ picks })} /> : draft.template_snapshot ? <><Field label="Who is this for?"><Input value={studioText(draft.picks.audience)} onChange={e => edit({ picks: { ...draft.picks, audience: e.target.value } })} placeholder="The person and the moment this should reach" /></Field><Field label="What should they take away?"><Textarea value={studioText(draft.picks.promise)} onChange={e => edit({ picks: { ...draft.picks, promise: e.target.value } })} placeholder="A feeling, a useful answer, a new perspective…" /></Field><Field label="What makes your version different?"><Textarea value={studioText(draft.picks.original_angle)} onChange={e => edit({ picks: { ...draft.picks, original_angle: e.target.value } })} placeholder="Your experience, evidence, setting, visual world or unexpected connection" /></Field></> : null}
          <Field label="Format" help={recipe?.format ? 'This comes from your template. Add destination-specific adaptations in Make & adapt.' : undefined}><Select value={draft.format} disabled={!draft.template_snapshot || !!recipe?.format} onValueChange={format => edit({ format })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>)}</SelectContent></Select></Field>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">How would you like to make it?</legend><div className="grid gap-2 sm:grid-cols-3">{STUDIO_TIERS.map(tier => <button key={tier.value} type="button" disabled={tier.value === 'automated' || !draft.template_snapshot} aria-pressed={draft.tier === tier.value} onClick={() => edit({ tier: tier.value })} className={cn('rounded-xl border p-3 text-left', draft.tier === tier.value && 'border-primary bg-primary/10', tier.value === 'automated' && 'opacity-60')}><span className="block text-sm font-semibold">{tier.title}</span><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{tier.description}</span></button>)}</div></fieldset>
          {studioText(studioObject(item.brief).summary) && <div className="rounded-lg bg-muted/50 p-4"><h2 className="mb-2 text-sm font-medium">Original idea</h2><p className="whitespace-pre-wrap text-sm text-muted-foreground">{studioText(studioObject(item.brief).summary)}</p></div>}
          {draft.tier === 'one_tap' && <div className="space-y-3 rounded-lg border p-4"><p className="text-sm text-muted-foreground">Your full-draft request includes the saved direction, template and existing evidence. The worker will return research needs, opening choices, script and production plan for review.</p>{requestButton('draft', 'Request a complete draft')}</div>}
        </div>}
        {draft.step === 'research' && <div className="space-y-6">
          {recipe?.research_brief && <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">{recipe.research_brief}</p>}
          <Field label="Research direction" help="Add the question you need answered or the city, subject and angle to investigate."><Textarea value={studioText(draft.research.direction)} onChange={e => edit({ research: { ...draft.research, direction: e.target.value } })} rows={3} /></Field>
          {requestButton('research', 'Request fresh research')}
          <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Facts & scenario ideas</h2><Button size="sm" variant="outline" onClick={() => edit({ research: { ...draft.research, facts: [...facts, { id: crypto.randomUUID(), text: '', source_url: '', kind: 'fact' }] } })}><Plus className="mr-2 h-4 w-4" />Add a finding</Button></div>
            {!facts.length && <p className="text-sm text-muted-foreground">Research results will appear here. You can also add your own findings and their sources.</p>}
            {facts.map((fact, index) => <div key={fact.id} className="space-y-3 rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><Select value={fact.kind} onValueChange={kind => updateFact(fact.id, { kind: kind as 'fact' | 'scenario' })}><SelectTrigger className="w-52" aria-label={`Finding ${index + 1} type`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fact">Factual claim</SelectItem><SelectItem value="scenario">Creative scenario assumption</SelectItem></SelectContent></Select><Button size="icon" variant="ghost" aria-label={`Remove finding ${index + 1}`} onClick={() => edit({ research: { ...draft.research, facts: facts.filter(f => f.id !== fact.id) } })}><Trash2 className="h-4 w-4" /></Button></div><Textarea aria-label={`Finding ${index + 1}`} value={fact.text} onChange={e => updateFact(fact.id, { text: e.target.value })} placeholder={fact.kind === 'fact' ? 'What does the source actually support?' : 'What are we imagining, under which assumptions?'} /><Input aria-label={`Finding ${index + 1} source link`} value={fact.source_url} onChange={e => updateFact(fact.id, { source_url: e.target.value })} placeholder={fact.kind === 'fact' ? 'Source URL required for a factual claim' : 'Supporting context URL, if useful'} />{studioUrl(fact.source_url) && <External href={fact.source_url}>Open source</External>}</div>)}
          </div>
          <details className="rounded-xl border p-4" open={!facts.length}><summary className="cursor-pointer font-medium">Brand research, audience questions & outliers</summary><div className="mt-4 space-y-4"><p className="text-xs text-muted-foreground">Include up to 8 saved sources. They guide the researcher; factual claims still need source-supported findings.</p>
            {context.isLoading && <p className="text-sm text-muted-foreground">Loading your research…</p>}{context.isError && <p role="alert" className="text-sm text-destructive">Saved research could not be loaded.</p>}
            {context.data?.sources.map(source => {
              const sourceIds = studioLines(draft.research.source_ids); const included = sourceIds.includes(source.id);
              return <article key={source.id} className="space-y-2 border-b pb-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{source.title}</h3><Button size="sm" variant={included ? 'secondary' : 'outline'} disabled={!included && sourceIds.length >= 8} onClick={() => edit({ research: { ...draft.research, source_ids: included ? sourceIds.filter(id => id !== source.id) : [...sourceIds, source.id] } })}>{included ? 'Included ✓' : 'Use this research'}</Button></div><p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{source.summary}</p><External href={source.url}>Read research</External></article>;
            })}
            {context.data?.pains.slice(0, 12).map(pain => <article key={pain.id} className="space-y-2 border-b pb-3"><Badge variant="outline">Audience question</Badge><p className="text-sm">{pain.pain_text}</p><Button size="sm" variant="ghost" onClick={() => editDecision('audience_question', pain.pain_text)}>Use as the audience question</Button></article>)}
            {context.data?.results.slice(0, 12).map(result => <article key={result.id} className="space-y-2 border-b pb-3"><Badge variant="outline">{result.platform}{result.outlier_multiple != null ? ` · ${result.outlier_multiple}× recorded baseline` : ''}</Badge><p className="text-sm">{result.hook_text || result.topic || result.angle}</p><External href={result.post_url}>View observed post</External></article>)}
            {context.data && !context.data.sources.length && !context.data.pains.length && !context.data.results.length && <p className="text-sm text-muted-foreground">No saved research for this brand yet. Request fresh research to begin.</p>}
          </div></details>
        </div>}
        {draft.step === 'hooks' && <div className="space-y-6">
          {studioText(draft.decisions.audience_question) && <p className="rounded-lg bg-muted/50 p-4 text-sm">Audience question: {studioText(draft.decisions.audience_question)}</p>}
          {hooks.length ? <div className="space-y-3">{hooks.map(hook => <button key={hook.id} type="button" aria-pressed={draft.hook === hook.text} onClick={() => { edit({ hook: hook.text, decisions: { ...draft.decisions, selected_hook: hook.id } }); }} className={cn('w-full space-y-2 rounded-xl border p-4 text-left', draft.hook === hook.text && 'border-primary bg-primary/10')}><span className="text-xs font-semibold uppercase tracking-wide text-primary">{hook.label}</span><span className="block text-lg font-medium">{hook.text}</span>{hook.rationale && <span className="block text-sm text-muted-foreground">{hook.rationale}</span>}</button>)}</div> : <div className="space-y-3 rounded-xl border border-dashed p-5"><p className="text-sm text-muted-foreground">Ask for three distinct openings based on your research. You can also write your own now.</p>{requestButton('draft', 'Request openings & a draft')}</div>}
          <Field label="Your chosen opening" help="Promise something this piece actually delivers. Edit the wording to sound like your brand."><Textarea rows={4} value={draft.hook} onChange={e => edit({ hook: e.target.value, decisions: { ...draft.decisions, selected_hook: 'custom' } })} placeholder="What makes the right person stop and care?" /></Field>
          <Field label="What will pay off this opening?"><Textarea rows={3} value={studioText(draft.decisions.hook_payoff)} onChange={e => editDecision('hook_payoff', e.target.value)} placeholder="The reveal, explanation, experience or evidence the audience receives" /></Field>
          <Field label="The visual or sound in the first moment"><Textarea rows={3} value={studioText(draft.decisions.opening_visual)} onChange={e => editDecision('opening_visual', e.target.value)} placeholder="Describe the first frame, movement, caption or sound" /></Field>
        </div>}
        {draft.step === 'script' && <div className="space-y-6">
          {draft.hook && <blockquote className="border-l-2 border-primary pl-4 text-sm">{draft.hook}</blockquote>}
          <Field label={draft.format === 'long_form' && draft.template_snapshot?.slug?.includes('city-drive') ? 'Episode structure, track order & chapter plan' : 'Script or finished written content'} help="Keep source-supported facts distinct from fictional events. This is the same script your HQ content item uses."><Textarea value={draft.script} onChange={e => edit({ script: e.target.value })} rows={16} className="font-mono text-sm leading-relaxed" placeholder="The complete narration, written post or timecoded episode plan…" /></Field>
          <Field label="Scenes, shots & asset plan" help="Include timing, on-screen action, narration or music cues, asset names and what needs to be made."><Textarea value={studioText(draft.decisions.shot_plan)} onChange={e => editDecision('shot_plan', e.target.value)} rows={10} className="font-mono text-sm leading-relaxed" placeholder="00:00–00:08 | Opening shot | Visual / audio / asset name" /></Field>
          {(studioText(draft.decisions.originality_notes) || Array.isArray(draft.decisions.claim_checks)) && <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Originality & factual checks</summary><div className="mt-3 space-y-3 text-sm">{studioText(draft.decisions.originality_notes) && <p className="whitespace-pre-wrap text-muted-foreground">{studioText(draft.decisions.originality_notes)}</p>}{Array.isArray(draft.decisions.claim_checks) && draft.decisions.claim_checks.map((claim: any, index: number) => <div key={index} className="space-y-1 border-t pt-3"><p>{studioText(claim?.text)}</p><External href={claim?.source_url}>Check the source</External></div>)}</div></details>}
          <Field label="Call to action"><Input value={draft.cta} onChange={e => edit({ cta: e.target.value })} placeholder="The useful next step for your audience" /></Field>
          <label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><Checkbox checked={draft.decisions.script_locked === true} onCheckedChange={checked => editDecision('script_locked', checked === true)} /><span>I have reviewed this script and scene plan for production.<span className="mt-1 block text-xs text-muted-foreground">A creative checkpoint. Final publishing approval stays in HQ’s review workflow.</span></span></label>
          {requestButton('draft', 'Request a draft or revision')}
        </div>}
        {draft.step === 'production' && <div className="space-y-6">
          {draft.decisions.script_locked !== true && <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Review your script and scene plan before committing to generation or an edit.</p>}
          <Field label="Finished asset links" help="One full link per line. Add the actual files or viewable exports for this piece, so review can happen in HQ."><Textarea value={draft.asset_urls.join('\n')} onChange={e => edit({ asset_urls: e.target.value.split('\n') })} rows={5} placeholder="https://drive.google.com/file/d/…/view" /></Field>
          <div className="flex flex-wrap gap-x-4 gap-y-2">{draft.asset_urls.filter(studioUrl).map((url, index) => <External key={`${url}-${index}`} href={url}>Asset {index + 1}</External>)}</div>
          <Field label="Main caption or description"><Textarea value={draft.caption} onChange={e => edit({ caption: e.target.value })} rows={5} /></Field>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Platform versions</h2><Button size="sm" variant="outline" onClick={addVariant}><Plus className="mr-2 h-4 w-4" />Add a version</Button></div>
          {!draft.variants.length && <p className="text-sm text-muted-foreground">Keep a platform’s opening, crop, caption and output file with the piece. Each version can be adjusted for how people use that platform.</p>}
          {draft.variants.map((variant, index) => <div key={variant.id} className="space-y-4 rounded-xl border p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Version {index + 1}</h3><Button size="icon" variant="ghost" aria-label={`Remove platform version ${index + 1}`} onClick={() => edit({ variants: draft.variants.filter(v => v.id !== variant.id) })}><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Platform"><Select value={variant.platform} onValueChange={platform => updateVariant(variant.id, { platform })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['youtube', 'instagram', 'tiktok', 'facebook_page', 'facebook_profile_manual', 'pinterest', 'linkedin', 'x', 'blog', 'email'].map(p => <SelectItem key={p} value={p}>{p.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Format"><Select value={variant.format} onValueChange={format => updateVariant(variant.id, { format })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>)}</SelectContent></Select></Field></div><Field label="Opening"><Input value={variant.hook} onChange={e => updateVariant(variant.id, { hook: e.target.value })} /></Field><Field label="Caption / description"><Textarea rows={3} value={variant.caption} onChange={e => updateVariant(variant.id, { caption: e.target.value })} /></Field><Field label="Adaptation notes"><Textarea rows={3} value={variant.notes} onChange={e => updateVariant(variant.id, { notes: e.target.value })} placeholder="Crop, pacing, on-screen text, sound, disclosure or a different ending" /></Field><Field label="Version’s final file"><Input value={variant.asset_url} onChange={e => updateVariant(variant.id, { asset_url: e.target.value })} placeholder="https://…" /></Field>{variant.platform === 'facebook_profile_manual' && <p className="text-xs text-muted-foreground">Personal Facebook profile posts are a manual posting step.</p>}</div>)}
          {requestButton('production', 'Request the production package')}
          <p className="text-xs text-muted-foreground">This saves a production request. It does not buy generation credits or publish a post.</p>
        </div>}
        {draft.step === 'review' && <div className="space-y-6">
          <div className="space-y-3 rounded-xl border p-4"><h2 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-primary" />Before you review</h2>{reviewNotes.length ? <ul className="space-y-2 text-sm text-muted-foreground">{reviewNotes.map(note => <li key={note}>• {note}</li>)}</ul> : <p className="text-sm text-muted-foreground">Your direction, opening and script are saved. Review the actual files and platform versions before approving.</p>}<p className="text-xs text-muted-foreground">These are guidance notes. Scores never decide whether you are allowed to approve your finished content.</p></div>
          {studioLines(recipe?.quality_checks).length > 0 && <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">This format’s quality checks</legend>{studioLines(recipe?.quality_checks).map((check, i) => <label key={i} className="flex items-start gap-3 text-sm"><Checkbox checked={studioLines(draft.decisions.quality_checks_done).includes(check)} onCheckedChange={checked => { const done = studioLines(draft.decisions.quality_checks_done); editDecision('quality_checks_done', checked ? [...new Set([...done, check])] : done.filter(c => c !== check)); }} /><span>{check}</span></label>)}</fieldset>}
          <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={async () => { setBusy(true); try { await save(); setWorkflowOpen(true); } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); } }}><CheckCircle2 className="mr-2 h-4 w-4" />Open content review</Button>{isAdmin && <Button variant="outline" asChild><Link to="/production-board">Production Board</Link></Button>}</div>
          <p className="text-sm text-muted-foreground">The review opens your existing content item. Finish its production stage, approve the finished piece, and record actual scheduling or publishing through the same HQ workflow.</p>
          <div className="space-y-3 border-t pt-5"><h2 className="font-semibold">Keep the format that worked</h2><p className="text-sm text-muted-foreground">Save the repeatable structure and variable choices as a draft template. Performance validation comes from real published results.</p><Button variant="outline" disabled={!canManage.data} onClick={() => { setTemplateName(`${draft.template_snapshot?.title || draft.title} — my format`); setTemplateNote(''); setTemplateOpen(true); }}><Plus className="mr-2 h-4 w-4" />Save this format as a template</Button></div>
          <StudioResults itemId={item.id} />
        </div>}
        <div className="flex flex-wrap justify-between gap-3 border-t pt-5"><Button variant="ghost" disabled={stepIndex === 0} onClick={() => edit({ step: STUDIO_STEPS[stepIndex - 1].key })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>{stepIndex < STUDIO_STEPS.length - 1 && <Button variant="outline" disabled={!draft.template_snapshot} onClick={() => edit({ step: STUDIO_STEPS[stepIndex + 1].key })}>Next: {STUDIO_STEPS[stepIndex + 1].title}<ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
      </main>
      <aside className="min-w-0 space-y-4">
        {runningTask && <p role="status" className="flex items-center gap-2 rounded-xl border bg-primary/5 p-4 text-sm"><Loader2 className="h-4 w-4 shrink-0 animate-spin" />The connected worker is processing your request.</p>}
        {runnerError && <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm">{runnerError}</p>}
        <StudioRequests tasks={tasks.data ?? []} loading={tasks.isLoading} error={tasks.isError} busy={busy || !!runningTask} onRefresh={() => { void refresh(); }} onRun={task => { void runTask(task.id); }} onCancel={async task => {
          setBusy(true); try { await mutations.cancel.mutateAsync(task.id); toast.success('Request cancelled'); } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
        }} onRetry={async task => {
          const type = studioTaskType(task); if (!['research', 'draft', 'production'].includes(type)) return;
          setBusy(true); try { await mutations.cancel.mutateAsync(task.id); await request(type as StudioTaskType); } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
        }} />
        <section className="space-y-3 rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">A note for the next request</h2><Textarea aria-label="Instructions for the next request" value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} placeholder="Anything the researcher or creator should pay special attention to…" /><p className="text-xs text-muted-foreground">Your saved template, choices, research and script are included automatically.</p></section>
        <section className="space-y-3 rounded-xl border bg-card p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" />Your production files</h2><div className="space-y-2">{STUDIO_DRIVE.map(folder => <div key={folder.url}><External href={folder.url}>{folder.label}</External></div>)}</div><p className="text-xs leading-relaxed text-muted-foreground">Keep the files in Drive. Save each piece’s actual output links in Make & adapt.</p></section>
      </aside>
    </div>
    <CreatePipelineDialog request={pipeRequest} onClose={() => setPipeRequest(null)} onCreated={() => { void job.refetch(); }} navigateOnCreated={false} />
    <ContentWorkflowDialog projectId={item.project_id} itemId={workflowOpen ? item.id : null} onClose={() => { setWorkflowOpen(false); void onRefresh(); }} />
    <Dialog open={templateOpen} onOpenChange={setTemplateOpen}><DialogContent><DialogHeader><DialogTitle>Save a repeatable format</DialogTitle><DialogDescription>Your variable choices become defaults. This piece’s factual claims, script and final files stay with the piece.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Template name"><Input value={templateName} onChange={e => setTemplateName(e.target.value)} /></Field><Field label="When should this format be used?"><Textarea rows={4} value={templateNote} onChange={e => setTemplateNote(e.target.value)} /></Field><Button className="w-full" disabled={busy || !templateName.trim()} onClick={saveTemplate}>Save draft template</Button></div></DialogContent></Dialog>
  </div>;
}
