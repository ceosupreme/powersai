import { useState, useEffect, useRef } from 'react';
import { ActionCard } from '@/types/venue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Loader2, Send, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ToolEvidence, type ToolCallRecord } from './ToolEvidence';

interface FollowUpMessage {
  role: 'user' | 'assistant';
  content: string;
  evidence?: ToolCallRecord[];
}

interface DeepDiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ActionCard;
  barId?: string;
}

const DEEP_DIVE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/insight-deep-dive`;

// Simple markdown-like rendering
const renderContent = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0">{line.slice(3)}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-2">{line.slice(4)}</h3>;
    }
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-foreground/80 text-sm mb-2">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{part}</strong> : part
          )}
        </p>
      );
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="text-foreground/80 text-sm ml-4 mb-1 list-disc">{line.slice(2)}</li>;
    }
    if (/^\d+\.\s/.test(line)) {
      return <li key={i} className="text-foreground/80 text-sm ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    return <p key={i} className="text-foreground/80 text-sm mb-2">{line}</p>;
  });
};

interface SSEDeltaHandlers {
  onText?: (delta: string) => void;
  onEvidence?: (evidence: ToolCallRecord[]) => void;
}

const parseSSEStream = async (response: Response, handlers: SSEDeltaHandlers) => {
  if (!response.body) throw new Error('No response body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const handleLine = (raw: string) => {
    let line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (line.startsWith(':') || line.trim() === '' || !line.startsWith('data: ')) return;
    const json = line.slice(6).trim();
    if (json === '[DONE]') return;
    try {
      const parsed = JSON.parse(json);
      const delta = parsed.choices?.[0]?.delta;
      if (delta?.content) handlers.onText?.(delta.content);
      if (Array.isArray(delta?.tool_evidence) && delta.tool_evidence.length) {
        handlers.onEvidence?.(delta.tool_evidence);
      }
    } catch { /* malformed event, ignore */ }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      handleLine(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
  }
  if (buffer.trim()) buffer.split('\n').forEach(handleLine);
};

export const DeepDiveModal = ({ open, onOpenChange, card, barId }: DeepDiveModalProps) => {
  const [content, setContent] = useState('');
  const [evidence, setEvidence] = useState<ToolCallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  const [followUps, setFollowUps] = useState<FollowUpMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isSolutionLoading, setIsSolutionLoading] = useState(false);
  const [hasRunSolution, setHasRunSolution] = useState(false);

  useEffect(() => {
    if (open && !hasStartedRef.current) {
      hasStartedRef.current = true;
      fetchDeepDive();
    }
    if (!open) {
      hasStartedRef.current = false;
      setContent('');
      setEvidence([]);
      setError(null);
      setFollowUps([]);
      setFollowUpInput('');
      setIsSolutionLoading(false);
      setHasRunSolution(false);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [content, followUps, evidence]);

  const authedFetch = async (url: string, body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  };

  const fetchDeepDive = async () => {
    setIsLoading(true);
    setError(null);
    setContent('');
    setEvidence([]);

    try {
      const response = await authedFetch(DEEP_DIVE_URL, {
        mode: 'initial',
        insight_id: card.insightId,
        bar_id: barId,
        insight_title: card.insight_title,
        insight_summary: card.insight_summary,
        problem_detail: card.problem_detail,
        pillar: card.pillar,
        action_title: card.action_title,
        priority: card.priority,
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limited. Please try again in a moment.');
        if (response.status === 402) throw new Error('AI credits exhausted. Please add credits to continue.');
        throw new Error('Failed to fetch deep dive analysis');
      }
      let accumulated = '';
      await parseSSEStream(response, {
        onText: (d) => { accumulated += d; setContent(accumulated); },
        onEvidence: (ev) => setEvidence((prev) => [...prev, ...ev]),
      });
    } catch (err) {
      console.error('Deep dive error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze insight');
    } finally {
      setIsLoading(false);
    }
  };

  const sendFollowUp = async () => {
    if (!followUpInput.trim() || isFollowUpLoading) return;
    const userMsg: FollowUpMessage = { role: 'user', content: followUpInput.trim() };
    setFollowUps(prev => [...prev, userMsg]);
    setFollowUpInput('');
    setIsFollowUpLoading(true);

    let assistantContent = '';
    let assistantEvidence: ToolCallRecord[] = [];

    try {
      const conversation: FollowUpMessage[] = [
        { role: 'assistant', content },
        ...followUps,
        userMsg,
      ];
      const response = await authedFetch(DEEP_DIVE_URL, {
        mode: 'followup',
        insight_id: card.insightId,
        bar_id: barId,
        question: userMsg.content,
        messages: conversation.slice(-20).map(m => ({ role: m.role, content: m.content })),
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Session expired. Please sign in again.');
        if (response.status === 429) throw new Error('Too many requests. Please try again in a minute.');
        throw new Error('AI assistant is temporarily unavailable.');
      }
      setFollowUps(prev => [...prev, { role: 'assistant', content: '', evidence: [] }]);
      await parseSSEStream(response, {
        onText: (delta) => {
          assistantContent += delta;
          setFollowUps(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: assistantContent };
            }
            return updated;
          });
        },
        onEvidence: (ev) => {
          assistantEvidence = [...assistantEvidence, ...ev];
          setFollowUps(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, evidence: assistantEvidence };
            }
            return updated;
          });
        },
      });
    } catch (err) {
      console.error('Follow-up error:', err);
      setFollowUps(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && !m.content)),
        { role: 'assistant', content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong.'}` },
      ]);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const runDeepSolution = async () => {
    if (isSolutionLoading || hasRunSolution) return;
    setIsSolutionLoading(true);
    setHasRunSolution(true);

    const userMsg: FollowUpMessage = { role: 'user', content: 'Dig into solutions' };
    setFollowUps(prev => [...prev, userMsg, { role: 'assistant', content: '', evidence: [] }]);

    let assistantContent = '';
    let assistantEvidence: ToolCallRecord[] = [];

    try {
      const response = await authedFetch(DEEP_DIVE_URL, {
        mode: 'solution',
        insight_id: card.insightId,
        bar_id: barId,
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Session expired. Please sign in again.');
        if (response.status === 429) throw new Error('Too many requests. Please try again in a minute.');
        if (response.status === 402) throw new Error('AI credits exhausted. Please add credits to continue.');
        throw new Error('Deep solution is temporarily unavailable.');
      }
      await parseSSEStream(response, {
        onText: (delta) => {
          assistantContent += delta;
          setFollowUps(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: assistantContent };
            }
            return updated;
          });
        },
        onEvidence: (ev) => {
          assistantEvidence = [...assistantEvidence, ...ev];
          setFollowUps(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, evidence: assistantEvidence };
            }
            return updated;
          });
        },
      });
    } catch (err) {
      console.error('Deep solution error:', err);
      setHasRunSolution(false); // allow retry
      setFollowUps(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && !m.content)),
        { role: 'assistant', content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong.'}` },
      ]);
    } finally {
      setIsSolutionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-card border-border">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            AI Deep Dive
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{card.insight_title}</p>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 -mx-6 px-6 overflow-y-auto min-h-0">
          <div className="py-4">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
                <Button variant="outline" size="sm" onClick={fetchDeepDive} className="mt-2 w-full">
                  Try Again
                </Button>
              </div>
            )}

            {isLoading && !content && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
                </div>
                <p className="mt-4 text-sm">Analyzing insight...</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Resolving source records</p>
              </div>
            )}

            {content && (
              <div className={cn("prose prose-sm max-w-none", isLoading && "animate-pulse")}>
                {renderContent(content)}
                {isLoading && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />}
              </div>
            )}

            {evidence.length > 0 && <ToolEvidence evidence={evidence} />}

            {followUps.length > 0 && (
              <div className="mt-6 border-t border-border pt-4 space-y-4">
                {followUps.map((msg, i) => (
                  <div key={i} className={cn("text-sm", msg.role === 'user' ? "text-right" : "")}>
                    {msg.role === 'user' ? (
                      <div className="inline-block bg-primary/10 text-foreground rounded-lg px-3 py-2 max-w-[85%] text-left">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        {renderContent(msg.content)}
                        {(isFollowUpLoading || isSolutionLoading) && i === followUps.length - 1 && (
                          <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                        )}
                        {msg.evidence && msg.evidence.length > 0 && (
                          <ToolEvidence evidence={msg.evidence} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!isLoading && content && (
          <div className="flex-shrink-0 pt-3 border-t border-border space-y-2">
            {!hasRunSolution && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runDeepSolution}
                disabled={isSolutionLoading}
                className="w-full"
              >
                {isSolutionLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Investigating...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" /> Dig into solutions</>
                )}
              </Button>
            )}
            <form onSubmit={(e) => { e.preventDefault(); sendFollowUp(); }} className="flex gap-2">
              <Input
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                disabled={isFollowUpLoading}
                className="flex-1 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!followUpInput.trim() || isFollowUpLoading}
                className="shrink-0"
              >
                {isFollowUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
