import type { Finding } from './mockFindings';

// Display labels for 1–5 scales. Keeping these in one place so Prompt 5 can swap
// FindingType / scale labels without touching cards or filters.
export const upsideLabel = (n: number): 'Low' | 'Med' | 'High' | 'Very High' => {
  if (n <= 1) return 'Low';
  if (n <= 2) return 'Med';
  if (n <= 4) return 'High';
  return 'Very High';
};

export const easeLabel = (n: number): 'Easy' | 'Med' | 'Hard' => {
  if (n >= 4) return 'Easy';
  if (n >= 2) return 'Med';
  return 'Hard';
};

export const confidenceLabel = (n: number): 'Low' | 'Med' | 'High' => {
  if (n >= 4) return 'High';
  if (n >= 2) return 'Med';
  return 'Low';
};

export const opsRiskLabel = (n: number): 'Low' | 'Med' | 'High' => {
  if (n >= 4) return 'High';
  if (n >= 2) return 'Med';
  return 'Low';
};

/** Priority Score: (upside × ease × confidence − ops_risk), clamped & normalized to 0–100. */
export const computePriorityScore = (
  upside: number, ease: number, confidence: number, opsRisk: number,
): number => {
  const raw = upside * ease * confidence - opsRisk;
  const MAX = 5 * 5 * 5 - 1; // 124
  const clamped = Math.max(0, raw);
  return Math.round((clamped / MAX) * 100);
};

export const upsideTone = (n: number) => {
  const l = upsideLabel(n);
  return l === 'Very High' || l === 'High'
    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : l === 'Med' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    : 'bg-muted text-muted-foreground border-border';
};

export const easeTone = (n: number) => {
  const l = easeLabel(n);
  return l === 'Easy' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : l === 'Med' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    : 'bg-orange-500/15 text-orange-600 border-orange-500/30';
};

export const sortFindings = (
  list: Finding[],
  by: 'priority' | 'created' | 'severity' | 'upside',
): Finding[] => {
  const sevRank = { Critical: 4, High: 3, Medium: 2, Low: 1 } as const;
  const copy = [...list];
  switch (by) {
    case 'created': return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'severity': return copy.sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
    case 'upside': return copy.sort((a, b) => b.revenueUpside - a.revenueUpside);
    case 'priority':
    default: return copy.sort((a, b) => b.priorityScore - a.priorityScore);
  }
};
