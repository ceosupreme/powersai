// localVisibilityGap — emits one finding per detected GBP gap.
// Reads the latest gbp_snapshots row per venue. If no snapshot or stale
// (>30d), emits a single "no GBP data" finding and short-circuits so the
// individual gap detectors don't fire on missing data.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'local_visibility_gap';
const CATEGORY = 'local';

const DAY = 86_400_000;

type Snap = {
  id: string;
  captured_at: string;
  source: 'automated' | 'manual';
  scope: string;
  primary_category: string | null;
  description: string | null;
  hours_complete: boolean | null;
  attributes: Record<string, unknown> | null;
  photo_count: number | null;
  last_photo_at: string | null;
  post_count: number | null;
  last_post_at: string | null;
  qa_unanswered: number | null;
  last_qa_answered_at: string | null;
  review_response_rate_30d: number | null;
  nap_match_name: boolean | null;
  nap_match_address: boolean | null;
  nap_match_phone: boolean | null;
};

function ageDays(iso: string): number {
  return (Date.now() - Date.parse(iso)) / DAY;
}

function confidenceFor(snap: Snap): 1 | 2 | 3 | 4 | 5 {
  const age = ageDays(snap.captured_at);
  if (snap.source === 'automated' && age < 7) return 5;
  if (age < 30) return 3;
  return 2;
}

export const localVisibilityGapAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      const { data: snapRows, error } = await supabase
        .from('gbp_snapshots')
        .select('id, captured_at, source, scope, primary_category, description, hours_complete, attributes, photo_count, last_photo_at, post_count, last_post_at, qa_unanswered, last_qa_answered_at, review_response_rate_30d, nap_match_name, nap_match_address, nap_match_phone')
        .eq('venue_id', venueId)
        .is('fetch_error', null)
        .order('captured_at', { ascending: false })
        .limit(1);
      if (error) throw error;

      const snap = (snapRows?.[0] as Snap | undefined);
      const currentKeys: string[] = [];

      if (!snap || ageDays(snap.captured_at) > 30) {
        const sk = 'gbp:no_data';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity: 'Medium',
          title: 'Google Business Profile data missing',
          diagnosis: 'No fresh GBP snapshot exists for this venue. Local search visibility cannot be scored until a place mapping is configured or manual data is entered.',
          recommended_action: 'Open Data Sources → Google Business Profile and either resolve the venue\'s place ID or submit a manual snapshot.',
          evidence: {
            summary: snap ? `Most recent snapshot is ${Math.round(ageDays(snap.captured_at))}d old.` : 'No snapshot found.',
            sources: [{ label: 'GBP audit pipeline', ref: `venue:${venueId}` }],
          },
          revenue_upside: 3, ease: 4, confidence: 5, operational_risk: 1,
          metadata: { snapshot_id: snap?.id ?? null },
        });
        if (inserted) result.inserted++; else result.updated++;
        result.resolved += await bulkReconcile(supabase, venueId, TYPE_ID, currentKeys);
        result.ms = Date.now() - t0;
        return result;
      }

      const conf = confidenceFor(snap);
      const ev = (s: string) => ({
        summary: s,
        sources: [{
          label: `GBP audit · ${snap.source} · ${new Date(snap.captured_at).toISOString().slice(0, 10)}`,
          ref: `gbp_snapshot:${snap.id}`,
        }],
      });
      const meta = (extra: Record<string, unknown>) => ({
        snapshot_id: snap.id,
        captured_at: snap.captured_at,
        source: snap.source,
        ...extra,
      });

      // 1. Missing primary category — Critical.
      if (!snap.primary_category) {
        const sk = 'gbp:missing_primary_category';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: 'Critical',
          title: 'Primary business category missing on Google',
          diagnosis: 'Without a primary category set, this venue is invisible in category-filtered local pack searches.',
          recommended_action: 'Open the Google Business Profile dashboard and set a primary category that matches the venue type.',
          evidence: ev('Snapshot reports no primary category.'),
          revenue_upside: 5, ease: 4, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'primary_category' }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // 2. Missing business description — High.
      if (snap.description == null || snap.description.trim().length < 30) {
        const sk = 'gbp:missing_description';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: 'High',
          title: 'Business description missing or too short',
          diagnosis: 'A keyword-rich business description improves local relevance and click-through. The current description is empty or under 30 characters.',
          recommended_action: 'Write a 200-400 character description that mentions the venue type, signature offerings, and neighborhood.',
          evidence: ev(`Description length: ${snap.description?.trim().length ?? 0} chars.`),
          revenue_upside: 3, ease: 4, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'description' }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // 3. Incomplete hours — High.
      if (snap.hours_complete === false) {
        const sk = 'gbp:incomplete_hours';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: 'High',
          title: 'Operating hours incomplete on Google',
          diagnosis: 'Google penalizes listings with missing daily hours, and customers route to competitors when hours are ambiguous.',
          recommended_action: 'Fill in regular hours for all 7 days, then add holiday hours for the next 90 days.',
          evidence: ev('Snapshot reports hours not complete for all days.'),
          revenue_upside: 4, ease: 5, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'hours' }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // 4. No recent posts — Medium.
      const lastPostAge = snap.last_post_at ? ageDays(snap.last_post_at) : Infinity;
      if (lastPostAge > 30 && snap.last_post_at !== undefined) {
        const sk = 'gbp:no_recent_posts:30d';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: 'Medium',
          title: 'No GBP posts in the last 30 days',
          diagnosis: `Last post was ${Number.isFinite(lastPostAge) ? Math.round(lastPostAge) + 'd ago' : 'never'}. Inactive profiles get less local-pack exposure.`,
          recommended_action: 'Publish a "What\'s New" or "Offer" post this week and aim for one post per week ongoing.',
          evidence: ev(`Last post: ${snap.last_post_at ?? 'never'}.`),
          revenue_upside: 3, ease: 4, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'posts', last_post_at: snap.last_post_at }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // 5. Stale photos — Medium.
      const lastPhotoAge = snap.last_photo_at ? ageDays(snap.last_photo_at) : null;
      if (lastPhotoAge !== null && lastPhotoAge > 90) {
        const sk = 'gbp:stale_photos:90d';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: 'Medium',
          title: 'No new GBP photos in the last 90 days',
          diagnosis: `Most recent photo upload was ${Math.round(lastPhotoAge)}d ago. Fresh photography signals an active business to Google.`,
          recommended_action: 'Upload 5-10 fresh photos (food, drinks, interior, events) this week.',
          evidence: ev(`Last photo: ${snap.last_photo_at}.`),
          revenue_upside: 2, ease: 5, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'photos', last_photo_at: snap.last_photo_at }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // 6. Low review response rate — Medium.
      if (typeof snap.review_response_rate_30d === 'number' && snap.review_response_rate_30d < 0.5) {
        const sk = 'gbp:low_response_rate:30d';
        currentKeys.push(sk);
        const pct = Math.round(snap.review_response_rate_30d * 100);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: 'Medium',
          title: `Review response rate ${pct}% over last 30 days`,
          diagnosis: 'Google rewards businesses that respond to reviews. Response rate below 50% drops local relevance signals.',
          recommended_action: 'Respond to all unreplied reviews from the last 30 days, then commit to a 48-hour SLA.',
          evidence: ev(`Response rate: ${pct}%.`),
          revenue_upside: 3, ease: 3, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'response_rate', rate: snap.review_response_rate_30d }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // 7. Unanswered Q&A — Low/Medium.
      if (typeof snap.qa_unanswered === 'number' && snap.qa_unanswered > 0) {
        const sk = 'gbp:unanswered_qa';
        currentKeys.push(sk);
        const lastAnsweredAge = snap.last_qa_answered_at ? ageDays(snap.last_qa_answered_at) : Infinity;
        const sev: FindingSeverity = lastAnsweredAge > 14 ? 'Medium' : 'Low';
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: sev,
          title: `${snap.qa_unanswered} unanswered question${snap.qa_unanswered === 1 ? '' : 's'} on Google`,
          diagnosis: 'Unanswered Q&A items show up to potential customers searching the listing and can be answered by anyone — including competitors.',
          recommended_action: 'Answer each open question this week with the official venue voice.',
          evidence: ev(`Open questions: ${snap.qa_unanswered}.`),
          revenue_upside: 2, ease: 5, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'qa', unanswered: snap.qa_unanswered }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // 8. NAP mismatches — High per field.
      for (const field of ['name', 'address', 'phone'] as const) {
        const matchKey = `nap_match_${field}` as const;
        if (snap[matchKey] === false) {
          const sk = `gbp:nap_mismatch:${field}`;
          currentKeys.push(sk);
          const { inserted } = await upsertFinding(supabase, venueId, sk, {
            type_id: TYPE_ID, category: CATEGORY, severity: 'High',
            title: `Google ${field} doesn't match BarPulse record`,
            diagnosis: `The ${field} on the Google listing differs from this venue's record in BarPulse. Inconsistent NAP data hurts local pack ranking and confuses customers.`,
            recommended_action: `Reconcile the ${field} between Google and the venue's authoritative record so they match exactly.`,
            evidence: ev(`NAP ${field} mismatch detected.`),
            revenue_upside: 3, ease: 3, confidence: conf, operational_risk: 1,
            metadata: meta({ gap: 'nap', field }),
          });
          if (inserted) result.inserted++; else result.updated++;
        }
      }

      // 9. Missing high-value attributes — Medium.
      if (snap.attributes && Object.keys(snap.attributes).length === 0) {
        const sk = 'gbp:missing_attributes';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID, category: CATEGORY, severity: 'Medium',
          title: 'No service attributes set on Google',
          diagnosis: 'Attributes (payment, parking, accessibility, amenities) help Google match the venue to filtered searches.',
          recommended_action: 'Set the relevant attributes for this venue type in the GBP dashboard.',
          evidence: ev('Snapshot reports no attributes.'),
          revenue_upside: 2, ease: 5, confidence: conf, operational_risk: 1,
          metadata: meta({ gap: 'attributes' }),
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      result.resolved += await bulkReconcile(supabase, venueId, TYPE_ID, currentKeys);
      result.ms = Date.now() - t0;
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(msg);
      result.ms = Date.now() - t0;
      return result;
    }
  },
};
