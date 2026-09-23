export const STAGES = [
  "idea",
  "script",
  "design",
  "record",
  "edit",
  "thumbnail",
  "scheduled",
  "published",
] as const;

export type ContentStage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<ContentStage, string> = {
  idea: "Idea",
  script: "Script",
  design: "Design",
  record: "Record",
  edit: "Edit",
  thumbnail: "Thumbnail",
  scheduled: "Scheduled",
  published: "Published",
};

export const FORMATS = [
  "long_form",
  "short",
  "livestream",
  "community",
  "article",
  "carousel",
  "pin",
  "email",
  "reel",
  "post",
  "story",
  "printable",
] as const;
export type ContentFormat = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  long_form: "Long-form",
  short: "Short",
  livestream: "Livestream",
  community: "Community Post",
  article: "Article",
  carousel: "Carousel",
  pin: "Pin",
  email: "Email",
  reel: "Reel",
  post: "Post",
  story: "Story",
  printable: "Printable",
};

/** Production route per deliverable type. */
export const VIDEO_FLOW: ContentStage[] = [
  "idea", "script", "record", "edit", "thumbnail", "scheduled", "published",
];
export const GRAPHIC_FLOW: ContentStage[] = [
  "idea", "script", "design", "scheduled", "published",
];
export const TEXT_FLOW: ContentStage[] = [
  "idea", "script", "scheduled", "published",
];

const VIDEO_FORMATS = ["long_form", "short", "reel", "livestream"];
const GRAPHIC_FORMATS = ["carousel", "pin", "post", "story", "printable"];
const TEXT_FORMATS = ["article", "email", "community"];

export function flowForFormat(format: string | null | undefined): ContentStage[] {
  if (format && GRAPHIC_FORMATS.includes(format)) return GRAPHIC_FLOW;
  if (format && TEXT_FORMATS.includes(format)) return TEXT_FLOW;
  if (format && VIDEO_FORMATS.includes(format)) return VIDEO_FLOW;
  return VIDEO_FLOW;
}

/** Next stage along the flat stage list (kept for the existing pipeline views). */
export function nextStage(stage: ContentStage): ContentStage {
  const i = STAGES.indexOf(stage);
  return STAGES[Math.min(i + 1, STAGES.length - 1)];
}

/** Next stage along the route that matches the item's format. */
export function nextStageForFormat(
  stage: string,
  format: string | null | undefined,
): ContentStage {
  const flow = flowForFormat(format);
  const i = flow.indexOf(stage as ContentStage);
  if (i === -1) return flow[0];
  return flow[Math.min(i + 1, flow.length - 1)];
}
