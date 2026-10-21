// Free checkup report: owner-facing wording for every finding, and the
// online score. Both work only from what the checkup returns; nothing here
// fetches or invents data.

import type { WebsiteCheck } from '@/hooks/usePublicAudit';

export type FindingCopy = { title: string; means: string; fix: string };

type TypeGroup = 'restaurant' | 'home' | 'auto' | 'carpet' | 'moving';

/** Which wording set a checkup uses, from the matched business type. */
export function typeGroup(matchedKey: string | null | undefined): TypeGroup {
  switch (matchedKey) {
    case 'bars_restaurants': return 'restaurant';
    case 'auto': return 'auto';
    case 'carpet_cleaning': return 'carpet';
    case 'moving_hauling': return 'moving';
    default: return 'home'; // home_services, hvac, plumbing, client
  }
}

const COPY: Record<TypeGroup, Record<string, FindingCopy>> = {
  restaurant: {
    'Reservation/inquiry calls ringing out': {
      title: 'Calls missed during service',
      means: "When the phone rings during a rush and nobody picks up, most callers don't leave a message. They book somewhere else.",
      fix: 'An AI phone assistant answers every call, takes reservations, and texts back anyone who hangs up.',
    },
    'Event inquiries unfollowed': {
      title: 'Private event requests going cold',
      means: 'Event planners contact several venues at once and usually book the first one that answers with dates and prices.',
      fix: 'Every event request gets an instant reply with your packages and a link to book a walkthrough, then follow-ups until they answer.',
    },
    'Regulars unworked (no reactivation)': {
      title: 'Regulars who stopped coming in',
      means: 'Bringing back a past guest costs much less than finding a new one, but only if you can reach them.',
      fix: 'Collect guest emails and phone numbers, then send an automatic "we miss you" offer to anyone who hasn\'t been in for 60 days.',
    },
    'Online review response gap': {
      title: 'Bad reviews without a reply',
      means: 'People read your replies before they decide where to eat. A 1- to 3-star review with no reply tells them nobody is listening.',
      fix: 'Every new review gets a reply drafted the same day for you to approve, and happy guests get a text asking for a review.',
    },
  },
  home: {
    'Missed calls': {
      title: 'Calls you missed',
      means: 'Someone with a leak or a dead AC calls the next company on the list if nobody picks up.',
      fix: 'Missed calls get an instant text back, and an AI receptionist answers after hours and books the job.',
    },
    'Unsold estimates': {
      title: 'Estimates that never got a follow-up',
      means: "Many customers who don't say yes right away just need a reminder. One follow-up wins a lot of them back.",
      fix: "Automatic text and email follow-ups on every open estimate until it's a yes or a no.",
    },
    'Slow first response on inbound leads': {
      title: 'Online leads waiting too long for a reply',
      means: 'Homeowners usually hire the first company that gets back to them. A reply in five minutes beats a reply in an hour.',
      fix: 'Every web form, Google message and Facebook lead gets an instant text reply and goes straight to your phone.',
    },
    'Unresponded emergency jobs': {
      title: 'Emergency calls nobody answered',
      means: "Emergency customers pay the most and wait the least. If nobody answers, they've hired someone else within minutes.",
      fix: 'Emergency calls ring through to whoever is on call, with an instant text back if nobody picks up.',
    },
    'Unresponded emergency leads': {
      title: 'Emergency calls nobody answered',
      means: "Emergency customers pay the most and wait the least. If nobody answers, they've hired someone else within minutes.",
      fix: 'Emergency calls ring through to whoever is on call, with an instant text back if nobody picks up.',
    },
    'Unresponded leads sitting in queue': {
      title: 'Leads still waiting for a first reply',
      means: 'A lead that sits in your inbox for a day has usually already talked to someone else.',
      fix: 'Every new lead gets an instant reply and a follow-up schedule, so nothing sits.',
    },
  },
  auto: {
    'Slow first response on inbound leads': {
      title: 'Online leads waiting too long for a reply',
      means: 'Car shoppers send the same request to several dealers. The first one to answer usually gets the visit.',
      fix: 'Every web form and marketplace lead gets an instant text reply and goes straight to your sales team.',
    },
    'Unworked past-buyer list': {
      title: "Past buyers you're not bringing back for service",
      means: 'People who bought from you are the easiest service customers to win, as long as you remind them.',
      fix: 'Automatic service reminders by text and email, based on purchase date and mileage.',
    },
    'Service calls ringing out': {
      title: 'Service calls you missed',
      means: 'A driver with a warning light calls the next shop if nobody picks up.',
      fix: 'Missed calls get an instant text back with a link to book a service slot.',
    },
    'Estimates never chased': {
      title: 'Repair estimates that never got a follow-up',
      means: 'Customers who said "let me think about it" often come back if you follow up within a few days.',
      fix: 'Automatic follow-up texts on every open repair estimate.',
    },
  },
  carpet: {
    'Dead customer list (no rebooking cadence)': {
      title: 'Past customers who never got a rebooking reminder',
      means: 'Most customers need a cleaning every 6 to 12 months and will rebook with whoever reminds them first.',
      fix: 'Automatic rebooking reminders at 6 and 12 months with a one-tap booking link.',
    },
    'Slow quote replies': {
      title: 'Quote requests answered late',
      means: 'People asking for a cleaning quote usually book the first company that replies with a price and a time.',
      fix: 'Instant replies to quote requests with your pricing and a booking link.',
    },
    'Unsold estimates': {
      title: 'Estimates that never got a follow-up',
      means: "Many customers who don't say yes right away just need a reminder. One follow-up wins a lot of them back.",
      fix: "Automatic text and email follow-ups on every open estimate until it's a yes or a no.",
    },
    'Missed calls': {
      title: 'Calls you missed',
      means: 'Someone who wants a cleaning this week calls the next company on the list if nobody picks up.',
      fix: 'Missed calls get an instant text back with your pricing and a booking link.',
    },
  },
  moving: {
    'Quote requests answered late': {
      title: 'Quote requests answered late',
      means: 'People planning a move ask several companies for quotes and usually book the first good answer.',
      fix: 'Instant replies to quote requests with a booking link, plus follow-ups.',
    },
    'Estimates never chased': {
      title: 'Estimates that never got a follow-up',
      means: "Many customers who don't say yes right away just need a reminder. One follow-up wins a lot of them back.",
      fix: "Automatic text and email follow-ups on every open estimate until it's a yes or a no.",
    },
    'No review/referral ask post-job': {
      title: 'No review or referral request after each job',
      means: 'Right after a smooth move is when customers are happiest to leave a review or recommend you.',
      fix: 'An automatic text after every job asking for a Google review, with a referral link.',
    },
    'Missed calls': {
      title: 'Calls you missed',
      means: 'Someone planning a move calls the next company on the list if nobody picks up.',
      fix: 'Missed calls get an instant text back with a link to get a quote.',
    },
  },
};

/** Wording for one finding. Falls back to the same name in any other set,
 *  then to a plain version of the raw name, so a new finding never shows a
 *  placeholder sentence. */
export function findingCopy(name: string, matchedKey: string | null | undefined): FindingCopy {
  const group = typeGroup(matchedKey);
  const hit = COPY[group][name] ?? Object.values(COPY).map((set) => set[name]).find(Boolean);
  if (hit) return hit;
  return { title: name, means: '', fix: '' };
}

export function findingTitle(name: string, matchedKey: string | null | undefined): string {
  return findingCopy(name, matchedKey).title;
}

// ── Online score ─────────────────────────────────────────────────────────
// Three parts, built only from items the checkup actually checked. An item
// it couldn't check is left out (not counted against them); a part with
// nothing checked is shown as "not checked" and the total scales to the rest.

export interface ListingSummary {
  rating: number | null;
  review_count: number | null;
  hours_set: boolean | null;
  phone: boolean | null;
  website: boolean | null;
  photos: number | null;
  category: string | null;
}

export interface GoogleSummary {
  keyword: string;
  you_rank: number | null;
  in_map_pack: boolean | null;
}

export interface ScorePart {
  key: 'google' | 'reviews' | 'website';
  label: string;
  max: number;
  points: number | null; // null = not checked
  reason: string;
}

export interface OnlineScore {
  total: number;
  parts: ScorePart[];
  summary: string;
}

type Item = { earned: number; possible: number } | null;
const sum = (items: Item[]) => items.reduce((a, i) => ({ earned: a.earned + (i?.earned ?? 0), possible: a.possible + (i?.possible ?? 0) }), { earned: 0, possible: 0 });

function rankPoints(rank: number | null): number {
  if (rank == null) return 0;
  if (rank <= 3) return 25;
  if (rank <= 5) return 18;
  if (rank <= 10) return 13;
  if (rank <= 20) return 7;
  return 0;
}

function ratingPoints(rating: number): number {
  if (rating >= 4.7) return 15;
  if (rating >= 4.5) return 13;
  if (rating >= 4.2) return 10;
  if (rating >= 4.0) return 7;
  if (rating >= 3.5) return 4;
  return rating > 0 ? 1 : 0;
}

function countPoints(count: number, restaurant: boolean): number {
  const steps = restaurant ? [1000, 500, 200, 100, 25, 1] : [250, 100, 50, 25, 10, 1];
  const pts = [15, 12, 9, 6, 3, 1];
  for (let i = 0; i < steps.length; i += 1) if (count >= steps[i]) return pts[i];
  return 0;
}

const fmtCount = (n: number) => n.toLocaleString('en-US');

export function computeOnlineScore(input: {
  listing: ListingSummary | null | undefined;
  google: GoogleSummary | null | undefined;
  website: WebsiteCheck | null | undefined;
  matchedKey: string | null | undefined;
}): OnlineScore | null {
  const { listing, google, website } = input;
  const restaurant = typeGroup(input.matchedKey) === 'restaurant';

  // Found on Google (40): where they rank (25) + listing basics (15).
  let googlePart: ScorePart;
  if (google) {
    const listingItems: Item[] = listing
      ? [
          listing.hours_set == null ? null : { earned: listing.hours_set ? 4 : 0, possible: 4 },
          listing.phone == null ? null : { earned: listing.phone ? 3 : 0, possible: 3 },
          listing.website == null ? null : { earned: listing.website ? 4 : 0, possible: 4 },
          listing.photos == null ? null : { earned: listing.photos >= 10 ? 4 : listing.photos > 0 ? 2 : 0, possible: 4 },
        ]
      : [];
    const t = sum([{ earned: rankPoints(google.you_rank), possible: 25 }, ...listingItems]);
    const missing = listing
      ? [listing.hours_set === false && 'hours', listing.phone === false && 'phone number', listing.website === false && 'website', listing.photos != null && listing.photos < 10 && 'photos'].filter(Boolean) as string[]
      : [];
    const rankLine = google.you_rank == null
      ? `You don't show up in the top 20 for "${google.keyword}".`
      : google.you_rank <= 3
        ? `You're #${google.you_rank} for "${google.keyword}", in the top 3 people see first.`
        : `You're #${google.you_rank} for "${google.keyword}". The top 3 get seen first.`;
    const listingLine = !listing ? '' : missing.length ? ` Your Google listing is missing: ${missing.join(', ')}.` : ' Your Google listing has hours, phone, website and photos.';
    googlePart = { key: 'google', label: 'Found on Google', max: 40, points: Math.round((t.earned / t.possible) * 40), reason: rankLine + listingLine };
  } else {
    googlePart = { key: 'google', label: 'Found on Google', max: 40, points: null, reason: "We couldn't check your Google ranking this time." };
  }

  // Reviews (30): star rating (15) + how many reviews (15).
  let reviewsPart: ScorePart;
  if (listing && listing.review_count != null) {
    const count = listing.review_count;
    const t = sum([
      { earned: listing.rating != null ? ratingPoints(listing.rating) : 0, possible: 15 },
      { earned: countPoints(count, restaurant), possible: 15 },
    ]);
    reviewsPart = {
      key: 'reviews', label: 'Reviews', max: 30, points: Math.round((t.earned / t.possible) * 30),
      reason: count === 0 ? 'No Google reviews yet.' : `${listing.rating != null ? `${listing.rating.toFixed(1)} stars from ` : ''}${fmtCount(count)} Google review${count === 1 ? '' : 's'}.`,
    };
  } else {
    reviewsPart = { key: 'reviews', label: 'Reviews', max: 30, points: null, reason: "We couldn't read your Google reviews this time." };
  }

  // Website (30): opens (8), secure (7), works on phones (8), easy to contact (7).
  let websitePart: ScorePart;
  if (!website || website.status === 'blocked') {
    websitePart = { key: 'website', label: 'Website', max: 30, points: null, reason: "We couldn't check your website this time." };
  } else if (website.status === 'none') {
    websitePart = { key: 'website', label: 'Website', max: 30, points: 0, reason: 'No website on your Google listing.' };
  } else if (website.status === 'social') {
    websitePart = { key: 'website', label: 'Website', max: 30, points: 0, reason: `Your listing links to ${website.social_label ?? 'a social page'}, not a website.` };
  } else if (website.status === 'unreachable' || website.opens === false) {
    websitePart = { key: 'website', label: 'Website', max: 30, points: 0, reason: "Your website didn't open when we checked." };
  } else {
    const items: Item[] = [
      website.opens == null ? null : { earned: website.opens ? 8 : 0, possible: 8 },
      website.secure == null ? null : { earned: website.secure ? 7 : 0, possible: 7 },
      website.phone_ready == null ? null : { earned: website.phone_ready ? 8 : 0, possible: 8 },
      website.contact == null ? null : { earned: website.contact ? 7 : 0, possible: 7 },
    ];
    const t = sum(items);
    const fails = [website.secure === false && 'not secure', website.phone_ready === false && 'not set up for phones', website.contact === false && 'no easy way to call or message you'].filter(Boolean) as string[];
    websitePart = {
      key: 'website', label: 'Website', max: 30,
      points: t.possible ? Math.round((t.earned / t.possible) * 30) : null,
      reason: fails.length ? `Opens, but ${fails.join(', ')}.` : 'Opens, secure, works on phones, and easy to contact you from.',
    };
  }

  const parts = [googlePart, reviewsPart, websitePart];
  const checked = parts.filter((p) => p.points != null);
  if (checked.length === 0) return null;
  const earned = checked.reduce((a, p) => a + (p.points ?? 0), 0);
  const possible = checked.reduce((a, p) => a + p.max, 0);
  const total = Math.round((earned / possible) * 100);

  const weakest = [...checked].sort((a, b) => (a.points! / a.max) - (b.points! / b.max))[0];
  const weakestShare = weakest.points! / weakest.max;
  const summary = weakestShare >= 0.8
    ? "You're in strong shape on the basics. The list below shows what may still be slipping."
    : weakest.key === 'google'
      ? 'Your biggest opening is how you show up on Google.'
      : weakest.key === 'reviews'
        ? 'Your biggest opening is your reviews.'
        : 'Your biggest opening is your website.';

  return { total, parts, summary };
}
