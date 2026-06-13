// ============================================================================
// Source attribution helper (extracted from generate-daily-insights A18 block).
// Resolves a raw AI insight to a source_log_id by trusting AI-provided ids only
// when they appear in the candidate set, falling back to a deterministic
// (source_date, source_family) match when exactly one candidate matches.
// ============================================================================

export const SOURCE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SourceFamily = 'barpulse' | 'asana' | '7shifts_tasks' | '7shifts_logbook';

export interface CandidateLog {
  id: string;
  date: string;
  family: SourceFamily;
}

export function familyForSourceType(st: string | null | undefined): SourceFamily | null {
  const s = String(st || '').toLowerCase();
  if (!s) return null;
  if (s.includes('asana')) return 'asana';
  if (s.includes('7shifts task') || s.includes('task summary')) return '7shifts_tasks';
  if (s.includes('7shifts shift') || s.includes('shift feedback') || s.includes('logbook')) return '7shifts_logbook';
  if (s.includes('barpulse log') || s.includes('shift log') || s.includes('gm log') || s.includes('lead log') || s.includes('manager log')) return 'barpulse';
  return null;
}

export interface ResolveContext {
  candidates: CandidateLog[];
  knownIds: Set<string>;
}

export function buildResolveContext(candidates: CandidateLog[]): ResolveContext {
  return { candidates, knownIds: new Set(candidates.map((c) => c.id)) };
}

export function resolveSourceLogId(
  ctx: ResolveContext,
  insight: { source_type?: string | null; source_log_id?: unknown },
  sourceDate: string,
): string | null {
  const provided = (insight as any).source_log_id;
  if (typeof provided === 'string' && SOURCE_UUID_RE.test(provided) && ctx.knownIds.has(provided)) {
    return provided;
  }
  const fam = familyForSourceType(insight.source_type ?? null);
  if (!fam || !sourceDate) return null;
  const matches = ctx.candidates.filter((c) => c.date === sourceDate && c.family === fam);
  return matches.length === 1 ? matches[0].id : null;
}
