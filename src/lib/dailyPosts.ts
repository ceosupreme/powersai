export type DailyPostStatus =
  | "ready"
  | "almost_ready"
  | "waiting_on_owner"
  | "scheduled"
  | "posted";

export type DailyPostWaitingReason =
  | "needs_person_approval"
  | "no_channel"
  | "missing_logo"
  | "missing_link"
  | "account_problem"
  | "other";

export interface DailyPostMedia {
  drive_file_id?: string | null;
  url?: string | null;
  kind: "image" | "video";
  name?: string | null;
}

export interface DailyPostPlacement {
  id: string;
  content_item_id: string;
  project_id: string;
  channel: string;
  status: string;
  scheduled_for: string | null;
  live_url: string | null;
  verified_at: string | null;
  caption: string;
  hashtags: string;
  notes: string;
  posted_no_link_at: string | null;
}

export interface DailyPostPackage {
  id: string;
  project_id: string;
  brand_name: string;
  title: string;
  post_date: string;
  quality_score: number | null;
  quality_notes: string | null;
  post_status: DailyPostStatus;
  waiting_reason: DailyPostWaitingReason | null;
  waiting_detail: string | null;
  almost_ready_detail: string | null;
  drive_folder_url: string | null;
  post_this_doc_url: string | null;
  media: DailyPostMedia[];
  made_by: string | null;
  handoff_id: string | null;
  placements: DailyPostPlacement[];
}

export const DAILY_POST_STATUS_LABELS: Record<DailyPostStatus, string> = {
  ready: "Ready to post",
  almost_ready: "Almost ready",
  waiting_on_owner: "Waiting on you",
  scheduled: "Scheduled",
  posted: "Posted",
};

export const DAILY_POST_STATUS_ORDER: DailyPostStatus[] = [
  "ready",
  "waiting_on_owner",
  "almost_ready",
  "scheduled",
  "posted",
];

const VALID_STATUSES = new Set<string>(DAILY_POST_STATUS_ORDER);

/** Single source of truth for separating finished daily posts from normal content items. */
export function isDailyPost(item: { purpose_type?: string | null } | null | undefined): boolean {
  return item?.purpose_type === "daily_post";
}

export function pacificDateStr(offsetDays = 0, now = new Date()): string {
  const shifted = new Date(now.getTime() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

export function qualityLabel(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "Unscored";
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs work";
}

export function plainWaitingReason(
  reason: string | null | undefined,
  detail: string | null | undefined,
): string {
  const cleanDetail = (detail ?? "").trim();
  switch (reason) {
    case "needs_person_approval":
      return cleanDetail || "Needs approval before it goes out.";
    case "no_channel":
      return cleanDetail || "No social account set up for this brand yet.";
    case "missing_logo":
      return cleanDetail || "Logo missing from the brand kit.";
    case "missing_link":
      return cleanDetail || "Channel link missing.";
    case "account_problem":
      return cleanDetail ? `Account problem: ${cleanDetail}` : "Account problem needs attention.";
    default:
      return cleanDetail || "Waiting on a decision before posting.";
  }
}

export function parseDailyPostPlacement(raw: any): DailyPostPlacement {
  const receipt = (raw?.receipt && typeof raw.receipt === "object" ? raw.receipt : {}) as Record<string, any>;
  return {
    id: String(raw.id),
    content_item_id: String(raw.content_item_id),
    project_id: String(raw.project_id),
    channel: String(raw.channel ?? "other"),
    status: String(raw.status ?? "planned"),
    scheduled_for: raw.scheduled_for ?? null,
    live_url: raw.live_url ?? null,
    verified_at: raw.verified_at ?? null,
    caption: typeof receipt.caption === "string" ? receipt.caption : "",
    hashtags: typeof receipt.hashtags === "string" ? receipt.hashtags : "",
    notes: typeof receipt.notes === "string" ? receipt.notes : "",
    posted_no_link_at: typeof receipt.posted_no_link_at === "string" ? receipt.posted_no_link_at : null,
  };
}

export function resolveDailyPostStatus(
  rawStatus: unknown,
  placements: DailyPostPlacement[],
): DailyPostStatus {
  if (placements.length > 0 && placements.every((p) => p.status === "published")) {
    return "posted";
  }
  if (typeof rawStatus === "string" && VALID_STATUSES.has(rawStatus)) {
    return rawStatus as DailyPostStatus;
  }
  if (placements.length > 0 && placements.every((p) => p.status === "scheduled" || p.status === "published")) {
    return "scheduled";
  }
  return "ready";
}

export function parseDailyPostPackage(
  rawItem: any,
  placements: DailyPostPlacement[],
  brandName: string,
): DailyPostPackage {
  const brief = (rawItem?.brief && typeof rawItem.brief === "object" ? rawItem.brief : {}) as Record<string, any>;
  const dp = (brief.daily_post && typeof brief.daily_post === "object" ? brief.daily_post : {}) as Record<string, any>;
  const rawMedia = Array.isArray(dp.media) ? dp.media : [];
  const media: DailyPostMedia[] = rawMedia
    .filter((m: any) => m && typeof m === "object" && (m.drive_file_id || m.url))
    .map((m: any) => ({
      drive_file_id: typeof m.drive_file_id === "string" ? m.drive_file_id : null,
      url: typeof m.url === "string" ? m.url : null,
      kind: m.kind === "video" ? "video" : "image",
      name: typeof m.name === "string" ? m.name : null,
    }));

  return {
    id: String(rawItem.id),
    project_id: String(rawItem.project_id),
    brand_name: brandName,
    title: String(rawItem.title ?? brandName),
    post_date: String(rawItem.due_date ?? "").slice(0, 10),
    quality_score: typeof rawItem.quality_score === "number" ? rawItem.quality_score : null,
    quality_notes: typeof rawItem.quality_notes === "string" ? rawItem.quality_notes : null,
    post_status: resolveDailyPostStatus(dp.post_status, placements),
    waiting_reason: typeof dp.waiting_reason === "string" ? (dp.waiting_reason as DailyPostWaitingReason) : null,
    waiting_detail: typeof dp.waiting_detail === "string" ? dp.waiting_detail : null,
    almost_ready_detail: typeof dp.almost_ready_detail === "string" ? dp.almost_ready_detail : null,
    drive_folder_url: typeof dp.drive_folder_url === "string" ? dp.drive_folder_url : null,
    post_this_doc_url: typeof dp.post_this_doc_url === "string" ? dp.post_this_doc_url : null,
    media,
    made_by: typeof dp.made_by === "string" ? dp.made_by : null,
    handoff_id: typeof dp.handoff_id === "string" ? dp.handoff_id : null,
    placements,
  };
}

export function rankDailyPosts(packages: DailyPostPackage[]): DailyPostPackage[] {
  return [...packages].sort((a, b) => {
    const sa = a.quality_score ?? -1;
    const sb = b.quality_score ?? -1;
    if (sb !== sa) return sb - sa;
    if (b.post_date !== a.post_date) return b.post_date.localeCompare(a.post_date);
    return a.brand_name.localeCompare(b.brand_name);
  });
}

export function countDailyPostsByStatus(packages: DailyPostPackage[]): Record<DailyPostStatus, number> & { total: number } {
  const counts: Record<DailyPostStatus, number> & { total: number } = {
    ready: 0,
    almost_ready: 0,
    waiting_on_owner: 0,
    scheduled: 0,
    posted: 0,
    total: packages.length,
  };
  for (const p of packages) counts[p.post_status] += 1;
  return counts;
}

export type DailyPostDateWindow = "today" | "tomorrow" | "last7" | "all";

export function filterDailyPostsByDate(
  packages: DailyPostPackage[],
  window: DailyPostDateWindow,
  todayPT = pacificDateStr(0),
): DailyPostPackage[] {
  if (window === "all") return packages;
  if (window === "today") return packages.filter((p) => p.post_date === todayPT);
  const [y, m, d] = todayPT.split("-").map(Number);
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  if (window === "tomorrow") {
    const tom = new Date(base.getTime() + 86_400_000).toISOString().slice(0, 10);
    return packages.filter((p) => p.post_date === tom);
  }
  const weekAgo = new Date(base.getTime() - 6 * 86_400_000).toISOString().slice(0, 10);
  return packages.filter((p) => p.post_date >= weekAgo && p.post_date <= todayPT);
}