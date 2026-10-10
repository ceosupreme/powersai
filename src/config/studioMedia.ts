import allmightySupreme from "@/assets/studio/allmighty-supreme.png";
import bigPawsClub from "@/assets/studio/big-paws-club.png";
import supremeWellnessClub from "@/assets/studio/supreme-wellness-club.png";
import barpulse from "@/assets/studio/barpulse.png";
import karioVoss from "@/assets/studio/kario-voss.png";
import homeHeroDevices from "@/assets/studio/home-hero.webp.asset.json";
import homeIndustryService from "@/assets/studio/home-industry-hvac.webp.asset.json";
import homeIndustryRestaurant from "@/assets/studio/home-industry-pizza.webp.asset.json";
import homeIndustryMedspa from "@/assets/studio/home-industry-medspa.webp.asset.json";
import websitesHero from "@/assets/studio/service-websites-hero.webp.asset.json";
import coastalBeauties from "@/assets/studio/coastal-beauties.png";
import plumbingHero from "@/assets/studio/industry-plumbing-hero.webp.asset.json";
import restaurantsHero from "@/assets/studio/industry-restaurants-hero.png.asset.json";
import tacosHero from "@/assets/studio/industry-tacos-hero.webp.asset.json";
import autoHero from "@/assets/studio/industry-auto-hero.webp.asset.json";
import realEstateHero from "@/assets/studio/industry-realestate-hero.webp.asset.json";
import dealershipsHero from "@/assets/studio/industry-dealerships-hero.webp.asset.json";
import legalHero from "@/assets/studio/industry-legal-hero.webp.asset.json";
import brandMaterials from "@/assets/studio/brand-materials-spread.webp.asset.json";
import marketingCampaign from "@/assets/studio/marketing-campaign-scene.webp.asset.json";
import publishingRelease from "@/assets/studio/publishing-release-spread.webp.asset.json";
import openingChessDesktop from "@/assets/stm-opening/chess-hero-desktop.webp.asset.json";
import openingChessMedium from "@/assets/stm-opening/chess-hero-1280.webp.asset.json";
import openingChessMobile from "@/assets/stm-opening/chess-hero-mobile.webp.asset.json";
import openingMark from "@/assets/stm-opening/stm-mark.png.asset.json";
import openingWebDesign from "@/assets/stm-opening/web-design-monitor.png.asset.json";
import openingMarketing from "@/assets/stm-opening/marketing-bars.png.asset.json";
import openingSales from "@/assets/stm-opening/sales-people.png.asset.json";
import openingCrm from "@/assets/stm-opening/crm-database.png.asset.json";
import openingAutomation from "@/assets/stm-opening/automation-gear.png.asset.json";
import openingTrustPeople from "@/assets/stm-opening/trust-people-black.png.asset.json";
import openingTrustShield from "@/assets/stm-opening/trust-shield.png.asset.json";
import openingTrustStar from "@/assets/stm-opening/trust-star.png.asset.json";

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
  "home-opening-chess": {
    src: openingChessDesktop.url,
    mobileSrc: openingChessMobile.url,
    posterSrc: openingChessMedium.url,
    alt: "A hand moving a gold king across a reflective chessboard",
    aspectRatio: "1792 / 1104",
    width: 1792,
    height: 1104,
    objectFit: "contain",
    objectPosition: "center top",
  },
  "home-opening-mark": { src: openingMark.url, alt: "", aspectRatio: "61 / 77", width: 61, height: 77, objectFit: "contain" },
  "home-opening-web-design": { src: openingWebDesign.url, alt: "", aspectRatio: "75 / 68", width: 75, height: 68, objectFit: "contain" },
  "home-opening-marketing": { src: openingMarketing.url, alt: "", aspectRatio: "69 / 71", width: 69, height: 71, objectFit: "contain" },
  "home-opening-sales": { src: openingSales.url, alt: "", aspectRatio: "92 / 70", width: 92, height: 70, objectFit: "contain" },
  "home-opening-crm": { src: openingCrm.url, alt: "", aspectRatio: "61 / 74", width: 61, height: 74, objectFit: "contain" },
  "home-opening-automation": { src: openingAutomation.url, alt: "", aspectRatio: "74 / 74", width: 74, height: 74, objectFit: "contain" },
  "home-opening-trust-people": { src: openingTrustPeople.url, alt: "", aspectRatio: "55 / 43", width: 55, height: 43, objectFit: "contain" },
  "home-opening-trust-shield": { src: openingTrustShield.url, alt: "", aspectRatio: "43 / 50", width: 43, height: 50, objectFit: "contain" },
  "home-opening-trust-star": { src: openingTrustStar.url, alt: "", aspectRatio: "44 / 45", width: 44, height: 45, objectFit: "contain" },
  "home-hero": {
    src: homeHeroDevices.url,
    mobileSrc: null,
    videoSrc: null,
    posterSrc: null,
    alt: "Laptop and phone showing a home services website and a pizza restaurant website on a sunny San Diego terrace",
    aspectRatio: "1672 / 941",
    width: 1672,
    height: 941,
    objectFit: "contain",
    objectPosition: "center",
  },
  "home-industry-hvac": {
    src: homeIndustryService.url,
    alt: "HVAC and home services website experience",
    aspectRatio: "1672 / 941",
    width: 1672,
    height: 941,
    objectFit: "contain",
  },
  "home-industry-pizza": {
    src: homeIndustryRestaurant.url,
    alt: "Restaurant and pizza website experience",
    aspectRatio: "1672 / 941",
    width: 1672,
    height: 941,
    objectFit: "contain",
  },
  "home-industry-medspa": {
    src: homeIndustryMedspa.url,
    alt: "Med spa and wellness website experience",
    aspectRatio: "1672 / 941",
    width: 1672,
    height: 941,
    objectFit: "contain",
  },
  "service-websites-hero": {
    src: websitesHero.url,
    alt: "Website service laptop and phone composition",
    aspectRatio: "1672 / 941",
    width: 1672,
    height: 941,
    objectFit: "contain",
  },
  "industry-plumbing-hero": { src: plumbingHero.url, alt: "Plumber servicing a home beside a Summit Plumbing van, with the company website shown on laptop and phone", aspectRatio: "3 / 2", width: 1920, height: 1280, objectFit: "cover", objectPosition: "center" },
  "industry-restaurants-hero": { src: restaurantsHero.url, alt: "Restaurant dining room with an Ember and Oak website shown on laptop and phone", aspectRatio: "73 / 49", width: 1168, height: 784, objectFit: "cover", objectPosition: "center" },
  "industry-tacos-hero": { src: tacosHero.url, alt: "Busy taquería with tacos and the restaurant website shown on laptop and phone", aspectRatio: "1672 / 941", width: 1672, height: 941, objectFit: "cover", objectPosition: "center" },
  "industry-auto-hero": { src: autoHero.url, alt: "Auto repair shop with the Riverdale Auto Care website shown on laptop and phone", aspectRatio: "1672 / 941", width: 1672, height: 941, objectFit: "cover", objectPosition: "center" },
  "industry-realestate-hero": { src: realEstateHero.url, alt: "Southern California home with a real estate website shown on laptop and phone", aspectRatio: "1672 / 941", width: 1672, height: 941, objectFit: "cover", objectPosition: "center" },
  "industry-dealerships-hero": { src: dealershipsHero.url, alt: "Independent auto dealership with its inventory website shown on laptop and phone", aspectRatio: "1672 / 941", width: 1672, height: 941, objectFit: "cover", objectPosition: "center" },
  "industry-legal-hero": { src: legalHero.url, alt: "Law office with the Harrington and Blake website shown on laptop and phone", aspectRatio: "1672 / 941", width: 1672, height: 941, objectFit: "cover", objectPosition: "center" },
  "brand-materials-spread": { src: brandMaterials.url, alt: "Aura and Stone identity system across typography, print, packaging, color and social media", aspectRatio: "75 / 56", width: 1200, height: 896, objectFit: "cover", objectPosition: "center" },
  "marketing-campaign-scene": { src: marketingCampaign.url, alt: "Coordinated Evergreen Home Care campaign across website, social, email and inquiry materials", aspectRatio: "4 / 3", width: 1448, height: 1086, objectFit: "cover", objectPosition: "center" },
  "publishing-release-spread": { src: publishingRelease.url, alt: "The Brighter Path release across print book, website, phone and launch materials", aspectRatio: "4 / 3", width: 1448, height: 1086, objectFit: "cover", objectPosition: "center" },
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
