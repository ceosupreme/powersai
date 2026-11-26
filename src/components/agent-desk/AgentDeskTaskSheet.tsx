import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Sparkles, Send, CheckCircle2, RotateCcw, ArrowRightLeft, XCircle, Share2, Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { streamAskBarPulse } from '@/lib/askStream';
import {
  AGENTS, agentLabel, formatPacific, getProofLinks, getPublishedLinks, isSocialPost,
  isStudioLeased, readableSpec, statusLabel, whatHappenedOf, type AgentHandoffRow,
} from '@/lib/agentDesk';
import type { useAgentDesk } from '@/hooks/useAgentDesk';
import { useAgentTaskSheet } from '@/hooks/useAgentDesk';

type Actions = ReturnType<typeof useAgentDesk>['actions'];

interface Props {
  row: AgentHandoffRow | null;
  historyRows: AgentHandoffRow[];
  brandNames: Map<string, string>;
  isAdmin: boolean;
  actions: Actions;
  initialAction?: 'answer' | 'posted' | null;
  onClose: () => void;
}

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'X', 'Other'];

export function AgentDeskTaskSheet({ row, historyRows, brandNames, isAdmin, actions, initialAction, onClose }: Props) {
  const saved = useAgentTaskSheet(row?.id ?? null);
  row = saved.row ?? row;
  historyRows = saved.historyRows;
  const [mode, setMode] = useState<'none' | 'answer' | 'sendBack' | 'reassign' | 'cancel' | 'done' | 'posted'>('none');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [toAgent, setToAgent] = useState('claude');
  const [platform, setPlatform] = useState('Instagram');
  const [askOpen, setAskOpen] = useState(false);
  const [askQ, setAskQ] = useState('');
  const [askAns, setAskAns] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    setMode(initialAction ?? 'none');
    setText(''); setUrl(''); setLabel(''); setAskOpen(false); setAskQ(''); setAskAns('');
  }, [row?.id, initialAction]);

  if (!row) return null;
  const leased = isStudioLeased(row);
  const canAct = isAdmin && !leased;
  const proofs = getProofLinks(row);
  const published = getPublishedLinks(row);
  const specEntries = readableSpec(row.spec);
  const whatHappened = whatHappenedOf(row);
  const brands = (row.brand_ids ?? []).map((id) => brandNames.get(id)).filter(Boolean) as string[];

  const handleAsk = async () => {
    if (!askQ.trim() || asking) return;
    setAsking(true); setAskAns('');
    try {
      await streamAskBarPulse({
        question: askQ.trim(),
        context: {
          mode: 'brand_task',
          task: { title: row.title, status: statusLabel(row), from: agentLabel(row.from_agent), to: agentLabel(row.to_agent), brands, owner_question: row.owner_question, what_happened: whatHappened, spec: row.spec, notes: row.notes },
        },
        history: [],
        onText: setAskAns,
      });
    } catch (e) {
      setAskAns(e instanceof Error ? e.message : 'Could not get an answer right now.');
    } finally { setAsking(false); }
  };

  const doneThenReset = () => { setMode('none'); setText(''); setUrl(''); setLabel(''); };

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto pb-24">
        <SheetHeader className="text-left space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={row.status === 'failed' ? 'destructive' : row.status === 'needs_owner' ? 'default' : 'secondary'}>
              {statusLabel(row)}
            </Badge>
            <span className="text-xs text-muted-foreground">{agentLabel(row.from_agent)} → {agentLabel(row.to_agent)}</span>
            {brands.map((b) => <Badge key={b} variant="outline" className="text-xs">{b}</Badge>)}
          </div>
          <SheetTitle className="text-lg leading-snug">{row.title}</SheetTitle>
          <SheetDescription className="text-xs">
            Created {formatPacific(row.created_at)}
            {row.due_at ? ` · Due ${formatPacific(row.due_at)}` : ''}
            {row.claimed_at ? ` · Claimed ${formatPacific(row.claimed_at)}` : ''}
            {row.last_run_at ? ` · Last run ${formatPacific(row.last_run_at)}` : ''}
            {row.completed_at ? ` · Finished ${formatPacific(row.completed_at)}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5 text-sm">
          {leased && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Content Studio is working on this right now. Actions unlock when it finishes.</span>
            </div>
          )}

          {row.owner_question ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Question for you</p>
              <p className="text-foreground whitespace-pre-wrap">{row.owner_question}</p>
            </div>
          ) : whatHappened ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What happened</p>
              <p className="text-foreground whitespace-pre-wrap">{whatHappened}</p>
            </div>
          ) : null}

          {canAct && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>
              <div className="flex flex-wrap gap-2">
                {row.status === 'needs_owner' && (
                  <Button size="sm" onClick={() => setMode(mode === 'answer' ? 'none' : 'answer')}><Send className="h-3.5 w-3.5 mr-1.5" />Answer</Button>
                )}
                {isSocialPost(row) && row.status !== 'cancelled' && (
                  <Button size="sm" variant="default" onClick={() => setMode(mode === 'posted' ? 'none' : 'posted')}><Share2 className="h-3.5 w-3.5 mr-1.5" />Mark posted</Button>
                )}
                {row.status !== 'done' && row.status !== 'cancelled' && (
                  <Button size="sm" variant="secondary" onClick={() => setMode(mode === 'done' ? 'none' : 'done')}><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark done with proof</Button>
                )}
                {row.to_agent !== 'owner' && row.status !== 'cancelled' && (
                  <Button size="sm" variant="outline" onClick={() => setMode(mode === 'sendBack' ? 'none' : 'sendBack')}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Send back</Button>
                )}
                {row.to_agent !== 'owner' && row.status !== 'done' && row.status !== 'cancelled' && (
                  <Button size="sm" variant="outline" onClick={() => setMode(mode === 'reassign' ? 'none' : 'reassign')}><ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />Hand to agent</Button>
                )}
                {row.status !== 'done' && row.status !== 'cancelled' && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setMode(mode === 'cancel' ? 'none' : 'cancel')}><XCircle className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
                )}
              </div>

              {mode === 'answer' && (
                <div className="space-y-2 pt-2 border-t">
                  <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer for the agent..." rows={3} />
                  <Button size="sm" disabled={!text.trim() || actions.answer.isPending} onClick={() => actions.answer.mutate({ id: row.id, answer: text }, { onSuccess: doneThenReset })}>
                    Send answer
                  </Button>
                </div>
              )}
              {mode === 'posted' && (
                <div className="space-y-2 pt-2 border-t">
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... (live post link)" />
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" disabled={!url.trim() || actions.markPosted.isPending} onClick={() => actions.markPosted.mutate({ id: row.id, url, platform }, { onSuccess: doneThenReset })}>
                    Save live post
                  </Button>
                </div>
              )}
              {mode === 'done' && (
                <div className="space-y-2 pt-2 border-t">
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... (proof link, required)" />
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Link label (optional, e.g. Drive folder)" />
                  <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Short summary (optional)" rows={2} />
                  <Button size="sm" disabled={!url.trim() || actions.markDone.isPending} onClick={() => actions.markDone.mutate({ id: row.id, url, label, summary: text }, { onSuccess: doneThenReset })}>
                    Save as done
                  </Button>
                </div>
              )}
              {mode === 'sendBack' && (
                <div className="space-y-2 pt-2 border-t">
                  <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What should the agent change or redo?" rows={3} />
                  <Button size="sm" disabled={!text.trim() || actions.sendBack.isPending} onClick={() => actions.sendBack.mutate({ id: row.id, note: text }, { onSuccess: doneThenReset })}>
                    Send back
                  </Button>
                </div>
              )}
              {mode === 'reassign' && (
                <div className="space-y-2 pt-2 border-t">
                  <Select value={toAgent} onValueChange={setToAgent}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AGENTS.filter((a) => a !== row.to_agent).map((a) => <SelectItem key={a} value={a}>{agentLabel(a)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional note for the new agent" rows={2} />
                  <Button size="sm" disabled={actions.reassign.isPending} onClick={() => actions.reassign.mutate({ id: row.id, toAgent, note: text }, { onSuccess: doneThenReset })}>
                    Hand over
                  </Button>
                </div>
              )}
              {mode === 'cancel' && (
                <div className="space-y-2 pt-2 border-t">
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reason (optional)" />
                  <Button size="sm" variant="destructive" disabled={actions.cancel.isPending} onClick={() => actions.cancel.mutate({ id: row.id, reason: text }, { onSuccess: doneThenReset })}>
                    Confirm cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          {(proofs.length > 0 || published.length > 0 || row.content_item_id || row.action_item_id) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proof & links</p>
              <div className="flex flex-wrap gap-2">
                {proofs.map((p) => (
                  <Button key={p.url} size="sm" variant="outline" asChild>
                    <a href={p.url} target="_blank" rel="noreferrer">{p.label}<ExternalLink className="h-3.5 w-3.5 ml-1.5" /></a>
                  </Button>
                ))}
                {published.map((p) => (
                  <Button key={p.url} size="sm" variant="secondary" asChild>
                    <a href={p.url} target="_blank" rel="noreferrer">Live on {p.platform}<ExternalLink className="h-3.5 w-3.5 ml-1.5" /></a>
                  </Button>
                ))}
                {row.content_item_id && (
                  <Button size="sm" variant="outline" asChild><Link to="/content-studio">Open in Content Studio</Link></Button>
                )}
                {row.action_item_id && (
                  <Button size="sm" variant="outline" asChild><Link to="/tasks">Linked to-do</Link></Button>
                )}
              </div>
            </div>
          )}

          {specEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instructions</p>
              <dl className="divide-y divide-border rounded-lg border border-border">
                {specEntries.map((e) => (
                  <div key={e.label} className="p-2.5 space-y-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">{e.label}</dt>
                    <dd className="text-sm text-foreground whitespace-pre-wrap break-words">{e.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {saved.loading && <p role="status" className="text-sm text-muted-foreground">Loading task history…</p>}
          {saved.error && <p role="alert" className="text-sm text-destructive">The latest task or its history could not be loaded.</p>}
          {historyRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
              <ul className="space-y-2">
                {historyRows.map((h) => (
                  <li key={h.id} className="rounded-lg border border-border p-2.5 text-xs space-y-1">
                    <div className="flex justify-between gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground">{h.title}</span>
                      <span>{formatPacific(h.created_at)}</span>
                    </div>
                    {h.notes && <p className="text-muted-foreground whitespace-pre-wrap">{h.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 border-t space-y-2">
            <Button size="sm" variant="ghost" className="px-0" onClick={() => setAskOpen((v) => !v)}>
              <Sparkles className="h-4 w-4 mr-1.5 text-primary" />{askOpen ? 'Hide Ask about this' : 'Ask about this'}
            </Button>
            {askOpen && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={askQ} onChange={(e) => setAskQ(e.target.value)} placeholder="Ask a question about this task..." onKeyDown={(e) => e.key === 'Enter' && handleAsk()} />
                  <Button size="sm" disabled={!askQ.trim() || asking} onClick={handleAsk}>{asking ? '...' : 'Ask'}</Button>
                </div>
                {askAns && <div className="rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap">{askAns}</div>}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}