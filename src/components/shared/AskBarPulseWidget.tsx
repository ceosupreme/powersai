import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ToolEvidence, type ToolCallRecord } from './ToolEvidence';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  evidence?: ToolCallRecord[];
}

interface AskBarPulseWidgetProps {
  context: {
    pillar: string;
    weekLabel?: string;
    metrics?: Record<string, any>;
    bar_id?: string;
    barId?: string;
  };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-barpulse`;

export const AskBarPulseWidget = ({ context }: AskBarPulseWidgetProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const contextRef = useRef(context);
  contextRef.current = context;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-expand when messages exist
  useEffect(() => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsExpanded(true);

    let assistantContent = '';
    let assistantEvidence: ToolCallRecord[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: input.trim(),
          context: {
            ...contextRef.current,
            bar_id: contextRef.current.bar_id || contextRef.current.barId,
          },
          messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Your session expired. Please sign in again.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please try again in a minute.');
        } else {
          throw new Error(errorData.error || 'AI assistant is temporarily unavailable.');
        }
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', evidence: [] }]);

      const handleLine = (raw: string) => {
        let line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
        if (line.startsWith(':') || line.trim() === '' || !line.startsWith('data: ')) return;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            assistantContent += delta.content;
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: assistantContent };
              }
              return updated;
            });
          }
          if (Array.isArray(delta?.tool_evidence) && delta.tool_evidence.length) {
            assistantEvidence = [...assistantEvidence, ...delta.tool_evidence];
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, evidence: assistantEvidence };
              }
              return updated;
            });
          }
        } catch { /* malformed event, ignore */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = textBuffer.indexOf('\n')) !== -1) {
          handleLine(textBuffer.slice(0, idx));
          textBuffer = textBuffer.slice(idx + 1);
        }
      }
      if (textBuffer.trim()) textBuffer.split('\n').forEach(handleLine);
    } catch (error) {
      console.error('Error asking BarPulse:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== '');
        return [...filtered, {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Sorry, I had trouble responding. Please try again.'
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div className="bg-card border border-primary/30 rounded-xl overflow-hidden hover:border-primary/50 transition-colors duration-200 shadow-sm">
        {/* Collapsible Header */}
        <button
          onClick={toggleExpand}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-muted-foreground text-xs md:text-sm font-medium uppercase tracking-wide hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span>Ask Supreme</span>
            {messages.length > 0 && !isExpanded && (
              <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full">
                {messages.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Collapsible Messages area */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="h-[140px] md:h-[180px] overflow-y-auto p-3 space-y-2 md:space-y-3 border-t border-primary/20">
            {messages.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-primary/60" />
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Ask me about your {context.pillar.toLowerCase()} performance
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn('animate-fade-in-up', msg.role === 'user' ? 'flex justify-end' : '')}>
                  <div
                    className={cn(
                      'text-xs md:text-sm rounded-xl px-3 py-2 max-w-[90%]',
                      msg.role === 'user'
                        ? 'bg-primary/20 text-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {msg.content || (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Thinking...
                      </span>
                    )}
                    {msg.role === 'assistant' && msg.evidence && msg.evidence.length > 0 && (
                      <ToolEvidence evidence={msg.evidence} />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - always visible */}
        <div className="border-t border-primary/30 p-2 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            placeholder="Ask a question..."
            className="flex-1 h-10 md:h-9 text-sm bg-background rounded-lg"
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 md:h-9 md:w-9 p-0 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg touch-manipulation transition-all duration-200 hover:shadow-md"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
