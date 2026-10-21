// Free checkup report: "Your marketing" — where they show up on Google, what
// their Google listing shows, where online orders go, ad and analytics tags,
// and how their site looks in Google results. Built only from what the
// checkup returned (results from version 6 on; older results give fewer or
// no rows). Nothing here fetches or estimates anything.

import type { GoogleSummaryResult, ListingSummaryResult, WebsiteCheck } from '@/hooks/usePublicAudit';

export type MarketingTone = 'ok' | 'gap' | 'unknown';
export type MarketingRow = { tone: MarketingTone; title: string; detail?: string; badge?: string };
export type MarketingSection = { key: string; heading: string; intro?: string; rows: MarketingRow[] };

const fmt = (n: number) => n.toLocaleString('en-US');
const list = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

export function marketingSections(input: {
  website?: WebsiteCheck | null;
  listing?: ListingSummaryResult | null;
  google?: GoogleSummaryResult | null;
  matchedKey: string | null;
  unknownType: boolean;
}): MarketingSection[] {
  const { website, listing, google } = input;
  const food = input.matchedKey === 'bars_restaurants' && !input.unknownType;
  const f = website?.features ?? null;
  const m = website?.marketing ?? null;
  const sections: MarketingSection[] = [];

  // Where they show up for the searches people use.
  if (google?.keyword) {
    const all = [{ keyword: google.keyword, you_rank: google.you_rank }, ...(google.searches ?? [])];
    const anyBelow = all.some((s) => s.you_rank == null || s.you_rank > 3);
    sections.push({
      key: 'searches',
      heading: 'Where you show up on Google',
      intro: [google.searched_near ? 'Searched from your location, the way someone nearby searches.' : '', anyBelow ? "Google's map results show the top 3 first." : '']
        .filter(Boolean).join(' ') || undefined,
      rows: all.map((s): MarketingRow => ({
        tone: s.you_rank != null && s.you_rank <= 3 ? 'ok' : 'gap',
        title: `“${s.keyword}”`,
        badge: s.you_rank == null ? 'Not in the top 20' : `#${s.you_rank}`,
      })),
    });
  }

  // What their Google listing shows.
  const listingRows: MarketingRow[] = [];
  const special = Array.isArray(listing?.special_hours) ? listing!.special_hours! : null;
  if (food && special) {
    if (special.includes('HAPPY_HOUR')) listingRows.push({ tone: 'ok', title: 'Your happy hour times are on your Google listing.' });
    else if (f?.happy_hour) listingRows.push({ tone: 'gap', title: "Your happy hour isn't on your Google listing.", detail: 'Google can show happy hour times right on your listing. Yours has none set.' });
    if (special.includes('BRUNCH')) listingRows.push({ tone: 'ok', title: 'Your brunch hours are on your Google listing.' });
    else if (f?.brunch) listingRows.push({ tone: 'gap', title: "Your brunch hours aren't on your Google listing.", detail: 'Google can show brunch hours right on your listing. Yours has none set.' });
  }
  const avg = google?.top3_avg_reviews;
  const count = listing?.review_count;
  if (typeof avg === 'number' && typeof count === 'number' && google?.keyword) {
    const line = `${fmt(count)} Google review${count === 1 ? '' : 's'}. The top 3 for “${google.keyword}” average ${fmt(avg)}.`;
    listingRows.push(count >= avg
      ? { tone: 'ok', title: line }
      : { tone: 'gap', title: line, detail: 'Google says more reviews and good ratings help a business rank higher in local results.' });
  }
  if (listingRows.length) sections.push({ key: 'listing', heading: 'Your Google listing', rows: listingRows });

  // Where online orders go (bars and restaurants).
  if (food && f?.online_ordering && typeof f.ordering_direct === 'boolean') {
    const apps = f.ordering_apps ?? [];
    const bigTwo = apps.some((a) => a === 'DoorDash' || a === 'Uber Eats');
    const rows: MarketingRow[] = [];
    if (!f.ordering_direct && apps.length) {
      rows.push({
        tone: 'gap',
        title: `Your online orders go through ${list(apps)}.`,
        detail: `${bigTwo ? 'DoorDash and Uber Eats take 15% to 30% of each delivery order.' : 'Delivery apps take a cut of each order.'} Ordering on your own site avoids that commission.`,
      });
    } else if (f.ordering_direct) {
      rows.push({ tone: 'ok', title: apps.length ? `You take orders on your own site, and also through ${list(apps)}.` : 'You take orders on your own site.' });
    }
    if (rows.length) sections.push({ key: 'orders', heading: 'Online orders', rows });
  }

  // Ad and analytics tags.
  if (m?.tags) {
    const t = m.tags;
    const rows: MarketingRow[] = [];
    const how = t.tag_manager ? 'through Google Tag Manager' : 'through its site builder';
    const hiddenDetail = `Your site loads its tags ${how} after the page opens, which we can't see from outside.`;
    if (t.meta_pixel == null && t.google_analytics == null) {
      rows.push({ tone: 'unknown', title: "Ad pixels and Google Analytics: we couldn't tell.", detail: hiddenDetail });
    } else {
      if (t.meta_pixel === true) rows.push({ tone: 'ok', title: 'Facebook and Instagram ad pixel', detail: 'You can show ads to people who visited your site.' });
      else if (t.meta_pixel === false) rows.push({ tone: 'gap', title: 'No Facebook ad pixel', detail: `People who ${food ? 'look at your menu' : 'visit your site'} and leave can't be shown your ads on Facebook and Instagram later.` });
      else rows.push({ tone: 'unknown', title: "Facebook ad pixel: we couldn't tell.", detail: hiddenDetail });
      if (t.old_google_analytics_only) rows.push({ tone: 'gap', title: 'Only the old Google Analytics', detail: "Google shut that version off on July 1, 2023, so your site hasn't counted a visit since." });
      else if (t.google_analytics === true) rows.push({ tone: 'ok', title: 'Google Analytics', detail: 'You can see how many people visit and where they come from.' });
      else if (t.google_analytics === false) rows.push({ tone: 'gap', title: 'No Google Analytics', detail: "You can't see how many people visit your site or where they come from." });
      else rows.push({ tone: 'unknown', title: "Google Analytics: we couldn't tell.", detail: hiddenDetail });
    }
    if (t.google_ads) rows.push({ tone: 'ok', title: 'Google Ads conversion tracking' });
    if (t.tiktok_pixel) rows.push({ tone: 'ok', title: 'TikTok ad pixel' });
    sections.push({ key: 'tags', heading: 'Ads and tracking', rows });
  }

  // How the homepage looks in Google results and when its link is shared.
  if (m?.search) {
    const s = m.search;
    const rows: MarketingRow[] = [];
    if (!s.title) {
      rows.push({ tone: 'gap', title: 'No page title', detail: 'Your homepage has no title for Google to show as the blue link.' });
    } else if (typeof s.title_says_where === 'boolean' || typeof s.title_says_what === 'boolean') {
      const where = s.title_says_where !== false;
      const what = s.title_says_what !== false;
      const title = `Page title: “${s.title}”`;
      const link = 'That title is the blue link people see in Google.';
      rows.push(where && what
        ? { tone: 'ok', title, detail: 'It says what you are and where.' }
        : { tone: 'gap', title, detail: `It doesn't say ${!where && !what ? 'what you are or where' : !where ? 'where you are' : 'what kind of place you are'}. ${link}` });
    }
    rows.push(s.description
      ? { tone: 'ok', title: 'Search description', detail: 'The gray text under your link in Google.' }
      : { tone: 'gap', title: 'No search description', detail: 'Google fills the gray lines under your link with whatever text it picks from your page.' });
    rows.push(s.share_image
      ? { tone: 'ok', title: 'Share picture', detail: "Your link shows a photo when it's texted or posted." }
      : { tone: 'gap', title: 'No share picture', detail: 'When someone texts or posts your link, it shows up without a photo.' });
    rows.push(s.business_schema
      ? { tone: 'ok', title: 'Business details coded for Google', detail: 'Your hours, address and phone are marked up so Google reads them correctly.' }
      : { tone: 'gap', title: "Business details aren't coded for Google", detail: "Your hours, address and phone aren't marked up (schema markup), which helps Google read them correctly." });
    sections.push({ key: 'search', heading: 'Your site in Google results', rows });
  }

  return sections;
}

export function marketingGapCount(sections: MarketingSection[]): number {
  return sections.reduce((n, s) => n + s.rows.filter((r) => r.tone === 'gap').length, 0);
}
