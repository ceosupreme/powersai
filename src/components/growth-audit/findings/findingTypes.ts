// Canonical 10 finding types for the Growth Audit (Prompt 5).
// Each type carries raw bracketed templates for future AI generation;
// resolved diagnosis/recommendedAction text lives on each Finding instance.

import type { FindingCategoryKey } from './mockFindings';
import type { ActionPackBlueprint } from './actionPackBlueprints';
import { ACTION_PACK_BLUEPRINTS } from './actionPackBlueprints';

export type FindingType =
  | 'soft_shift_opportunity'
  | 'strong_shift_amplification'
  | 'menu_item_under_promotion'
  | 'event_lift_opportunity'
  | 'event_underperformance'
  | 'reputation_theme_opportunity'
  | 'reputation_risk'
  | 'operational_readiness_blocker'
  | 'private_party_conversion_gap'
  | 'local_visibility_gap'
  | 'context_marketing_opportunity';

export type FindingTypeTemplate = {
  type: FindingType;
  label: string;
  category: FindingCategoryKey;
  defaultTrafficDriving: boolean;
  /** Raw bracketed pattern — for future AI generation. NOT the resolved text. */
  diagnosisPattern: string;
  /** Raw bracketed pattern — for future AI generation. NOT the resolved text. */
  recommendedActionPattern: string;
  /** Source labels this type usually carries; used for evidence-display hints. */
  evidenceHints: string[];
  actionPackBlueprint: ActionPackBlueprint;
};

export const FINDING_TYPE_TEMPLATES: Record<FindingType, FindingTypeTemplate> = {
  soft_shift_opportunity: {
    type: 'soft_shift_opportunity',
    label: 'Soft Shift Opportunity',
    category: 'revenue',
    defaultTrafficDriving: true,
    diagnosisPattern: "[Day] [time range] revenue is [X]% below the venue's [day-type] average",
    recommendedActionPattern: 'Test a targeted [campaign theme] campaign for [day] [time range]',
    evidenceHints: ['Toast — Daily metrics', 'Schedule (7shifts)'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.soft_shift_opportunity,
  },
  strong_shift_amplification: {
    type: 'strong_shift_amplification',
    label: 'Strong Shift Amplification',
    category: 'revenue',
    defaultTrafficDriving: true,
    diagnosisPattern: '[Day] [time range] revenue is [X]% above baseline — amplify with marketing',
    recommendedActionPattern: 'Build content + promotion around [day] [time range] using [theme]',
    evidenceHints: ['Toast — Daily metrics', 'Toast — Item mix'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.strong_shift_amplification,
  },
  menu_item_under_promotion: {
    type: 'menu_item_under_promotion',
    label: 'Menu Item Under-Promotion',
    category: 'menu',
    defaultTrafficDriving: false,
    diagnosisPattern: '[Item] generates [margin/volume] but appears in zero recent marketing efforts',
    recommendedActionPattern: 'Feature [item] in social, GBP posts, and staff scripts for [duration]',
    evidenceHints: ['Toast — Item mix', 'Marketing log (Asana)'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.menu_item_under_promotion,
  },
  event_lift_opportunity: {
    type: 'event_lift_opportunity',
    label: 'Event Lift Opportunity',
    category: 'events',
    defaultTrafficDriving: true,
    diagnosisPattern: '[Event] lifts [category] sales but [other category] stays flat',
    recommendedActionPattern: 'Add a complementary [offering] / cross-promotion to capture [other category]',
    evidenceHints: ['Toast — Item mix', 'Event calendar'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.event_lift_opportunity,
  },
  event_underperformance: {
    type: 'event_underperformance',
    label: 'Event Underperformance',
    category: 'events',
    defaultTrafficDriving: false,
    diagnosisPattern: '[Event] occurs [frequency] but performance is similar to non-event windows',
    recommendedActionPattern: 'Change [theme/offer/timing] or discontinue [event]',
    evidenceHints: ['Sales / performance data', 'Event calendar'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.event_underperformance,
  },
  reputation_theme_opportunity: {
    type: 'reputation_theme_opportunity',
    label: 'Reputation Theme Opportunity',
    category: 'reputation',
    defaultTrafficDriving: true,
    diagnosisPattern: 'Reviews praise [theme] but marketing rarely features it',
    recommendedActionPattern: 'Convert [theme] into a social-proof content series and GBP posts',
    evidenceHints: ['Review sentiment classifier', 'Yelp Business API', 'Google Reviews'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.reputation_theme_opportunity,
  },
  reputation_risk: {
    type: 'reputation_risk',
    label: 'Reputation Risk',
    category: 'reputation',
    defaultTrafficDriving: false,
    diagnosisPattern: 'Reviews mention [issue] in [context/area] — operational concern',
    recommendedActionPattern: 'Flag [context/area] for ops fix; do not push traffic until resolved',
    evidenceHints: ['Review sentiment classifier', 'Operational signals', 'Schedule / staffing data'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.reputation_risk,
  },
  operational_readiness_blocker: {
    type: 'operational_readiness_blocker',
    label: 'Operational Readiness Blocker',
    category: 'operational',
    defaultTrafficDriving: false,
    diagnosisPattern: '[Window] shows demand but labor / service indicators suggest capacity strain',
    recommendedActionPattern: 'Fix [staffing / workflow] before marketing; never auto-push traffic',
    evidenceHints: ['Schedule / staffing data', 'Service / fulfillment signals', 'Review sentiment classifier'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.operational_readiness_blocker,
  },
  private_party_conversion_gap: {
    type: 'private_party_conversion_gap',
    label: 'Private Party / Group Conversion Gap',
    category: 'website',
    defaultTrafficDriving: false,
    diagnosisPattern: 'No private party page / inquiry form / package found on website',
    recommendedActionPattern: 'Build a [landing page + inquiry form + package] and a follow-up sequence',
    evidenceHints: ['Site audit', 'Site chat transcripts'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.private_party_conversion_gap,
  },
  local_visibility_gap: {
    type: 'local_visibility_gap',
    label: 'Local Visibility Gap',
    category: 'local',
    defaultTrafficDriving: true,
    diagnosisPattern: 'Venue not appearing for [search term] in [area]',
    recommendedActionPattern: 'GBP refresh + posts + photos + attribute updates + review responses for [term]',
    evidenceHints: ['BrightLocal rank tracker', 'Google Business Profile API'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.local_visibility_gap,
  },
  context_marketing_opportunity: {
    type: 'context_marketing_opportunity',
    label: 'Local Context Opportunity',
    category: 'context',
    defaultTrafficDriving: true,
    diagnosisPattern: '[Context item] is approaching on [date] with no marketing campaign covering it',
    recommendedActionPattern: 'Build a [campaign theme] tied to [context item] before [date]',
    evidenceHints: ['Calendar', 'Weather (NWS)', 'News (NewsData.io)', 'Sports (MLB / TheSportsDB)', 'Events (Ticketmaster)'],
    actionPackBlueprint: ACTION_PACK_BLUEPRINTS.context_marketing_opportunity,
  },
};

export const ALL_FINDING_TYPES = Object.keys(FINDING_TYPE_TEMPLATES) as FindingType[];
export const findingTypeLabel = (t: FindingType) => FINDING_TYPE_TEMPLATES[t].label;
