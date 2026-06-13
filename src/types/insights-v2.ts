// ============= Insights & Actions System v2 Types =============

import type { Pillar } from './venue';

// Severity levels for insights (v2)
export type SeverityV2 = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

// Insight types
export type InsightType = 'Pillar Summary' | 'Issue' | 'Opportunity' | 'Recognition';

// Insight status
export type InsightStatus = 'New' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Dismissed';

// Action status (v2)
export type ActionStatusV2 = 'Not Started' | 'In Progress' | 'Done' | 'Cancelled';

// Effort levels
export type EffortLevel = 'Quick' | 'Short' | 'Long' | 'Project';

// Approval status
export type ApprovalStatus = 'Proposed' | 'Approved' | 'Rejected';

// Overall sentiment
export type Sentiment = 'Strong' | 'Good' | 'Mixed' | 'Challenging' | 'Critical';

// Grade
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// Weekly Briefing - AI-generated summary
export interface WeeklyBriefingV2 {
  id: string;
  week: string[];
  bar: string[];
  headline: string;
  overall_sentiment: Sentiment;
  overall_score: number;
  overall_grade: Grade;
  highlights: string;
  highlights_json?: string;
  watch_fors: string;
  watch_fors_json?: string;
  priority_actions: string;
  priority_actions_json?: string;
  talking_points: string;
  talking_points_json?: string;
  revenue_summary: string;
  labor_summary: string;
  operations_summary: string;
  guest_summary: string;
  marketing_summary: string;
  recognition: string;
  coaching_needed: string;
  next_week_focus: string;
  // Pillar scores from linked scorecard
  revenue_score?: number;
  labor_score?: number;
  operations_score?: number;
  guest_experience_score?: number;
  marketing_score?: number;
}

// Map Airtable pillar values to app pillar types
export type PillarV2 = 'Revenue' | 'Labor' | 'Operations' | 'Guest' | 'Marketing';

// Insight v2 - observations/problems
export interface InsightV2 {
  id: string;
  insight_id?: number;
  week: string[];
  bar: string[];
  pillar: PillarV2;
  insight_type: InsightType;
  severity: SeverityV2;
  title: string;
  summary: string;
  detail: string;
  facts: string;
  source?: string;
  source_type?: string;
  source_date?: string;
  source_metric?: string;
  source_value?: string;
  source_context?: string;
  estimated_impact: string;
  status: InsightStatus;
  is_recurring: boolean;
  streak_weeks: number;
  generated_at: string;
  // Linked actions (populated client-side)
  actions?: ActionItemV2[];
  // Resolved week start date
  weekStart?: string;
  // daily or weekly insight mode
  insight_mode?: string;
  // Period-keyed insights (e.g. inventory) — independent of Mon-Sun weeks
  period_start?: string;
  period_end?: string;
  period_label?: string;
  // Employee linkage (for labor compliance alerts)
  employee_id?: string | null;
  employee_name?: string | null;
}

// Action Item v2 - tasks to fix insights
export interface ActionItemV2 {
  id: string;
  action_id?: number;
  insight: string[]; // Link to WeeklyInsights
  week: string[];
  title: string;
  detail: string;
  estimated_minutes: number;
  effort_level: EffortLevel;
  suggested_assignee: string;
  assignee: string;
  due_date: string;
  approval_status: ApprovalStatus;
  status: ActionStatusV2;
  asana_task_gid?: string;
  asana_task_url?: string;
  // Resolved week start date
  weekStart?: string;
}

// Pillar with score for summary display
export interface PillarScore {
  pillar: Pillar;
  score: number;
  summary?: string;
  grade: Grade;
}

// Filter state for insights page
export interface InsightFiltersState {
  selectedWeek: string | null;
  selectedPillar: PillarV2 | null;
  severityFilter: SeverityV2[];
  statusFilter: InsightStatus | 'all';
  sortBy: 'severity' | 'newest' | 'pillar' | 'dueDate';
}

// Severity order for sorting (Critical first)
export const SEVERITY_ORDER: Record<SeverityV2, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Info: 4,
};

// Pillar order for sorting
export const PILLAR_ORDER: Record<PillarV2, number> = {
  Revenue: 0,
  Labor: 1,
  Operations: 2,
  Guest: 3,
  Marketing: 4,
};

// Helper to map pillar names from Airtable to app types
export const mapPillarV2 = (airtablePillar: string): PillarV2 => {
  const pillarMap: Record<string, PillarV2> = {
    'Revenue': 'Revenue',
    'Labor': 'Labor',
    'Operations': 'Operations',
    'Guest': 'Guest',
    'Guest Experience': 'Guest',
    'Marketing': 'Marketing',
  };
  return pillarMap[airtablePillar] || 'Operations';
};

// Helper to get full pillar name for display
export const getPillarDisplayName = (pillar: PillarV2): Pillar => {
  if (pillar === 'Guest') return 'Guest Experience';
  return pillar;
};

// Helper to get score color based on grade
export const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 80) return 'text-emerald-300';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 60) return 'text-orange-400';
  return 'text-red-400';
};

// Helper to get grade from score
export const getGradeFromScore = (score: number): Grade => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};
