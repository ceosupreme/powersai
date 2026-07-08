import type { FoundationCheck } from './types.ts';
import { brandLogoCheck, brandColorsCheck, brandTaglineCheck } from './brand.ts';
import { websiteLiveCheck, websiteHttpsCheck, websiteMobileCheck, websiteContactCheck } from './website.ts';
import { gbpMappedCheck, gbpHoursCheck, gbpPhotosCheck, gbpNapCheck } from './gbp.ts';
import { reviewsHasCheck, reviewsRatingCheck, reviewsVolumeCheck } from './reviews.ts';
import { socialInstagramCheck, socialFacebookCheck, socialRecentCheck } from './social.ts';
import { offersHasCheck, channelsHasCheck } from './offers.ts';
import { primaryContactCheck } from './contacts.ts';

export const ALL_FOUNDATION_CHECKS: FoundationCheck[] = [
  brandLogoCheck, brandColorsCheck, brandTaglineCheck,
  websiteLiveCheck, websiteHttpsCheck, websiteMobileCheck, websiteContactCheck,
  gbpMappedCheck, gbpHoursCheck, gbpPhotosCheck, gbpNapCheck,
  reviewsHasCheck, reviewsRatingCheck, reviewsVolumeCheck,
  socialInstagramCheck, socialFacebookCheck, socialRecentCheck,
  offersHasCheck, channelsHasCheck,
  primaryContactCheck,
];

// Foundation checks that can run against a cold prospect (only public signals:
// GBP, website, reviews, social). Internal-data checks (brand.*, offers.has,
// channels.has, contacts.primary) are excluded — they require data the
// prospect hasn't given us yet.
export const COLD_SAFE_FOUNDATION_IDS: ReadonlySet<string> = new Set([
  'website.live', 'website.https', 'website.mobile', 'website.contact',
  'gbp.mapped', 'gbp.hours', 'gbp.photos', 'gbp.nap',
  'reviews.has', 'reviews.rating', 'reviews.volume',
  'social.instagram', 'social.facebook', 'social.recent',
]);

export type { FoundationCheck };