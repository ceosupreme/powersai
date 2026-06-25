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

export type { FoundationCheck };