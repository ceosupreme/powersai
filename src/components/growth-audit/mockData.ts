// NOTE: Despite the legacy filename, this module no longer contains mock
// fixtures. The MOCK_PRIMARY / MOCK_CATEGORIES / MOCK_PRIORITIES /
// MOCK_QUICK_STATS constants were removed when the Growth Audit was wired
// end-to-end to real per-venue data. Type exports kept here to avoid a
// churn-only rename across importers.

import type { LucideIcon } from 'lucide-react';
import type { DataConfidence, OpportunityLevel, ReadinessGate, Severity } from './scoreBands';

export type PrimaryMetrics = {
  growthScore: number | null;
  growthTrend: number; // delta vs last audit
  opportunityLevel: OpportunityLevel;
  opportunityDollars: string;
  dataConfidence: DataConfidence;
  dataConfidenceNote: string;
  readiness: ReadinessGate;
  readinessReason: string;
  lastRunLabel: string;
};

export type CategoryScore = {
  key: string;
  name: string;
  icon: LucideIcon;
  score: number | null;
  trend: number;
  openFindings: number;
  confidence: DataConfidence;
};

export type Priority = {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  upside: string;
  /** Traffic-driving findings are subject to the Ops Readiness Gate. */
  isTrafficDriving: boolean;
  /** Why this finding is gated; surfaced on Caution / Needs Ops Fix First. */
  gateReason?: string;
};

export type QuickStats = {
  openFindings: number;
  resolvedThisMonth: number;
  campaignsLaunched: number;
  opportunitySurfaced: string;
};
