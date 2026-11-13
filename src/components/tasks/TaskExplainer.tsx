import { ReactNode, useEffect, useState } from 'react';
import { ChevronDown, Loader2, MessageCircleQuestion, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

/** Phone check that is right on the first draw, so a sheet opened at once slides up instead of in from the side. */
export function usePhoneSheetSide(): 'bottom' | 'right' {
  const later = useIsMobile();
  const [first] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [settled, setSettled] = useState(false);
  useEffect(() => { setSettled(true); }, []);
  return (settled ? later : first) ? 'bottom' : 'right';
}
import { streamAskBarPulse } from '@/lib/askStream';
import { cn } from '@/lib/utils';

/** Everything a task row can explain about itself. Empty fields are hidden. */
export interface TaskExplanation {
  title: string;
  detail?: string | null;
  why?: string | null;
  ownerKind?: string | null;
  minutes?: number | null;
  brand?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  pillar?: string | null;
  status?: string | null;
  /** Project the "Ask about this" chat is scoped to. */
  projectId?: string | null;
  /** Hide the "Your part" block (non-action rows). */
  hideYourPart?: boolean;
}

const fmtDue = (iso?: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export function yourPartText(ownerKind?: string | null, minutes?: number | null): string {
  const time = minutes && minutes > 0 ? ` About ${minutes} minutes.` : '';
  if (ownerKind === 'owner') return `This is waiting on you. You do this step yourself.${time}`;
  if (ownerKind === 'claude' || ownerKind === 'agent') return `An agent is doing this work. You only review and approve it.${time}`;
  return `No one has been named for this step yet.${time}`;
}

function Section({ label, tone, children }: { label: string; tone: string; children: ReactNode }) {
  return (
    <div>
      <p className={cn('text-xs font-semibold uppercase tracking-wide mb-1', tone)}>{label}</p>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

/** Expanded explanation body for one task. */
export function TaskExplanationBody({ task, onAsk }: { task: TaskExplanation; onAsk?: () => void }) {
  const meta = [task.brand, task.priority, task.dueDate ? `due ${fmtDue(task.dueDate)}` : null, task.pillar]
    .filter((v) => v && v !== '—');
  return (
    <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <Section label="What this is" tone="text-primary">
        {task.detail?.trim()
          ? <p className="whitespace-pre-wrap break-words">{task.detail}</p>
          : <p className="text-muted-foreground">No explanation was saved for this task yet.</p>}
      </Section>
      {task.why?.trim() && (
        <Section label="Why it matters" tone="text-amber-700 dark:text-amber-300">
          <p className="whitespace-pre-wrap break-words">{task.why}</p>
        </Section>
      )}
      {!task.hideYourPart && (
        <Section label="Your part" tone="text-emerald-700 dark:text-emerald-300">
          <p>{yourPartText(task.ownerKind, task.minutes)}</p>
        </Section>
      )}
      {meta.length > 0 && <p className="text-sm text-muted-foreground">{meta.join(' · ')}</p>}
      {onAsk && task.projectId && (
        <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onAsk}>
          <MessageCircleQuestion className="h-4 w-4 mr-1.5" /> Ask about this
        </Button>
      )}
    </div>
  );
}

/**
 * A task row that expands to explain itself. `header` is the always-visible
 * title area; `actions` stay visible and behave exactly as before.
 */
export function TaskExplainer({
  task, header, actions, defaultOpen = false, leading, trailing, className,
}: {
  task: TaskExplanation;
  header?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [asking, setAsking] = useState(false);
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        {leading}
        <button
          type="button"
          aria-expanded={open}
          className="min-w-0 flex-1 text-left flex items-start gap-2 min-h-11 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="min-w-0 flex-1">{header ?? <p className="text-sm text-foreground">{task.title}</p>}</div>
          <ChevronDown aria-hidden className={cn('h-5 w-5 mt-0.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
          <span className="sr-only">{open ? 'Hide explanation' : 'Show explanation'}</span>
        </button>
        {trailing}
      </div>
      {open && <TaskExplanationBody task={task} onAsk={() => setAsking(true)} />}
      {actions}
      {asking && <TaskAskSheet task={task} onClose={() => setAsking(false)} />}
    </div>
  );
}

const STARTERS = ['What exactly do I need to do?', 'Why does this matter for this brand?', 'What happens if I skip it?'];

/** Small chat about one task, scoped to its project, using ask-barpulse. */
export function TaskAskSheet({ task, onClose, heading = 'Ask about this task', starters = STARTERS }: {
  task: TaskExplanation; onClose: () => void; heading?: string; starters?: string[];
}) {
  const isMobile = usePhoneSheetSide() === 'bottom';
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || loading || !task.projectId) return;
    const history = messages;
    setMessages([...history, { role: 'user', content: q }, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    const setLast = (content: string) => setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: 'assistant', content };
      return next;
    });
    try {
      const answer = await streamAskBarPulse({
        question: q,
        history,
        context: {
          pillar: 'Task',
          bar_id: task.projectId,
          task: {
            title: task.title, detail: task.detail ?? '', why: task.why ?? '', brand: task.brand ?? '',
            owner_kind: task.ownerKind ?? '', status: task.status ?? '',
          },
        },
        onText: setLast,
      });
      if (!answer.trim()) setLast('No answer came back. Please try again.');
    } catch (e) {
      setLast(e instanceof Error ? e.message : 'Sorry, I had trouble responding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('flex flex-col gap-3', isMobile ? 'h-[85vh]' : 'w-full sm:max-w-md')}>
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">{heading}</SheetTitle>
          <SheetDescription className="text-sm">{task.title}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-3" aria-live="polite">
          {messages.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pick a question or type your own.</p>
              {starters.map((s) => (
                <Button key={s} variant="outline" className="w-full justify-start min-h-11 text-sm h-auto whitespace-normal text-left" onClick={() => ask(s)}>
                  {s}
                </Button>
              ))}
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' && 'justify-end')}>
              <div className={cn('rounded-lg px-3 py-2 text-sm max-w-[90%] whitespace-pre-wrap break-words',
                m.role === 'user' ? 'bg-primary/15 text-foreground' : 'bg-muted text-foreground')}>
                {m.content || <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</span>}
              </div>
            </div>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" className="h-11 text-base" disabled={loading} />
          <Button type="submit" className="h-11 w-11 p-0" disabled={loading || !input.trim()} aria-label="Send">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
