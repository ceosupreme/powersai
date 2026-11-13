import { supabase } from '@/integrations/supabase/client';
import type { ToolCallRecord } from '@/components/shared/ToolEvidence';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-barpulse`;

/** Streams one ask-barpulse answer; calls onText with the full text so far. */
export async function streamAskBarPulse(opts: {
  question: string;
  context: Record<string, unknown>;
  history: { role: 'user' | 'assistant'; content: string }[];
  onText: (text: string) => void;
  onEvidence?: (evidence: ToolCallRecord[]) => void;
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question: opts.question, context: opts.context, messages: opts.history.slice(-20) }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Your session expired. Please sign in again.');
    if (response.status === 429) throw new Error('Too many requests. Please try again in a minute.');
    throw new Error(errorData.error || 'AI assistant is temporarily unavailable.');
  }
  if (!response.body) throw new Error('No response body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  let evidence: ToolCallRecord[] = [];
  const handleLine = (raw: string) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line.startsWith('data: ')) return;
    const json = line.slice(6).trim();
    if (json === '[DONE]') return;
    try {
      const delta = JSON.parse(json).choices?.[0]?.delta;
      if (delta?.content) { text += delta.content; opts.onText(text); }
      if (Array.isArray(delta?.tool_evidence) && delta.tool_evidence.length) {
        evidence = [...evidence, ...delta.tool_evidence];
        opts.onEvidence?.(evidence);
      }
    } catch { /* malformed event, ignore */ }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) { handleLine(buf.slice(0, idx)); buf = buf.slice(idx + 1); }
  }
  if (buf.trim()) buf.split('\n').forEach(handleLine);
  return text;
}
