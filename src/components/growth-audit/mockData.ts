import { TrendingUp, UtensilsCrossed, CalendarDays, MapPin, Star, Hash, Globe, ShieldCheck, LucideIcon } from 'lucide-react';
import { deriveGate, type DataConfidence, type OpportunityLevel, type ReadinessGate, type Severity } from './scoreBands';

export type PrimaryMetrics = {
  growthScore: number;
  growthTrend: number; // delta vs last audit
  opportunityLevel: OpportunityLevel;
  opportunityDollars: string;
  dataConfidence: DataConfidence;
  dataConfidenceNote: string;
  readiness: ReadinessGate;
  readinessReason: string;
  lastRunLabel: string;
};

// Operational Readiness category score is the source of truth for the gate.
const OPS_SCORE = 55;

export const MOCK_PRIMARY: PrimaryMetrics = {
  growthScore: 67,
  growthTrend: 4,
  opportunityLevel: 'High',
  opportunityDollars: '$18,400 / mo',
  dataConfidence: 'Partial',
  dataConfidenceNote: '5 of 8 data sources fully connected',
  readiness: deriveGate(OPS_SCORE),
  readinessReason: 'Late-night labor below capacity; reviews mention slow service after 10pm. Fix before driving more late-night traffic.',
  lastRunLabel: 'May 6, 2026 · 2 days ago',
};

export type CategoryScore = {
  key: string;
  name: string;
  icon: LucideIcon;
  score: number;
  trend: number;
  openFindings: number;
  confidence: DataConfidence;
};

export const MOCK_CATEGORIES: CategoryScore[] = [
  { key: 'revenue',     name: 'Revenue Patterns',        icon: TrendingUp,      score: 72, trend:  3, openFindings: 2, confidence: 'Complete' },
  { key: 'menu',        name: 'Menu Marketing',          icon: UtensilsCrossed, score: 58, trend: -2, openFindings: 4, confidence: 'Partial' },
  { key: 'events',      name: 'Event Performance',       icon: CalendarDays,    score: 81, trend:  6, openFindings: 1, confidence: 'Complete' },
  { key: 'local',       name: 'Local Search Visibility', icon: MapPin,          score: 44, trend:  0, openFindings: 5, confidence: 'Partial' },
  { key: 'reputation',  name: 'Online Reputation',       icon: Star,            score: 76, trend:  2, openFindings: 2, confidence: 'Complete' },
  { key: 'social',      name: 'Social & Content',        icon: Hash,            score: 39, trend: -5, openFindings: 6, confidence: 'Limited' },
  { key: 'website',     name: 'Website & Conversion',    icon: Globe,           score: 62, trend:  1, openFindings: 3, confidence: 'Limited' },
  { key: 'operational', name: 'Operational Readiness',   icon: ShieldCheck,     score: 55, trend: -3, openFindings: 4, confidence: 'Unavailable' },
];

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

export const MOCK_PRIORITIES: Priority[] = [
  { id: 'p1', title: 'Google Business listing missing 4 high-intent attributes', category: 'Local Search Visibility', severity: 'High',   upside: '+$3,200/mo', isTrafficDriving: true,  gateReason: 'Late-night labor is below capacity and reviews mention slow service after 10pm — fix before driving more late-night traffic.' },
  { id: 'p2', title: 'No follow-up to 312 first-time guests in last 60 days',     category: 'Revenue Patterns',        severity: 'High',   upside: '+$2,800/mo', isTrafficDriving: true,  gateReason: 'Repeat-visit nudges will land on weekends; current weekend ticket times exceed 18 min. Stabilize before pushing returns.' },
  { id: 'p3', title: 'Instagram posting cadence dropped 60% vs Q1',               category: 'Social & Content',        severity: 'Medium', upside: '+$1,400/mo', isTrafficDriving: true,  gateReason: 'Social posts drive walk-ins within 48h. Ops capacity must hold before increasing reach.' },
  { id: 'p4', title: 'Happy hour menu not surfaced on website homepage',          category: 'Website & Conversion',    severity: 'Medium', upside: '+$1,100/mo', isTrafficDriving: false },
  { id: 'p5', title: 'Yelp review responses missing for 14 of last 20 reviews',   category: 'Online Reputation',       severity: 'Medium', upside: '+$650/mo',   isTrafficDriving: false },
];

export type QuickStats = {
  openFindings: number;
  resolvedThisMonth: number;
  campaignsLaunched: number;
  opportunitySurfaced: string;
};

export const MOCK_QUICK_STATS: QuickStats = {
  openFindings: 27,
  resolvedThisMonth: 9,
  campaignsLaunched: 4,
  opportunitySurfaced: '$18,400 / mo',
};
