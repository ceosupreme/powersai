// Analyzer registry. Add a new analyzer = drop a file + push it here.

import type { AnalyzerModule } from './types.ts';
import { softShiftAnalyzer } from './softShift.ts';
import { strongShiftAnalyzer } from './strongShift.ts';
import { eventUnderperformanceAnalyzer } from './eventUnderperformance.ts';
import { menuItemUnderPromotionAnalyzer } from './menuItemUnderPromotion.ts';
import { localVisibilityGapAnalyzer } from './localVisibilityGap.ts';
import { reputationThemeOpportunityAnalyzer } from './reputationThemeOpportunity.ts';
import { reputationRiskAnalyzer } from './reputationRisk.ts';
import { privatePartyConversionGapAnalyzer } from './privatePartyConversionGap.ts';
import { websiteHealthAnalyzer } from './websiteHealth.ts';
import { mapPackRankingGapAnalyzer } from './mapPackRankingGap.ts';
import { aiSearchVisibilityGapAnalyzer } from './aiSearchVisibilityGap.ts';
import { operationalReadinessBlockerAnalyzer } from './operationalReadinessBlocker.ts';
import { eventLiftOpportunityAnalyzer } from './eventLiftOpportunity.ts';
import { contextMarketingOpportunityAnalyzer } from './contextMarketingOpportunity.ts';

export const ALL_ANALYZERS: AnalyzerModule[] = [
  contextMarketingOpportunityAnalyzer,
  softShiftAnalyzer,
  strongShiftAnalyzer,
  eventUnderperformanceAnalyzer,
  eventLiftOpportunityAnalyzer,
  menuItemUnderPromotionAnalyzer,
  localVisibilityGapAnalyzer,
  reputationThemeOpportunityAnalyzer,
  reputationRiskAnalyzer,
  privatePartyConversionGapAnalyzer,
  websiteHealthAnalyzer,
  mapPackRankingGapAnalyzer,
  aiSearchVisibilityGapAnalyzer,
  operationalReadinessBlockerAnalyzer,
];

// Analyzers that can run against a cold prospect. Toast/shift/event/
// operational-readiness analyzers all require internal data and are excluded.
export const COLD_SAFE_ANALYZER_IDS: ReadonlySet<string> = new Set([
  'local_visibility_gap',
  'map_pack_ranking_gap',
  'ai_search_visibility_gap',
  'reputation_risk',
  'reputation_theme_opportunity',
  'website_health',
]);

export type { AnalyzerModule, AnalyzerResult } from './types.ts';
