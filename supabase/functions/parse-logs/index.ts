import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI as sharedCallAI } from "../_shared/ai-models.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GM_SYSTEM_PROMPT = `You are parsing a restaurant GM's daily log. Extract structured data from conversational text.

The log may contain these sections:
- BASIC INFO: Date, GM on Duty, Opening/Closing Manager, Expected Close Time
- OPERATIONS: Shift Summary, Pacing (Slow/Steady/Busy/Slammed), Staffing issues, Guest vibe (Good/Mixed/Problematic), Team Energy (High/Medium/Low)
- STAFF: Highlights (who did well), Coaching/Corrections needed, Training Needs
- INVENTORY: 86'd Items, Low Stock Watchlist, Prep Issues, Waste/Comps notes
- MAINTENANCE: Broken Items, New Problems, Cleanliness notes, Safety Concerns
- GUEST: Complaints (with resolutions), Compliments, VIPs/Regulars spotted

Many logs are conversational and informal. Extract what you can find. Use null for fields not mentioned.

The log may be written in English or Spanish. Extract structured fields the same way regardless of language. Keep extracted text in its original language (do not translate); the JSON keys remain as defined.

Return ONLY valid JSON with these fields:
{
  "date": "YYYY-MM-DD or null",
  "gm_on_duty": "string or null",
  "opening_manager": "string or null",
  "closing_manager": "string or null",
  "expected_close_time": "string or null",
  "overall_shift_summary": "string or null - brief summary of the shift",
  "pacing": "Slow|Steady|Busy|Slammed or null",
  "staffing_issues": "string or null",
  "guest_vibe": "Good|Mixed|Problematic or null",
  "team_energy": "High|Medium|Low or null",
  "cleanliness_notes": "string or null",
  "prep_issues": "string or null",
  "waste_comps": "string or null",
  "staff_highlights": [{"employee": "name", "note": "what they did well"}],
  "coaching_corrections": [{"employee": "name", "note": "what needs improvement"}],
  "training_needs": [{"employee": "name", "skill": "what they need training on"}],
  "items_86d": ["item1", "item2"],
  "low_stock_watchlist": ["item1", "item2"],
  "broken_items": [{"item": "what", "notes": "details"}],
  "safety_concerns": ["concern1"],
  "new_problems": ["problem1"],
  "guest_complaints": [{"issue": "what happened", "resolution": "how it was resolved"}],
  "guest_compliments": [{"note": "what the guest said or complimented"}],
  "vips_regulars": [{"name": "who", "notes": "details"}]
}

Return empty arrays [] for list fields with no data. Return null for string fields with no data.`;

const LEAD_SYSTEM_PROMPT = `You are parsing a restaurant shift lead's daily log. Extract structured data from conversational text.

The log typically answers these questions:
- Date and shift (AM or PM)
- Any cleaning issues?
- How was business flow?
- Any Toast/computer issues?
- Staffing levels - were we properly staffed?
- Any customer issues?
- Did you meet any new customers?
- Anything to make us better?
- Are we out of anything?
- Shoutouts for team members

Some logs include numerical ratings (1-10 scale) for:
- FOH (Front of House)
- BOH (Back of House)
- Product quality
- Hospitality

Many logs are conversational and informal. Extract what you can find. Use null for fields not mentioned.

The log may be written in English or Spanish. Extract structured fields the same way regardless of language. Keep extracted text in its original language (do not translate); the JSON keys remain as defined.

Return ONLY valid JSON with these fields:
{
  "date": "YYYY-MM-DD or null",
  "shift": "AM|PM - determine from content or time context",
  "cleaning_issues": "string or null",
  "business_flow": "string or null - how busy/slow it was",
  "toast_computer_issues": "string or null",
  "staffing_levels": "string or null",
  "customer_issues": "string or null",
  "improvement_suggestions": "string or null",
  "new_customers": [{"name": "string", "notes": "string"}],
  "items_out": ["item1", "item2"],
  "shoutouts": [{"employee": "name", "reason": "why"}],
  "issues": [{"description": "what happened", "severity": "High|Medium|Low"}],
  "foh_rating": "number 1-10 or null",
  "boh_rating": "number 1-10 or null",
  "product_rating": "number 1-10 or null",
  "hospitality_rating": "number 1-10 or null"
}

Return empty arrays [] for list fields with no data. Return null for string fields with no data.
For ratings, return the number as an integer, or null if not provided.`;

// ── Junk Content Pre-filter ──────────────────────────────────────────────────

function isJunkContent(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Skipped: empty content';

  // Strip URLs
  const withoutUrls = trimmed.replace(/https?:\/\/\S+/gi, '').trim();

  // If nothing meaningful remains after removing URLs
  if (withoutUrls.length === 0) return 'Skipped: URL-only content, not a log entry';
  if (withoutUrls.length < 30) return 'Skipped: content too short after removing URLs';

  // Raw text too short overall (even without URLs)
  if (trimmed.length < 40) return 'Skipped: content too short to be a valid daily log';

  // Short conversational replies that aren't structured logs (< 100 chars after URL removal)
  // Real logs contain dates, ratings, structured questions, or multiple lines
  if (withoutUrls.length < 100) {
    const hasLogIndicators = /\b(date|fecha|shift|turno|cleaning|limpieza|business flow|staffing|personal|rating|calificaci[oó]n|foh|boh|shoutout|reconocimiento|86|items out|sin stock|agotado)\b/i.test(withoutUrls);
    const hasStructure = (withoutUrls.match(/\n/g) || []).length >= 3;
    const hasRatings = /\b\d+\s*\/\s*10\b/.test(withoutUrls);
    if (!hasLogIndicators && !hasStructure && !hasRatings) {
      return 'Skipped: short conversational content, not a structured log';
    }
  }

  return null;
}

// ── AI Call ───────────────────────────────────────────────────────────────────

async function callAI(systemPrompt: string, userContent: string, _apiKey: string): Promise<Record<string, unknown>> {
  let r;
  try {
    r = await sharedCallAI({
      taskType: 'utility_parsing',
      functionName: 'parse-logs',
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      // 8192 comfortably fits the longest observed logs (~7.5KB raw → ~3-4k
      // output tokens with all list fields populated). Default 4096 truncated
      // mid-JSON on long logs, producing unrecoverable parse errors.
      maxTokens: 8192,
      gatewayExtras: { response_format: { type: 'json_object' } },
    });
  } catch (e) {
    // Treat any JSON-parse error from the provider response envelope as a
    // permanent parse failure so the log is marked rather than re-looped.
    const msg = (e as Error).message || 'Unknown AI error';
    if (msg.includes('JSON') || msg.includes('Unexpected')) {
      throw new Error(`No JSON object found in AI response: provider envelope parse failed: ${msg}`);
    }
    throw e;
  }
  const content = r.text;
  if (!content) throw new Error('No content in AI response');

  // Strip markdown code fences if present
  let jsonStr = String(content).trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }


  // Resilient JSON extraction — first success wins.
  // 1) parse as-is
  try { return JSON.parse(jsonStr); } catch (e) {
    console.warn(`[parse-logs] step1 failed (len=${jsonStr.length}):`, (e as Error).message, '| head=', jsonStr.substring(0, 120), '| tail=', jsonStr.substring(Math.max(0, jsonStr.length - 120)));
  }

  // 2) extract first balanced JSON object (handles trailing text / second object)
  const balanced = findFirstBalancedObject(jsonStr);
  if (balanced) {
    try { return JSON.parse(balanced); } catch (e) {
      console.warn(`[parse-logs] step2 failed (balLen=${balanced.length}):`, (e as Error).message);
    }
  } else {
    console.warn('[parse-logs] step2: no balanced object found');
  }

  // 3) doubled-quote normalization on best candidate (handles `{""k"": ""v""}`)
  const candidate = balanced ?? jsonStr;
  try { return JSON.parse(candidate.replace(/""/g, '"')); } catch (e) {
    console.warn('[parse-logs] step3 failed:', (e as Error).message);
  }

  // 4) preserve permanent-failure sentinel for parseGmLog/parseLeadLog isPermanent
  throw new Error(`No JSON object found in AI response: ${jsonStr.substring(0, 200)}`);
}

/**
 * Scan from the first `{`, walking brace depth while respecting string
 * literals and backslash escapes. Returns the slice from that `{` to its
 * matching `}`, or null if no balanced object is found.
 */
function findFirstBalancedObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = false; }
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

// ── Parse GM Log ─────────────────────────────────────────────────────────────

async function parseGmLog(
  supabase: any,
  apiKey: string,
  logId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: log, error: fetchErr } = await supabase
    .from('gm_logs')
    .select('id, raw_text, is_parsed')
    .eq('id', logId)
    .single();

  if (fetchErr || !log) return { success: false, error: `Log not found: ${fetchErr?.message}` };
  if (!log.raw_text) return { success: false, error: 'No raw_text to parse' };
  if (log.is_parsed) return { success: true }; // already done

  const skipReason = isJunkContent(log.raw_text);
  if (skipReason) {
    await supabase.from('gm_logs').update({
      is_parsed: true,
      parse_error: skipReason,
    }).eq('id', logId);
    return { success: true };
  }

  try {
    const parsed = await callAI(GM_SYSTEM_PROMPT, log.raw_text, apiKey);

    const { error: updateErr } = await supabase.from('gm_logs').update({
      gm_on_duty: parsed.gm_on_duty ?? null,
      opening_manager: parsed.opening_manager ?? null,
      closing_manager: parsed.closing_manager ?? null,
      expected_close_time: parsed.expected_close_time ?? null,
      overall_shift_summary: parsed.overall_shift_summary ?? null,
      pacing: parsed.pacing ?? null,
      staffing_issues: parsed.staffing_issues ?? null,
      guest_vibe: parsed.guest_vibe ?? null,
      team_energy: parsed.team_energy ?? null,
      cleanliness_notes: parsed.cleanliness_notes ?? null,
      prep_issues: parsed.prep_issues ?? null,
      waste_comps: parsed.waste_comps ?? null,
      staff_highlights: parsed.staff_highlights ?? [],
      coaching_corrections: parsed.coaching_corrections ?? [],
      training_needs: parsed.training_needs ?? [],
      items_86d: parsed.items_86d ?? [],
      low_stock_watchlist: parsed.low_stock_watchlist ?? [],
      broken_items: parsed.broken_items ?? [],
      safety_concerns: parsed.safety_concerns ?? [],
      new_problems: parsed.new_problems ?? [],
      guest_complaints: parsed.guest_complaints ?? [],
      guest_compliments: parsed.guest_compliments ?? [],
      vips_regulars: parsed.vips_regulars ?? [],
      is_parsed: true,
      parsed_at: new Date().toISOString(),
      parse_error: null,
    }).eq('id', logId);

    if (updateErr) return { success: false, error: `DB update failed: ${updateErr.message}` };
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown parse error';
    const isPermanent = msg.includes('No JSON object found');
    await supabase.from('gm_logs').update({
      parse_error: msg,
      ...(isPermanent ? { is_parsed: true } : {}),
    }).eq('id', logId);
    return { success: false, error: msg };
  }
}

// ── Parse Lead Log ───────────────────────────────────────────────────────────

async function parseLeadLog(
  supabase: any,
  apiKey: string,
  logId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: log, error: fetchErr } = await supabase
    .from('lead_logs')
    .select('id, raw_text, is_parsed')
    .eq('id', logId)
    .single();

  if (fetchErr || !log) return { success: false, error: `Log not found: ${fetchErr?.message}` };
  if (!log.raw_text) return { success: false, error: 'No raw_text to parse' };
  if (log.is_parsed) return { success: true };

  const skipReason = isJunkContent(log.raw_text);
  if (skipReason) {
    await supabase.from('lead_logs').update({
      is_parsed: true,
      parse_error: skipReason,
    }).eq('id', logId);
    return { success: true };
  }

  try {
    const parsed = await callAI(LEAD_SYSTEM_PROMPT, log.raw_text, apiKey);

    const { error: updateErr } = await supabase.from('lead_logs').update({
      shift: parsed.shift ?? null,
      cleaning_issues: parsed.cleaning_issues ?? null,
      business_flow: parsed.business_flow ?? null,
      toast_computer_issues: parsed.toast_computer_issues ?? null,
      staffing_levels: parsed.staffing_levels ?? null,
      customer_issues: parsed.customer_issues ?? null,
      improvement_suggestions: parsed.improvement_suggestions ?? null,
      new_customers: parsed.new_customers ?? [],
      items_out: parsed.items_out ?? [],
      shoutouts: parsed.shoutouts ?? [],
      issues: parsed.issues ?? [],
      is_parsed: true,
      parsed_at: new Date().toISOString(),
      parse_error: null,
    }).eq('id', logId);

    if (updateErr) return { success: false, error: `DB update failed: ${updateErr.message}` };
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown parse error';
    const isPermanent = msg.includes('No JSON object found');
    await supabase.from('lead_logs').update({
      parse_error: msg,
      ...(isPermanent ? { is_parsed: true } : {}),
    }).eq('id', logId);
    return { success: false, error: msg };
  }
}

// ── Parse All Unparsed ───────────────────────────────────────────────────────

async function parseAll(
  supabase: any,
  apiKey: string,
  barId?: string,
  limit?: number,
): Promise<{ gm_parsed: number; lead_parsed: number; gm_errors: number; lead_errors: number; gm_remaining: number; lead_remaining: number; errors: string[] }> {
  const result = { gm_parsed: 0, lead_parsed: 0, gm_errors: 0, lead_errors: 0, gm_remaining: 0, lead_remaining: 0, errors: [] as string[] };
  const batchLimit = limit || 10; // Default to 10 per batch to avoid timeouts

  // Fetch unparsed GM logs
  let gmQuery = supabase.from('gm_logs').select('id').eq('is_parsed', false).limit(batchLimit);
  if (barId) gmQuery = gmQuery.eq('bar_id', barId);
  const { data: gmLogs } = await gmQuery;

  // Fetch unparsed Lead logs
  let leadQuery = supabase.from('lead_logs').select('id').eq('is_parsed', false).limit(batchLimit);
  if (barId) leadQuery = leadQuery.eq('bar_id', barId);
  const { data: leadLogs } = await leadQuery;

  // We need a bar_id for sync_runs - use the provided one or query the first bar
  let syncBarId = barId;
  if (!syncBarId) {
    const { data: firstBar } = await supabase.from('venues').select('id').eq('is_active', true).limit(1).single();
    syncBarId = firstBar?.id;
  }

  // Create sync_run
  let runId: string | null = null;
  if (syncBarId) {
    const { data: runRow } = await supabase.from('sync_runs').insert({
      bar_id: syncBarId,
      sync_type: 'ai_parse',
      status: 'running',
    }).select('id').single();
    runId = runRow?.id ?? null;
  }

  // Parse GM logs sequentially
  for (const log of (gmLogs || [])) {
    const res = await parseGmLog(supabase, apiKey, log.id);
    if (res.success) {
      result.gm_parsed++;
    } else {
      result.gm_errors++;
      result.errors.push(`gm/${log.id}: ${res.error}`);
    }
  }

  // Parse Lead logs sequentially
  for (const log of (leadLogs || [])) {
    const res = await parseLeadLog(supabase, apiKey, log.id);
    if (res.success) {
      result.lead_parsed++;
    } else {
      result.lead_errors++;
      result.errors.push(`lead/${log.id}: ${res.error}`);
    }
  }

  // Count remaining unparsed
  const [{ count: gmRemaining }, { count: leadRemaining }] = await Promise.all([
    supabase.from('gm_logs').select('id', { count: 'exact', head: true }).eq('is_parsed', false),
    supabase.from('lead_logs').select('id', { count: 'exact', head: true }).eq('is_parsed', false),
  ]);
  result.gm_remaining = gmRemaining || 0;
  result.lead_remaining = leadRemaining || 0;

  // Update sync_run
  if (runId) {
    const totalParsed = result.gm_parsed + result.lead_parsed;
    const totalErrors = result.gm_errors + result.lead_errors;
    await supabase.from('sync_runs').update({
      status: totalErrors > 0 ? (totalParsed > 0 ? 'partial' : 'failed') : 'success',
      completed_at: new Date().toISOString(),
      records_processed: (gmLogs?.length || 0) + (leadLogs?.length || 0),
      records_updated: totalParsed,
      error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
    }).eq('id', runId);
  }

  return result;
}

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { action, log_id, bar_id } = body;

    let result: unknown;

    switch (action) {
      case 'parse_gm':
        if (!log_id) throw new Error('log_id required for parse_gm');
        result = await parseGmLog(supabase, apiKey, log_id);
        break;

      case 'parse_lead':
        if (!log_id) throw new Error('log_id required for parse_lead');
        result = await parseLeadLog(supabase, apiKey, log_id);
        break;

      case 'parse_all':
        result = await parseAll(supabase, apiKey, bar_id, body.limit);
        break;

      default:
        throw new Error(`Unknown action: ${action}. Use parse_gm, parse_lead, or parse_all`);
    }

    console.log(`parse-logs [${action}] complete:`, JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('parse-logs error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
