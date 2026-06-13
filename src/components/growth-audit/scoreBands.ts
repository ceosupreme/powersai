export type ScoreBand = {
  label: 'Strong' | 'Moderate' | 'Weak' | 'Critical';
  /** Tailwind text/border/bg color hints; semantic-ish via existing palette */
  text: string;
  bg: string;
  border: string;
  ring: string;
};

export const getScoreBand = (n: number): ScoreBand => {
  if (n >= 80) return { label: 'Strong', text: 'text-emerald-600', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', ring: 'ring-emerald-500/30' };
  if (n >= 60) return { label: 'Moderate', text: 'text-amber-600', bg: 'bg-amber-500/15', border: 'border-amber-500/40', ring: 'ring-amber-500/30' };
  if (n >= 40) return { label: 'Weak', text: 'text-orange-600', bg: 'bg-orange-500/15', border: 'border-orange-500/40', ring: 'ring-orange-500/30' };
  return { label: 'Critical', text: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/40', ring: 'ring-destructive/30' };
};

export type Severity = 'High' | 'Medium' | 'Low';
export const severityTone = (s: Severity) =>
  s === 'High' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : s === 'Medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
  : 'bg-muted text-muted-foreground border-border';

export type DataConfidence = 'Complete' | 'Partial' | 'Limited' | 'Unavailable';
export const confidenceTone = (c: DataConfidence) =>
  c === 'Complete' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
  : c === 'Partial' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
  : c === 'Limited' ? 'bg-orange-500/15 text-orange-600 border-orange-500/30'
  : 'bg-muted text-muted-foreground border-border';

export type OpportunityLevel = 'Low' | 'Medium' | 'High' | 'Very High';
export const opportunityIndex = (l: OpportunityLevel) =>
  ({ Low: 1, Medium: 2, High: 3, 'Very High': 4 }[l]);

export type ReadinessGate = 'Green Light' | 'Caution' | 'Needs Ops Fix First';

/** Derive the gate from the Operational Readiness category score. */
export const deriveGate = (opsScore: number): ReadinessGate => {
  if (opsScore >= 70) return 'Green Light';
  if (opsScore >= 50) return 'Caution';
  return 'Needs Ops Fix First';
};
export const readinessTone = (g: ReadinessGate) =>
  g === 'Green Light' ? { text: 'text-emerald-600', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' }
  : g === 'Caution' ? { text: 'text-amber-600', dot: 'bg-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/40' }
  : { text: 'text-destructive', dot: 'bg-destructive', bg: 'bg-destructive/10', border: 'border-destructive/40' };
