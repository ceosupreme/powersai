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
  /** Visible caption/disclosure printed with the media when supplied. */
  disclosure?: string;
};

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
    src: null,
    alt: "Sylina Renae artist website",
    aspectRatio: "16 / 10",
    width: 1600,
    height: 1000,
    objectFit: "cover",
  },
  "work-coastal-beauties": {
    src: null,
    alt: "Coastal Beauties brand creative",
    aspectRatio: "4 / 3",
    width: 1600,
    height: 1200,
    objectFit: "cover",
  },
  "work-barpulse": {
    src: null,
    alt: "BarPulse hospitality operating system interface",
    aspectRatio: "16 / 10",
    width: 1600,
    height: 1000,
    objectFit: "cover",
    disclosure: "Sample data shown.",
  },
  "work-ritual-command": {
    src: null,
    alt: "Ritual Command Center demonstration screens",
    aspectRatio: "16 / 10",
    width: 1600,
    height: 1000,
    objectFit: "cover",
    disclosure: "Demonstration using sample data.",
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
