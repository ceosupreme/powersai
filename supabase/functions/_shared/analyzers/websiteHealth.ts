// Analyzer — Website Health
// Multi-signal SEO/site-health gaps. Each gap is its own signal_key so it
// resolves independently. Findings here are NOT traffic-driving — they
// improve search visibility, not raw demand.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'website_health';
const CATEGORY = 'website';
const DAY = 86_400_000;

type Gap = {
  key: string; severity: FindingSeverity; title: string;
  diagnosis: string; action: string;
  upside: number; ease: number;
};

export const websiteHealthAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();
    try {
      // Latest weekly snapshot
      const { data: weekly } = await supabase
        .from('website_snapshots')
        .select('*')
        .eq('venue_id', venueId)
        .eq('scope', 'weekly_full')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Latest pagespeed snapshot
      const { data: psi } = await supabase
        .from('website_snapshots')
        .select('captured_at, perf_score, inp_ms, lcp_ms, cls, mobile_friendly, https_enabled')
        .eq('venue_id', venueId)
        .eq('scope', 'daily_pagespeed')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!weekly && !psi) {
        result.note = 'no website data';
        result.ms = Date.now() - t0;
        return result;
      }
      const ageDays = weekly ? (Date.now() - Date.parse(weekly.captured_at)) / DAY : Infinity;
      if (weekly && ageDays > 60) {
        result.note = `weekly snapshot stale (${Math.round(ageDays)}d)`;
        // still allow PSI-only alerts to fire below
      }

      const gaps: Gap[] = [];
      const httpsEnabled = (psi?.https_enabled ?? weekly?.https_enabled);
      if (httpsEnabled === false) {
        gaps.push({
          key: 'website_health:no_https',
          severity: 'Critical',
          title: 'Website is not served over HTTPS',
          diagnosis: 'Modern browsers warn visitors that your site is not secure, and search engines penalize HTTP-only sites.',
          action: 'Enable HTTPS via your hosting provider or CMS. Most platforms (Squarespace, Wix, WordPress hosts) offer free SSL with one click.',
          upside: 4, ease: 5,
        });
      }
      if (psi && psi.mobile_friendly === false) {
        gaps.push({
          key: 'website_health:no_mobile',
          severity: 'Critical',
          title: 'No mobile-friendly version detected',
          diagnosis: 'PageSpeed Insights reports your site is not mobile-friendly. Most local-search traffic comes from phones.',
          action: 'Switch to a responsive theme or enable your CMS\'s mobile view. This is the single highest-impact site fix for local search.',
          upside: 5, ease: 3,
        });
      }

      if (weekly) {
        if (weekly.menu_is_pdf_only) {
          gaps.push({
            key: 'website_health:menu_pdf_only',
            severity: 'High',
            title: 'Menu is only available as a PDF',
            diagnosis: 'Search engines cannot fully index PDF menus. Customers can\'t skim a PDF on mobile, and you miss menu-item search ranking.',
            action: 'Publish your menu as an HTML page (one section per category). Keep the PDF for download but make HTML the primary version.',
            upside: 4, ease: 3,
          });
        } else if (!weekly.has_menu_page) {
          gaps.push({
            key: 'website_health:missing_menu',
            severity: 'Critical',
            title: 'No menu page found on the website',
            diagnosis: 'A menu page is the most-searched destination for restaurant/bar websites. Visitors who can\'t find one bounce immediately.',
            action: 'Publish a menu page reachable from the main navigation, with prices and descriptions in HTML.',
            upside: 5, ease: 3,
          });
        }
        if (!weekly.has_localbusiness_schema) {
          gaps.push({
            key: 'website_health:missing_schema',
            severity: 'High',
            title: 'No Restaurant / LocalBusiness schema markup',
            diagnosis: 'Without schema.org structured data, Google can\'t reliably display your hours, address, and rating in rich results.',
            action: 'Add JSON-LD Restaurant or BarOrPub schema with name, address, phone, hours, and URL on the homepage.',
            upside: 3, ease: 4,
          });
        }
        if (!weekly.has_contact_page) {
          gaps.push({
            key: 'website_health:missing_contact',
            severity: 'High',
            title: 'No contact page detected',
            diagnosis: 'Visitors expect a clear contact page with hours, address, phone, and a way to reach you for questions.',
            action: 'Add a /contact page with full address, phone (clickable on mobile), email, hours, and an embedded map.',
            upside: 3, ease: 5,
          });
        }
        if (!weekly.has_events_page) {
          gaps.push({
            key: 'website_health:missing_events',
            severity: 'High',
            title: 'No events / calendar page detected',
            diagnosis: 'An events page captures repeat visits and feeds local-event search results.',
            action: 'Publish an events or calendar page (even a simple list works). Update it weekly.',
            upside: 3, ease: 4,
          });
        }
        if (!weekly.has_happy_hour_page) {
          gaps.push({
            key: 'website_health:missing_happy_hour',
            severity: 'Medium',
            title: 'No happy hour / specials page',
            diagnosis: '"Happy hour [city]" is one of the highest-volume bar searches and you have no page to rank for it.',
            action: 'Publish a happy hour page with days, times, and featured items.',
            upside: 4, ease: 4,
          });
        }
        const altCov = weekly.image_alt_coverage_pct;
        if (typeof altCov === 'number' && altCov < 40) {
          gaps.push({
            key: 'website_health:low_alt_coverage',
            severity: 'Medium',
            title: `Image alt-text coverage is ${Math.round(altCov)}%`,
            diagnosis: 'Most images lack alt text, hurting both accessibility and image-search visibility.',
            action: 'Add descriptive alt text to all menu/photo images. Aim for 80%+ coverage.',
            upside: 2, ease: 4,
          });
        }
        const audited = weekly.pages_audited ?? 0;
        const withMeta = weekly.pages_with_meta_desc ?? 0;
        if (audited >= 5 && withMeta / audited < 0.5) {
          gaps.push({
            key: 'website_health:missing_meta_desc',
            severity: 'Medium',
            title: 'Most pages are missing meta descriptions',
            diagnosis: `Only ${withMeta}/${audited} crawled pages have a meta description. Search results auto-generate snippets that are often unappealing.`,
            action: 'Write a 140-160 character meta description for each key page.',
            upside: 2, ease: 4,
          });
        }
        const withH1 = weekly.pages_with_h1 ?? 0;
        if (audited >= 5 && withH1 / audited < 0.7) {
          gaps.push({
            key: 'website_health:missing_h1',
            severity: 'Low',
            title: 'Several pages are missing an H1 heading',
            diagnosis: `${audited - withH1} of ${audited} crawled pages have no H1. Search engines lean on H1 to understand page topic.`,
            action: 'Ensure every page has exactly one H1 that matches the page topic.',
            upside: 1, ease: 5,
          });
        }
        const withTitle = weekly.pages_with_title ?? 0;
        if (audited >= 5 && withTitle / audited < 0.8) {
          gaps.push({
            key: 'website_health:short_titles',
            severity: 'Low',
            title: 'Several pages have weak or missing titles',
            diagnosis: `${audited - withTitle} of ${audited} crawled pages have a missing or very short <title>.`,
            action: 'Write a 50-60 character title tag for each page including the venue name and key topic.',
            upside: 1, ease: 5,
          });
        }
      }

      // Core Web Vitals from PSI
      if (psi) {
        const cwvFail = (psi.lcp_ms && psi.lcp_ms > 2500)
          || (psi.cls != null && Number(psi.cls) > 0.1)
          || (psi.inp_ms && psi.inp_ms > 200);
        if (cwvFail) {
          gaps.push({
            key: 'website_health:cwv_failing',
            severity: 'Medium',
            title: 'Core Web Vitals failing on mobile',
            diagnosis: `PageSpeed mobile scores: LCP ${psi.lcp_ms ?? '—'}ms, CLS ${psi.cls ?? '—'}, INP ${psi.inp_ms ?? '—'}ms. One or more are above Google\'s thresholds.`,
            action: 'Compress images, defer non-critical scripts, and audit large layout-shifting elements (banners, ads, fonts).',
            upside: 2, ease: 2,
          });
        }
      }

      // Emit
      const currentKeys: string[] = [];
      for (const g of gaps) {
        currentKeys.push(g.key);
        const { inserted } = await upsertFinding(supabase, venueId, g.key, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity: g.severity,
          title: g.title,
          diagnosis: g.diagnosis,
          recommended_action: g.action,
          evidence: {
            summary: weekly
              ? `Detected via website audit on ${new Date(weekly.captured_at).toISOString().slice(0, 10)}.`
              : 'Detected via PageSpeed Insights audit.',
            sources: [
              ...(weekly ? [{ label: 'Website crawl', ref: `snapshot:${weekly.id}` }] : []),
              ...(psi ? [{ label: 'PageSpeed Insights', ref: `psi:${psi.captured_at}` }] : []),
            ],
          },
          revenue_upside: g.upside,
          ease: g.ease,
          confidence: weekly && ageDays <= 14 ? 5 : 3,
          operational_risk: 1,
          is_traffic_driving: false,
          metadata: { gap: g.key.replace('website_health:', '') },
        });
        if (inserted) result.inserted++; else result.updated++;
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
