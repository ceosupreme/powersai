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
  // 1. Soft Shift Opportunity — gated (Caution): mid-week BOH thin
  mk({
    id: 'f1',
    type: 'soft_shift_opportunity',
    title: 'Tuesday 4–7pm revenue 28% below weekday happy-hour baseline',
    severity: 'High',
    revenueUpside: 4, ease: 4, confidence: 4, operationalRisk: 2,
    gateReason: 'Mid-week BOH coverage already thin; verify staffing holds before pushing happy-hour traffic.',
    evidence: {
      summary: 'Trailing 8 weeks: Tue 4–7pm $1,820 net vs weekday HH baseline $2,540. Cover counts down 22% in same window.',
      sources: [
        { label: 'Toast — Daily metrics', ref: 'toast.daily' },
        { label: 'Schedule (7shifts)', ref: '7shifts.schedule' },
      ],
    },
    diagnosis: "Tuesday 4–7pm revenue is 28% below the venue's weekday happy-hour average. The shift has the same physical capacity but is leaking the local after-work crowd to nearby competitors.",
    recommendedAction: 'Test a targeted pre-karaoke happy hour (Tue 4–7pm) with a 4-week measurement window before scaling.',
    status: 'New',
    createdAt: '2026-05-06T14:00:00Z',
  }),

  // 2. Strong Shift Amplification
  mk({
    id: 'f2',
    type: 'strong_shift_amplification',
    title: 'Saturday brunch 35% above brunch baseline — amplify',
    severity: 'Medium',
    revenueUpside: 4, ease: 4, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: 'Trailing 6 weeks: Sat brunch $7,420 net vs brunch baseline $5,490. Cover counts and avg ticket both up.',
      sources: [
        { label: 'Toast — Daily metrics', ref: 'toast.daily' },
        { label: 'Toast — Item mix', ref: 'toast.menu_mix' },
      ],
    },
    diagnosis: 'Saturday brunch revenue is 35% above the brunch baseline — amplify with marketing. The shift already has product-market fit; reach is the bottleneck, not the offering.',
    recommendedAction: 'Build a 4-post content series + subscriber email + menu callout around Saturday brunch over the next 4 weeks.',
    status: 'In Progress',
    createdAt: '2026-05-04T10:00:00Z',
  }),

  // 3. Menu Item Under-Promotion
  mk({
    id: 'f3',
    type: 'menu_item_under_promotion',
    title: 'Wings: 18% of food revenue, 0 marketing efforts in last 90 days',
    severity: 'Medium',
    revenueUpside: 3, ease: 5, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: 'Wings = 18% of food revenue trailing 90d, 64% gross margin. Marketing log shows 0 social/GBP/email mentions in the same window.',
      sources: [
        { label: 'Toast — Item mix', ref: 'toast.menu_mix' },
        { label: 'Marketing log (Asana)', ref: 'asana.marketing' },
      ],
    },
    diagnosis: 'Wings generate 18% of food revenue at 64% margin but appear in zero recent marketing efforts. The item is doing the work organically — promotion will compound it.',
    recommendedAction: 'Feature wings in social, GBP posts, and FOH staff scripts for the next 30 days.',
    status: 'New',
    createdAt: '2026-05-05T09:00:00Z',
  }),

  // 4. Event Lift Opportunity
  mk({
    id: 'f4',
    type: 'event_lift_opportunity',
    title: 'Karaoke lifts beverages 40% but food sales stay flat',
    severity: 'Medium',
    revenueUpside: 3, ease: 4, confidence: 4, operationalRisk: 2,
    gateReason: 'Adding food attach increases BOH load on a high-volume night. Confirm prep capacity before launch.',
    evidence: {
      summary: 'Karaoke nights (Thu/Sat): bev avg +40% vs same-DOW baseline; food avg +3%. Attach rate 0.8 food items/cover vs 1.4 baseline.',
      sources: [
        { label: 'Toast — Item mix', ref: 'toast.menu_mix' },
        { label: 'Event calendar', ref: 'events.calendar' },
      ],
    },
    diagnosis: 'Karaoke lifts beverage sales 40% but food sales stay flat. The crowd is engaged and spending — they just have nothing easy to share over.',
    recommendedAction: 'Add a karaoke shareables menu insert + cross-promo (e.g. "Round + Wings" combo) to capture food attach.',
    status: 'New',
    createdAt: '2026-05-03T11:00:00Z',
  }),

  // 5. Event Underperformance
  mk({
    id: 'f5',
    type: 'event_underperformance',
    title: 'Monday open-mic averages $4,200 vs Monday baseline of $4,100',
    severity: 'Low',
    revenueUpside: 2, ease: 3, confidence: 4, operationalRisk: 2,
    evidence: {
      summary: 'Trailing 12 Mondays with open-mic: $4,200 net avg vs Monday no-event baseline $4,100. Cover counts identical.',
      sources: [
        { label: 'Toast — Daily metrics', ref: 'toast.daily' },
        { label: 'Event calendar', ref: 'events.calendar' },
      ],
    },
    diagnosis: 'Monday open-mic occurs weekly but revenue is statistically equivalent to non-event Mondays. The event is consuming staff bandwidth and stage cost without lift.',
    recommendedAction: 'Replace open-mic with a tested format (trivia or industry night) for 4 weeks; if no lift, discontinue.',
    status: 'Snoozed',
    snoozedUntil: '2026-05-20',
    createdAt: '2026-04-15T09:00:00Z',
  }),

  // 6. Reputation Theme Opportunity
  mk({
    id: 'f6',
    type: 'reputation_theme_opportunity',
    title: 'Karaoke and atmosphere are top positive review themes — feature them',
    severity: 'Medium',
    revenueUpside: 3, ease: 5, confidence: 4, operationalRisk: 1,
    evidence: {
      summary: 'Last 90d reviews: "karaoke" mentioned positively in 38%, "atmosphere/vibe" in 31%. Marketing log shows ~5% of posts reference either.',
      sources: [
        { label: 'Review sentiment classifier', ref: 'reviews.sentiment' },
        { label: 'Yelp Business API', ref: 'yelp.reviews' },
        { label: 'Marketing log (Asana)', ref: 'asana.marketing' },
      ],
    },
    diagnosis: 'Reviews praise karaoke and atmosphere but marketing rarely features either. Guests are already telling the story — repeat it.',
    recommendedAction: 'Convert karaoke + atmosphere review themes into a 4-post social series and refresh GBP highlights.',
    status: 'New',
    createdAt: '2026-05-02T16:00:00Z',
  }),

  // 7. Reputation Risk — surfaces the operational gate reason
  mk({
    id: 'f7',
    type: 'reputation_risk',
    title: 'Reviews mention slow service after 10pm — late-night ops risk',
    severity: 'High',
    revenueUpside: 2, ease: 2, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: '9 of last 30 reviews cite slow service after 10pm. KDS ticket time avg 18.4 min vs 12 min target in the same window.',
      sources: [
        { label: 'Review sentiment classifier', ref: 'reviews.sentiment' },
        { label: 'Toast KDS ticket times', ref: 'toast.kds' },
        { label: '7shifts schedule', ref: '7shifts.schedule' },
      ],
    },
    diagnosis: 'Reviews mention slow service after 10pm — operational concern. This is the same shift driving the Caution gate; reputation will keep degrading if traffic is added.',
    recommendedAction: 'Flag late-night for ops fix (staffing + expo workflow). Do not push late-night traffic until KDS ticket time clears 12 min for 2 consecutive weeks.',
    status: 'In Progress',
    createdAt: '2026-04-29T08:00:00Z',
  }),

  // 8. Operational Readiness Blocker — Needs Ops Fix First
  mk({
    id: 'f8',
    type: 'operational_readiness_blocker',
    title: 'Friday late-night labor 22% under capacity vs covers',
    severity: 'Critical',
    revenueUpside: 4, ease: 2, confidence: 5, operationalRisk: 1,
    evidence: {
      summary: 'Wed–Sat 10pm–close: 3.1 staff scheduled vs 4.0 modeled requirement; ticket times 18.4 min vs 12 target; 9/30 reviews cite slow service.',
      sources: [
        { label: '7shifts schedule', ref: '7shifts.schedule' },
        { label: 'Toast KDS ticket times', ref: 'toast.kds' },
        { label: 'Review sentiment classifier', ref: 'reviews.sentiment' },
      ],
    },
    diagnosis: 'Friday late-night demand is high but labor is below 7shifts target and reviews confirm capacity strain. This is the venue\'s ops bottleneck and the reason the Ops Readiness Gate is in Caution.',
    recommendedAction: 'Add 1 BOH and 1 FOH to Wed–Sat 9:30pm–close. Re-evaluate gate in 2 weeks.',
    status: 'In Progress',
    createdAt: '2026-04-28T13:00:00Z',
  }),

  // 9. Private Party / Group Conversion Gap
  mk({
    id: 'f9',
    type: 'private_party_conversion_gap',
    title: 'Website lacks private party page despite venue size and group demand',
    severity: 'High',
    revenueUpside: 5, ease: 3, confidence: 4, operationalRisk: 1,
    evidence: {
      summary: 'Site audit: no /private-events page, no inquiry form, no group package. Site chat logs show 24 group inquiries in last 60d routed to generic email.',
      sources: [
        { label: 'Site audit', ref: 'audit.site' },
        { label: 'Site chat transcripts', ref: 'site.chat' },
      ],
    },
    diagnosis: 'No private party page, inquiry form, or package found on the website. Group demand is arriving via chat and bouncing because there is no path to convert it.',
    recommendedAction: 'Build a private-party landing page, structured inquiry form, two-tier package, and a 3-touch follow-up sequence.',
    status: 'New',
    createdAt: '2026-05-01T15:00:00Z',
  }),

  // 10. Local Visibility Gap — Sent to Marketing Hub example
  mk({
    id: 'f10',
    type: 'local_visibility_gap',
    title: 'Not appearing for "karaoke bar Gaslamp" despite category leadership',
    severity: 'Medium',
    revenueUpside: 4, ease: 3, confidence: 4, operationalRisk: 2,
    gateReason: 'Search-driven karaoke traffic peaks Thu–Sat late-night — same window as the late-night ops issue. Verify staffing before pushing.',
    evidence: {
      summary: 'BrightLocal: rank avg 9.4 over last 14d for "karaoke bar Gaslamp" (and 5 related queries). Only 2 other venues in Gaslamp offer karaoke — both rank top 3.',
      sources: [
        { label: 'BrightLocal rank tracker', ref: 'brightlocal.local_pack' },
        { label: 'Google Business Profile API', ref: 'gbp.attributes' },
      ],
    },
    diagnosis: 'Venue is not appearing for "karaoke bar Gaslamp" despite being one of the few karaoke venues in the area. GBP signals (attributes, post cadence, photo freshness) are well below the two ranking competitors.',
    recommendedAction: 'GBP refresh + weekly posts + photos + attribute updates + a review-request push mentioning "karaoke" for the next 4 weeks.',
    status: 'Sent to Marketing Hub',
    createdAt: '2026-04-25T13:00:00Z',
  }),
];
