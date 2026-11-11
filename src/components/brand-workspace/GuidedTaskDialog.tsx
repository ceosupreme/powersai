import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCompleteNextTenRow, type NextTenRow } from '@/hooks/useNextTen';
import { useCreateTask } from '@/hooks/useTasks';
import { parseFacts } from '@/lib/ownerWork';
import { toast } from 'sonner';

function validExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch { return null; }
}

/** Actual actionable task view. Updates fail visibly if RLS denies writes. */
export function GuidedTaskDialog({ row, onClose }: { row: NextTenRow | null; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [requestMode, setRequestMode] = useState<'help' | 'change' | null>(null);
  const [working, setWorking] = useState(false);
  const complete = useCompleteNextTenRow();
  const helpTask = useCreateTask();
  const task = useQuery({
    queryKey: ['guided-task', row?.projectId, row?.refId],
    enabled: !!row && row.source === 'Action',
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('action_items')
        .select('id,title,detail,facts,output_url,status,owner_kind,job_id')
        .eq('id', row!.refId)
        .or(`venue_id.eq.${row!.projectId},bar_id.eq.${row!.projectId}`)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This step is unavailable for your brand.');
      return data as {
        id: string; title: string; detail: string | null; facts: string | null;
        output_url: string | null; status: string; owner_kind: string | null; job_id: string | null;
      };
    },
  });
  const parsed = parseFacts(task.data?.facts);
  useEffect(() => {
    setNote(typeof parsed.facts?.operator_note === 'string' ? parsed.facts.operator_note : '');
  }, [task.data?.id, task.data?.facts]);

  const saveNote = async () => {
    if (!row || !task.data) return;
    setWorking(true);
    try {
      const existing = parsed.facts ?? (parsed.text ? { original_note: parsed.text } : {});
      const { data: changed, error } = await (supabase as any).from('action_items')
        .update({ facts: JSON.stringify({ ...existing, operator_note: note }) })
        .eq('id', row.refId)
        .or(`venue_id.eq.${row.projectId},bar_id.eq.${row.projectId}`)
        .select('id').maybeSingle();
      if (error || !changed) throw error ?? new Error('Your permissions did not allow this change.');
      await task.refetch();
      toast.success('Progress note saved on this step.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save your progress.');
    } finally {
      setWorking(false);
    }
  };

  const requestHelp = async () => {
    if (!row || !note.trim() || !task.data || !requestMode) return;
    setWorking(true);
    try {
      await helpTask.mutateAsync({
        bar_id: row.projectId,
        title: `${requestMode === 'help' ? 'Help needed' : 'Change requested'}: ${task.data.title}`,
        description: [
          `Brand: ${row.projectName}`,
          `Step: ${task.data.title}`,
          `Source action ID: ${task.data.id}`,
          task.data.job_id ? `Plan: /project/${row.projectId}/jobs/${task.data.job_id}` : '',
          '',
          note.trim(),
        ].filter(Boolean).join('\n'),
        status: 'Todo',
        priority: 'High',
      });
      toast.success('Request added to the HQ task list.');
      setRequestMode(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not submit the request.');
    } finally {
      setWorking(false);
    }
  };

  const markDone = async () => {
    if (!row || row.source !== 'Action' || !task.data || task.data.status === 'Done') return;
    setWorking(true);
    try {
      await complete.mutateAsync(row);
      toast.success('Step completed. Your next priority will appear on Today.');
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not complete this step.');
    } finally { setWorking(false); }
  };

  const facts = parsed.facts;
  const links = Object.entries(facts?.links ?? {})
    .map(([label, url]) => ({ label, url: validExternalUrl(url) }))
    .filter((item): item is { label: string; url: string } => !!item.url);
  const output = validExternalUrl(task.data?.output_url);

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.data?.title || row?.step || 'Your next step'}</DialogTitle>
          <DialogDescription>
            {row?.projectName}{row?.dueDate ? ` · due ${row.dueDate.slice(0, 10)}` : ''}
            {row?.note ? ` · ${row.note}` : ''}
          </DialogDescription>
        </DialogHeader>
        {task.isLoading ? <p className="text-sm">Loading your instructions…</p> :
          task.isError ? <p role="alert" className="text-sm text-destructive">{(task.error as Error)?.message}</p> :
          task.data && (
            <div className="space-y-4">
              <section className="space-y-2">
                <h3 className="font-semibold text-sm">What to do</h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {task.data.detail || parsed.text || 'No written instructions are available yet. Request clarification before marking this complete.'}
                </p>
              </section>
              {!!facts?.inputs?.length && <section><h3 className="font-semibold text-sm">You'll need</h3><ul className="mt-1 list-disc pl-5 text-sm space-y-1">{facts.inputs.map((x, i) => <li key={i}>{String(x)}</li>)}</ul></section>}
              {facts?.expected_output && <section><h3 className="font-semibold text-sm">What you'll finish with</h3><p className="text-sm">{String(facts.expected_output)}</p></section>}
              {!!facts?.checks?.length && <section><h3 className="font-semibold text-sm">Before you mark complete</h3><ul className="mt-1 list-disc pl-5 text-sm space-y-1">{facts.checks.map((x, i) => <li key={i}>{String(x)}</li>)}</ul></section>}
              {(links.length > 0 || output) && (
                <div className="flex flex-wrap gap-2">
                  {links.map(({ label, url }) => <Button key={label} size="sm" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer">{label}</a></Button>)}
                  {output && <Button size="sm" variant="outline" asChild><a href={output} target="_blank" rel="noreferrer">Open work result</a></Button>}
                </div>
              )}
              <section className="space-y-2 border-t pt-4">
                <Label htmlFor="step-progress-note">Progress note (optional)</Label>
                <Textarea id="step-progress-note" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="What have you finished, or what needs attention?" rows={3} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={working} onClick={saveNote}>Save progress note</Button>
                  <Button variant="outline" size="sm" disabled={working} onClick={() => setRequestMode('help')}>I'm stuck</Button>
                  <Button variant="outline" size="sm" disabled={working} onClick={() => setRequestMode('change')}>Something needs changing</Button>
                </div>
                {requestMode && <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">{requestMode === 'help' ? 'Ask HQ for help' : 'Request a plan change'}</p>
                  <p className="text-xs text-muted-foreground">Your note becomes an actual HQ task linked to this step.</p>
                  <Button size="sm" disabled={working || !note.trim()} onClick={requestHelp}>Submit request</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRequestMode(null)}>Cancel</Button>
                </div>}
              </section>
            </div>
          )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button disabled={!task.data || working || complete.isPending || task.data?.status === 'Done'} onClick={markDone}>
            {task.data?.status === 'Done' ? 'Completed' : 'All done — next step'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
