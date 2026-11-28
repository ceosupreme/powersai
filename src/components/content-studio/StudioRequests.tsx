import { Clock3, RefreshCw } from 'lucide-react';
import { DriveLink } from '@/components/drive/DrivePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { studioFacts, studioHooks, studioObject, studioTaskStatus, studioTaskType, studioText, studioUrl, type StudioTask } from '@/lib/contentStudio';

export function StudioRequests({ tasks, loading, error, busy, onRefresh, onCancel, onRetry, onRun }: {
  tasks: StudioTask[]; loading: boolean; error: boolean; busy: boolean; onRefresh: () => void;
  onCancel: (task: StudioTask) => void; onRetry: (task: StudioTask) => void;
  onRun: (task: StudioTask) => void;
}) {
  return <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="studio-requests">
    <div className="flex items-center justify-between gap-3"><h2 id="studio-requests" className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4" />Saved requests</h2>
      <Button size="sm" variant="ghost" onClick={onRefresh} aria-label="Refresh requests and saved results"><RefreshCw className="h-4 w-4" /></Button></div>
    <p className="text-xs leading-relaxed text-muted-foreground">Requests carry this piece’s saved choices and research to the team mailbox. Connected research and writing tools return results here. Production requests wait for the production worker.</p>
    {loading && <p role="status" className="text-sm text-muted-foreground">Loading requests…</p>}
    {error && <p role="alert" className="text-sm text-destructive">Requests could not be loaded. Try refreshing.</p>}
    {!loading && !error && !tasks.length && <p className="text-sm text-muted-foreground">No requests for this piece yet.</p>}
    {tasks.slice(0, 8).map(task => {
      const result = studioObject(task.result);
      const patch = studioObject(studioObject(result.submission).patch || result.patch);
      const creative = studioObject(patch.creative);
      const decisions = studioObject(patch.decisions);
      const facts = studioFacts(studioObject(patch.research));
      const hooks = studioHooks(decisions);
      const links = Array.isArray(task.result_links) ? task.result_links : [];
      return <details key={task.id} className="rounded-lg border p-3">
        <summary className="cursor-pointer space-y-1 text-sm"><span className="font-medium capitalize">{studioTaskType(task)}</span> <Badge variant="outline" className="text-xs font-normal">{studioTaskStatus(task.status)}</Badge></summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>{task.title}</p><p>Requested {new Date(task.created_at).toLocaleString()}</p>
          {studioText(studioObject(task.spec).instructions) && <p className="whitespace-pre-wrap">{studioText(studioObject(task.spec).instructions)}</p>}
          {task.notes && <p className="whitespace-pre-wrap">{task.notes}</p>}
          {studioText(result.summary || result.notes) && <p className="whitespace-pre-wrap text-foreground">{studioText(result.summary || result.notes)}</p>}
          {(facts.length > 0 || hooks.length > 0 || creative.script || decisions.shot_plan) && <details className="rounded border p-2"><summary className="cursor-pointer font-medium text-foreground">Read returned work</summary><div className="mt-3 space-y-4">
            {facts.map(fact => <div key={fact.id}><p className="font-medium capitalize">{fact.kind === 'scenario' ? 'Scenario assumption' : 'Factual claim'}</p><p className="whitespace-pre-wrap">{fact.text}</p>{studioUrl(fact.source_url) && <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">Source</a>}</div>)}
            {hooks.map(hook => <div key={hook.id}><p className="font-medium">{hook.label}</p><p className="whitespace-pre-wrap">{hook.text}</p>{hook.rationale && <p>{hook.rationale}</p>}</div>)}
            {studioText(creative.script) && <div><h4 className="font-semibold">Script</h4><p className="mt-1 whitespace-pre-wrap">{studioText(creative.script)}</p></div>}
            {studioText(decisions.shot_plan) && <div><h4 className="font-semibold">Scenes & assets</h4><p className="mt-1 whitespace-pre-wrap">{studioText(decisions.shot_plan)}</p></div>}
          </div></details>}
          {links.map((entry: any, i) => {
            const href = studioUrl(typeof entry === 'string' ? entry : entry?.url);
            return href ? <DriveLink key={i} href={href}>{typeof entry === 'string' ? entry : entry.label || entry.title || href}</DriveLink> : null;
          })}
          {task.completed_at && <p>Finished {new Date(task.completed_at).toLocaleString()}</p>}
          {task.status === 'new' && ['research', 'draft'].includes(studioTaskType(task)) && <Button size="sm" disabled={busy} onClick={() => onRun(task)}>Start connected worker</Button>}
          {['new', 'queued', 'claimed', 'running', 'failed', 'needs_owner'].includes(task.status) && <div className="flex flex-wrap gap-2 pt-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => onCancel(task)}>Cancel request</Button>{['failed', 'needs_owner'].includes(task.status) && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onRetry(task)}>Retry with current choices</Button>}</div>}
        </div>
      </details>;
    })}
  </section>;
}
