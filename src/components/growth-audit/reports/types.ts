import type { CategoryScore, PrimaryMetrics, Priority, QuickStats } from '../mockData';
import type { Finding, FindingCategoryKey } from '../findings/mockFindings';
import type { FoundationScoreResult } from '@/components/foundation-audit/deriveFoundationScores';

export type ReportType = 'profit_leak' | 'full' | 'executive' | 'category' | 'custom';

export type ReportConfig = {
  type: ReportType;
  /** Categories to include. For `executive` this is ignored (top findings only). */
  categories: FindingCategoryKey[];
  /** ISO date strings (Pacific date) */
  dateRange: { start: string; end: string };
  preparedFor?: string;
  venueName: string;
};

/** Point-in-time snapshot — captured when "Generate Report" is clicked. */
export type ReportSnapshot = {
  id: string;
  config: ReportConfig;
  generatedAt: string; // ISO
  primary: PrimaryMetrics;
  categories: CategoryScore[];
  priorities: Priority[];
  findings: Finding[];
  quickStats: QuickStats;
  /** Per-venue Foundation Audit result captured at generation time. */
  foundation?: FoundationScoreResult | null;
  /** Static methodology + data sources captured at generation time */
  methodology: string[];
  dataSources: { label: string; status: 'Connected' | 'Partial' | 'Not connected' }[];
};
