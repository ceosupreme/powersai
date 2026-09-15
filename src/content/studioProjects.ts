/**
 * Shared public project-content module for the studio site.
 *
 * Two sources, one shape:
 *   1. Published `portfolio_items` rows (CMS, status='published' only).
 *   2. The four explicitly approved editorial starter summaries below.
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
  /** Homepage ordering: website + creative first, technical after. */
  order: number;
}

export const EDITORIAL_CASES: EditorialCase[] = [
  {
    enabled: true,
    order: 1,
    slug: "sylina-renae",
    title: "Sylina Renae — Artist website",
    classification: "Website project",
    categories: ["websites-apps"],
    summary: "An artist's online presence, designed and implemented as a responsive website.",
    role: "Website design and implementation.",
    brief: "Give an artist a dedicated web presence beyond social profiles.",
    work: "Design and implementation of a responsive artist website with a contact path.",
    demonstrates:
      "Visual presentation, responsive web delivery, and translating a personal brand into a usable site.",
    statusNote:
      "Completed website project. Public-domain availability is checked separately; do not promise that the domain remains live today.",
    mediaKey: "work-sylina-renae",
    imageUrl: null,
    externalUrl: null,
    bodyText: null,
    plateTone: "lilac",
  },
  {
    enabled: true,
    order: 2,
    slug: "coastal-beauties",
    title: "Coastal Beauties — Brand, content & events",
    classification: "Owned brand / historical work",
    categories: ["brand-creative", "marketing-growth"],
    summary:
      "A lifestyle and events brand built through creative direction, promotion, partnerships, and audience development.",
    role: "Founder, brand development, marketing and event promotion.",
    brief: "Build and promote an independent lifestyle and events brand.",
    work: "Brand direction, promotional creative, campaigns and hospitality partnerships.",
    demonstrates:
      "How identity and marketing can work together across a brand and its experiences.",
    statusNote:
      "Sean's own brand, founded in 2008; historical experience. Not an external client, not a currently running event schedule.",
    mediaKey: "work-coastal-beauties",
    imageUrl: null,
    externalUrl: null,
    bodyText: null,
    plateTone: "sand",
  },
  {
    enabled: true,
    order: 3,
    slug: "barpulse",
    title: "BarPulse — Hospitality operating system",
    classification: "Historical client implementation",
    categories: ["ai-systems", "websites-apps"],
    summary:
      "Built and deployed for an eight-venue hospitality group, connecting operating information, management workflows, and AI-assisted reporting.",
    role: "Discovery, application build, integrations, owner-specific scoring, and weekly refinement.",
    brief:
      "Connect scattered operating information and help leadership review what needed attention across venues.",
    work:
      "Integrated Toast, 7shifts and Asana in the historical engagement; configured scoring, reporting and insights around ownership priorities.",
    demonstrates:
      "Business discovery, integration, AI implementation, management workflows and stakeholder iteration.",
    statusNote:
      "Historical eight-venue implementation. Not a claim that all eight venues are currently live, paying, or running daily.",
    mediaKey: "work-barpulse",
    imageUrl: null,
    externalUrl: null,
    bodyText: null,
    plateTone: "green",
  },
  {
    enabled: true,
    order: 4,
    slug: "ritual-command",
    title: "Ritual Command Center — A workflow made tangible",
    classification: "Interactive demonstration / sample data",
    categories: ["ai-systems", "websites-apps"],
    summary:
      "A five-screen barbershop management demonstration that turns an operating idea into an experience someone can explore.",
    role: "Workflow design, interface and rapid prototyping.",
    brief: "Make a barbershop operating concept concrete before a full implementation.",
    work: "A five-screen dashboard demonstration, built in one afternoon and checked on a phone.",
    demonstrates: "Rapid prototyping, workflow communication and mobile-first interface thinking.",
    statusNote: "Demonstration using labeled sample data. Not a paid live client system.",
    mediaKey: "work-ritual-command",
    imageUrl: null,
    externalUrl: null,
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
    const ai = cmsOrder.has(a.slug) ? cmsOrder.get(a.slug)! : 1000;
    const bi = cmsOrder.has(b.slug) ? cmsOrder.get(b.slug)! : 1000;
    return ai - bi;
  });
}
