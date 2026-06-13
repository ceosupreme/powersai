// Marketing Hub domain model.
// Mock-only for Prompt 7. Unions are exported so a future migration can map 1:1 to enum columns.

export type CampaignOrigin = 'growth_audit' | 'manual_barpulse' | 'manual_external';

export type CampaignType =
  | 'Daily Special'
  | 'Weekly Special'
  | 'Limited-Time Promotion'
  | 'Event'
  | 'Happy Hour Variation'
  | 'Brand Partnership'
  | 'Content Push'
  | 'Seasonal/Holiday'
  | 'Other';

export type CampaignStatus =
  | 'Draft'
  | 'Approved'
  | 'Scheduled'
  | 'Live'
  | 'Ended'
  | 'Archived';

export type Recurrence = 'One-Time' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Custom';

export type MarketingChannel =
  | 'Instagram'
  | 'Facebook'
  | 'TikTok'
  | 'Email'
  | 'SMS'
  | 'Google Business Profile'
  | 'In-Venue Signage'
  | 'Staff Upsell'
  | 'Paid Ads'
  | 'Influencer'
  | 'Press';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type Recommendation = 'Repeat' | 'Tweak' | 'Retire';
export type FinalDecision = 'Kill' | 'Improve' | 'Repeat' | 'Scale';

export type ExecutionAdapterType = 'asana' | 'monday' | 'clickup' | 'barpulse_native';
export type ExecutionSyncStatus = 'Synced' | 'Syncing' | 'Sync Failed' | 'Not Synced';

export type ExecutionAdapter = {
  adapter_type: ExecutionAdapterType;
  external_id?: string | null;
  sync_status: ExecutionSyncStatus;
  last_synced_at?: string | null; // ISO
  error_message?: string | null;
};

export type AttributionTier = 1 | 2 | 3;

export type TierMetric = {
  actual?: number | null;
  baseline?: number | null;
  expected?: number | null;
  deltaPct?: number | null; // signed, vs baseline
};

export type Tier1Block = {
  available: boolean;
  unavailableReason?: string;
  promoCode?: { code: string; redemptions: number; revenue: number } | null;
  linkedItems?: { name: string; units: number; revenue: number }[];
  trackedLinks?: { source: string; clicks: number }[];
};

export type Tier2Block = {
  available: boolean;
  unavailableReason?: string;
  window?: { start: string; end: string };
  baselineWeeks?: number;
  revenue?: TierMetric;
  guests?: TierMetric;
  avgTicket?: TierMetric;
  topItems?: { name: string; units: number }[];
  labor?: { cost?: number | null; ratio?: number | null; baselineRatio?: number | null };
};

export type Tier3Block = {
  available: boolean;
  unavailableReason?: string;
  dayLevel?: TierMetric;
  shiftLevel?: TierMetric;
};

export type CampaignResults = {
  // Legacy/canonical headline fields (kept populated for backward compat).
  attributedRevenue?: number;
  redemptions?: number;
  featuredItemUnitsSold?: number;
  actualGuestCount?: number;
  actualVsExpectedDelta?: number; // percent, signed
  laborCost?: number;
  laborToRevenueRatio?: number; // 0..1
  roi?: number; // multiplier
  confidence?: ConfidenceLevel;
  narrativeSummary?: string;
  recommendation?: Recommendation;
  recommendationReasoning?: string;
  finalDecision?: FinalDecision;

  // Structured tier model (Prompt 10).
  attributionTier?: AttributionTier;
  tier1?: Tier1Block;
  tier2?: Tier2Block;
  tier3?: Tier3Block;
  expectations?: {
    revenue?: { expected?: number | null; actual?: number | null };
    guests?: { expected?: number | null; actual?: number | null };
  };

  // Provenance.
  generatedAt?: string; // ISO
  generatedBy?: 'auto' | 'manual';
  analysisVersion?: number;
  inputsHash?: string;
  asanaCommentGid?: string | null;
};

export type CampaignAttachment = { id: string; label: string; kind: 'image' | 'doc' | 'link' };

export type Campaign = {
  // Identity
  id: string;
  venueId: string;
  venueName: string;
  origin: CampaignOrigin;
  originatingFindingId?: string | null;

  // Core
  title: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  startTime?: string;      // HH:mm
  endTime?: string;        // HH:mm
  description: string;
  objective: string;
  recurrence: Recurrence;
  targetAudience: string;
  channels: MarketingChannel[];
  brandPartner?: string | null;
  brandPartnerContribution?: number | null;
  budget?: number | null;
  expectedGuestCount?: number | null;
  expectedRevenueImpact?: number | null;
  linkedToastPromoCode?: string | null;
  linkedMenuItems: string[];
  successMetric: string;
  assignedTo?: string | null;
  internalNotes?: string;
  attachments: CampaignAttachment[];

  // Execution adapter (generic — never Asana-specific in code)
  executionAdapter?: ExecutionAdapter | null;
  /** True when the linked external task was deleted in the source system. */
  syncLost?: boolean;
  /** Which side wrote the most recent change to this campaign. */
  lastSyncedFrom?: 'barpulse' | 'asana' | null;

  /** Campaign was ingested from Asana but is missing required fields. */
  needsDetails?: boolean;
  /** Field keys that are missing when needsDetails=true. */
  missingFields?: string[];
  /** External tooling subsource — e.g. 'jotform' for JotForm-created tasks. */
  externalSubsource?: string | null;

  // Results (only populated after Ended)
  results?: CampaignResults | null;

  createdAt: string;
  updatedAt: string;
};

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'Draft', 'Approved', 'Scheduled', 'Live', 'Ended', 'Archived',
];
export const CAMPAIGN_TYPES: CampaignType[] = [
  'Daily Special', 'Weekly Special', 'Limited-Time Promotion', 'Event',
  'Happy Hour Variation', 'Brand Partnership', 'Content Push', 'Seasonal/Holiday', 'Other',
];
export const CAMPAIGN_ORIGINS: CampaignOrigin[] = [
  'growth_audit', 'manual_barpulse', 'manual_external',
];

export const ORIGIN_LABEL: Record<CampaignOrigin, string> = {
  growth_audit: 'Growth Audit',
  manual_barpulse: 'Manual (Supreme Team Media)',
  manual_external: 'Manual (External)',
};
