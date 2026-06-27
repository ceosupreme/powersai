import type { CategoryScore, PrimaryMetrics, Priority, QuickStats } from '../mockData';
import type { Finding } from '../findings/mockFindings';
import type { FoundationScoreResult } from '@/components/foundation-audit/deriveFoundationScores';
import type { ReportConfig, ReportSnapshot } from './types';

const METHODOLOGY = [
  'The Growth Audit aggregates 8 categories of venue performance signals scored 0–100, rolled into an overall Growth Score.',
  'Findings are surfaced when at least one signal in a category breaches its baseline by a statistically meaningful margin over the trailing window.',
  'Each finding carries Revenue Upside, Ease, Confidence, and Operational Risk on a 1–5 scale, combined into a Priority Score.',
  'The Operational Readiness Gate guards traffic-driving recommendations: campaigns are paused while ops capacity is below threshold.',
];

export type CaptureSnapshotInput = {
  primary: PrimaryMetrics;
  categories: CategoryScore[];
  priorities: Priority[];
  quickStats: QuickStats;
  findings: Finding[];
  foundation?: FoundationScoreResult | null;
  /** Per-venue data-source connection states, derived in the call site. */
  dataSources?: ReportSnapshot['dataSources'];
};

/**
 * Build an immutable snapshot from real per-venue Growth Audit state.
 * Note: icon refs on categories are non-serializable but the renderer reads
 * them by reference within the same session, so we keep them on the object.
 */
export const captureSnapshot = (
  config: ReportConfig,
  data: CaptureSnapshotInput,
): ReportSnapshot => ({
  id: `rpt_${Date.now().toString(36)}`,
  config,
  generatedAt: new Date().toISOString(),
  primary: { ...data.primary },
  categories: data.categories.map((c) => ({ ...c })),
  priorities: data.priorities.map((p) => ({ ...p })),
  findings: data.findings.map((f) => ({ ...f })),
  quickStats: { ...data.quickStats },
  foundation: data.foundation ?? null,
  methodology: METHODOLOGY,
  dataSources: data.dataSources ?? [],
});
