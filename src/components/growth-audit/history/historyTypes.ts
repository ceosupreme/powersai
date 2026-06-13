// Audit-history types (extracted from mockHistory.ts on persistence cutover).
// Snapshot rows are immutable point-in-time captures.

import type { FindingCategoryKey } from '../findings/mockFindings';

export type AuditRunType = 'manual' | 'scheduled';

export type SnapshotFinding = {
  id: string;
  title: string;
  category: FindingCategoryKey;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priorityScore: number;
};

export type AuditRun = {
  id: string;
  /** ISO timestamp captured at run completion */
  timestamp: string;
  type: AuditRunType;
  overallScore: number;
  /** 8-category score map at run time */
  categoryScores: Record<FindingCategoryKey, number>;
  /** Findings active at run time (top by priority) */
  findings: SnapshotFinding[];
  /** Human summary derived from delta vs prior run */
  keyChanges: string;
  /** Display name of the user who triggered the run, if manual */
  triggeredByName?: string;
};

export type FindingsFlowPoint = {
  month: string;
  opened: number;
  resolved: number;
};

export type CampaignActivityPoint = {
  month: string;
  launched: number;
  repeat: number;
  tweak: number;
  retire: number;
};

export type ScoreSnapshotPoint = {
  date: string; // ISO date YYYY-MM-DD
  overall: number | null;
  revenue: number | null;
  menu: number | null;
  events: number | null;
  local: number | null;
  reputation: number | null;
  social: number | null;
  website: number | null;
  operational: number | null;
};
