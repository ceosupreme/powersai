import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceSummarySectionProps {
  summary: string;
  className?: string;
}

function decodeEscapedLines(value: string) {
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

function extractBriefingFromObject(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;

  const briefing = (value as { briefing?: unknown }).briefing;
  return typeof briefing === 'string' ? briefing : null;
}

function extractBriefingFromDump(value: string): string | null {
  const match = value.match(
    /["']?briefing["']?\s*:\s*["']?([\s\S]*?)(?:["'],?\s*["']?wins["']?\s*:|["'],?\s*["']?key_drivers["']?\s*:|["']?\s*\}|$)/i
  );
  if (!match?.[1]) return null;

  return match[1]
    .replace(/^["']/, '')
    .replace(/["'],?\s*$/, '')
    .trim() || null;
}

function normalizeSummary(summary: string): string | null {
  const raw = summary?.trim();
  if (!raw) return null;

  let extracted = raw;

  try {
    const sanitized = raw.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    const parsed = JSON.parse(sanitized);
    extracted = extractBriefingFromObject(parsed) ?? raw;
  } catch {
    extracted = extractBriefingFromDump(raw) ?? raw;
  }

  const normalized = decodeEscapedLines(extracted)
    .replace(/^briefing\s*:\s*/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();

  return normalized || null;
}

function renderSummary(summary: string) {
  const normalized = normalizeSummary(summary);
  if (!normalized) return null;

  const recommendationMatch = normalized.match(/\*\*Recommendation:\*\*|Recommendation:/i);

  if (!recommendationMatch || recommendationMatch.index == null) {
    return <p className="text-sm leading-7 text-foreground/75 whitespace-pre-line">{normalized}</p>;
  }

  const intro = normalized.slice(0, recommendationMatch.index).trim();
  const recommendation = normalized
    .slice(recommendationMatch.index)
    .replace(/^\*\*Recommendation:\*\*\s*/i, '')
    .replace(/^Recommendation:\s*/i, '')
    .trim();

  return (
    <div className="space-y-0">
      {intro ? (
        <p className="text-sm leading-7 text-foreground/75 whitespace-pre-line">{intro}</p>
      ) : null}
      <p className="mt-3 text-sm leading-7 text-foreground/80 whitespace-pre-line">
        <strong className="font-semibold text-foreground">Recommendation:</strong>
        {recommendation ? ` ${recommendation}` : ''}
      </p>
    </div>
  );
}

export function PerformanceSummarySection({ summary, className }: PerformanceSummarySectionProps) {
  const content = renderSummary(summary);
  if (!content) return null;

  return (
    <section className={cn('bg-card border border-border rounded-xl p-4 md:p-5', className)}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">Performance Summary</h2>
      </div>
      <div className="max-w-3xl">{content}</div>
    </section>
  );
}
