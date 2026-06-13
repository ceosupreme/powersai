import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsanaStory {
  gid: string;
  created_at: string;
  text: string;
  resource_subtype: string;
  created_by?: {
    gid: string;
    name: string;
  };
}

interface Bar {
  id: string;
  name: string;
  bar_code: string | null;
  asana_project_gid: string | null;
  asana_log_project_gid: string | null;
  asana_log_section_gid: string | null;
  asana_gm_log_task_gid: string | null;
  asana_lead_log_task_gid: string | null;
  asana_gm_log_section_gid: string | null;
}

interface SyncResult {
  bar_id: string;
  bar_name: string;
  gm_created: number;
  lead_created: number;
  gm_section_created: number;
  gm_section_task_gids: string[];
  project_tasks_read: number;
  project_comments_found: number;
  project_shift_log_created: boolean;
  fallback_used: boolean;
  errors: string[];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function nowPacific(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

function yesterday(): string {
  const d = nowPacific();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tableForLogType(lt: string): 'gm_logs' | 'lead_logs' | 'shift_logs' {
  if (lt === 'lead') return 'lead_logs';
  if (lt === 'shift') return 'shift_logs';
  return 'gm_logs'; // 'gm', 'manager', and unknown collapse to gm_logs
}

// Inject canonical dual-column write (bar_id + venue_id) into a row, but only
// for tables that actually have a venue_id column. `lead_logs` is bar_id-only,
// so writing venue_id to it fails with a schema-cache error. For shift_logs,
// also synthesize a unique `source` so per-comment rows don't collide on the
// (bar_id, date, source) unique index. See mem://architecture/bar-id-venue-id.
const TABLES_WITH_VENUE_ID = new Set(['gm_logs', 'shift_logs']);

function withCanonicalIds(
  row: Record<string, any>,
  table: 'gm_logs' | 'lead_logs' | 'shift_logs',
  venueId: string,
  perCommentSource?: string, // e.g. `asana_section:${gid}` or `asana_task:${gid}`
): Record<string, any> {
  const out: Record<string, any> = { ...row };
  if (TABLES_WITH_VENUE_ID.has(table)) {
    out.venue_id = venueId;
  }
  if (table === 'shift_logs' && perCommentSource) {
    out.source = perCommentSource;
  }
  return out;
}

function parseLogDate(commentText: string, createdAt: string): string {
  // Patterns capture: [1]=month-or-monthName, [2]=day, [3]=optional year (2 or 4 digit).
  // `\s` matches newlines in JS, so `Date:\s*` handles `Date:\nMay 20, 2026`.
  const datePatterns: RegExp[] = [
    // "Date: May 20, 2026" / "Date:\nMay 20, 2026" / "Date: May 20"
    /Date:\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s*(\d{2,4}))?/i,
    // "Date: 5/20/2026" / "Date: 5/20"
    /Date:\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i,
    // Leading "5/20 -" / "5/20/2026 -" / "5-20 -"
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*[-–]/,
    /^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?\s*[-–]/,
    // Leading "May 20" / "May 20, 2026"
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s*(\d{2,4}))?/i,
  ];

  // PT-local fallback: avoids mis-attributing late-night PT logs (e.g. 11pm PT
  // May 13 → created_at 06:00 UTC May 14) to the next business day.
  const fallback = (() => {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return createdAt.split('T')[0];
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  })();
  const createdMs = Date.parse(createdAt);
  const maxFutureMs = isNaN(createdMs) ? Infinity : createdMs + 7 * 86400_000;

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  for (const pattern of datePatterns) {
    const match = commentText.match(pattern);
    if (!match) continue;

    let month: number;
    let day: number;
    if (/^[A-Za-z]/.test(match[1])) {
      month = months[match[1].toLowerCase().slice(0, 3)];
      day = parseInt(match[2]);
    } else {
      month = parseInt(match[1]) - 1;
      day = parseInt(match[2]);
    }
    if (isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) continue;

    // Year handling: explicit year in body wins; otherwise infer year from
    // createdAt in PT (avoids Dec/Jan UTC boundary drift).
    let year: number;
    if (match[3]) {
      const y = parseInt(match[3]);
      year = y < 100 ? 2000 + y : y;
    } else {
      const baseMs = isNaN(createdMs) ? Date.now() : createdMs;
      year = parseInt(new Date(baseMs).toLocaleDateString('en-CA', {
        timeZone: 'America/Los_Angeles', year: 'numeric',
      }));
    }

    // Build ISO directly to avoid local-tz off-by-one from new Date(y,m,d).
    const candidateIso = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Never accept a parsed date >7 days in the future relative to created_at.
    const candidateMs = Date.parse(`${candidateIso}T00:00:00Z`);
    if (!isNaN(candidateMs) && candidateMs > maxFutureMs) {
      return fallback;
    }
    return candidateIso;
  }

  return fallback;
}

// ── Shift detection for lead logs ─────────────────────────────────────────────

function determineShift(commentText: string, createdAt: string): string {
  const lowerText = commentText.toLowerCase();
  if (lowerText.includes('am shift') || lowerText.includes('morning') || lowerText.includes('open')) {
    return 'AM';
  }
  if (lowerText.includes('pm shift') || lowerText.includes('evening') || lowerText.includes('close') || lowerText.includes('night')) {
    return 'PM';
  }
  const pacificHour = parseInt(
    new Date(createdAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false })
  );
  return pacificHour < 17 ? 'AM' : 'PM';
}

// ── Task author parsing ──────────────────────────────────────────────────────
// Asana task title patterns vary by venue:
//   "Karlee"                        (HTP)
//   "Angel, Apr 30, 2026"           (Hearth)
//   "Brooke Smith"                  (Aero Club)
//   "Syc - Anna"                    (SycDen)
//   "Hills - Lead Logs"             (multi-comment task — no per-task author)
// Returns the candidate author name (raw, capitalized) or null if title looks like
// a generic task (Lead Logs, Daily Notes, etc.).
const VENUE_PREFIX_RE = /^\s*(syc|hills|htp|aero|hearth|pelican|skybar|waterfront)\s*[-–:]\s*/i;
const GENERIC_TITLE_RE = /\b(lead logs?|gm logs?|daily logs?|daily notes?|shift logs?|notes?|logs?|checklist|checklists)\b/i;

function parseAsanaTaskAuthor(taskName: string | null | undefined): string | null {
  if (!taskName) return null;
  let s = taskName.trim();
  if (!s) return null;
  s = s.replace(VENUE_PREFIX_RE, '').trim();
  // Drop trailing date suffix: "Angel, Apr 30, 2026" → "Angel"
  s = s.split(/[,–-]/)[0].trim();
  if (!s) return null;
  if (GENERIC_TITLE_RE.test(s)) return null;
  // Take leading 1-2 word author. Stop on digit or non-letter punctuation.
  const m = s.match(/^([A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'’-]+)?)/);
  if (!m) return null;
  const candidate = m[1].trim();
  // Reject all-uppercase 2+ char tokens that look like venue codes.
  if (candidate.length < 2) return null;
}

// ── Lead Log rating extractor ────────────────────────────────────────────────
// The Asana Lead Log form renders answers into the task notes / comment text
// as labelled lines, e.g. "Lead rating: 3" or "Vibe Rating - 4". We extract
// each of the 6 supported ratings (1-5) and patch them onto the lead_logs row.
const LEAD_RATING_LABELS: Array<{ col: string; label: RegExp }> = [
  { col: 'lead_rating',              label: /lead\s*rating/i },
  { col: 'bartender_rating',         label: /bartender\s*rating/i },
  { col: 'service_bartender_rating', label: /service\s*bartender\s*rating/i },
  { col: 'window_rating',            label: /window\s*rating/i },
  { col: 'float_rating',             label: /float\s*rating/i },
  { col: 'vibe_rating',              label: /vibe\s*rating/i },
];

export function parseLeadRatings(text: string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!text) return out;
  // Match each label followed by an optional separator (:, -, =, whitespace)
  // and a digit 1-5.
  for (const { col, label } of LEAD_RATING_LABELS) {
    // service_bartender_rating must win over bartender_rating; we prefix with
    // an explicit "service" check by searching the more specific label first.
    const re = new RegExp(label.source + '\\s*[:\\-=]?\\s*([1-5])(?!\\d)', 'i');
    const m = text.match(re);
    if (m) out[col] = Number(m[1]);
  }
  // Disambiguation: "Service Bartender Rating: X" also matches the loose
  // "Bartender Rating" pattern. If both fired with the same value at the
  // same offset, drop the ambiguous one when the explicit service line exists.
  if (out.service_bartender_rating != null && out.bartender_rating != null) {
    // Re-extract bartender_rating using a negative-lookbehind workaround:
    // require that "bartender" is NOT preceded by "service" within 12 chars.
    const strict = text.match(/(?<!service\s{0,4})bartender\s*rating\s*[:\-=]?\s*([1-5])(?!\d)/i);
    if (!strict) delete out.bartender_rating;
  }
  return out;
}

async function patchLeadLogRatings(
  supabase: any,
  asanaCommentGid: string,
  ratings: Record<string, number>,
): Promise<void> {
  if (Object.keys(ratings).length === 0) return;
  const { error } = await supabase
    .from('lead_logs')
    .update(ratings)
    .eq('asana_comment_gid', asanaCommentGid);
  if (error) {
    console.warn(`[LEAD-RATINGS] patch failed for ${asanaCommentGid}: ${error.message}`);
  }
}


// ── Asana API ─────────────────────────────────────────────────────────────────

async function fetchTaskStories(taskGid: string, accessToken: string): Promise<AsanaStory[]> {
  const url = `https://app.asana.com/api/1.0/tasks/${taskGid}/stories?opt_fields=gid,created_at,text,resource_subtype,created_by.name`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Asana API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return (data.data || []).filter(
    (s: AsanaStory) => s.resource_subtype === 'comment_added'
  );
}

// ── Fetch all tasks in a project (with pagination) ────────────────────────────

interface AsanaTask {
  gid: string;
  name: string;
  notes: string;
  modified_at: string;
}

async function fetchProjectTasks(
  projectGid: string,
  modifiedSince: string,
  accessToken: string,
  sectionGid?: string | null,
): Promise<AsanaTask[]> {
  const allTasks: AsanaTask[] = [];
  const base = sectionGid
    ? `https://app.asana.com/api/1.0/sections/${sectionGid}/tasks`
    : `https://app.asana.com/api/1.0/projects/${projectGid}/tasks`;
  let url: string | null =
    `${base}?opt_fields=gid,name,notes,modified_at&modified_since=${modifiedSince}T00:00:00Z&limit=100`;

  while (url) {
    const resp: Response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Asana ${sectionGid ? 'section' : 'project'} tasks ${resp.status}: ${errText}`);
    }

    const json: any = await resp.json();
    allTasks.push(...(json.data || []));
    url = json.next_page?.uri || null;
  }

  return allTasks;
}

// ── Per-type sync (existing GM/Lead path) ─────────────────────────────────────

async function syncLogType(
  supabase: any,
  asanaToken: string,
  bar: Bar,
  logType: 'gm' | 'lead' | 'shift',
  taskGid: string,
  backfillSince?: string, // ISO date YYYY-MM-DD; when set, ignore cursor and pull stories created on/after this date
  sourceId?: string | null,
  sourceLabel?: string | null,
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  const stories = await fetchTaskStories(taskGid, asanaToken);

  let newStories: AsanaStory[];
  if (backfillSince) {
    // Backfill mode: ignore cursor, take stories created on/after the backfill date.
    // Dedup is enforced at insert time via onConflict: asana_comment_gid.
    const threshold = `${backfillSince}T00:00:00Z`;
    newStories = stories.filter((s) => s.created_at >= threshold);
    console.log(`[syncLogType/backfill] task=${taskGid} since=${backfillSince}: ${newStories.length} stories in window (of ${stories.length} total)`);
  } else {
    const { data: cursorRow } = await supabase
      .from('asana_sync_cursor')
      .select('last_comment_gid')
      .eq('bar_id', bar.id)
      .eq('log_type', logType)
      .maybeSingle();

    const lastGid = cursorRow?.last_comment_gid || null;
    if (lastGid) {
      const cursorIdx = stories.findIndex((s) => s.gid === lastGid);
      newStories = cursorIdx === -1 ? stories : stories.slice(cursorIdx + 1);
    } else {
      newStories = stories;
    }
  }

  newStories = newStories.filter((s) => s.text && s.text.trim().length >= 10);

  if (newStories.length === 0) {
    return { created: 0, errors };
  }

  const targetTable = tableForLogType(logType);

  for (const story of newStories) {
    const date = parseLogDate(story.text, story.created_at);
    const authorName = story.created_by?.name || null;

    const baseRow: Record<string, any> = {
      bar_id: bar.id,
      date,
      raw_text: story.text,
      author_name: authorName,
      asana_comment_gid: story.gid,
      asana_task_gid: taskGid,
      comment_created_at: story.created_at,
      is_parsed: false,
      asana_source_id: sourceId ?? null,
      asana_source_label: sourceLabel ?? null,
    };
    if (logType === 'lead') {
      baseRow.shift = determineShift(story.text, story.created_at);
    }
    const perCommentSource = targetTable === 'shift_logs'
      ? `asana_task:${story.gid}`
      : undefined;
    const row = withCanonicalIds(baseRow, targetTable, bar.id, perCommentSource);

    const { error } = await supabase.from(targetTable).upsert(
      row,
      { onConflict: 'asana_comment_gid', ignoreDuplicates: true }
    );
    if (error) {
      errors.push(`${logType}/${story.gid}: ${error.message}`);
    } else {
      created++;
      if (logType === 'lead') {
        await patchLeadLogRatings(supabase, story.gid, parseLeadRatings(story.text));
      }
    }
  }

  // Don't move the cursor during backfill — leave it alone so the next normal
  // daily sync still picks up where it left off.
  if (!backfillSince) {
    const latestGid = newStories[newStories.length - 1].gid;
    await supabase.from('asana_sync_cursor').upsert(
      {
        bar_id: bar.id,
        log_type: logType,
        task_gid: taskGid,
        last_comment_gid: latestGid,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'bar_id,log_type' }
    );
  }

  return { created, errors };
}

// ── Full project sync (new path) ──────────────────────────────────────────────

async function syncFromProject(
  supabase: any,
  bar: Bar,
  asanaToken: string,
  targetDate?: string,
  extraSkipGids: string[] = [],
  backfillSince?: string, // when set, ingest each day in [backfillSince, today] as its own shift_log
  sourceId?: string | null,
  sourceLabel?: string | null,
  logType: 'gm' | 'lead' | 'manager' | 'shift' = 'shift',
): Promise<{ tasks_read: number; comments_found: number; shift_log_created: boolean; errors: string[] }> {
  const date = targetDate || yesterday();
  const errors: string[] = [];
  const projectGid = bar.asana_log_project_gid!;
  const sectionGid = bar.asana_log_section_gid || null;

  // In backfill mode, fetch tasks modified since backfillSince; otherwise since `date`.
  const fetchSince = backfillSince || date;
  console.log(`[Project Sync] Bar: ${bar.name}, Project: ${projectGid}, Section: ${sectionGid ?? '(entire project)'}, ${backfillSince ? `Backfill since: ${backfillSince}` : `Date: ${date}`}`);

  // 1. Fetch tasks (section-scoped if configured, else entire project) modified since target date
  let tasks: AsanaTask[];
  try {
    tasks = await fetchProjectTasks(projectGid, fetchSince, asanaToken, sectionGid);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch project tasks';
    console.error(`[Project Sync] ${msg}`);
    return { tasks_read: 0, comments_found: 0, shift_log_created: false, errors: [msg] };
  }

  console.log(`[Project Sync] Fetched ${tasks.length} modified tasks for ${bar.name}${sectionGid ? ` (section ${sectionGid})` : ''}`);

  // 2. Skip tasks that belong to the specific GM/Lead/GM-section paths (avoid double-reading)
  const skipGids = new Set<string>(extraSkipGids);
  if (bar.asana_gm_log_task_gid) skipGids.add(bar.asana_gm_log_task_gid);
  if (bar.asana_lead_log_task_gid) skipGids.add(bar.asana_lead_log_task_gid);

  // Bug 4 — honor logType. Write per-comment rows to the matching log table
  // (gm_logs / lead_logs / shift_logs). All three tables now have asana_comment_gid
  // for dedup. shift_logs additionally has a (bar_id,date,source) unique index, so
  // each per-comment row needs a synthetic unique `source` derived from the gid.
  // Project-level shift aggregation (single bundled row per date) lives below and
  // is only used when caller explicitly opts into the aggregate path via
  // logType==='shift_aggregate'.
  const targetTable = tableForLogType(logType);
  if (logType !== 'shift_aggregate') {
    const sinceThreshold = backfillSince
      ? `${backfillSince}T00:00:00Z`
      : `${date}T00:00:00Z`;
    const upperThreshold = backfillSince
      ? null
      : (() => {
          const nd = new Date(date + 'T00:00:00Z');
          nd.setUTCDate(nd.getUTCDate() + 1);
          return nd.toISOString();
        })();
    let perCommentCreated = 0;
    let perCommentFound = 0;
    for (const task of tasks) {
      if (skipGids.has(task.gid)) continue;

      // Bug 1: ingest task.notes as a synthetic log row.
      if (task.notes && task.notes.trim().length >= 10) {
        const noteCreatedAt = task.modified_at || new Date().toISOString();
        const inWindow = noteCreatedAt >= sinceThreshold && (!upperThreshold || noteCreatedAt < upperThreshold);
        if (inWindow) {
          const noteDate = parseLogDate(task.notes, noteCreatedAt);
          const author = parseAsanaTaskAuthor(task.name);
          const row: any = {
            bar_id: bar.id,
            date: noteDate,
            raw_text: task.notes.trim(),
            author_name: author,
            asana_comment_gid: `task:${task.gid}`,
            asana_task_gid: task.gid,
            comment_created_at: noteCreatedAt,
            is_parsed: false,
            asana_source_id: sourceId ?? null,
            asana_source_label: sourceLabel ?? null,
          };
          if (targetTable === 'lead_logs') {
            row.shift = determineShift(task.notes, noteCreatedAt);
            Object.assign(row, parseLeadRatings(task.notes));
          }
          const perCommentSource = targetTable === 'shift_logs'
            ? `asana_project_task:${task.gid}`
            : undefined;
          const rowOut = withCanonicalIds(row, targetTable, bar.id, perCommentSource);
          const { error } = await supabase.from(targetTable).upsert(rowOut, {
            onConflict: 'asana_comment_gid', ignoreDuplicates: true,
          });
          if (error) errors.push(`${targetTable}/task:${task.gid}: ${error.message}`);
          else {
            perCommentCreated++;
            if (targetTable === 'lead_logs') {
              await patchLeadLogRatings(supabase, `task:${task.gid}`, parseLeadRatings(task.notes));
            }
          }
        }
      }

      // Comments
      let stories: AsanaStory[] = [];
      try {
        stories = await fetchTaskStories(task.gid, asanaToken);
      } catch (e) {
        console.warn(`[Project Sync/${targetTable}] Failed to fetch stories for task ${task.gid}:`, e);
        continue;
      }
      const inWindow = stories.filter(
        (s) => s.created_at >= sinceThreshold
          && (!upperThreshold || s.created_at < upperThreshold)
          && s.text && s.text.trim().length >= 10,
      );
      perCommentFound += inWindow.length;
      for (const story of inWindow) {
        const storyDate = parseLogDate(story.text, story.created_at);
        const row: any = {
          bar_id: bar.id,
          date: storyDate,
          raw_text: story.text,
          author_name: story.created_by?.name || null,
          asana_comment_gid: story.gid,
          asana_task_gid: task.gid,
          comment_created_at: story.created_at,
          is_parsed: false,
          asana_source_id: sourceId ?? null,
          asana_source_label: sourceLabel ?? null,
        };
        if (targetTable === 'lead_logs') {
          row.shift = determineShift(story.text, story.created_at);
          Object.assign(row, parseLeadRatings(story.text));
        }
        const perCommentSource = targetTable === 'shift_logs'
          ? `asana_project_comment:${story.gid}`
          : undefined;
        const rowOut = withCanonicalIds(row, targetTable, bar.id, perCommentSource);
        const { error } = await supabase.from(targetTable).upsert(rowOut, {
          onConflict: 'asana_comment_gid', ignoreDuplicates: true,
        });
        if (error) errors.push(`${targetTable}/${story.gid}: ${error.message}`);
        else {
          perCommentCreated++;
          if (targetTable === 'lead_logs') {
            await patchLeadLogRatings(supabase, story.gid, parseLeadRatings(story.text));
          }
        }
      }
    }
    console.log(`[Project Sync] ${bar.name} → ${targetTable}: ${perCommentCreated} created, ${perCommentFound} comments in window`);
    return { tasks_read: tasks.length, comments_found: perCommentFound, shift_log_created: perCommentCreated > 0, errors };
  }

  let commentsFound = 0;

  // ── Backfill mode: bucket comments by their actual created_at date ──
  if (backfillSince) {
    const sinceThreshold = `${backfillSince}T00:00:00Z`;
    // perDate[YYYY-MM-DD] = string[] of task entries (task name + comments) for that date
    const perDate = new Map<string, string[]>();

    for (const task of tasks) {
      if (skipGids.has(task.gid)) continue;

      let stories: AsanaStory[] = [];
      try {
        stories = await fetchTaskStories(task.gid, asanaToken);
      } catch (e) {
        console.warn(`[Project Sync/backfill] Failed to fetch stories for task ${task.gid}:`, e);
        continue;
      }

      const inWindow = stories.filter((s) => s.created_at >= sinceThreshold && s.text && s.text.trim());
      if (inWindow.length === 0) continue;

      // Group this task's comments by date
      const byDate = new Map<string, AsanaStory[]>();
      for (const s of inWindow) {
        const d = s.created_at.split('T')[0];
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d)!.push(s);
        commentsFound++;
      }

      for (const [d, dayStories] of byDate.entries()) {
        const parts: string[] = [task.name];
        const taskAuthor = parseAsanaTaskAuthor(task.name);
        if (taskAuthor) parts.push(`Task Author: ${taskAuthor}`);
        if (task.notes && task.notes.trim()) parts.push(task.notes.trim());
        for (const c of dayStories) {
          const author = c.created_by?.name ? `[${c.created_by.name}] ` : '';
          parts.push(`→ ${author}${c.text.trim()}`);
        }
        if (!perDate.has(d)) perDate.set(d, []);
        perDate.get(d)!.push(parts.join('\n'));
      }
    }

    if (perDate.size === 0) {
      console.log(`[Project Sync/backfill] No activity for ${bar.name} since ${backfillSince}`);
      return { tasks_read: tasks.length, comments_found: 0, shift_log_created: false, errors };
    }

    let anyCreated = false;
    for (const [d, entries] of perDate.entries()) {
      const shiftSummary = entries.join('\n\n---\n\n');
      const { error } = await supabase
        .from('shift_logs')
        .upsert(
          {
            bar_id: bar.id,
            venue_id: bar.id,
            date: d,
            shift: 'ALL',
            source: 'asana_project',
            shift_summary: shiftSummary,
            is_processed: false,
            asana_source_id: sourceId ?? null,
            asana_source_label: sourceLabel ?? null,
          },
          { onConflict: 'bar_id,date,source' }
        );
      if (error) {
        errors.push(`shift_log/${d}: ${error.message}`);
      } else {
        anyCreated = true;
      }
    }

    console.log(`[Project Sync/backfill] ${bar.name}: wrote shift_logs for ${perDate.size} dates, ${commentsFound} comments`);
    return { tasks_read: tasks.length, comments_found: commentsFound, shift_log_created: anyCreated, errors };
  }

  // ── Normal single-day path (unchanged behavior) ──
  const allEntries: string[] = [];
  const dateThreshold = `${date}T00:00:00Z`;
  const nextDate = new Date(date + 'T00:00:00Z');
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDayThreshold = nextDate.toISOString();

  for (const task of tasks) {
    if (skipGids.has(task.gid)) continue;

    let relevantComments: AsanaStory[] = [];
    try {
      const stories = await fetchTaskStories(task.gid, asanaToken);
      relevantComments = stories.filter((s) => s.created_at >= dateThreshold && s.created_at < nextDayThreshold);
    } catch (e) {
      console.warn(`[Project Sync] Failed to fetch stories for task ${task.gid}:`, e);
    }

    const parts: string[] = [task.name];
    const taskAuthor = parseAsanaTaskAuthor(task.name);
    if (taskAuthor) parts.push(`Task Author: ${taskAuthor}`);
    if (task.notes && task.notes.trim()) {
      parts.push(task.notes.trim());
    }
    for (const comment of relevantComments) {
      if (comment.text && comment.text.trim()) {
        const author = comment.created_by?.name ? `[${comment.created_by.name}] ` : '';
        parts.push(`→ ${author}${comment.text.trim()}`);
        commentsFound++;
      }
    }

    if (relevantComments.length > 0 || (task.notes && task.notes.trim())) {
      allEntries.push(parts.join('\n'));
    }
  }

  if (allEntries.length === 0) {
    console.log(`[Project Sync] No activity found for ${bar.name} on ${date}`);
    return { tasks_read: tasks.length, comments_found: 0, shift_log_created: false, errors };
  }

  const shiftSummary = allEntries.join('\n\n---\n\n');

  const { error } = await supabase
    .from('shift_logs')
    .upsert(
      {
        bar_id: bar.id,
        venue_id: bar.id,
        date,
        shift: 'ALL',
        source: 'asana_project',
        shift_summary: shiftSummary,
        is_processed: false,
        asana_source_id: sourceId ?? null,
        asana_source_label: sourceLabel ?? null,
      },
      { onConflict: 'bar_id,date,source' }
    );

  if (error) {
    const msg = `Failed to upsert shift_log: ${error.message}`;
    console.error(`[Project Sync] ${msg}`);
    return { tasks_read: tasks.length, comments_found: commentsFound, shift_log_created: false, errors: [msg] };
  }

  console.log(`[Project Sync] Created shift_log for ${bar.name} on ${date}: ${allEntries.length} entries, ${commentsFound} comments`);
  return { tasks_read: tasks.length, comments_found: commentsFound, shift_log_created: true, errors };
}

// ── GM Log Section sync (new path) ────────────────────────────────────────────
// Reads tasks from a specific Asana section (globally unique GID — no project
// needed) and ingests every comment as a gm_log entry, mirroring syncLogType.

async function syncGmLogSection(
  supabase: any,
  bar: Bar,
  asanaToken: string,
  targetDate?: string,
  sourceId?: string | null,
  sourceLabel?: string | null,
  logType: 'gm' | 'lead' | 'manager' | 'shift' = 'gm',
): Promise<{ created: number; task_gids: string[]; errors: string[] }> {
  const date = targetDate || yesterday();
  const errors: string[] = [];
  const sectionGid = bar.asana_gm_log_section_gid!;
  let created = 0;
  const taskGids: string[] = [];

  // Honor logType. shift_logs now supports per-comment dedup via asana_comment_gid
  // (see migration 2026-05-16). Each shift_logs row gets a synthetic unique
  // `source` to avoid colliding on the (bar_id, date, source) unique index.
  const targetTable = tableForLogType(logType);

  console.log(`[Section Sync] Bar: ${bar.name}, Section: ${sectionGid}, Date: ${date}, table: ${targetTable}`);

  let tasks: AsanaTask[];
  try {
    tasks = await fetchProjectTasks('', date, asanaToken, sectionGid);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch section tasks';
    console.error(`[Section Sync] ${msg}`);
    return { created: 0, task_gids: [], errors: [msg] };
  }

  console.log(`[Section Sync] Fetched ${tasks.length} modified tasks for ${bar.name}`);

  for (const task of tasks) {
    taskGids.push(task.gid);

    // Bug 1: ingest task.notes itself as a log row when present.
    if (task.notes && task.notes.trim().length >= 10) {
      const noteCreatedAt = task.modified_at || new Date().toISOString();
      const noteDate = parseLogDate(task.notes, noteCreatedAt);
      const author = parseAsanaTaskAuthor(task.name);
      const row: any = {
        bar_id: bar.id,
        date: noteDate,
        raw_text: task.notes.trim(),
        author_name: author,
        asana_comment_gid: `task:${task.gid}`,
        asana_task_gid: task.gid,
        comment_created_at: noteCreatedAt,
        is_parsed: false,
        asana_source_id: sourceId ?? null,
        asana_source_label: sourceLabel ?? null,
      };
      if (targetTable === 'lead_logs') {
        row.shift = determineShift(task.notes, noteCreatedAt);
        Object.assign(row, parseLeadRatings(task.notes));
      }
      const perCommentSource1 = targetTable === 'shift_logs' ? `asana_section_task:${task.gid}` : undefined;
      const rowOut1 = withCanonicalIds(row, targetTable, bar.id, perCommentSource1);
      const { error } = await supabase.from(targetTable).upsert(rowOut1, {
        onConflict: 'asana_comment_gid', ignoreDuplicates: true,
      });
      if (error) errors.push(`${targetTable}/task:${task.gid}: ${error.message}`);
      else {
        created++;
        if (targetTable === 'lead_logs') {
          await patchLeadLogRatings(supabase, `task:${task.gid}`, parseLeadRatings(task.notes));
        }
      }
    }

    // Stories (comments) — coexist with task.notes rows.
    let stories: AsanaStory[] = [];
    try {
      stories = await fetchTaskStories(task.gid, asanaToken);
    } catch (e) {
      console.warn(`[Section Sync] Failed to fetch stories for task ${task.gid}:`, e);
      continue;
    }

    const filtered = stories.filter((s) => s.text && s.text.trim().length >= 10);

    for (const story of filtered) {
      const storyDate = parseLogDate(story.text, story.created_at);
      const authorName = story.created_by?.name || null;

      const row: any = {
        bar_id: bar.id,
        date: storyDate,
        raw_text: story.text,
        author_name: authorName,
        asana_comment_gid: story.gid,
        asana_task_gid: task.gid,
        comment_created_at: story.created_at,
        is_parsed: false,
        asana_source_id: sourceId ?? null,
        asana_source_label: sourceLabel ?? null,
      };
      if (targetTable === 'lead_logs') {
        row.shift = determineShift(story.text, story.created_at);
        Object.assign(row, parseLeadRatings(story.text));
      }

      const perCommentSource2 = targetTable === 'shift_logs' ? `asana_section_comment:${story.gid}` : undefined;
      const rowOut2 = withCanonicalIds(row, targetTable, bar.id, perCommentSource2);
      const { error } = await supabase.from(targetTable).upsert(rowOut2, {
        onConflict: 'asana_comment_gid', ignoreDuplicates: true,
      });

      if (error) {
        errors.push(`${targetTable}/${story.gid}: ${error.message}`);
      } else {
        created++;
        if (targetTable === 'lead_logs') {
          await patchLeadLogRatings(supabase, story.gid, parseLeadRatings(story.text));
        }
      }
    }
  }

  console.log(`[Section Sync] Bar: ${bar.name}, Section: ${sectionGid}, table: ${targetTable}, created: ${created}`);
  return { created, task_gids: taskGids, errors };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('asana', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const asanaToken = Deno.env.get('ASANA_ACCESS_TOKEN');
    if (!asanaToken) throw new Error('ASANA_ACCESS_TOKEN not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Parse optional filters from query string and/or JSON body.
    // Supported: bar_id (alias: venue_id), target_date, backfill_since (YYYY-MM-DD).
    let filterBarId: string | null = null;
    let targetDate: string | undefined;
    let backfillSince: string | undefined;

    const url = new URL(req.url);
    filterBarId = url.searchParams.get('venue_id') || url.searchParams.get('bar_id');
    targetDate = url.searchParams.get('target_date') || undefined;
    backfillSince = url.searchParams.get('backfill_since') || undefined;

    try {
      const body = await req.json();
      if (body.bar_id) filterBarId = body.bar_id;
      if (body.venue_id) filterBarId = body.venue_id;
      if (body.target_date) targetDate = body.target_date;
      if (body.backfill_since) backfillSince = body.backfill_since;
    } catch {
      // No body
    }

    if (backfillSince && !/^\d{4}-\d{2}-\d{2}$/.test(backfillSince)) {
      return new Response(JSON.stringify({ success: false, error: 'backfill_since must be YYYY-MM-DD' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[sync-asana-logs] filters: bar=${filterBarId ?? 'all'}, target_date=${targetDate ?? '(yesterday)'}, backfill_since=${backfillSince ?? 'none'}`);

    // Query bars
    let barsQuery = supabase
      .from('venues')
      .select('id, name, bar_code, asana_project_gid, asana_log_project_gid, asana_log_section_gid, asana_gm_log_task_gid, asana_lead_log_task_gid, asana_gm_log_section_gid')
      .eq('is_active', true);

    if (filterBarId) {
      barsQuery = barsQuery.eq('id', filterBarId);
    }

    const { data: bars, error: barsErr } = await barsQuery;
    if (barsErr) throw barsErr;

    const results: SyncResult[] = [];

    for (const bar of (bars || []) as Bar[]) {
      const hasProject = !!bar.asana_log_project_gid;
      const hasGm = !!bar.asana_gm_log_task_gid;
      const hasLead = !!bar.asana_lead_log_task_gid;
      const hasGmSection = !!bar.asana_gm_log_section_gid;
      if (!hasProject && !hasGm && !hasLead && !hasGmSection) continue;

      // Create sync_run entry
      const { data: runRow } = await supabase
        .from('sync_runs')
        .insert({
          bar_id: bar.id,
          sync_type: 'asana_logs',
          status: 'running',
        })
        .select('id')
        .single();

      const runId = runRow?.id;
      const barResult: SyncResult = {
        bar_id: bar.id,
        bar_name: bar.name,
        gm_created: 0,
        lead_created: 0,
        gm_section_created: 0,
        gm_section_task_gids: [],
        project_tasks_read: 0,
        project_comments_found: 0,
        project_shift_log_created: false,
        fallback_used: false,
        errors: [],
      };

      try {
        // Step 0: New multi-source path. Load configured log sources for this venue
        // and dispatch each by source_type. This runs in addition to legacy
        // columns (which act as a safe fallback for un-migrated venues).
        const { data: sources } = await supabase
          .from('venue_asana_log_sources')
          .select('id, label, source_type, asana_gid, log_type, is_active')
          .eq('venue_id', bar.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        const extraSkipFromSources: string[] = [];

        for (const src of (sources || []) as Array<{ id: string; label: string; source_type: string; asana_gid: string; log_type: string }>) {
          if (!src.asana_gid) continue;
          try {
            if (src.source_type === 'task') {
              // Honor explicit log_type → table mapping. shift_logs now supports
              // per-comment dedup (see migration 2026-05-16); 'manager' still
              // collapses to 'gm'.
              const lt: 'gm' | 'lead' | 'shift' =
                src.log_type === 'lead' ? 'lead'
                : src.log_type === 'shift' ? 'shift'
                : 'gm';
              const r = await syncLogType(supabase, asanaToken, bar, lt, src.asana_gid, backfillSince, src.id, src.label);
              if (lt === 'lead') barResult.lead_created += r.created;
              else if (lt === 'shift') barResult.project_comments_found += r.created;
              else barResult.gm_created += r.created;
              barResult.errors.push(...r.errors);
              extraSkipFromSources.push(src.asana_gid);
              console.log(`[Sync/MultiSource] ${bar.name} task "${src.label}" (src.log_type=${src.log_type} → ${lt}): ${r.created}`);
            } else if (src.source_type === 'section') {
              const sectionBar: Bar = { ...bar, asana_gm_log_section_gid: src.asana_gid };
              const r = await syncGmLogSection(
                supabase, sectionBar, asanaToken, backfillSince || targetDate,
                src.id, src.label, (src.log_type as any) || 'gm',
              );
              if (src.log_type === 'lead') barResult.lead_created += r.created;
              else barResult.gm_section_created += r.created;
              barResult.gm_section_task_gids.push(...r.task_gids);
              barResult.errors.push(...r.errors);
              console.log(`[Sync/MultiSource] ${bar.name} section "${src.label}" (${src.log_type}): ${r.created}`);
            } else if (src.source_type === 'project') {
              const projBar: Bar = { ...bar, asana_log_project_gid: src.asana_gid, asana_log_section_gid: null };
              const r = await syncFromProject(
                supabase, projBar, asanaToken, targetDate, barResult.gm_section_task_gids,
                backfillSince, src.id, src.label, (src.log_type as any) || 'shift',
              );
              barResult.project_tasks_read += r.tasks_read;
              barResult.project_comments_found += r.comments_found;
              if (r.shift_log_created) barResult.project_shift_log_created = true;
              barResult.errors.push(...r.errors);
              console.log(`[Sync/MultiSource] ${bar.name} project "${src.label}" (${src.log_type}): ${r.tasks_read} tasks, ${r.comments_found} comments`);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'multi-source error';
            barResult.errors.push(`${src.label}: ${msg}`);
          }
        }

        // Step 1: Legacy sync — specific GM/Lead task GIDs (fallback for venues
        // that haven't been migrated to venue_asana_log_sources yet).
        if (hasGm) {
          const gm = await syncLogType(supabase, asanaToken, bar, 'gm', bar.asana_gm_log_task_gid!, backfillSince);
          barResult.gm_created = gm.created;
          barResult.errors.push(...gm.errors);
          console.log(`[Sync] ${bar.name} GM task: ${gm.created} created`);
        }

        if (hasLead) {
          const lead = await syncLogType(supabase, asanaToken, bar, 'lead', bar.asana_lead_log_task_gid!, backfillSince);
          barResult.lead_created = lead.created;
          barResult.errors.push(...lead.errors);
          console.log(`[Sync] ${bar.name} Lead task: ${lead.created} created`);
        }

        // Step 1b: Sync GM logs from a dedicated Asana section (if configured).
        // Section GIDs are globally unique — no project field required.
        if (hasGmSection) {
          const gmSection = await syncGmLogSection(supabase, bar, asanaToken, backfillSince || targetDate);
          barResult.gm_section_created = gmSection.created;
          barResult.gm_section_task_gids = gmSection.task_gids;
          barResult.errors.push(...gmSection.errors);
        }

        // Step 2: ALWAYS run project-level scan when configured (not just as fallback)
        // This ensures we capture logs from tasks like "shift daily", "daily notes", "lead logs"
        // that may not be pinned via specific GM/Lead task GIDs
        if (hasProject) {
          console.log(`[Sync] ${bar.name}: Running project-level scan (always-on)`);
          const projectResult = await syncFromProject(
            supabase,
            bar,
            asanaToken,
            targetDate,
            barResult.gm_section_task_gids,
            backfillSince,
          );
          barResult.project_tasks_read = projectResult.tasks_read;
          barResult.project_comments_found = projectResult.comments_found;
          barResult.project_shift_log_created = projectResult.shift_log_created;
          barResult.errors.push(...projectResult.errors);
          console.log(`[Sync] ${bar.name} Project: ${projectResult.tasks_read} tasks, ${projectResult.comments_found} comments, shift_log=${projectResult.shift_log_created}`);
        }

        // Trigger parse-logs for any unparsed logs
        try {
          const [{ count: unparsedGm }, { count: unparsedLead }] = await Promise.all([
            supabase.from('gm_logs').select('id', { count: 'exact', head: true }).eq('bar_id', bar.id).eq('is_parsed', false),
            supabase.from('lead_logs').select('id', { count: 'exact', head: true }).eq('bar_id', bar.id).eq('is_parsed', false),
          ]);

          const totalUnparsed = (unparsedGm || 0) + (unparsedLead || 0);
          if (totalUnparsed > 0) {
            const parseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/parse-logs`;
            await fetch(parseUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'parse_all', bar_id: bar.id }),
            });
            console.log(`Triggered parse-logs for bar ${bar.name} (${totalUnparsed} unparsed logs)`);
          } else {
            console.log(`No unparsed logs for bar ${bar.name}, skipping parse-logs`);
          }
        } catch (parseErr) {
          console.error(`Failed to trigger parse-logs for bar ${bar.name}:`, parseErr);
        }

        // Update sync_run
        const totalCreatedForBar = barResult.gm_created + barResult.lead_created + barResult.gm_section_created + (barResult.project_shift_log_created ? 1 : 0);
        if (runId) {
          await supabase.from('sync_runs').update({
            status: barResult.errors.length > 0 ? 'partial' : 'success',
            completed_at: new Date().toISOString(),
            records_created: totalCreatedForBar,
            error_message: barResult.errors.length > 0 ? barResult.errors.join('; ') : null,
          }).eq('id', runId);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        barResult.errors.push(msg);
        if (runId) {
          await supabase.from('sync_runs').update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: msg,
          }).eq('id', runId);
        }
      }

      results.push(barResult);
    }

    const totalCreated = results.reduce((s, r) => s + r.gm_created + r.lead_created, 0);
    const totalProjectComments = results.reduce((s, r) => s + r.project_comments_found, 0);
    const fallbackCount = results.filter(r => r.fallback_used).length;
    console.log(`Sync complete: ${totalCreated} logs created, ${totalProjectComments} project comments, ${fallbackCount} venues used fallback, across ${results.length} bars`);

    return new Response(JSON.stringify({ success: true, results, total_created: totalCreated, total_project_comments: totalProjectComments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
