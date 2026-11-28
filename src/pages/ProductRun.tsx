import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { assertProductRecipe, type ProductStage } from '@/lib/productRecipes';
import { currentRunStep, isPublishStage, selectedChoices, stageForStep, type RunState, type RunStep } from '@/lib/productRun';
import { useAuth } from '@/context/AuthContext';
import { useStudioCanManage } from '@/hooks/useContentStudio';
import { ProductUploadKit, type ProductOutlet } from '@/components/content-studio/ProductUploadKit';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const words = (value: unknown): string => typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
function StageBody({ stage, state, busy, readOnly, event }: { stage: ProductStage; state: RunState; busy: boolean; readOnly: boolean; event: (action: string, details?: Record<string, unknown>, key?: string) => Promise<void> }) {
  const saved = state.stage_results[stage.key]; const choices = selectedChoices(stage, saved);
  const [output, setOutput] = useState(saved?.output ?? '');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingText, setSavingText] = useState(false);
  const saveDrafts = async () => { setSavingText(true); try { for (const [choice, value] of Object.entries(drafts)) await event('choose', { choice, value }); setDrafts({}); } finally { setSavingText(false); } };
  return <div className="space-y-6">
    <div className="space-y-2"><h2 className="text-2xl font-semibold break-words">{stage.title}</h2><p className="text-sm whitespace-pre-wrap break-words">{stage.what}</p>{stage.why && <p className="line-clamp-1 text-sm text-muted-foreground" title={stage.why}>{stage.why}</p>}<p className="text-sm font-medium">{stage.owner === 'owner' ? 'Your decision' : `Waiting for ${stage.doer}`}</p></div>
    {stage.owner === 'owner' ? <>
      {Array.isArray(stage.decided) && stage.decided.length > 0 && <details className="border-y py-3"><summary className="min-h-11 cursor-pointer font-medium">Already decided for you</summary><ul className="space-y-3 text-sm">{stage.decided.map((v, i) => { const d = v as Record<string, unknown>; return <li key={i}><strong>{words(d.what)}</strong>: {words(d.value)}<p className="text-xs text-muted-foreground">{words(d.reason)}</p></li>; })}</ul></details>}
      {stage.choices.map(c => <fieldset key={c.key} className="space-y-3" disabled={busy || readOnly || savingText}><legend className="mb-2 font-medium">{words(c.question) || c.key}</legend>{!!c.help && <p className="text-sm text-muted-foreground">{words(c.help)}</p>}
        {c.options?.length ? <div className="grid gap-3">{c.options.map((o, i) => <Button key={words(o.value) || i} variant={choices[c.key] === o.value ? 'default' : 'outline'} aria-pressed={choices[c.key] === o.value} className="min-h-14 h-auto w-full whitespace-normal justify-start text-left p-4" onClick={() => event('choose', { choice: c.key, value: o.value })}><span className="space-y-1"><span className="block">{words(o.label) || words(o.value)}{o.recommended === true && <span className="ml-2 text-xs">Recommended</span>}</span>{!!o.pick_when && <span className="block text-xs font-normal">{words(o.pick_when)}</span>}</span></Button>)}</div>
          : <Textarea aria-label={words(c.question) || c.key} value={drafts[c.key] ?? words(choices[c.key])} onChange={e => setDrafts(v => ({ ...v, [c.key]: e.target.value }))} className="min-h-24 text-base" />}
      </fieldset>)}
      {!!Object.keys(drafts).length && <Button variant="outline" disabled={busy || readOnly || savingText} onClick={saveDrafts}>Save answers</Button>}
      {!readOnly && <div className="space-y-3"><Button className="w-full min-h-14" disabled={busy || savingText || !!Object.keys(drafts).length} onClick={() => event('approve')}>Approve and continue</Button>{stage.skip?.can_skip === true && <><Button variant="outline" className="w-full min-h-12" disabled={busy} onClick={() => event('skip')}>Skip</Button><p className="text-xs text-muted-foreground">{stage.skip.rule}</p></>}</div>}
    </> : <>
      <section className="space-y-2"><h3 className="font-medium">Output</h3><ul className="space-y-2 text-sm">{stage.output.map((o, i) => <li key={i}>{typeof o === 'string' ? o : Object.entries(o as Record<string, unknown>).map(([k, v]) => `${k}: ${words(v)}`).join(' · ')}</li>)}</ul><h3 className="font-medium pt-2">Must pass</h3><p className="text-sm">{stage.check}</p></section>
      {readOnly ? <p className="whitespace-pre-wrap break-words text-sm">{saved?.output || '—'}</p> : <div className="space-y-3"><Label htmlFor="stage-output">Output link or text</Label><Textarea id="stage-output" className="min-h-32 text-base" value={output} onChange={e => setOutput(e.target.value)} /><Button className="min-h-14 w-full" disabled={busy || !output.trim()} onClick={() => { let kit: unknown; try { kit = JSON.parse(output).upload_kit; } catch { /* Plain text and links are valid outputs. */ } return event('output', { output, ...(kit ? { upload_kit: kit } : {}) }); }}>Mark done</Button></div>}
    </>}
    {saved?.at && <p className="text-xs text-muted-foreground">Saved {new Date(saved.at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} Pacific</p>}
  </div>;
}

export default function ProductRun() {
  const { jobId } = useParams(); const qc = useQueryClient(); const { isAdmin } = useAuth();
  const [busy, setBusy] = useState(false); const [viewKey, setViewKey] = useState<string | null>(null); const [kitOpen, setKitOpen] = useState(false);
  const autoKit = useRef<string | null>(null); const stateRef = useRef<RunState | null>(null);
  const run = useQuery({ queryKey: ['product-run', jobId], enabled: !!jobId, queryFn: async () => {
    if (!jobId) throw new Error('Run not found.');
    const job = await supabase.from('production_jobs').select('id,title,project_id,target_id,run_state').eq('id', jobId).single();
    if (job.error) throw job.error;
    const state = job.data.run_state as unknown as RunState;
    assertProductRecipe(state?.product_template?.recipe);
    const [steps, brand, product, catalog] = await Promise.all([
      supabase.from('action_items').select('id,title,detail,owner_kind,assignee,status,step_order,facts').eq('job_id', jobId).order('step_order'),
      supabase.from('venues').select('name').eq('id', job.data.project_id).single(),
      supabase.from('channel_products').select('name').eq('id', job.data.target_id ?? '').single(),
      supabase.rpc('hq_product_run_outlets', { r: state.product_template.recipe as never, state: state as never }),
    ]);
    for (const r of [steps, brand, product, catalog]) if (r.error) throw r.error;
    return { job: job.data, state, steps: (steps.data ?? []) as unknown as RunStep[], brand: brand.data?.name ?? '—', name: product.data?.name ?? job.data.title, outlets: catalog.data as unknown as ProductOutlet[] };
  } });
  const manage = useStudioCanManage(run.data?.job.project_id ?? '');
  const active = run.data ? currentRunStep(run.data.steps) : undefined;
  const activeStage = run.data && active ? stageForStep(run.data.state, active) : undefined;
  useEffect(() => { if (run.data) stateRef.current = run.data.state; }, [run.data]);
  useEffect(() => { if (activeStage && isPublishStage(activeStage) && autoKit.current !== activeStage.key) { autoKit.current = activeStage.key; setKitOpen(true); } }, [activeStage?.key]);
  const event = async (action: string, details: Record<string, unknown> = {}, key = activeStage?.key) => {
    const state = stateRef.current;
    if (!jobId || !key || !state) throw new Error('Reload this run before saving.');
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('hq_product_run_event', { p_job_id: jobId, p_revision: state.revision ?? 0, p_stage_key: key, p_action: action, p_details: details as never });
      if (error) throw error;
      stateRef.current = data as unknown as RunState;
      await run.refetch(); await qc.invalidateQueries({ queryKey: ['brand-workspace'] });
      if (action === 'reopen') setViewKey(null);
      toast.success(action === 'choose' ? 'Choice saved' : action === 'link' ? 'Live link saved' : 'Run saved');
    } catch (e) { toast.error(e instanceof Error ? e.message : words((e as { message?: string }).message) || 'The change could not be saved.'); throw e; }
    finally { setBusy(false); }
  };
  if (run.isLoading) return <p role="status" className="p-6">Opening your run…</p>;
  if (!run.data || run.isError) return <div className="p-6 space-y-4"><h1 className="text-xl font-semibold">This run could not be opened</h1><p>{words((run.error as { message?: string })?.message)}</p><Button onClick={() => run.refetch()}>Try again</Button><Button asChild variant="outline"><Link to="/content-studio">Content Studio</Link></Button></div>;
  const { state, steps, name, brand, outlets } = run.data;
  const done = steps.filter(s => s.status === 'Done').length;
  const viewedStep = viewKey ? steps.find(s => state.stage_steps[viewKey] === s.id) : undefined;
  const stage = viewedStep ? stageForStep(state, viewedStep) : activeStage;
  const readOnly = !!viewKey || !(isAdmin || manage.data);
  return <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-28" data-testid="product-run">
    <header className="space-y-4"><div className="flex items-start justify-between gap-3"><Button asChild variant="ghost" className="px-0"><Link to={`/content-studio?brand=${run.data.job.project_id}`}>Content Studio</Link></Button><Button variant="outline" onClick={() => setKitOpen(true)}>Upload kit</Button></div><div><p className="text-sm text-muted-foreground">{brand}</p><h1 className="text-2xl font-semibold break-words">{name}</h1></div><p className="text-sm font-medium">Step {active ? steps.indexOf(active) + 1 : steps.length} of {steps.length}</p><Progress value={steps.length ? done / steps.length * 100 : 0} aria-label="Run progress" /></header>
    {viewKey && <Button variant="outline" onClick={() => setViewKey(null)}>Back to current step</Button>}
    {stage ? <StageBody key={stage.key} stage={stage} state={state} busy={busy} readOnly={readOnly} event={(a, d) => event(a, d, stage.key).catch(() => undefined)} /> : <section className="space-y-3"><h2 className="text-xl font-semibold">Run complete</h2><p className="text-muted-foreground">All stages are saved.</p></section>}
    {viewKey && (isAdmin || manage.data) && <Button disabled={busy} variant="outline" className="min-h-12 w-full" onClick={() => event('reopen', {}, viewKey).catch(() => undefined)}>Reopen this stage</Button>}
    <details className="border-y py-4"><summary className="min-h-11 cursor-pointer font-medium">All stages · {done} done</summary><ol className="space-y-2">{steps.map((step, i) => { const s = stageForStep(state, step); return <li key={step.id}><Button variant="ghost" className="min-h-12 h-auto w-full whitespace-normal justify-start text-left gap-3" disabled={step.status !== 'Done' && step.id !== active?.id} onClick={() => setViewKey(step.status === 'Done' ? s.key : null)}><span className="shrink-0">{i + 1}</span><span className="flex-1">{s.title}</span><Badge variant="outline" className="shrink-0">{step.status === 'Done' ? 'Done' : step.id === active?.id ? 'Current' : 'Waiting'}</Badge></Button></li>; })}</ol></details>
    {kitOpen && <ProductUploadKit state={state} outlets={outlets} busy={busy || !(isAdmin || manage.data)} onClose={() => setKitOpen(false)} saveLink={(o, url) => event('link', { outlet: o.outlet, url }, o.stage).catch(() => undefined)} />}
  </main>;
}