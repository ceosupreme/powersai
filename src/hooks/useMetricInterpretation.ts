import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { StatTile, MetricComparison } from '@/lib/metricStats';

interface Args {
  enabled: boolean;
  cacheKey: string; // (barId|weekId|scoreKey)
  pillar: string;
  metricLabel: string;
  scoreKey: string;
  gmName?: string | null;
  venueName?: string | null;
  weekStart?: string | null;
  tiles: StatTile[];
  comparison?: MetricComparison;
}

interface State {
  text: string;
  isStreaming: boolean;
  error: string | null;
  insufficient: boolean;
}

// In-memory cache so reopening the same metric in a session is instant.
const cache = new Map<string, { text: string; insufficient: boolean }>();
let lastQuotaToastAt = 0;

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metric-interpretation`;

export function useMetricInterpretation(args: Args): State {
  const { enabled, cacheKey } = args;
  const [state, setState] = useState<State>({ text: '', isStreaming: false, error: null, insufficient: false });
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const cached = cache.get(cacheKey);
    if (cached) {
      setState({ text: cached.text, isStreaming: false, error: null, insufficient: cached.insufficient });
      return;
    }

    setState({ text: '', isStreaming: true, error: null, insufficient: false });
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';

    (async () => {
      try {
        const resp = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            pillar: args.pillar,
            metricLabel: args.metricLabel,
            scoreKey: args.scoreKey,
            gmName: args.gmName ?? null,
            venueName: args.venueName ?? null,
            weekStart: args.weekStart ?? null,
            tiles: args.tiles,
            comparison: args.comparison ?? null,
          }),
        });

        if (resp.status === 429 || resp.status === 402) {
          // One toast per minute, max.
          const now = Date.now();
          if (now - lastQuotaToastAt > 60_000) {
            lastQuotaToastAt = now;
            toast({
              title: 'AI temporarily unavailable',
              description: resp.status === 402 ? 'AI credits exhausted.' : 'Rate limited, try again shortly.',
            });
          }
          setState({ text: '', isStreaming: false, error: 'unavailable', insufficient: false });
          return;
        }

        if (!resp.ok || !resp.body) {
          setState({ text: '', isStreaming: false, error: 'failed', insufficient: false });
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let done = false;
        while (!done) {
          const r = await reader.read();
          if (r.done) break;
          buffer += decoder.decode(r.value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') { done = true; break; }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                acc += delta;
                setState((s) => ({ ...s, text: acc }));
              }
            } catch {
              buffer = line + '\n' + buffer;
              break;
            }
          }
        }

        const trimmed = acc.trim();
        const insufficient = !trimmed || trimmed.toUpperCase().includes('INSUFFICIENT');
        cache.set(cacheKey, { text: insufficient ? '' : trimmed, insufficient });
        setState({ text: insufficient ? '' : trimmed, isStreaming: false, error: null, insufficient });
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
        console.error('metric-interpretation stream error', err);
        setState({ text: '', isStreaming: false, error: 'failed', insufficient: false });
      }
    })();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cacheKey]);

  return state;
}
