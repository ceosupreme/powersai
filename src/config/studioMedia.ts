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
};

const PORTFOLIO_SCREENSHOTS = {
  allmightySupreme:
    "https://screenshot2.lovable.dev/lovp_2zrkjvzcdd89dv2s0xjjpcw3k9/3a92d4e6a01a776aad337d91b81effb6_1789656394284.png",
  bigPawsClub:
    "https://screenshot2.lovable.dev/lovp_3ym6nfhyh798stgrmbnap95sg9/8a2bafacb8482a43ea8ecd3cf1b76482_1789573751264.png",
  supremeWellnessClub:
    "https://screenshot2.lovable.dev/lovp_12rvyyr7dw90ftwrfgsyd6dyzd/7f6c8f0f02afc339560c736ccee6407a_1789542944265.png",
  karioVoss:
    "https://screenshot2.lovable.dev/lovp_1an1s64hms96yskc1gj1wtkrx1/95edee6297459e433262509f713fce89_1789658066594.png",
  coastalBeauties:
    "https://screenshot2.lovable.dev/lovp_102kc4t68f805rpsnfn71xk7kp/07c56d452083ea05f228c857682aa43b_1789633894375.png",
  sylinaRenae:
    "https://screenshot2.lovable.dev/c36000d8-b5bc-49fb-827b-3fd40458368c/id-preview-1953d250--239bbdc0-06ea-4d8d-beb2-9904fdf82a11.lovable.app-1785267476400.png",
  barpulse:
    "https://screenshot2.lovable.dev/62aa616dd84eb18a8ebfa06c5a64a364/id-preview-0af47b37--8e1af904-fd16-47e1-833f-7a3efdea81d3.lovable.app-1789354728585.png",
} as const;

export const STUDIO_MEDIA: Record<string, StudioMediaSlot> = {
  "hero-composition": {
    src: null,
    alt: "Supreme Team Media studio composition",
    aspectRatio: "3 / 2",
    width: 1800,
    height: 1200,
    objectFit: "cover",
  },
  "work-sylina-renae": {
    src: PORTFOLIO_SCREENSHOTS.sylinaRenae,
    alt: "Screenshot of the Sylina Renae artist website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-coastal-beauties": {
    src: PORTFOLIO_SCREENSHOTS.coastalBeauties,
    alt: "Screenshot of the Coastal Beauties lifestyle and creator-culture website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-barpulse": {
    src: PORTFOLIO_SCREENSHOTS.barpulse,
    alt: "Screenshot of the BarPulse hospitality operations platform website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-allmighty-supreme": {
    src: PORTFOLIO_SCREENSHOTS.allmightySupreme,
    alt: "Screenshot of the AllMighty Supreme personal brand website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-big-paws-club": {
    src: PORTFOLIO_SCREENSHOTS.bigPawsClub,
    alt: "Screenshot of the Big Paws Club editorial and lifestyle website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-supreme-wellness-club": {
    src: PORTFOLIO_SCREENSHOTS.supremeWellnessClub,
    alt: "Screenshot of the Supreme Wellness Club wellness brand website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "work-kario-voss": {
    src: PORTFOLIO_SCREENSHOTS.karioVoss,
    alt: "Screenshot of the Kario Voss artist website",
    aspectRatio: "16 / 9",
    width: 1920,
    height: 1080,
    objectFit: "cover",
    objectPosition: "top center",
  },
  "founder-portrait": {
    src: null,
    alt: "Sean Mayo",
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
