import { flowForFormat } from '@/components/content/contentStages';

/**
 * Separates a concept/quality review from an actual deliverable.
 * The brief's `asset_urls` are the editor's explicit finished-production links.
 * OG images, reference art, title-only briefs, and a high quality score are NOT
 * evidence that the PDF, video, or social creative has been produced.
 */
export interface ReadinessContent {
  format?: string | null;
  stage?: string | null;
  brief?: unknown;
  cta?: string | null;
  purpose_type?: string | null;
  quality_score?: number | null;
  quality_fails?: string[] | null;
  approved_at?: string | null;
}

const TEXT_FORMATS = new Set(['article', 'email', 'community']);

function briefRecord(brief: unknown): Record<string, unknown> {
  if (brief && typeof brief === 'object' && !Array.isArray(brief)) return brief as Record<string, unknown>;
  if (typeof brief === 'string') {
    try {
      const decoded = JSON.parse(brief);
      if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) return decoded;
    } catch { /* A plain-text legacy brief does not prove a finished asset. */ }
  }
  return {};
}
function nonempty(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
function validWebLink(value: unknown): boolean {
  if (!nonempty(value)) return false;
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch { return false; }
}

export function contentDeliveryGaps(item: ReadinessContent): string[] {
  const brief = briefRecord(item.brief);
  const format = item.format ?? 'short';
  const isText = TEXT_FORMATS.has(format);
  const gaps: string[] = [];
  const assets = Array.isArray(brief.asset_urls) ? brief.asset_urls : [];
  const hasFile = assets.some(validWebLink);
  const hasText = [brief.script, brief.body, brief.text, brief.content, brief.full_text].some(nonempty)
    || (format === 'community' && nonempty(brief.caption));
  const flow = flowForFormat(format);
  const lastProductionStage = flow[flow.length - 3];
  const stepIndex = flow.indexOf((item.stage ?? 'idea') as typeof flow[number]);
  const finalStepIndex = flow.indexOf(lastProductionStage);

  if (stepIndex < finalStepIndex) {
    gaps.push(`Finish the ${lastProductionStage} production step`);
  }
  if (isText && !hasText) gaps.push('Write the finished article, email, or post text');
  if (!isText && !hasFile) {
    gaps.push(format === 'printable'
      ? 'Attach the finished printable file (not a cover or preview)'
      : 'Attach a link to the finished production file');
  }
  if (item.purpose_type === 'offer' && !nonempty(item.cta) && !nonempty(brief.cta)) {
    gaps.push('Add the offer call to action');
  }
  return gaps;
}

export function hasQualityApproval(item: ReadinessContent): boolean {
  return (item.quality_score ?? 0) >= 80 && (item.quality_fails ?? []).length === 0;
}

export function canApproveFinishedContent(item: ReadinessContent): boolean {
  return hasQualityApproval(item) && contentDeliveryGaps(item).length === 0;
}

export function contentApprovalLabel(item: ReadinessContent): string {
  if (item.stage === 'published') return 'Published';
  const finished = contentDeliveryGaps(item).length === 0;
  if (item.approved_at) return finished ? 'Release approved' : 'Concept approved · finish production';
  if (finished && hasQualityApproval(item)) return 'Ready for final approval';
  return 'Not release-ready';
}

/** Missing CTA is useful production guidance even for non-offer posts. */
export function contentQualityHints(item: ReadinessContent): string[] {
  const brief = briefRecord(item.brief);
  const hints = contentDeliveryGaps(item);
  if (!nonempty(item.cta) && !nonempty(brief.cta) && item.purpose_type !== 'offer') {
    hints.push('CTA not recorded — add one if this post should drive an action');
  }
  if ((item.quality_fails ?? []).length) hints.push(...(item.quality_fails ?? []));
  return hints;
}
