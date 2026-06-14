// Derives the Overview metrics from the live findings list.
// Keeps the existing mock-data shapes (`PrimaryMetrics`, `CategoryScore`,
// `Priority`, `QuickStats`) so the visual components don't change.
//
// Rules:
//   - "Active" = status ∉ {Resolved, Dismissed} and (snoozed_until is null OR < today).
//   - Category score: 100 minus a penalty per active finding, weighted by severity.
//     Severity weights chosen so a single Critical drops a category below 80
//     and three Highs drop it to ~60.
//   - Growth Score: weighted average of category scores using `CATEGORY_WEIGHTS`.
//   - Ops Gate: derived from the Operational Readiness category score via the
//     existing `deriveGate` helper (single source of truth).
//   - Opportunity dollars: rough proxy from active revenue_upside totals.

import {
  TrendingUp, UtensilsCrossed, CalendarDays, MapPin, Star, Hash, Globe, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { Finding, FindingCategoryKey } from './findings/mockFindings';
import { CATEGORY_LABEL } from './findings/mockFindings';
import type { GbpSnapshot } from './data-sources/useGbpStatus';
import type { ReputationStatus } from './data-sources/useReputationStatus';
import type { WebsiteStatus, WebsiteSnapshot } from './data-sources/useWebsiteStatus';
import type { MapPackSummary } from './data-sources/useMapPackSummary';
import type { AiSearchSummary } from './data-sources/useAiSearchSummary';
import {
  deriveGate,
  type DataConfidence,
  type OpportunityLevel,
  type ReadinessGate,
  type Severity,
} from './scoreBands';

export type CategoryKey = FindingCategoryKey;

export type CategoryScore = {
  key: CategoryKey;
  name: string;
  icon: LucideIcon;
  score: number | null;
  unscored?: boolean;
  trend: number;
  openFindings: number;
  confidence: DataConfidence;
};

export type PrimaryMetrics = {
  growthScore: number | null;
  growthTrend: number;
  opportunityLevel: OpportunityLevel;
  opportunityDollars: string;
  dataConfidence: DataConfidence;
  dataConfidenceNote: string;
  readiness: ReadinessGate;
  readinessReason: string;
  lastRunLabel: string;
};

export type Priority = {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  upside: string;
  isTrafficDriving: boolean;
  gateReason?: string;
};

export type QuickStats = {
  openFindings: number;
  resolvedThisMonth: number;
  campaignsLaunched: number;
  opportunitySurfaced: string;
};

export const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  revenue: TrendingUp,
  menu: UtensilsCrossed,
  events: CalendarDays,
  local: MapPin,
  reputation: Star,
  social: Hash,
  website: Globe,
  operational: ShieldCheck,
  context: CalendarDays,
};

// Weights used for the overall Growth Score average.
const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  revenue: 1.5,
  operational: 1.4,
  reputation: 1.2,
  local: 1.1,
  website: 1.0,
  menu: 1.0,
  events: 0.9,
  social: 0.9,
  context: 1.0,
};

const SEV_PENALTY: Record<Finding['severity'], number> = {
  Critical: 22,
  High: 12,
  Medium: 6,
  Low: 3,
};

export const isActive = (f: Finding): boolean => {
  if (f.status === 'Resolved' || f.status === 'Dismissed') return false;
  if (f.status === 'Snoozed' && f.snoozedUntil) {
    const today = new Date().toISOString().slice(0, 10);
    if (f.snoozedUntil > today) return false;
  }
  return true;
};

const round = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const DAY = 86_400_000;

/**
 * Local Search Visibility raw score from a GBP snapshot, before finding penalties.
 * Weighting per design: 55% profile completeness, 30% engagement recency, 15% NAP.
 * Returns null if no snapshot or snapshot is too stale (>30d) to score.
 */
export function localScoreFromSnapshot(snap: GbpSnapshot | null | undefined): number | null {
  if (!snap) return null;
  const ageDays = (Date.now() - Date.parse(snap.captured_at)) / DAY;
  if (ageDays > 30) return null;

  // Completeness (0-1): primary_category, description ≥30 chars, hours_complete, photo_count ≥10.
  const completeness = (
    Number(!!snap.primary_category) +
    Number((snap.description?.trim().length ?? 0) >= 30) +
    Number(snap.hours_complete === true) +
    Number((snap.photo_count ?? 0) >= 10)
  ) / 4;

  // Engagement (0-1): post in last 30d (0.5), photo in last 90d (0.25), response rate ≥0.5 (0.25).
  const lastPostAge = snap.last_post_at ? (Date.now() - Date.parse(snap.last_post_at)) / DAY : Infinity;
  const lastPhotoAge = snap.last_photo_at ? (Date.now() - Date.parse(snap.last_photo_at)) / DAY : Infinity;
  const responseRate = typeof snap.review_response_rate_30d === 'number' ? snap.review_response_rate_30d : 0;
  const engagement =
    (lastPostAge <= 30 ? 0.5 : 0) +
    (lastPhotoAge <= 90 ? 0.25 : 0) +
    (responseRate >= 0.5 ? 0.25 : Math.max(0, responseRate * 0.5));

  // NAP (0-1): three booleans averaged; null treated as match (no signal).
  const napChecks = [snap.nap_match_name, snap.nap_match_address, snap.nap_match_phone];
  const napScore = napChecks.reduce((s, v) => s + (v === false ? 0 : 1), 0) / napChecks.length;

  return Math.round(100 * (completeness * 0.55 + engagement * 0.30 + napScore * 0.15));
}

function localConfidenceFromSnapshot(snap: GbpSnapshot | null | undefined): DataConfidence {
  if (!snap) return 'Unavailable';
  const ageDays = (Date.now() - Date.parse(snap.captured_at)) / DAY;
  if (ageDays > 30) return 'Limited';
  if (snap.fetch_error) return 'Limited';
  if (snap.source === 'automated' && ageDays <= 7) return 'Complete';
  return 'Partial';
}

function reputationScoreFromStatus(rep: ReputationStatus | null | undefined): number | null {
  if (!rep || !rep.hasReviews) return null;
  // Theme balance contribution; defaults to neutral 0.5 when no themes yet.
  const balance = rep.total > 0
    ? Math.max(0, Math.min(1, 0.5 + (rep.positive - rep.negative) / (rep.total * 2)))
    : 0.5;
  // Without aggregate rating threading here, hold the rating component flat at
  // 80 (B-) and let theme balance + finding penalties move the needle.
  const ratingComponent = 80;
  const responseComponent = 80;
  const themeComponent = balance * 100;
  return Math.round(ratingComponent * 0.55 + responseComponent * 0.20 + themeComponent * 0.25);
}

function reputationConfidenceFromStatus(rep: ReputationStatus | null | undefined): DataConfidence {
  if (!rep || !rep.hasReviews) return 'Limited';
  const ext = rep.lastExtractedAt ? Date.parse(rep.lastExtractedAt) : 0;
  const ageDays = ext ? (Date.now() - ext) / DAY : Infinity;
  if (ageDays <= 7) return 'Complete';
  if (ageDays <= 30) return 'Partial';
  return 'Limited';
}

/**
 * Website & Conversion raw score from a weekly crawl snapshot.
 * Universal 5-item generic core-pages inventory (about page, contact form,
 * email signup, https, mobile-friendly) at 50%; perf 25% (PSI); SEO 25%
 * (title+meta+h1 coverage, schema, https, mobile, alt text). Honest for any
 * business type — a restaurant still scores fine on these checks.
 */
export function websiteScoreFromSnapshot(
  weekly: WebsiteSnapshot | null | undefined,
  pagespeed: WebsiteSnapshot | null | undefined,
): number | null {
  if (!weekly) return null;
  const ageDays = (Date.now() - Date.parse(weekly.captured_at)) / DAY;
  if (ageDays > 60) return null;

  const inv = [
    // Generic core pages — works for agencies, SaaS, retail, services, restaurants, etc.
    weekly.has_about_page,
    weekly.has_contact_form,
    weekly.has_email_signup,
    weekly.https_enabled,
    weekly.mobile_friendly,
  ];
  const inventory = inv.reduce((s, v) => s + (v ? 1 : 0), 0) / inv.length;

  const perfRaw = pagespeed?.perf_score ?? weekly.perf_score;
  const perf = typeof perfRaw === 'number' ? Math.max(0, Math.min(1, perfRaw / 100)) : 0.6;

  const audited = weekly.pages_audited ?? 0;
  const titleCov = audited > 0 ? (weekly.pages_with_title ?? 0) / audited : 0;
  const metaCov = audited > 0 ? (weekly.pages_with_meta_desc ?? 0) / audited : 0;
  const h1Cov = audited > 0 ? (weekly.pages_with_h1 ?? 0) / audited : 0;
  const altCov = typeof weekly.image_alt_coverage_pct === 'number' ? weekly.image_alt_coverage_pct / 100 : 0.5;
  const schema = weekly.has_localbusiness_schema ? 1 : 0;
  const https = weekly.https_enabled ? 1 : 0;
  const mobile = weekly.mobile_friendly ? 1 : 0;
  const seo = (titleCov * 0.2 + metaCov * 0.15 + h1Cov * 0.15 + altCov * 0.1 + schema * 0.15 + https * 0.15 + mobile * 0.1);

  return Math.round(100 * (inventory * 0.5 + perf * 0.25 + seo * 0.25));
}

export function websiteConfidenceFromSnapshot(web: WebsiteStatus | null | undefined): DataConfidence {
  if (!web || !web.weekly) return 'Unavailable';
  if (web.weekly.fetch_error) return 'Limited';
  const age = web.weeklyAgeDays ?? Infinity;
  if (web.mapping?.js_heavy) return 'Limited';
  if (age <= 14) return 'Complete';
  if (age <= 30) return 'Partial';
  return 'Limited';
}

/**
 * Map Pack ranking signal — produces a 0-100 score plus a trend hint.
 * Blend rule: hitRate (high-priority in top 3) is dominant (~0.7); avgRank
 * decay tops up. Returns null when no keywords are tracked yet.
 */
export function mapPackScoreFromSummary(
  summary: MapPackSummary | null | undefined,
): { score: number; trend: 'up' | 'down' | 'flat' } | null {
  if (!summary || !summary.hasKeywords || summary.snapshotsCount === 0) return null;
  const hitRate = summary.hitRate ?? 0;
  // Avg-rank decay: rank 1 = 1.0, rank 5 = 1.0, rank 15 = 0, >15 floors at 0.
  const avg = summary.avgRank ?? 21;
  const rankComponent = avg <= 5 ? 1 : avg >= 15 ? 0 : (15 - avg) / 10;
  const score = Math.round(100 * (hitRate * 0.7 + rankComponent * 0.3));
  return { score, trend: summary.trend };
}

/**
 * AI Search visibility signal — produces a 0-100 score plus a trend hint.
 * Weights high-priority hit rate at 0.7 and overall hit rate at 0.3.
 * Returns null when no queries are tracked or no checks have run.
 */
export function aiSearchScoreFromSummary(
  summary: AiSearchSummary | null | undefined,
): { score: number; trend: 'up' | 'down' | 'flat' } | null {
  if (!summary || !summary.hasQueries || summary.totalChecks === 0) return null;
  const overall = summary.hitRate ?? 0;
  const high = summary.highHitRate ?? overall;
  const score = Math.round(100 * (high * 0.7 + overall * 0.3));
  return { score, trend: summary.trend };
}

export function deriveCategoryScores(
  findings: Finding[],
  gbpSnap?: GbpSnapshot | null,
  rep?: ReputationStatus | null,
  web?: WebsiteStatus | null,
  mapPack?: MapPackSummary | null,
  aiSearch?: AiSearchSummary | null,
): CategoryScore[] {
  const allKeys = Object.keys(CATEGORY_LABEL) as CategoryKey[];
  return allKeys.map((key) => {
    const inCat = findings.filter((f) => f.category === key);
    const active = inCat.filter(isActive);
    // Reputation Theme Opportunity findings don't deduct from score.
    const penalty = active
      .filter((f) => !(key === 'reputation' && f.type === 'reputation_theme_opportunity'))
      .reduce((sum, f) => sum + (SEV_PENALTY[f.severity] ?? 5), 0);
    let score: number | null = round(100 - penalty);
    let confidence: DataConfidence = active.length === 0 ? 'Complete' : 'Partial';
    let trend = 0;
    let hasSourceSignal = false;

    if (key === 'local') {
      const gbpRaw = localScoreFromSnapshot(gbpSnap);
      const mp = mapPackScoreFromSummary(mapPack);
      const ai = aiSearchScoreFromSummary(aiSearch);
      // Blend rule: GBP 45%, Map Pack 30%, AI Search 25% (normalized over present sources).
      const parts: Array<{ score: number; weight: number }> = [];
      if (gbpRaw !== null) parts.push({ score: gbpRaw, weight: 0.45 });
      if (mp) parts.push({ score: mp.score, weight: 0.30 });
      if (ai) parts.push({ score: ai.score, weight: 0.25 });
      if (parts.length > 0) {
        hasSourceSignal = true;
        const totalW = parts.reduce((s, p) => s + p.weight, 0);
        const raw = parts.reduce((s, p) => s + p.score * p.weight, 0) / totalW;
        score = round(raw - penalty);
      }
      confidence = localConfidenceFromSnapshot(gbpSnap);
      // Downgrade confidence if rankings or AI checks haven't run in 14d.
      const stale = (lastIso: string | null | undefined) =>
        lastIso ? (Date.now() - Date.parse(lastIso)) / DAY > 14 : true;
      if (mapPack?.hasKeywords && stale(mapPack.lastCheckedAt) && confidence === 'Complete') confidence = 'Partial';
      if (aiSearch?.hasQueries && stale(aiSearch.lastCheckedAt) && confidence === 'Complete') confidence = 'Partial';
      // Trend prefers AI > Map Pack signal when both present.
      const t = ai?.trend ?? mp?.trend ?? 'flat';
      trend = t === 'up' ? 1 : t === 'down' ? -1 : 0;
    }

    if (key === 'reputation') {
      const raw = reputationScoreFromStatus(rep);
      if (raw !== null) {
        hasSourceSignal = true;
        score = round(raw - penalty);
      }
      confidence = reputationConfidenceFromStatus(rep);
    }

    if (key === 'website') {
      const raw = websiteScoreFromSnapshot(web?.weekly, web?.pagespeed);
      if (raw !== null) {
        hasSourceSignal = true;
        score = round(raw - penalty);
      }
      confidence = websiteConfidenceFromSnapshot(web);
    }

    // Honest "no data" state: zero active findings AND no source signal →
    // unscored. Excludes the category from Growth Score averaging so empty
    // categories don't post fake 100s.
    if (active.length === 0 && !hasSourceSignal) {
      return {
        key,
        name: CATEGORY_LABEL[key],
        icon: CATEGORY_ICONS[key],
        score: null,
        unscored: true,
        trend: 0,
        openFindings: 0,
        confidence: 'Unavailable',
      };
    }

    return {
      key,
      name: CATEGORY_LABEL[key],
      icon: CATEGORY_ICONS[key],
      score,
      trend,
      openFindings: active.length,
      confidence,
    };
  });
}

export function deriveGrowthScore(cats: CategoryScore[]): number | null {
  let weighted = 0;
  let totalW = 0;
  for (const c of cats) {
    if (c.unscored || c.score === null) continue;
    const w = CATEGORY_WEIGHTS[c.key] ?? 1;
    weighted += c.score * w;
    totalW += w;
  }
  if (totalW === 0) return null;
  return round(weighted / totalW);
}

const opportunityLevel = (totalUpside: number): OpportunityLevel => {
  if (totalUpside >= 24) return 'Very High';
  if (totalUpside >= 14) return 'High';
  if (totalUpside >= 6) return 'Medium';
  return 'Low';
};

const opportunityDollars = (level: OpportunityLevel): string => {
  switch (level) {
    case 'Very High': return '$25,000+ / mo';
    case 'High': return '$15,000–$25,000 / mo';
    case 'Medium': return '$5,000–$15,000 / mo';
    default: return '< $5,000 / mo';
  }
};

const formatLastRun = (iso: string | null | undefined): string => {
  if (!iso) return 'No audit refreshes recorded yet';
  const d = new Date(iso);
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
  const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const ago = days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  return `${datePart} · ${ago}`;
};

const escalateGate = (current: ReadinessGate, target: ReadinessGate): ReadinessGate => {
  const rank: Record<ReadinessGate, number> = {
    'Green Light': 0, 'Caution': 1, 'Needs Ops Fix First': 2,
  };
  return rank[target] > rank[current] ? target : current;
};

/** Active operational_readiness_blocker findings can force-escalate the gate. */
export function deriveOpsGateOverride(
  findings: Finding[],
  scoreGate: ReadinessGate,
): { gate: ReadinessGate; reason: string | null; blocker: Finding | null } {
  const active = findings.filter(
    (f) => isActive(f) && f.type === 'operational_readiness_blocker',
  );
  if (active.length === 0) return { gate: scoreGate, reason: null, blocker: null };

  const hasCritical = active.find((f) => f.severity === 'Critical');
  const hasHigh = active.find((f) => f.severity === 'High');
  const mediumCount = active.filter((f) => f.severity === 'Medium').length;

  let gate: ReadinessGate = scoreGate;
  let blocker: Finding | null = null;
  if (hasCritical) { gate = escalateGate(gate, 'Needs Ops Fix First'); blocker = hasCritical; }
  else if (hasHigh) { gate = escalateGate(gate, 'Caution'); blocker = hasHigh; }
  else if (mediumCount >= 2) { gate = escalateGate(gate, 'Caution'); blocker = active[0]; }
  else { blocker = active[0]; }

  return { gate, reason: blocker?.diagnosis ?? null, blocker };
}

export function derivePrimaryMetrics(
  findings: Finding[],
  cats: CategoryScore[],
  lastRunIso: string | null | undefined,
): PrimaryMetrics {
  // Ops Readiness Gate is currently neutralized — empty reason is the inert
  // sentinel that the UI uses to hide the tile/banner and that
  // GateBadge.computeGateState reads to render no badge. The mechanism
  // (deriveOpsGateOverride / deriveGate) is preserved for a future
  // business-health repurpose; we just don't call it here.
  const gate: ReadinessGate = 'Green Light';
  const reason = '';

  const totalUpside = findings
    .filter(isActive)
    .reduce((s, f) => s + f.revenueUpside, 0);
  const oppLvl = opportunityLevel(totalUpside);
  const growth = deriveGrowthScore(cats);

  return {
    growthScore: growth,
    growthTrend: 0,
    opportunityLevel: oppLvl,
    opportunityDollars: opportunityDollars(oppLvl),
    dataConfidence: 'Partial',
    dataConfidenceNote: 'Connection coverage shown in the Data Sources panel.',
    readiness: gate,
    readinessReason: reason,
    lastRunLabel: formatLastRun(lastRunIso),
  };
}

const sevToPriority = (s: Finding['severity']): Severity =>
  s === 'Critical' ? 'High' : (s as Severity);

const upsideDollarLabel = (n: number): string => {
  // Coarse money proxy from the 1–5 scale, just for the priority row.
  const map: Record<number, string> = {
    1: '+$400/mo', 2: '+$900/mo', 3: '+$1,800/mo', 4: '+$3,200/mo', 5: '+$5,500/mo',
  };
  return map[n] ?? '+$1,000/mo';
};

export function deriveTopPriorities(findings: Finding[], n = 5): Priority[] {
  return [...findings]
    .filter(isActive)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, n)
    .map((f) => ({
      id: f.id,
      title: f.title,
      category: CATEGORY_LABEL[f.category],
      severity: sevToPriority(f.severity),
      upside: upsideDollarLabel(f.revenueUpside),
      isTrafficDriving: f.isTrafficDriving,
      gateReason: f.gateReason,
    }));
}

export function deriveQuickStats(findings: Finding[]): QuickStats {
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const resolvedThisMonth = findings.filter(
    (f) => f.status === 'Resolved' && new Date(f.createdAt).getTime() >= monthAgo,
  ).length;
  const campaignsLaunched = findings.filter(
    (f) => f.status === 'Sent to Marketing Hub' || !!f.campaignId,
  ).length;
  const totalUpside = findings.filter(isActive).reduce((s, f) => s + f.revenueUpside, 0);
  return {
    openFindings: findings.filter(isActive).length,
    resolvedThisMonth,
    campaignsLaunched,
    opportunitySurfaced: opportunityDollars(opportunityLevel(totalUpside)),
  };
}
