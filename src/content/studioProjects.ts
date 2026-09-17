/**
 * Shared public project-content module for the studio site.
 *
 * Two sources, one shape:
 *   1. Published `portfolio_items` rows (CMS, status='published' only).
 *   2. The seven explicitly approved live-project editorial summaries below.
 *
 * Rules encoded here:
 * - Deduplicate by canonical slug; a published CMS row always wins.
 * - Each static entry has its own `enabled` flag. When a case is taken over by
 *   the CMS, set `enabled: false` so unpublishing the CMS row can never
 *   silently republish the static fallback.
 * - Draft/private records are never read (see usePublicProjects).
 * - Status labels here are the approved public presentation. They do not
 *   rewrite the database.
 */

export type StudioCategoryId =
  | "websites-apps"
  | "brand-creative"
  | "marketing-growth"
  | "ai-systems";

export const STUDIO_CATEGORIES: { id: StudioCategoryId; label: string }[] = [
  { id: "websites-apps", label: "Websites & apps" },
  { id: "brand-creative", label: "Brand & creative" },
  { id: "marketing-growth", label: "Marketing & growth" },
  { id: "ai-systems", label: "AI & systems" },
];

export const STUDIO_CATEGORY_LABEL: Record<string, string> = STUDIO_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.label }),
  {} as Record<string, string>,
);

export type PlateTone = "lilac" | "sand" | "green" | "paper";

/** Normalized project shape used by the homepage, /work and /work/:slug. */
export interface StudioProject {
  slug: string;
  title: string;
  /** Public classification label, e.g. "Historical client implementation". */
  classification: string;
  categories: StudioCategoryId[];
  summary: string;
  role: string;
  brief: string | null;
  work: string | null;
  demonstrates: string | null;
  statusNote: string | null;
  /** Key into STUDIO_MEDIA; null when no slot is configured. */
  mediaKey: string | null;
  /** Direct image URL coming from a published CMS row, if any. */
  imageUrl: string | null;
  /** Only set when an approved, current URL exists. Never a guess, never "#". */
  externalUrl: string | null;
  /** Free-form body text from the CMS. Rendered as plain text, never as HTML. */
  bodyText: string | null;
  plateTone: PlateTone;
  source: "cms" | "editorial";
}

/** An approved editorial starter case. */
interface EditorialCase extends Omit<StudioProject, "source"> {
  /**
   * Set to false once this case is managed in the CMS. A disabled entry is not
   * rendered even if the CMS row is later unpublished — that is intentional.
   */
  enabled: boolean;
  /** Public ordering for fallback-only projects. */
  order: number;
}

export const HOMEPAGE_WORK_ORDER = [
  "kario-voss",
  "big-paws-club",
  "supreme-wellness-club",
  "coastal-beauties",
  "barpulse",
  "allmighty-supreme",
] as const;

export const EDITORIAL_CASES: EditorialCase[] = [
  {
    enabled: true,
    order: 1,
    slug: "allmighty-supreme",
    title: "AllMighty Supreme — Personal brand website",
    classification: "Personal brand website",
    categories: ["websites-apps", "brand-creative"],
    summary:
      "A personal brand and portfolio experience built to present creative work, systems, and professional range in one place.",
    role: "Strategy, creative direction, copy, interface design, and implementation.",
    brief: "Create a flexible home for Sean's work, ideas, systems, and professional portfolio.",
    work: "Brand direction, portfolio architecture, responsive interface design, content structure, and implementation.",
    demonstrates:
      "Personal-brand strategy, editorial web design, portfolio UX, and translating a broad body of work into a clear digital experience.",
    statusNote: "Live website.",
    mediaKey: "work-allmighty-supreme",
    imageUrl: null,
    externalUrl: "https://allmightysupreme.com",
    bodyText: null,
    plateTone: "lilac",
  },
  {
    enabled: true,
    order: 2,
    slug: "big-paws-club",
    title: "Big Paws Club — Editorial & lifestyle brand website",
    classification: "Editorial & lifestyle brand website",
    categories: ["websites-apps", "brand-creative", "marketing-growth"],
    summary:
      "A content-rich large-dog brand experience combining practical guides, editorial structure, audience-building paths, and future product/shop experiences.",
    role: "Brand strategy, content architecture, UX, creative direction, and implementation.",
    brief: "Build a useful, distinctive destination for people living with large and giant dogs.",
    work: "Brand identity direction, responsive site design, editorial system, navigation, guide structure, signup paths, and implementation.",
    demonstrates: "Niche-brand strategy, editorial UX, content design, audience development, and web execution.",
    statusNote: "Live website.",
    mediaKey: "work-big-paws-club",
    imageUrl: null,
    externalUrl: "https://bigpawsclub.com",
    bodyText: null,
    plateTone: "sand",
  },
  {
    enabled: true,
    order: 3,
    slug: "supreme-wellness-club",
    title: "Supreme Wellness Club — Wellness brand website",
    classification: "Wellness brand website",
    categories: ["websites-apps", "brand-creative", "marketing-growth"],
    summary:
      "A wellness-focused digital experience combining education, guided paths, and a premium lifestyle presentation.",
    role: "Brand direction, content architecture, UX, design, and implementation.",
    brief:
      "Turn a broad wellness concept into a clear, approachable digital destination with useful paths for visitors.",
    work: "Responsive site design, content organization, guided pathways, visual system, and implementation.",
    demonstrates:
      "Brand strategy, information architecture, wellness-content presentation, and polished responsive web delivery.",
    statusNote: "Live website.",
    mediaKey: "work-supreme-wellness-club",
    imageUrl: null,
    externalUrl: "https://supremewellnessclub.com",
    bodyText: null,
    plateTone: "green",
  },
  {
    enabled: true,
    order: 4,
    slug: "barpulse",
    title: "BarPulse — Hospitality operations platform",
    classification: "Hospitality operations platform",
    categories: ["ai-systems", "websites-apps"],
    summary:
      "A hospitality operating system connecting operational information, management workflows, scorecards, tasks, and AI-assisted insights.",
    role:
      "Discovery, application build, integrations, workflow design, scoring logic, reporting, and iterative refinement.",
    brief:
      "Give hospitality leadership one clearer operating view across sales, labor, tasks, guest experience, and growth opportunities.",
    work:
      "Application design and development, workflow architecture, integrations, management dashboards, reporting, task systems, and AI-assisted insights.",
    demonstrates:
      "Business discovery, systems thinking, AI implementation, integrations, product design, and operational workflow development.",
    statusNote:
      "Live product site; historical eight-venue client implementation is part of the case history, but this does not imply all eight venues are currently active clients.",
    mediaKey: "work-barpulse",
    imageUrl: null,
    externalUrl: "https://barpulsehq.com",
    bodyText: null,
    plateTone: "paper",
  },
  {
    enabled: true,
    order: 5,
    slug: "kario-voss",
    title: "Kario Voss — Artist website",
    classification: "Artist website",
    categories: ["websites-apps", "brand-creative"],
    summary:
      "A mobile-first artist site bringing music, visuals, press materials, and identity into one focused digital experience.",
    role: "Creative direction, information architecture, interface design, and implementation.",
    brief:
      "Give an artist a distinctive digital home that feels like the brand while making music, visuals, and press material easy to explore.",
    work: "Responsive single-page design, content system, media sections, press-kit structure, gallery treatment, and implementation.",
    demonstrates: "Artist-brand translation, visual web design, media-rich UX, and mobile-first delivery.",
    statusNote: "Live website.",
    mediaKey: "work-kario-voss",
    imageUrl: null,
    externalUrl: "https://kariovoss.com",
    bodyText: null,
    plateTone: "lilac",
  },
  {
    enabled: true,
    order: 6,
    slug: "coastal-beauties",
    title: "Coastal Beauties — Lifestyle & creator-culture website",
    classification: "Lifestyle & creator-culture website",
    categories: ["websites-apps", "brand-creative", "marketing-growth"],
    summary:
      "A Southern California lifestyle and creator-culture destination combining editorial storytelling, brand identity, content, and audience growth.",
    role: "Brand direction, creative direction, content strategy, marketing, UX, and implementation.",
    brief: "Evolve an established lifestyle brand into a modern editorial and creator-culture destination.",
    work: "Brand presentation, responsive site design, editorial structure, blog/content experience, email capture, and marketing architecture.",
    demonstrates: "Brand evolution, editorial design, audience strategy, content systems, and web execution.",
    statusNote: "Live website.",
    mediaKey: "work-coastal-beauties",
    imageUrl: null,
    externalUrl: "https://coastalbeauties.com",
    bodyText: null,
    plateTone: "sand",
  },
  {
    enabled: true,
    order: 7,
    slug: "sylina-renae",
    title: "Sylina Renae — Artist website",
    classification: "Artist website",
    categories: ["websites-apps", "brand-creative"],
    summary:
      "A cinematic artist website presenting music, dance, modeling, media, and booking paths in one responsive experience.",
    role: "Website design, interface direction, content structure, and implementation.",
    brief: "Give an artist a dedicated web presence beyond social profiles and scattered media links.",
    work: "Responsive artist website, media sections, show information, biography, press, booking/contact paths, and implementation.",
    demonstrates: "Visual presentation, artist-brand translation, responsive design, and media-rich web delivery.",
    statusNote: "Live website.",
    mediaKey: "work-sylina-renae",
    imageUrl: null,
    externalUrl: "https://sylinarenea.com",
    bodyText: null,
    plateTone: "paper",
  },
];

/** Enabled editorial cases in homepage order. */
export function enabledEditorialCases(): StudioProject[] {
  return EDITORIAL_CASES.filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order)
    .map(({ enabled: _enabled, order: _order, ...rest }) => ({ ...rest, source: "editorial" as const }));
}

const PLATE_TONES: PlateTone[] = ["lilac", "sand", "green", "paper"];

/** Map a published CMS row onto the shared project shape. */
export function mapCmsRow(row: {
  slug: string;
  title: string;
  description: string | null;
  client_or_vertical: string | null;
  category: string;
  image_url: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  case_study_body: string | null;
  sort_order: number;
}): StudioProject {
  const category = normalizeCategory(row.category);
  return {
    slug: row.slug,
    title: row.title,
    classification: row.client_or_vertical || "Project",
    categories: [category],
    summary: row.description ?? "",
    role: "",
    brief: null,
    work: null,
    demonstrates: null,
    statusNote: null,
    mediaKey: null,
    imageUrl: row.image_url || row.thumbnail_url || null,
    externalUrl: row.external_url || null,
    bodyText: row.case_study_body ?? null,
    plateTone: PLATE_TONES[Math.abs(row.sort_order) % PLATE_TONES.length],
    source: "cms",
  };
}

function normalizeCategory(raw: string): StudioCategoryId {
  const key = raw.toLowerCase().replace(/[^a-z]+/g, "-");
  if (key.includes("brand") || key.includes("creative") || key.includes("graphic")) return "brand-creative";
  if (key.includes("market") || key.includes("growth") || key.includes("content")) return "marketing-growth";
  if (key.includes("ai") || key.includes("system") || key.includes("automation")) return "ai-systems";
  return "websites-apps";
}

/**
 * Merge published CMS projects with enabled editorial cases.
 * Published rows win on slug collision; disabled editorial entries never appear.
 */
export function mergeProjects(cms: StudioProject[]): StudioProject[] {
  const bySlug = new Map<string, StudioProject>();
  cms.forEach((p) => bySlug.set(p.slug, p));
  enabledEditorialCases().forEach((p) => {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);
  });
  const cmsOrder = new Map(cms.map((p, i) => [p.slug, i]));
  return Array.from(bySlug.values()).sort((a, b) => {
    const ai = cmsOrder.get(a.slug) ?? 1000;
    const bi = cmsOrder.get(b.slug) ?? 1000;
    return ai - bi;
  });
}
