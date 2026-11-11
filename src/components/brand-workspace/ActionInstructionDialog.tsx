import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompleteNextTenRow } from '@/hooks/useNextTen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Action = {
  id: string; title: string; detail: string | null; facts: string | null;
  status: string; approval_status: string | null; estimated_minutes: number | null;
  due_date: string | null; feedback_note: string | null; output_url: string | null;
};
function stepFacts(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const obj: unknown = JSON.parse(raw);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj as Record<string, unknown> : {};
  } catch { return {}; }
}

/** Admin-facing reader for unlinked tasks; production jobs have their own step screen. */
export function ActionInstructionDialog({ projectId, projectName, actionId, onClose }: {
  projectId: string; projectName: string; actionId: string | null; onClose: () => void;
}) {
  const qc = useQueryClient();
  const complete = useCompleteNextTenRow();
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const row = useQuery({
    queryKey: ['brand-action-instructions', projectId, actionId],
    enabled: !!actionId,
    queryFn: async (): Promise<Action> => {
      const { data, error } = await supabase.from('action_items')
        .select('id,title,detail,facts,status,approval_status,estimated_minutes,due_date,feedback_note,output_url')
        .eq('id', actionId!).eq('bar_id', projectId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This task cannot be opened for the selected project.');
      return data as Action;
    },
  });
  useEffect(() => {
    setNote(row.data?.feedback_note ?? '');
    setUrl(row.data?.output_url ?? '');
  }, [row.data?.id]);
  const save = async () => {
    if (!row.data) return;
    if (url.trim()) {
      try { const v = new URL(url.trim()); if (v.protocol !== 'https:' && v.protocol !== 'http:') throw new Error(); }
      catch { return toast.error('Use a valid HTTP(S) link, or leave the link empty.'); }
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('action_items')
        .update({ feedback_note: note.trim() || null, output_url: url.trim() || null })
        .eq('id', row.data.id).eq('bar_id', projectId);
      if (error) throw error;
      await row.refetch();
      toast.success('Progress saved. The task remains open.');
    } catch (error: any) { toast.error(error?.message ?? 'Could not save progress.'); }
    finally { setSaving(false); }
  };
  const done = async () => {
    if (!row.data || row.data.status === 'Done') return;
    try {
      await complete.mutateAsync({
        key: 'action-' + row.data.id, source: 'Action', step: row.data.title,
        projectId, projectName, refId: row.data.id, rank: 0,
      });
      await qc.invalidateQueries({ queryKey: ['brand-work-summary', projectId] });
      toast.success('Task completed. The next priority is now on your Today page.');
      onClose();
    } catch (error: any) { toast.error(error?.message ?? 'Could not complete the task.'); }
  };
  const facts = stepFacts(row.data?.facts ?? null);
  return <Dialog open={!!actionId} onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{row.data?.title ?? 'Work instructions'}</DialogTitle>
        <DialogDescription>Read the task, save your work, and mark it finished when it's actually done.</DialogDescription>
      </DialogHeader>
      {row.isLoading ? <p role="status">Opening the task…</p> : row.isError ?
        <p role="alert">The task could not be loaded. Try again from the brand page.</p> :
        row.data && <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            {row.data.due_date ? 'Due ' + row.data.due_date.slice(0, 10) : 'No due date'}
            {row.data.estimated_minutes != null ? ' · About ' + row.data.estimated_minutes + ' minutes' : ''}
          </div>
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <strong>What to do</strong>
            <p className="whitespace-pre-wrap">{row.data.detail || 'Detailed instructions are missing. Add them before assigning this task.'}</p>
            {typeof facts.expected_output === 'string' && <p><strong>Expected result: </strong>{facts.expected_output}</p>}
            {Array.isArray(facts.checks) && facts.checks.length > 0 &&
              <ul className="list-disc pl-4">{facts.checks.map((x,i)=><li key={i}>{String(x)}</li>)}</ul>}
          </div>
          <label className="block space-y-1 text-sm"><span className="font-medium">Progress notes</span>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What you completed or what you still need…" />
          </label>
          <label className="block space-y-1 text-sm"><span className="font-medium">Work link (optional)</span>
            <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"/>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={saving || complete.isPending} onClick={save}>Save progress</Button>
            <Button size="sm" disabled={saving || complete.isPending || row.data.status === 'Done' || row.data.approval_status === 'Blocked'} onClick={done}>Done — show next priority</Button>
          </div>
        </div>}
    </DialogContent>
  </Dialog>;
}
