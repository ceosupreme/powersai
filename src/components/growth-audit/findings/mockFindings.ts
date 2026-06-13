import { computePriorityScore } from './findingScales';
import { FINDING_TYPE_TEMPLATES, type FindingType } from './findingTypes';

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

/**
 * Mock-finding factory.
 * - `category` defaults to the type's template category.
 * - `isTrafficDriving` defaults to the type's `defaultTrafficDriving`.
 *   Only override on a fixture when there is a concrete reason — otherwise
 *   we'd silently create type/flag mismatches.
 */
type MkInput =
  Omit<Finding, 'priorityScore' | 'category' | 'isTrafficDriving'>
  & { category?: FindingCategoryKey; isTrafficDriving?: boolean };

const mk = (base: MkInput): Finding => {
  const tmpl = FINDING_TYPE_TEMPLATES[base.type];
  return {
    ...base,
    category: base.category ?? tmpl.category,
    isTrafficDriving: base.isTrafficDriving ?? tmpl.defaultTrafficDriving,
    priorityScore: computePriorityScore(
      base.revenueUpside, base.ease, base.confidence, base.operationalRisk,
    ),
  };
};

// ===== One mock finding per canonical type (10 total) =====
export const MOCK_FINDINGS: Finding[] = [
  // 1. Soft Shift Opportunity — generic mid-week demand window
  mk({
    id: 'f1',
    type: 'soft_shift_opportunity',
    title: 'Tuesday afternoon traffic 28% below weekday baseline',
    severity: 'High',
    revenueUpside: 4, ease: 4, confidence: 4, operationalRisk: 2,
    evidence: {
      summary: 'Trailing 8 weeks: Tuesday 1–5pm sessions and conversions both ~28% below the weekday afternoon baseline.',
      sources: [
        { label: 'Sales / performance data', ref: 'analytics.daily' },
        { label: 'Marketing log', ref: 'asana.marketing' },
      ],
    },
    diagnosis: "Tuesday afternoon performance is 28% below the weekday afternoon average. Capacity is identical; the slot is simply under-promoted relative to peers.",
    recommendedAction: 'Test a targeted mid-week promotion for Tuesday afternoons with a 4-week measurement window before scaling.',
    status: 'New',
    createdAt: '2026-05-06T14:00:00Z',
  }),

  // 2. Strong Shift Amplification
  mk({
    id: 'f2',
    type: 'strong_shift_amplification',
    title: 'Saturday performance 35% above baseline — amplify',
    severity: 'Medium',
    revenueUpside: 4, ease: 4, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: 'Trailing 6 weeks: Saturday output 35% above the Saturday baseline. Conversion rate and average order both up.',
      sources: [
        { label: 'Sales / performance data', ref: 'analytics.daily' },
        { label: 'Product / offer mix', ref: 'analytics.mix' },
      ],
    },
    diagnosis: 'Saturday performance is 35% above baseline — amplify with marketing. The window already has product-market fit; reach is the bottleneck, not the offering.',
    recommendedAction: 'Build a 4-post content series + subscriber email + landing-page callout around the Saturday offer over the next 4 weeks.',
    status: 'In Progress',
    createdAt: '2026-05-04T10:00:00Z',
  }),

  // 3. Menu Item Under-Promotion → generic top-offer under-promotion
  mk({
    id: 'f3',
    type: 'menu_item_under_promotion',
    title: 'Top offer drives 18% of revenue, 0 marketing efforts in last 90 days',
    severity: 'Medium',
    revenueUpside: 3, ease: 5, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: 'Top offer = 18% of revenue trailing 90d at strong margin. Marketing log shows 0 social/email/landing-page mentions in the same window.',
      sources: [
        { label: 'Product / offer mix', ref: 'analytics.mix' },
        { label: 'Marketing log', ref: 'asana.marketing' },
      ],
    },
    diagnosis: 'The top offer generates 18% of revenue at strong margin but appears in zero recent marketing efforts. The offer is doing the work organically — promotion will compound it.',
    recommendedAction: 'Feature the offer in social, landing-page callouts, and customer-facing scripts for the next 30 days.',
    status: 'New',
    createdAt: '2026-05-05T09:00:00Z',
  }),

  // 4. Event Lift Opportunity → generic launch lift gap
  mk({
    id: 'f4',
    type: 'event_lift_opportunity',
    title: 'Webinar drives a 40% lead lift but downstream conversions stay flat',
    severity: 'Medium',
    revenueUpside: 3, ease: 4, confidence: 4, operationalRisk: 2,
    evidence: {
      summary: 'Last 6 webinars: top-of-funnel leads +40% vs same-DOW baseline; signups / closed-won flat. Attach rate well below baseline.',
      sources: [
        { label: 'Product / offer mix', ref: 'analytics.mix' },
        { label: 'Event calendar', ref: 'events.calendar' },
      ],
    },
    diagnosis: 'Webinars lift top-of-funnel leads 40% but downstream conversion stays flat. The audience is engaged — there is no easy next step to act on.',
    recommendedAction: 'Add a complementary offer + follow-up sequence to capture the downstream conversion.',
    status: 'New',
    createdAt: '2026-05-03T11:00:00Z',
  }),

  // 5. Event Underperformance → generic recurring program
  mk({
    id: 'f5',
    type: 'event_underperformance',
    title: 'Monthly newsletter averages identical results to non-newsletter months',
    severity: 'Low',
    revenueUpside: 2, ease: 3, confidence: 4, operationalRisk: 2,
    evidence: {
      summary: 'Trailing 12 newsletters: revenue lift indistinguishable from non-newsletter months. Open / click rates flat.',
      sources: [
        { label: 'Sales / performance data', ref: 'analytics.daily' },
        { label: 'Event calendar', ref: 'events.calendar' },
      ],
    },
    diagnosis: 'The monthly newsletter occurs reliably but performance is statistically equivalent to non-newsletter months. It is consuming team bandwidth without measurable lift.',
    recommendedAction: 'Replace with a tested format (segmented offer, story-led series) for 4 weeks; if no lift, discontinue.',
    status: 'Snoozed',
    snoozedUntil: '2026-05-20',
    createdAt: '2026-04-15T09:00:00Z',
  }),

  // 6. Reputation Theme Opportunity → generic praise theme
  mk({
    id: 'f6',
    type: 'reputation_theme_opportunity',
    title: 'Responsiveness and clarity are top positive review themes — feature them',
    severity: 'Medium',
    revenueUpside: 3, ease: 5, confidence: 4, operationalRisk: 1,
    evidence: {
      summary: 'Last 90d reviews: "responsive" mentioned positively in 38%, "clear / easy to work with" in 31%. Marketing log references either in ~5% of posts.',
      sources: [
        { label: 'Review sentiment classifier', ref: 'reviews.sentiment' },
        { label: 'Google Reviews', ref: 'google.reviews' },
        { label: 'Marketing log', ref: 'asana.marketing' },
      ],
    },
    diagnosis: 'Reviews praise responsiveness and clarity but marketing rarely features either. Customers are already telling the story — repeat it.',
    recommendedAction: 'Convert the top review themes into a 4-post social-proof series and refresh website testimonials.',
    status: 'New',
    createdAt: '2026-05-02T16:00:00Z',
  }),

  // 7. Reputation Risk — generic ops risk surfaced via reviews
  mk({
    id: 'f7',
    type: 'reputation_risk',
    title: 'Reviews mention slow response times this month — service risk',
    severity: 'High',
    revenueUpside: 2, ease: 2, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: '9 of last 30 reviews cite slow responses. Average first-response time 32h vs 12h target in the same window.',
      sources: [
        { label: 'Review sentiment classifier', ref: 'reviews.sentiment' },
        { label: 'Service / fulfillment signals', ref: 'ops.service' },
      ],
    },
    diagnosis: 'Reviews mention slow response times — operational concern. Reputation will keep degrading if more demand is added on top.',
    recommendedAction: 'Flag intake / response workflow for ops fix. Do not push acquisition traffic until response time clears the 12h target for 2 consecutive weeks.',
    status: 'In Progress',
    createdAt: '2026-04-29T08:00:00Z',
  }),

  // 8. Operational Readiness Blocker — generic capacity blocker
  mk({
    id: 'f8',
    type: 'operational_readiness_blocker',
    title: 'Fulfillment capacity 22% below modeled demand',
    severity: 'Critical',
    revenueUpside: 4, ease: 2, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: 'Peak windows: 3.1 staff available vs 4.0 modeled requirement; response time 32h vs 12 target; 9/30 reviews cite slow service.',
      sources: [
        { label: 'Schedule / staffing data', ref: 'ops.schedule' },
        { label: 'Service / fulfillment signals', ref: 'ops.service' },
        { label: 'Review sentiment classifier', ref: 'reviews.sentiment' },
      ],
    },
    diagnosis: 'Demand is high but fulfillment capacity is below the modeled target and reviews confirm strain. This is the project\'s ops bottleneck.',
    recommendedAction: 'Add capacity (staffing or workflow change) to peak windows. Re-evaluate in 2 weeks.',
    status: 'In Progress',
    createdAt: '2026-04-28T13:00:00Z',
  }),

  // 9. Private Party / Group Conversion Gap → generic conversion-page gap
  mk({
    id: 'f9',
    type: 'private_party_conversion_gap',
    title: 'Website lacks a dedicated services / inquiry page despite inbound demand',
    severity: 'High',
    revenueUpside: 5, ease: 3, confidence: 4, operationalRisk: 1,
    evidence: {
      summary: 'Site audit: no /services landing page, no structured inquiry form, no packaged tier. Inbound logs show 24 inquiries in 60d routed to a generic email.',
      sources: [
        { label: 'Site audit', ref: 'audit.site' },
        { label: 'Inbound logs', ref: 'site.inbound' },
      ],
    },
    diagnosis: 'No dedicated services page, structured inquiry form, or productized tier on the website. Demand is arriving and bouncing because there is no clear path to convert it.',
    recommendedAction: 'Build a services landing page, structured inquiry form, two-tier package, and a 3-touch follow-up sequence.',
    status: 'New',
    createdAt: '2026-05-01T15:00:00Z',
  }),

  // 10. Local Visibility Gap — generic local-business keyword
  mk({
    id: 'f10',
    type: 'local_visibility_gap',
    title: 'Not appearing for "marketing agency san diego" despite strong reviews',
    severity: 'Medium',
    revenueUpside: 4, ease: 3, confidence: 4, operationalRisk: 2,
    evidence: {
      summary: 'Local rank tracker: avg rank 9.4 over last 14d for "marketing agency san diego" (and 5 related queries). Two competitors with weaker review profiles rank top 3.',
      sources: [
        { label: 'Local rank tracker', ref: 'brightlocal.local_pack' },
        { label: 'Google Business Profile API', ref: 'gbp.attributes' },
      ],
    },
    diagnosis: 'Project is not appearing for "marketing agency san diego" despite a strong review profile. GBP signals (attributes, post cadence, photo freshness) are well below the two ranking competitors.',
    recommendedAction: 'GBP refresh + weekly posts + photos + attribute updates + a review-request push tied to the core service keyword for the next 4 weeks.',
    status: 'Sent to Marketing Hub',
    createdAt: '2026-04-25T13:00:00Z',
  }),
];
