// NOTE: Despite the legacy filename, this module no longer contains mock
// fixtures. The MOCK_FINDINGS array was removed when the Growth Audit was
// wired end-to-end to real per-venue `growth_findings` rows. It now only
// exports shared Finding-shape types + CATEGORY_LABEL. File kept named
// `mockFindings.ts` to avoid a churn-only rename across ~20 importers.

import type { FindingType } from './findingTypes';

export type { FindingType } from './findingTypes';

export type FindingCategoryKey =
  | 'revenue' | 'menu' | 'events' | 'local' | 'reputation' | 'social' | 'website' | 'operational' | 'context';

export const CATEGORY_LABEL: Record<FindingCategoryKey, string> = {
  revenue: 'Revenue Patterns',
  menu: 'Menu Marketing',
  events: 'Event Performance',
  local: 'Local Search Visibility',
  reputation: 'Online Reputation',
  social: 'Social & Content',
  website: 'Website & Conversion',
  operational: 'Operational Readiness',
  context: 'Local Context Awareness',
};

export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type FindingStatus =
  | 'New' | 'In Progress' | 'Sent to Marketing Hub' | 'Resolved' | 'Dismissed' | 'Snoozed';

export type EvidenceSource = { label: string; ref: string };

export type Finding = {
  id: string;
  title: string;
  category: FindingCategoryKey;
  type: FindingType;
  severity: FindingSeverity;
  revenueUpside: 1 | 2 | 3 | 4 | 5;
  ease: 1 | 2 | 3 | 4 | 5;
  confidence: 1 | 2 | 3 | 4 | 5;
  operationalRisk: 1 | 2 | 3 | 4 | 5;
  priorityScore: number;
  isTrafficDriving: boolean;
  gateReason?: string;
  evidence: { summary: string; sources: EvidenceSource[] };
  /** Resolved diagnosis text (the type's bracketed pattern, filled in). */
  diagnosis: string;
  /** Resolved recommended-action text (the type's bracketed pattern, filled in). */
  recommendedAction: string;
  status: FindingStatus;
  snoozedUntil?: string;
  dismissReason?: string;
  // Forward-compatible — populated in later prompts
  actionPackId?: string;
  campaignId?: string;
  result?: 'Kill' | 'Improve' | 'Repeat' | 'Scale';
  createdAt: string; // ISO
  signalKey?: string | null;
  metadata?: Record<string, unknown>;
};
  // 1. Soft Shift Opportunity — generic mid-week demand window
