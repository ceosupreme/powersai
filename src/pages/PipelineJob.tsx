import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrafficNotice } from '@/components/pipeline/TrafficNotice';
import { useApproveItem } from '@/hooks/useContentProduction';
import { buildStarterPrompt } from '@/lib/pipelineComposer';
import { playbookStatus } from '@/lib/playbookStatus';
import { jobStatusWord } from '@/hooks/usePlaybooks';
import { PlaybookWordBadge } from '@/components/playbooks/PlaybookWordBadge';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatting';
import { useCompleteNextTenRow } from '@/hooks/useNextTen';
import { useKnowledgeRows, type KnowledgeRow, type ProductionJob } from '@/hooks/useBrandWorkspace';
import {
  OWNER_WORD, STEP_STATUS_WORD, deriveStepStatus, firstStepLink, parseFacts, parseKeyPointSteps,
  type StepStatus,
} from '@/lib/ownerWork';

const T = (t: string) => (supabase as any).from(t);

const STATUS_TONE: Record<StepStatus, string> = {
  done: 'border-signal-green/50 text-signal-green',
  blocked: 'border-destructive/50 text-destructive',
  ready: 'border-primary/60 text-primary',
  decision: 'border-gold/60 text-gold',
  queued: 'border-border text-muted-foreground',
  open: 'border-border text-muted-foreground',
};

interface Step {
  id: string; title: string; detail: string | null; facts: string | null; status: string | null;
  owner_kind: string | null; method_id: string | null; output_url: string | null; depends_on: string | null;
  step_order: number | null;
}

function usePipelineJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-job', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const jobRes = await T('production_jobs').select('*').eq('id', jobId).maybeSingle();
      if (jobRes.error) throw jobRes.error;
      const job = jobRes.data as ProductionJob | null;
      if (!job) return null;
      // snoozed_until is deliberately ignored here: every step of the job is shown.
      const [stepsRes, venueRes, kitRes, nicheRes, targetRes] = await Promise.all([
        supabase.from('action_items')
          .select('id,title,detail,facts,status,owner_kind,method_id,output_url,depends_on,step_order')
          .eq('job_id', job.id).order('step_order', { ascending: true }),
        T('venues').select('id,name').eq('id', job.project_id).maybeSingle(),
        T('brand_kits').select('bio_short,brand_voice,content_mode').eq('project_id', job.project_id).eq('archived', false).maybeSingle(),
        T('content_sources').select('id,title').eq('project_id', job.project_id).eq('source_type', 'niche_profile').order('updated_at', { ascending: false }).limit(1),
        job.target_type === 'content_items' && job.target_id
          ? T('content_items').select('id,title,brief,idea_score,performance,quality_score,quality_fails,approved_at').eq('id', job.target_id).maybeSingle()
          : job.target_type === 'channel_products' && job.target_id
            ? T('channel_products').select('id,name,status,price,monthly_sales').eq('id', job.target_id).maybeSingle()
            : job.target_type === 'knowledge_base' && job.target_id
              ? T('knowledge_base').select('id,title,status,expiry_date,full_text,tags,key_points,subcategory,summary').eq('id', job.target_id).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
      ]);
      for (const r of [stepsRes, venueRes, kitRes, nicheRes, targetRes] as any[]) if (r.error) throw r.error;
      let revenue: any[] = [];
      if (job.target_type === 'channel_products' && job.target_id) {
        const rev = await T('channel_revenue').select('id,amount,period_month,revenue_type,source_note')
          .eq('product_id', job.target_id).order('period_month', { ascending: false }).limit(6);
        if (rev.error) throw rev.error;
        revenue = rev.data ?? [];
      }
      return {
        job,
        steps: (stepsRes.data ?? []) as Step[],
        brandName: (venueRes.data as any)?.name ?? 'Brand',
        kit: kitRes.data as any,
        niche: ((nicheRes.data ?? []) as any[])[0] ?? null,
        target: targetRes.data as any,
        revenue,
      };
    },
  });
}

function briefText(brief: unknown): string | null {
  if (!brief) return null;
  if (typeof brief === 'string') return brief;
  if (typeof brief === 'object') {
    const b = brief as Record<string, unknown>;
    const pick = b.summary ?? b.angle ?? b.viewer_question ?? b.hook;
    if (typeof pick === 'string') return pick;
    return Object.entries(b).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).slice(0, 3).join(' · ') || null;
  }
  return null;
}

export default function PipelineJob() {
  const { venueId, jobId } = useParams<{ venueId: string; jobId: string }>();
  const { data, isLoading, isError, refetch } = usePipelineJob(jobId);
  const recipeIds = useMemo(() => (data?.job.recipe ?? []).map((r) => r.id), [data]);
  const stepMethodIds = useMemo(() => (data?.steps ?? []).map((s) => s.method_id), [data]);
  const kb = useKnowledgeRows([...recipeIds, ...stepMethodIds]);
  const complete = useCompleteNextTenRow();
  const approve = useApproveItem();
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [methodOpen, setMethodOpen] = useState<{ id: string; title: string; version: string; status: string } | null>(null);
  const [stepOpen, setStepOpen] = useState<Step | null>(null);
  const scrolled = useRef(false);

  const statusById = useMemo(() => new Map((data?.steps ?? []).map((s) => [s.id, s.status])), [data]);

  useEffect(() => {
    if (!data || scrolled.current || data.job.current_step == null) return;
    const el = document.getElementById(`step-${data.job.current_step}`);
    if (el) {
      scrolled.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [data]);

  if (isLoading) return <div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (isError) return <p role="status" className="p-6 text-sm text-destructive">This job could not be loaded. <button className="underline" onClick={() => refetch()}>Try again</button></p>;
  if (!data) return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-3">
      <h1 className="text-xl font-semibold">Job not found</h1>
      <Button variant="outline" asChild><Link to={`/project/${venueId}`}>Back to the brand</Link></Button>
    </div>
  );

  const { job, steps, brandName, kit, niche, target } = data;
  const results = job.result_links ?? [];
  const isPlaybookJob = job.kind === 'playbook';

  const markDone = async (s: Step) => {
    try {
      await complete.mutateAsync({ key: `action-${s.id}`, source: 'Action', step: s.title, projectId: job.project_id, projectName: brandName, refId: s.id, rank: 0 });
      toast.success('Step done');
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save that step');
    }
  };

  const updateStep = async (s: Step, patch: Record<string, unknown>, ok: string) => {
    setBusyStep(s.id);
    const { error } = await supabase.from('action_items').update(patch as any).eq('id', s.id);
    setBusyStep(null);
    if (error) return toast.error(error.message);
    toast.success(ok);
    refetch();
  };
  const queueStep = (s: Step) => {
    const { facts } = parseFacts(s.facts);
    const merged = { ...(facts ?? (s.facts ? { note: s.facts } : {})), queued: true, queued_at: new Date().toISOString() };
    return updateStep(s, { facts: JSON.stringify(merged) }, 'Queued for the next run');
  };
  const handToClaude = (s: Step) => updateStep(s, { owner_kind: 'claude', assignee: 'Claude', approval_status: 'Auto' }, 'Handed to Claude');
  const copyPrompt = async (s: Step) => {
    const m = s.method_id ? kb.data?.get(s.method_id) ?? null : null;
    const text = buildStarterPrompt({
      brand: brandName, jobId: job.id, jobTitle: job.title, moneyDestination: job.money_destination ?? null,
      stepOrder: s.step_order, stepTitle: s.title, method: m, facts: parseFacts(s.facts).facts as any,
    });
    try { await navigator.clipboard.writeText(text); toast.success('Prompt copied'); }
    catch { toast.error('Could not copy. Your browser blocked the clipboard.'); }
  };
  const approveTarget = async () => {
    try { await approve.mutateAsync(target.id); toast.success('Approved'); refetch(); }
    catch (e: any) { toast.error(e?.message ?? 'The database refused the approval'); }
  };

  const methodRow: KnowledgeRow | undefined = methodOpen ? kb.data?.get(methodOpen.id) : undefined;
  const stepFacts = stepOpen ? parseFacts(stepOpen.facts) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <Link to={`/project/${job.project_id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to {brandName}
      </Link>

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{brandName} · {job.kind.replace(/_/g, ' ')}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{job.title}</h1>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{jobStatusWord(job.status)}</Badge>
          {!isPlaybookJob && job.level != null && <Badge variant="outline">Level {job.level}</Badge>}
          {!isPlaybookJob && job.money_destination && <Badge variant="secondary">Money to: {job.money_destination}</Badge>}
          <Badge variant="outline">Your time: {job.owner_minutes_est ?? '—'} min est · {job.owner_minutes_actual ?? '—'} min actual</Badge>
        </div>
        {isPlaybookJob && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm space-y-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Playbook:</span>
              {target ? (
                <>
                  <Link className="font-medium text-primary underline" to={`/playbooks?open=${target.id}`}>{target.title}</Link>
                  <PlaybookWordBadge word={playbookStatus(target)} />
                </>
              ) : <span>{(job as any).target_key ?? '—'}</span>}
            </p>
            {job.money_destination && <p>{/^feeds:/i.test(job.money_destination) ? job.money_destination : `Feeds: ${job.money_destination}`}</p>}
          </div>
        )}
      </header>

      <section>
        <h2 className="text-sm font-semibold mb-2">Recipe</h2>
        <div className="flex flex-wrap gap-2">
          {(job.recipe ?? []).map((r) => (
            <button key={r.id} type="button" onClick={() => setMethodOpen(r)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary">
              {r.title} {r.version ? `v${r.version}` : ''}
              {r.status === 'draft' && <span className="ml-1 text-muted-foreground">· planned</span>}
            </button>
          ))}
          {(job.recipe ?? []).length === 0 && <span className="text-sm text-muted-foreground">No playbooks listed.</span>}
        </div>
        <div className="mt-3"><TrafficNotice projectId={job.project_id} methods={(job.recipe ?? []).map((r: any) => ({ key: r.key ?? '', title: r.title }))} /></div>
      </section>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {target && !isPlaybookJob ? (
            job.target_type === 'content_items' ? (
              <div>
                <p className="font-medium">{target.title}</p>
                <p className="text-muted-foreground">{briefText(target.brief) ?? 'No brief yet.'}</p>
                <p className="text-xs text-muted-foreground">Idea score {target.idea_score ?? '—'}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">{target.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{target.status ?? '—'} · {target.price == null ? 'No price' : formatCurrency(Number(target.price))}</p>
              </div>
            )
          ) : !isPlaybookJob && <p className="text-muted-foreground">No linked item.</p>}
          <p><span className="text-muted-foreground">Brand kit: </span>{kit?.bio_short || kit?.brand_voice || '—'}</p>
          <p>
            <span className="text-muted-foreground">Niche profile: </span>
            {niche ? <Link className="text-primary underline" to={`/project/${job.project_id}?tab=intel`}>{niche.title}</Link> : '—'}
          </p>
          {results.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {results.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-primary">
                  {l.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="text-lg font-semibold mb-2">Steps</h2>
        <ol className="space-y-3">
          {steps.map((s) => {
            const st = deriveStepStatus(s, statusById);
            const { facts } = parseFacts(s.facts);
            const link = firstStepLink(facts, s.output_url);
            const method = s.method_id ? kb.data?.get(s.method_id) : null;
            const current = s.step_order != null && s.step_order === job.current_step;
            const canDone = s.owner_kind === 'owner' && st !== 'blocked' && st !== 'done';
            const queued = !!(facts as any)?.queued;
            const isGate = job.target_type === 'content_items' && /^(Gate|Quality gate)/.test(s.title);
            return (
              <li key={s.id} id={s.step_order != null ? `step-${s.step_order}` : undefined}
                className={cn('rounded-lg border bg-card p-4 scroll-mt-24', current ? 'border-primary ring-1 ring-primary/40' : 'border-border', st === 'done' && 'opacity-80')}>
                <div className="flex gap-3">
                  <span className="text-2xl font-bold tabular-nums text-muted-foreground w-8 shrink-0">{s.step_order ?? '—'}</span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_TONE[st])}>{STEP_STATUS_WORD[st]}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{OWNER_WORD[s.owner_kind ?? ''] ?? 'Unassigned'}</Badge>
                      {method && <Badge variant="outline" className="text-[10px]">{method.title}</Badge>}
                      {current && <Badge className="text-[10px]">Current step</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setStepOpen(s)}>View instructions</Button>
                      {link && <Button size="sm" variant="outline" asChild><a href={link} target="_blank" rel="noreferrer">Open</a></Button>}
                      {canDone && <Button size="sm" disabled={complete.isPending} onClick={() => markDone(s)}>Done</Button>}
                      {canDone && <Button size="sm" variant="ghost" disabled={busyStep === s.id} onClick={() => handToClaude(s)}>Hand to Claude</Button>}
                      {s.owner_kind === 'claude' && st !== 'done' && (
                        queued
                          ? <span className="self-center text-xs text-muted-foreground">Queued for the next run</span>
                          : <Button size="sm" variant="outline" disabled={busyStep === s.id} onClick={() => queueStep(s)}>Queue</Button>
                      )}
                      {s.owner_kind === 'claude' && <Button size="sm" variant="outline" onClick={() => copyPrompt(s)}>Copy prompt</Button>}
                    </div>
                    {isGate && target && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2 text-xs">
                        <span>Quality score <span className="font-semibold">{target.quality_score ?? '—'}</span></span>
                        <span>Fails: {(target.quality_fails ?? []).length ? target.quality_fails.join(', ') : 'none'}</span>
                        {target.approved_at ? <span className="font-semibold">Approved</span> : (
                          <Button size="sm" className="h-7" disabled={approve.isPending} onClick={approveTarget}>Approve</Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {steps.length === 0 && <p className="text-sm text-muted-foreground">No steps on this job yet.</p>}
        </ol>
      </section>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Outputs</CardTitle></CardHeader>
        <CardContent>
          {results.length === 0 ? <p className="text-sm text-muted-foreground">No outputs recorded yet.</p> : (
            <ul className="space-y-1">{results.map((l) => <li key={l.url}><a className="text-sm text-primary underline break-all" href={l.url} target="_blank" rel="noreferrer">{l.label}</a></li>)}</ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Results</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {job.target_type === 'content_items' ? (
            target?.performance && Object.keys(target.performance).length ? (
              <dl className="grid grid-cols-2 gap-2">
                {Object.entries(target.performance as Record<string, unknown>).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}</dt><dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
                ))}
              </dl>
            ) : <p className="text-muted-foreground">No performance recorded yet.</p>
          ) : job.target_type === 'channel_products' ? (
            <div className="space-y-2">
              <p>Monthly sales: <span className="font-semibold">{target?.monthly_sales ?? '—'}</span></p>
              {data.revenue.length === 0 ? <p className="text-muted-foreground">No revenue rows yet.</p> : (
                <ul className="divide-y divide-border">
                  {data.revenue.map((r: any) => (
                    <li key={r.id} className="py-1.5 flex justify-between gap-2">
                      <span>{r.period_month} {r.revenue_type ? `· ${r.revenue_type}` : ''}</span>
                      <span className="font-medium">{formatCurrency(Number(r.amount ?? 0))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : <p className="text-muted-foreground">—</p>}
        </CardContent>
      </Card>

      <Sheet open={!!methodOpen} onOpenChange={(o) => !o && setMethodOpen(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {methodOpen && (
            <>
              <SheetHeader>
                <SheetTitle>{methodOpen.title}</SheetTitle>
                <SheetDescription>
                  {methodOpen.version ? `Version ${methodOpen.version}` : ''}{methodOpen.status === 'draft' ? ' · planned, not written yet' : ''}
                </SheetDescription>
              </SheetHeader>
              {kb.isLoading ? <Loader2 className="mt-6 h-5 w-5 animate-spin" /> : !methodRow ? (
                <p className="mt-4 text-sm text-muted-foreground">This playbook is not on the shelf yet.</p>
              ) : (
                <div className="mt-4 space-y-4 text-sm">
                  <p className="whitespace-pre-wrap">{methodRow.summary ?? 'No summary yet.'}</p>
                  {parseKeyPointSteps(methodRow.key_points).length > 0 && (
                    <ol className="list-decimal pl-5 space-y-1">
                      {parseKeyPointSteps(methodRow.key_points).map((k, i) => <li key={i}>{k}</li>)}
                    </ol>
                  )}
                  <p className="text-muted-foreground">Review by {methodRow.expiry_date ?? '—'}</p>
                  {(methodRow.external_url || methodRow.attachment_url) && (
                    <Button asChild className="w-full"><a href={(methodRow.external_url || methodRow.attachment_url)!} target="_blank" rel="noreferrer">Open playbook</a></Button>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!stepOpen} onOpenChange={(o) => !o && setStepOpen(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {stepOpen && (
            <>
              <SheetHeader>
                <SheetTitle>Step {stepOpen.step_order ?? ''}</SheetTitle>
                <SheetDescription>{stepOpen.title}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                {stepOpen.detail ? <p className="whitespace-pre-wrap">{stepOpen.detail}</p> : <p className="text-muted-foreground">No written instructions.</p>}
                {stepFacts?.text && <pre className="whitespace-pre-wrap text-xs bg-muted/40 p-3 rounded">{stepFacts.text}</pre>}
                {stepFacts?.facts && (
                  <>
                    {stepFacts.facts.method && <p><span className="text-muted-foreground">Playbook: </span>{stepFacts.facts.method}</p>}
                    {(stepFacts.facts.inputs ?? []).length > 0 && (
                      <div><p className="font-semibold">Inputs</p><ul className="list-disc pl-5">{stepFacts.facts.inputs!.map((x, i) => <li key={i}>{String(x)}</li>)}</ul></div>
                    )}
                    {stepFacts.facts.expected_output && (
                      <div><p className="font-semibold">Expected output</p><p>{stepFacts.facts.expected_output}</p></div>
                    )}
                    {(stepFacts.facts.checks ?? []).length > 0 && (
                      <div><p className="font-semibold">Checks</p><ul className="list-disc pl-5">{stepFacts.facts.checks!.map((x, i) => <li key={i}>{String(x)}</li>)}</ul></div>
                    )}
                    {stepFacts.facts.links && Object.keys(stepFacts.facts.links).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(stepFacts.facts.links).map(([k, u]) => (
                          <Button key={k} size="sm" variant="outline" asChild>
                            <a href={String(u)} target="_blank" rel="noreferrer" className="capitalize">{k.replace(/_/g, ' ')}</a>
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {stepOpen.output_url && (
                  <Button size="sm" variant="outline" asChild><a href={stepOpen.output_url} target="_blank" rel="noreferrer">Output</a></Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
