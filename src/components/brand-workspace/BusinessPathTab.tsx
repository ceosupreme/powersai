import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useBusinessPath } from '@/hooks/useBusinessPath';
import { BUSINESS_TYPES, PATH_STATUSES, type PathSettings, type PathStatus, type StepDraft, type businessPathProgress } from '@/lib/businessPath';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

type ProgressData = ReturnType<typeof businessPathProgress>;
type ProgressStep = ProgressData['stages'][number]['steps'][number];
const message = (error: unknown) => error instanceof Error ? error.message : 'Your changes could not be saved.';
export const pathStageTitle = (path: ProgressData) => path.current
  ? `Stage ${path.current.number} of ${path.stages.length}: ${path.current.name}` : 'All stages done';

export function BusinessPathTab({ projectId, isAdmin, openStepKey, readOnly = false }: { projectId: string; isAdmin: boolean; openStepKey?: string | null; readOnly?: boolean }) {
  const path = useBusinessPath(projectId);
  const [openStages, setOpenStages] = useState<string[]>([]);
  const currentKey = path.data?.current?.key;
  const requestedStage = path.data?.stages.find(stage => stage.steps.some(step => step.key === openStepKey))?.key;
  useEffect(() => { setOpenStages(requestedStage ? [requestedStage] : currentKey ? [currentKey] : []); }, [projectId, currentKey, requestedStage]);
  if (path.isLoading) return <p role="status">Loading the business path…</p>;
  if (path.isError) return <div role="alert" className="space-y-3"><p>The business path could not be loaded.</p><Button className="min-h-11" onClick={() => path.refetch()}>Try again</Button></div>;
  if (!path.data) return null;
  const data = path.data;
  return <div className="space-y-6">
    {data.stages.length > 0 ? <section className="space-y-3" aria-label="Business path progress">
      <h2 className="text-2xl sm:text-3xl font-bold break-words">{pathStageTitle(data)}</h2>
      {data.current && <p className="text-base whitespace-pre-wrap">Done when: {data.current.done_when}</p>}
      <p className="text-base font-semibold">{data.done} of {data.total} steps done</p>
      <Progress aria-label={`${data.done} of ${data.total} steps done`} value={data.total ? data.done / data.total * 100 : 100} />
    </section> : <p className="text-lg">The business path hasn't been loaded yet.</p>}
    {isAdmin && !readOnly && <PathSettingsForm key={projectId} settings={data.settings} save={path.saveSettings} busy={path.savingSettings} />}
    {!data.settings?.business_types.length && <p className="text-base">Pick at least one business type to see every step that applies to this brand.</p>}
    {!isAdmin && !data.hasSavedStatus && <p>This brand hasn't been placed on the map yet, so every step shows as not started.</p>}
    <Accordion type="multiple" value={openStages} onValueChange={setOpenStages}>
      {data.stages.map(stage => <AccordionItem key={stage.key} value={stage.key}>
        <AccordionTrigger className="min-h-11 text-left gap-3">
          <span className="space-y-2 min-w-0">
            <span className="block text-lg font-semibold break-words">Stage {stage.number}. {stage.name}</span>
            <span className="flex flex-wrap items-center gap-2 text-base"><Badge variant="outline" className="text-sm">{stage.complete ? 'Done' : stage.key === currentKey ? 'Current stage' : 'Coming up'}</Badge>{stage.done} of {stage.total} done</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-base mb-3 whitespace-pre-wrap">Done when: {stage.done_when}</p>
          {stage.steps.length === 0 && <p className="text-base">No applicable steps for this brand.</p>}
          <Accordion type="multiple" defaultValue={openStepKey ? [openStepKey] : []} key={`${projectId}-${openStepKey ?? ''}`}>
            {stage.steps.map(step => <PathStepEditor key={step.key} step={step} readOnly={readOnly} busy={path.savingStep} save={draft => path.saveStep(step.key, draft)} />)}
          </Accordion>
        </AccordionContent>
      </AccordionItem>)}
    </Accordion>
  </div>;
}

function PathSettingsForm({ settings, save, busy }: { settings: PathSettings | null; save: ReturnType<typeof useBusinessPath>['saveSettings']; busy: boolean }) {
  const [types, setTypes] = useState<string[]>(settings?.business_types ?? []);
  const [money, setMoney] = useState(settings?.money_goal ?? '');
  const [hours, setHours] = useState(settings?.hours_per_week == null ? '' : String(settings.hours_per_week));
  useEffect(() => {
    setTypes(settings?.business_types ?? []); setMoney(settings?.money_goal ?? '');
    setHours(settings?.hours_per_week == null ? '' : String(settings.hours_per_week));
  }, [settings]);
  const submit = async () => {
    const number = hours.trim() ? Number(hours) : null;
    if (number != null && !Number.isFinite(number)) return toast.error('Hours per week must be a number.');
    try { await save({ business_types: types, money_goal: money.trim() || null, hours_per_week: number, visible_to_managers: settings?.visible_to_managers ?? false }); toast.success('Path settings saved.'); }
    catch (error) { toast.error(message(error)); }
  };
  return <Card><CardHeader><CardTitle className="text-xl">Path settings</CardTitle></CardHeader><CardContent className="space-y-4">
    <fieldset><legend className="font-semibold text-base">Business type</legend><p className="text-base mt-1">Steps change by business type. Pick every type that fits.</p>
      <div className="grid sm:grid-cols-2 mt-2 gap-x-4">{Object.entries(BUSINESS_TYPES).map(([key, label]) => <label key={key} className="flex gap-3 items-center min-h-11 text-base cursor-pointer">
        <Checkbox checked={types.includes(key)} onCheckedChange={checked => setTypes(previous => checked === true ? [...previous.filter(type => type !== key), key] : previous.filter(type => type !== key))} />{label}
      </label>)}</div>
    </fieldset>
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="block space-y-2 text-base font-medium">Money goal<Input className="min-h-11" value={money} onChange={event => setMoney(event.target.value)} /></label>
      <label className="block space-y-2 text-base font-medium">Hours per week<Input type="number" step="any" className="min-h-11" value={hours} onChange={event => setHours(event.target.value)} /></label>
    </div>
    <Button className="min-h-11" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
  </CardContent></Card>;
}

function PathStepEditor({ step, save, busy, readOnly }: { step: ProgressStep; save: (draft: StepDraft) => Promise<unknown>; busy: boolean; readOnly: boolean }) {
  const [status, setStatus] = useState<PathStatus>(step.status);
  const [note, setNote] = useState(step.saved?.note ?? '');
  const [proof, setProof] = useState(step.saved?.evidence_url ?? '');
  useEffect(() => { setStatus(step.status); setNote(step.saved?.note ?? ''); setProof(step.saved?.evidence_url ?? ''); }, [step.status, step.saved?.note, step.saved?.evidence_url]);
  const submit = async () => {
    try { await save({ status, note, evidence_url: proof }); toast.success('Step saved.'); }
    catch (error) { toast.error(message(error)); }
  };
  return <AccordionItem value={step.key}>
    <AccordionTrigger className="min-h-11 gap-3 text-left"><span className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
      <span className="text-base font-semibold break-words">{step.title}</span><Badge className="text-sm w-fit" variant="outline">{PATH_STATUSES[step.status]}</Badge>
    </span></AccordionTrigger>
    <AccordionContent className="space-y-4 text-base">
      <p className="whitespace-pre-wrap leading-relaxed">{step.instructions}</p>
      {step.proof && <p className="whitespace-pre-wrap"><strong>What counts as proof:</strong> {step.proof}</p>}
      {step.auto_check && <p className="whitespace-pre-wrap"><strong>HQ can check this later:</strong> {step.auto_check}</p>}
      {readOnly ? <><p className="whitespace-pre-wrap">{note}</p>{proof && <a href={proof} target="_blank" rel="noreferrer" className="text-primary underline">Open proof</a>}<p className="text-muted-foreground">Preview only</p></> : <>
      <label className="block space-y-2 font-medium">Notes: what's happening or what it's waiting on<Textarea rows={4} value={note} onChange={event => setNote(event.target.value)} /></label>
      <label className="block space-y-2 font-medium">Proof link<Input className="min-h-11" type="url" placeholder="https://…" value={proof} onChange={event => setProof(event.target.value)} /></label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Step status">{(Object.keys(PATH_STATUSES) as PathStatus[]).map(key => <Button key={key} className="min-h-11" variant={status === key ? 'default' : 'outline'} aria-pressed={status === key} onClick={() => setStatus(key)}>{PATH_STATUSES[key]}</Button>)}</div>
      <Button className="min-h-11" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save'}</Button>
      </>}
      {step.saved?.updated_at && <p className="text-base">Last updated: {new Date(step.saved.updated_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })} Pacific</p>}
    </AccordionContent>
  </AccordionItem>;
}