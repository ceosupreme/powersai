// Analyzer — Private Party Conversion Gap
// High-value: detects venues whose websites lack a clear group/private-event
// inquiry funnel. Cross-source enriches with historical group event campaigns
// when present.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'private_party_conversion_gap';
const CATEGORY = 'website';
const DAY = 86_400_000;

const PACKAGE_KEYWORDS = /package|pricing|menu|capacity|guests|minimum|deposit|per[- ]?person|per[- ]?head|buyout/i;

export const privatePartyConversionGapAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();
    try {
      const { data: snap } = await supabase
        .from('website_snapshots')
        .select('*')
        .eq('venue_id', venueId)
        .eq('scope', 'weekly_full')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!snap) {
        result.note = 'no website snapshot yet';
        result.ms = Date.now() - t0;
        return result;
      }

      const ageDays = (Date.now() - Date.parse(snap.captured_at)) / DAY;
      if (ageDays > 60) {
        result.note = `snapshot stale (${Math.round(ageDays)}d)`;
        result.ms = Date.now() - t0;
        return result;
      }

      // Look for historical group event campaigns (last 180d).
      const since = new Date(Date.now() - 180 * DAY).toISOString().slice(0, 10);
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, type, results, expected_revenue_impact, start_date')
        .eq('venue_id', venueId)
        .in('type', ['Event', 'Brand Partnership'])
        .gte('start_date', since);

      const groupCampaigns = (campaigns || []).filter((c) =>
        /private|group|party|buyout|corporate/i.test(JSON.stringify(c.results ?? {}) + (c.type || ''))
      );
      const hasHistory = groupCampaigns.length > 0;

      // Best-effort revenue tally from results blob.
      let historicalRevenue = 0;
      for (const c of groupCampaigns) {
        const r = (c.results ?? {}) as Record<string, unknown>;
        const v = Number(r.actual_revenue ?? r.revenue ?? c.expected_revenue_impact ?? 0);
        if (Number.isFinite(v)) historicalRevenue += v;
      }
      const historyClause = hasHistory && historicalRevenue > 0
        ? `Booked ${groupCampaigns.length} private/group event${groupCampaigns.length === 1 ? '' : 's'} in the last 6 months generating ~$${Math.round(historicalRevenue).toLocaleString()}.`
        : hasHistory
          ? `Booked ${groupCampaigns.length} private/group event${groupCampaigns.length === 1 ? '' : 's'} in the last 6 months.`
          : '';

      // Find private-party page rows for richer evidence.
      const { data: ppPages } = await supabase
        .from('website_pages')
        .select('url, title, h1_text, body_text_sample:url')
        .eq('snapshot_id', snap.id)
        .eq('page_kind', 'private_party');

      const currentKeys: string[] = [];
      const baseConfidence = (() => {
        if (snap.fetch_error || snap.js_heavy) return 2;
        if (hasHistory && ageDays <= 14) return 5;
        if (ageDays <= 14) return 4;
        return 3;
      })();

      const emit = async (
        sk: string, severity: FindingSeverity, title: string, diagnosis: string,
        action: string, gapDetail: Record<string, unknown>,
      ) => {
        currentKeys.push(sk);
        const fullDiag = historyClause ? `${historyClause} ${diagnosis}` : diagnosis;
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity,
          title,
          diagnosis: fullDiag,
          recommended_action: action,
          evidence: {
            summary: hasHistory
              ? `${groupCampaigns.length} historical group event(s); website gap detected on ${new Date(snap.captured_at).toISOString().slice(0, 10)}.`
              : `Website audit ${new Date(snap.captured_at).toISOString().slice(0, 10)} flagged this gap.`,
            sources: [
              { label: 'Website audit', ref: `snapshot:${snap.id}` },
              ...(hasHistory ? [{ label: 'Historical group events', ref: `campaigns:${groupCampaigns.length}` }] : []),
            ],
          },
          revenue_upside: severity === 'Critical' ? 5 : severity === 'High' ? 4 : severity === 'Medium' ? 3 : 2,
          ease: 4,
          confidence: baseConfidence,
          operational_risk: 1,
          is_traffic_driving: true,
          metadata: {
            ...gapDetail,
            historical_group_events: groupCampaigns.length,
            historical_group_revenue: historicalRevenue || null,
            snapshot_id: snap.id,
            sample_pages: (ppPages ?? []).slice(0, 3).map((p) => ({ url: p.url, title: p.title })),
          },
        });
        if (inserted) result.inserted++; else result.updated++;
      };

      // Gap A: no private party page at all
      if (!snap.has_private_party_page) {
        const sev: FindingSeverity = hasHistory ? 'Critical' : 'High';
        await emit(
          'private_party_gap:no_page',
          sev,
          'No private party / group events page detected',
          'Your website has no discoverable page for private parties or group event inquiries — visitors looking to book a buyout, large group, or corporate event have no clear path.',
          'Add a dedicated "Private Events" or "Group Bookings" page with package overview, capacity, and an inquiry form. Link it from the main navigation.',
          { gap: 'no_page' },
        );
      } else {
        // A page exists. Check downstream gaps.
        if (!snap.private_party_has_form && !snap.has_contact_form) {
          await emit(
            'private_party_gap:no_form',
            'High',
            'Private party page lacks an inquiry form',
            'Your private party page exists but has no inquiry form or scheduling mechanism. Interested groups must hunt for a phone or email.',
            'Add a structured inquiry form (date, group size, event type, contact info) on the private party page so leads get captured automatically.',
            { gap: 'no_form' },
          );
        } else {
          // Has form — check for packages/pricing language on PP pages
          const hasPackages = (ppPages ?? []).some((p) =>
            PACKAGE_KEYWORDS.test(`${p.title || ''} ${p.h1_text || ''}`),
          );
          if (!hasPackages) {
            await emit(
              'private_party_gap:no_packages',
              'Medium',
              'Private party page lacks package or pricing details',
              'Your private party page has an inquiry form but does not show packages, pricing, or capacity — visitors often need this to decide whether to inquire.',
              'Add at least 2-3 package tiers with capacity, food/beverage minimums, and a starting price. Even ranges convert better than no information.',
              { gap: 'no_packages' },
            );
          }
        }

        if (!snap.private_party_linked_from_home) {
          await emit(
            'private_party_gap:orphan',
            'Low',
            'Private party page is not linked from the homepage',
            'Your private party page exists but is not linked from the homepage navigation or footer. Search engines and visitors will struggle to discover it.',
            'Add a link to the private events page in the main navigation and/or footer of the homepage.',
            { gap: 'orphan' },
          );
        }
      }

      result.resolved += await bulkReconcile(supabase, venueId, TYPE_ID, currentKeys);
      result.ms = Date.now() - t0;
      return result;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
      result.ms = Date.now() - t0;
      return result;
    }
  },
};
