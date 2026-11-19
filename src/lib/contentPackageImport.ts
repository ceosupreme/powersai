import { FORMATS, STAGES, type ContentFormat } from '@/components/content/contentStages';

type RecordValue = Record<string, unknown>;

export interface PackageImportSummary {
  created: string[];
  updated: string[];
  skipped: string[];
}

interface ImportedPost {
  item: RecordValue & { title: string; format: ContentFormat; stage: string; brief: RecordValue };
  channel: string;
  account: string | null;
  files: RecordValue[];
}

export interface ContentPackage {
  source: RecordValue & { title: string };
  family: RecordValue & { title: string };
  posts: ImportedPost[];
}

function record(value: unknown, path: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value as RecordValue;
}

function text(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`${path} must be text.`);
  return value.trim() || null;
}

function firstText(obj: RecordValue, keys: string[], path: string): string | null {
  // Validate every supplied alias, even if an earlier one takes precedence.
  return keys.map(key => text(obj[key], `${path}.${key}`)).find(value => value !== null) ?? null;
}

function number(obj: RecordValue, keys: string[], path: string): number | null {
  const values = keys.map(key => {
    const value = obj[key];
    if (value === undefined || value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`${path}.${key} must be a nonnegative number.`);
    }
    return value;
  });
  return values.find(value => value !== null) ?? null;
}

function webLink(value: unknown, path: string): string | null {
  const valueText = text(value, path);
  if (!valueText) return null;
  try {
    const url = new URL(valueText);
    if (url.protocol === 'https:' || url.protocol === 'http:') return valueText;
  } catch { /* Report the manifest field below. */ }
  throw new Error(`${path} must be a complete http or https link.`);
}

function links(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${path} must be a list of finished-file links.`);
  return [...new Set(value.map((url, i) => {
    const link = webLink(url, `${path}[${i + 1}]`);
    if (!link) throw new Error(`${path}[${i + 1}] must be a finished-file link.`);
    return link;
  }))];
}

function listAlias(obj: RecordValue, keys: string[], path: string): unknown[] {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && !Array.isArray(obj[key])) {
      throw new Error(`${path}.${key} must be a list.`);
    }
  }
  return keys.map(key => obj[key]).find(value => value !== undefined && value !== null) as unknown[] ?? [];
}

function decodeBrief(value: unknown, path: string): RecordValue {
  if (value === undefined || value === null) return {};
  if (typeof value === 'string') {
    if (!value.trim()) return {};
    try { return { ...record(JSON.parse(value), path) }; }
    catch { return { summary: value }; }
  }
  return { ...record(value, path) };
}

/** Validate the whole manifest before any source, family, item or asset is written. */
export function parseContentPackage(input: unknown): ContentPackage {
  const raw = record(input, 'Manifest');
  const source = record(raw.source ?? raw.article ?? {}, 'Source');
  const sourceTitle = firstText(source, ['title'], 'Source') ?? text(raw.title, 'Manifest.title');
  if (!sourceTitle) throw new Error('The manifest has no source article title.');
  const sourceRow = {
    title: sourceTitle,
    source_type: firstText(source, ['source_type', 'type'], 'Source') ?? 'article',
    url: webLink(source.url, 'Source.url'),
    summary: firstText(source, ['summary', 'description'], 'Source'),
  };
  const family = record(raw.family ?? {}, 'Family');
  const familyRow = {
    title: text(family.title, 'Family.title') ?? text(raw.package_name, 'Manifest.package_name') ?? sourceTitle,
    purpose: text(family.purpose, 'Family.purpose') ?? text(raw.purpose, 'Manifest.purpose'),
  };
  const recipe = text(raw.recipe_version, 'Manifest.recipe_version');
  const posts = listAlias(raw, ['posts', 'items', 'deliverables'], 'Manifest');
  if (!posts.length) throw new Error('The manifest lists no posts to create.');

  return {
    source: sourceRow,
    family: familyRow,
    posts: posts.map((value, i) => {
      const path = `Post ${i + 1}`;
      const post = record(value, path);
      const title = firstText(post, ['title', 'name'], path);
      if (!title) throw new Error(`${path} needs a title so repeat imports can match it safely.`);
      const format = firstText(post, ['format', 'type'], path) ?? 'post';
      if (!(FORMATS as readonly string[]).includes(format)) throw new Error(`${path}.format is not a supported content format.`);
      const stage = text(post.stage, `${path}.stage`) ?? 'idea';
      if (!(STAGES as readonly string[]).includes(stage) || stage === 'scheduled' || stage === 'published') {
        throw new Error(`${path}.stage must be a production stage, from idea through thumbnail. Approval, scheduling and publication happen in HQ.`);
      }
      const brief = decodeBrief(post.brief, `${path}.brief`);
      for (const key of ['script', 'caption', 'hook', 'cta', 'body', 'text', 'content', 'full_text']) {
        const nested = text(brief[key], `${path}.brief.${key}`);
        const direct = text(post[key], `${path}.${key}`);
        if (direct !== null || nested !== null) brief[key] = direct ?? nested;
      }
      const finalLinks = [...new Set([
        ...links(brief.asset_urls, `${path}.brief.asset_urls`),
        ...links(post.asset_urls, `${path}.asset_urls`),
      ])];
      if (finalLinks.length || brief.asset_urls !== undefined || post.asset_urls !== undefined) brief.asset_urls = finalLinks;
      for (const [value, label] of [[brief.cta_not_needed, 'brief.cta_not_needed'], [post.cta_not_needed, 'cta_not_needed']] as const) {
        if (value !== undefined && value !== null && typeof value !== 'boolean') throw new Error(`${path}.${label} must be true or false.`);
      }
      if (typeof post.cta_not_needed === 'boolean') brief.cta_not_needed = post.cta_not_needed;

      const files = listAlias(post, ['files', 'assets', 'exports', 'slides'], path).map((entry, fileIndex) => {
        const filePath = `${path} file ${fileIndex + 1}`;
        const file = record(entry, filePath);
        const name = firstText(file, ['file_name', 'name', 'path'], filePath);
        if (!name) throw new Error(`${filePath} needs a file_name, name or path.`);
        const mime = firstText(file, ['mime_type', 'mime'], filePath);
        return {
          file_name: name,
          storage_path: firstText(file, ['path', 'storage_path'], filePath) ?? name,
          mime_type: mime,
          asset_type: text(file.asset_type, `${filePath}.asset_type`) ?? (mime?.startsWith('video') ? 'video' : 'image'),
          file_size: number(file, ['size', 'file_size'], filePath),
          content_hash: firstText(file, ['content_hash', 'hash', 'sha256'], filePath),
          original_width: number(file, ['width', 'original_width'], filePath),
          original_height: number(file, ['height', 'original_height'], filePath),
          duration_seconds: number(file, ['duration_seconds', 'duration'], filePath),
          description: firstText(file, ['description', 'alt_text'], filePath),
          provenance: text(file.provenance, `${filePath}.provenance`),
        };
      });
      return {
        item: {
          title, format: format as ContentFormat, stage, brief,
          hook: text(brief.hook, `${path}.brief.hook`),
          cta: text(brief.cta, `${path}.brief.cta`),
          purpose: text(post.purpose, `${path}.purpose`),
          purpose_type: text(post.purpose_type, `${path}.purpose_type`),
          recipe_version: text(post.recipe_version, `${path}.recipe_version`) ?? recipe,
        },
        channel: firstText(post, ['channel', 'platform'], path) ?? 'other',
        account: firstText(post, ['account_label', 'account'], path),
        files,
      };
    }),
  };
}

function empty(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim())
    || (Array.isArray(value) && !value.length);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fillEmpty(existing: RecordValue, incoming: RecordValue): RecordValue {
  return Object.fromEntries([...new Set([...Object.keys(existing), ...Object.keys(incoming)])].map(key => {
    const old = existing[key];
    const next = incoming[key];
    const value = empty(old) ? (next === undefined ? old : next)
      : isRecord(old) && isRecord(next) ? fillEmpty(old, next) : old;
    return [key, value];
  }));
}

/** Add missing draft material without replacing user edits, stage or unrelated metadata. */
export function contentPackagePatch(existing: RecordValue, incoming: ImportedPost['item']): RecordValue {
  if (existing.approved_at || existing.stage === 'scheduled' || existing.stage === 'published') return {};
  const oldBrief = decodeBrief(existing.brief, 'Saved brief');
  const brief = fillEmpty(oldBrief, incoming.brief);
  // Final links are additive; references and other asset metadata never qualify as finished work.
  if (Array.isArray(incoming.brief.asset_urls) && incoming.brief.asset_urls.length) {
    const oldLinks = Array.isArray(oldBrief.asset_urls) ? oldBrief.asset_urls : [];
    brief.asset_urls = [...new Set([...oldLinks, ...incoming.brief.asset_urls])];
  }
  const patch: RecordValue = {};
  for (const key of ['hook', 'cta', 'purpose', 'purpose_type', 'recipe_version']) {
    const imported = key === 'hook' || key === 'cta' ? brief[key] : incoming[key];
    if (empty(existing[key]) && !empty(imported)) patch[key] = imported;
    // A column edited in HQ takes precedence over a blank imported brief field.
    if ((key === 'hook' || key === 'cta') && !empty(existing[key]) && empty(oldBrief[key])) brief[key] = existing[key];
  }
  if (Object.keys(brief).length && JSON.stringify(brief) !== JSON.stringify(oldBrief)) patch.brief = brief;
  return patch;
}

export class ContentPackageImportError extends Error {
  constructor(message: string, public summary: PackageImportSummary) { super(message); }
}

/** Uses the caller's authenticated table client; no uploads, approval or publishing are performed. */
export async function importContentPackage(input: unknown, context: {
  projectId: string;
  userId: string;
  from: (table: string) => any;
}): Promise<PackageImportSummary> {
  const manifest = parseContentPackage(input);
  const { from, projectId, userId } = context;
  if (!projectId || !userId) throw new Error('Choose a brand and sign in before importing a package.');
  const summary: PackageImportSummary = { created: [], updated: [], skipped: [] };
  const read = async (query: any) => {
    const result = await query;
    if (result.error) throw result.error;
    return result.data;
  };
  try {
    let source = await read(from('content_sources').select('id').eq('project_id', projectId).eq('title', manifest.source.title).maybeSingle());
    if (source) summary.skipped.push(`Source already existed: ${manifest.source.title}`);
    else {
      source = await read(from('content_sources').insert({ ...manifest.source, project_id: projectId }).select('id').single());
      summary.created.push(`Source: ${manifest.source.title}`);
    }
    let family = await read(from('content_families').select('id').eq('project_id', projectId).eq('title', manifest.family.title).maybeSingle());
    if (family) summary.skipped.push(`Family already existed: ${manifest.family.title}`);
    else {
      family = await read(from('content_families').insert({ ...manifest.family, project_id: projectId, source_id: source.id }).select('id').single());
      summary.created.push(`Family: ${manifest.family.title}`);
    }
    // No kit is needed for text-only packages with no file metadata.
    let kit: { id: string } | null = null;
    if (manifest.posts.some(post => post.files.length)) {
      kit = await read(from('brand_kits').select('id').eq('project_id', projectId).eq('archived', false).maybeSingle());
      if (!kit) {
        kit = await read(from('brand_kits').insert({ project_id: projectId, created_by: userId }).select('id').single());
        summary.created.push('Brand kit');
      }
    }
    for (const post of manifest.posts) {
      const { title, format } = post.item;
      let item = await read(from('content_items')
        .select('id,brief,hook,cta,purpose,purpose_type,recipe_version,stage,approved_at,updated_at')
        .eq('project_id', projectId).eq('family_id', family.id).eq('title', title).eq('format', format).maybeSingle());
      if (item) {
        const patch = contentPackagePatch(item, post.item);
        if (Object.keys(patch).length) {
          let update = from('content_items').update(patch).eq('id', item.id).eq('project_id', projectId);
          if (item.updated_at) update = update.eq('updated_at', item.updated_at);
          const saved = await read(update.select('id').maybeSingle());
          if (!saved) throw new Error(`“${title}” changed during this import or is no longer editable. Review it and repeat the import.`);
          summary.updated.push(`Filled missing draft material: ${title}`);
        } else summary.skipped.push(`Item already existed; saved work preserved: ${title}`);
      } else {
        item = await read(from('content_items').insert({
          ...post.item, project_id: projectId, family_id: family.id, created_by: userId,
        }).select('id').single());
        summary.created.push(`Item: ${title}`);
      }
      for (const file of post.files) {
        let duplicate = file.content_hash
          ? await read(from('brand_kit_assets').select('id').eq('kit_id', kit!.id).eq('content_hash', file.content_hash).limit(1).maybeSingle())
          : null;
        if (!duplicate) duplicate = await read(from('brand_kit_assets').select('id')
          .eq('kit_id', kit!.id).eq('source_id', source.id).eq('storage_path', file.storage_path).limit(1).maybeSingle());
        if (duplicate) summary.skipped.push(`File already stored: ${file.file_name}`);
        else {
          await read(from('brand_kit_assets').insert({ ...file, kit_id: kit!.id, source_id: source.id }));
          summary.created.push(`File: ${file.file_name}`);
        }
      }
      let placementQuery = from('content_placements').select('id')
        .eq('content_item_id', item.id).eq('project_id', projectId).eq('channel', post.channel);
      placementQuery = post.account ? placementQuery.eq('account_label', post.account) : placementQuery.is('account_label', null);
      const placement = await read(placementQuery.limit(1).maybeSingle());
      if (placement) summary.skipped.push(`Placement already existed: ${post.channel} — ${title}`);
      else {
        await read(from('content_placements').insert({
          content_item_id: item.id, project_id: projectId, channel: post.channel,
          account_label: post.account, status: 'draft',
          idempotency_key: `import:v2:${item.id}:${encodeURIComponent(post.channel)}:${encodeURIComponent(post.account ?? '')}`,
        }));
        summary.created.push(`Placement: ${post.channel} — ${title}`);
      }
    }
    return summary;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message
      : isRecord(error) && typeof error.message === 'string' ? error.message : 'The package could not be saved.';
    throw new ContentPackageImportError(message, summary);
  }
}
