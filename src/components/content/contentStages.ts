export const STAGES = [
  "idea",
  "script",
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
  record: "Record",
  edit: "Edit",
  thumbnail: "Thumbnail",
  scheduled: "Scheduled",
  published: "Published",
};

export const FORMATS = ["long_form", "short", "livestream", "community"] as const;
export type ContentFormat = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  long_form: "Long-form",
  short: "Short",
  livestream: "Livestream",
  community: "Community Post",
};

export function nextStage(stage: ContentStage): ContentStage {
  const i = STAGES.indexOf(stage);
  return STAGES[Math.min(i + 1, STAGES.length - 1)];
}