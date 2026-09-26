import allmightySupreme from "@/assets/studio/allmighty-supreme.png";
import bigPawsClub from "@/assets/studio/big-paws-club.png";
import supremeWellnessClub from "@/assets/studio/supreme-wellness-club.png";
import barpulse from "@/assets/studio/barpulse.png";
import karioVoss from "@/assets/studio/kario-voss.png";
import homeHeroDevices from "@/assets/studio/home-hero-devices.jpg";
import homeIndustryService from "@/assets/studio/home-industry-service.jpg";
import homeIndustryRestaurant from "@/assets/studio/home-industry-restaurant.jpg";
import homeIndustryMedspa from "@/assets/studio/home-industry-medspa.jpg";
import coastalBeauties from "@/assets/studio/coastal-beauties.png";

/**
 * Single media configuration for the public studio site.
 *
 * Every image slot on the public site resolves through this map. Until a real,
 * approved asset is supplied, `src` stays null and the surface renders a
 * finished editorial typographic plate — never a spinner, skeleton, grey box,
 * fake screenshot or "image coming soon" panel.
 *
 * To add artwork later: set `src` (imported asset or absolute URL), keep `alt`
 * truthful, and leave `width`/`height` set so no layout shift occurs. Do not
 * redesign sections to add media.
 */
export type StudioMediaSlot = {
  /** Image source. Null = render the editorial plate fallback. */
  src: string | null;
  /** Required when src is set. Describes the real asset, not the concept. */
  alt: string;
  /** CSS aspect-ratio value, e.g. "16 / 10". Reserved before load. */
  aspectRatio: string;
  /** Intrinsic pixel size of the intended asset, used to avoid layout shift. */
  width: number;
  height: number;
  objectFit: "cover" | "contain";
  /** CSS object-position value for screenshot framing. */
  objectPosition?: string;
  /** Visible caption/disclosure printed with the media when supplied. */
  disclosure?: string;
  mobileSrc?: string | null;
  videoSrc?: string | null;
  posterSrc?: string | null;
};

export const STUDIO_MEDIA: Record<string, StudioMediaSlot> = {
  "home-hero": {
    src: homeHeroDevices,
    mobileSrc: null,
    videoSrc: null,
    posterSrc: null,
    alt: "Laptop and phone showing a home services website and a pizza restaurant website on a sunny San Diego terrace",
    aspectRatio: "541 / 414",
    width: 1082,
    height: 828,
    objectFit: "cover",
  },
  "home-industry-hvac": {
    src: homeIndustryService,
    alt: "HVAC and home services website experience",
    aspectRatio: "161 / 89",
    width: 483,
    height: 267,
    objectFit: "cover",
  },
  "home-industry-pizza": {
    src: homeIndustryRestaurant,
    alt: "Restaurant and pizza website experience",
    aspectRatio: "161 / 89",
    width: 483,
    height: 267,
    objectFit: "cover",
  },
  "home-industry-medspa": {
    src: homeIndustryMedspa,
    alt: "Med spa and wellness website experience",
    aspectRatio: "161 / 89",
    width: 483,
    height: 267,
    objectFit: "cover",
  },
  "hero-composition": {
    src: null,
    alt: "Supreme Team Media studio composition",
    aspectRatio: "3 / 2",
    width: 1800,
    height: 1200,
    objectFit: "cover",
  },
  "work-sylina-renae": {
    src: null,
    alt: "Screenshot of the Sylina Renae artist website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-coastal-beauties": {
    src: coastalBeauties,
    alt: "Screenshot of the Coastal Beauties lifestyle and creator-culture website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-barpulse": {
    src: barpulse,
    alt: "Screenshot of the BarPulse hospitality operations platform website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-allmighty-supreme": {
    src: allmightySupreme,
    alt: "Screenshot of the AllMighty Supreme personal brand website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-big-paws-club": {
    src: bigPawsClub,
    alt: "Screenshot of the Big Paws Club editorial and lifestyle website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-supreme-wellness-club": {
    src: supremeWellnessClub,
    alt: "Screenshot of the Supreme Wellness Club wellness brand website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-kario-voss": {
    src: karioVoss,
    alt: "Screenshot of the Kario Voss artist website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "founder-portrait": {
    src: null,
    alt: "Sean Powers",
    aspectRatio: "3 / 4",
    width: 900,
    height: 1200,
    objectFit: "cover",
  },
};

export function getStudioMedia(key: string | null | undefined): StudioMediaSlot | null {
  if (!key) return null;
  return STUDIO_MEDIA[key] ?? null;
}
