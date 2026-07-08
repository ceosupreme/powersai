import type { LeakStackInput, LeakStackResult } from '@/hooks/useLeakStack';

export const SOURCE_LABEL: Record<NonNullable<LeakStackInput['source']>, string> = {
  signal: 'Live signal',
  override: 'Project override',
  vertical_default: 'Vertical default',
  fallback: 'Conservative fallback',
};

export const SOURCE_TONE: Record<NonNullable<LeakStackInput['source']>, string> = {
  signal: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  override: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  vertical_default: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  fallback: 'bg-muted text-muted-foreground border-border',
};

export function formatDollars(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function buildHookSentence(r: LeakStackResult): string {
  const dollars = formatDollars(r.monthly_dollars);
  const benchmark = r.benchmark ? ` — ${r.benchmark}` : '';
  return `You're leaking an estimated ${dollars}/mo to ${r.name}${benchmark}.`;
}