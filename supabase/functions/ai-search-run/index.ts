// ai-search-run — query each enabled engine (ChatGPT, Claude, Gemini,
// Perplexity) for active queries and persist a snapshot per (engine, query).
// Used by the weekly cron and the admin "Trigger Now" button.
//
// Body: { venue_id?, query_id?, trigger_source?: 'cron'|'manual'|'admin' }
// Manual triggers go through a 1h-per-venue rate limit.
//
// Engine model pinning (bump quarterly for trend continuity):
//   chatgpt    -> openai/gpt-5-mini       (via Lovable AI Gateway)
//   claude     -> claude-haiku-4-20250101 (direct Anthropic API)
//   gemini     -> google/gemini-2.5-flash (via Lovable AI Gateway)
//   perplexity -> sonar                   (direct Perplexity API; OPTIONAL)
//
// Perplexity skips cleanly when PERPLEXITY_API_KEY is missing — the snapshot
// is recorded with detection_method='engine_skipped' so trends stay aligned.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { heuristicDetect, aiVerifyMention } from '../_shared/aiSearchMentionDetect.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PER_QUERY_DELAY_MS = 1500;
const PER_VENUE_DELAY_MS = 20_000;
const MANUAL_RATE_LIMIT_MS = 60 * 60 * 1000;
const MAX_AI_VERIFY_PER_VENUE = 20;

const MODELS = {
  chatgpt: 'openai/gpt-5-mini',
  claude: 'claude-haiku-4-20250101',
  gemini: 'google/gemini-2.5-flash',
  perplexity: 'sonar',
} as const;

type Engine = keyof typeof MODELS;

const SYSTEM_PROMPT =
  'You are a helpful local recommendations assistant. When asked for venue suggestions, list 5-8 specific named places as a numbered list. Include each name on its own line. Be concrete; no generic advice.';

async function callOpenAIGateway(lovableKey: string, model: string, query: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { text: '', error: `${res.status}: ${t.slice(0, 200)}` };
    }
    const j = await res.json();
    return { text: j?.choices?.[0]?.message?.content ?? '' };
  } catch (e) {
    return { text: '', error: e instanceof Error ? e.message : String(e) };
  }
}

async function callClaude(apiKey: string, model: string, query: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: query }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { text: '', error: `${res.status}: ${t.slice(0, 200)}` };
    }
    const j = await res.json();
    const text = (j?.content ?? []).map((c: any) => c?.text ?? '').join('\n');
    return { text };
  } catch (e) {
    return { text: '', error: e instanceof Error ? e.message : String(e) };
  }
}

async function callPerplexity(apiKey: string, model: string, query: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { text: '', error: `${res.status}: ${t.slice(0, 200)}` };
    }
    const j = await res.json();
    return { text: j?.choices?.[0]?.message?.content ?? '' };
  } catch (e) {
    return { text: '', error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const lovableKey = (Deno.env.get('LOVABLE_API_KEY') || '').trim();
  const anthropicKey = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
  const perplexityKey = (Deno.env.get('PERPLEXITY_API_KEY') || '').trim();

  if (!lovableKey) return json(500, { error: 'LOVABLE_API_KEY not configured' });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const venueId: string | null = typeof body.venue_id === 'string' ? body.venue_id : null;
  const queryId: string | null = typeof body.query_id === 'string' ? body.query_id : null;
  const triggerSource: string =
    body.trigger_source === 'cron' ? 'cron'
    : body.trigger_source === 'admin' ? 'admin'
    : 'manual';

  let userId: string | null = null;
  if (triggerSource !== 'cron') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Missing bearer token' });
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims } = await userClient.auth.getClaims(token);
    userId = (claims?.claims?.sub as string) ?? null;
    if (!userId) return json(401, { error: 'Invalid session' });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  if (userId) {
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json(403, { error: 'Admin role required' });
  }

  // Manual rate limit per venue
  if (triggerSource === 'manual' && venueId) {
    const { data: trig } = await admin.from('ai_search_trigger_log')
      .select('last_triggered_at').eq('venue_id', venueId).maybeSingle();
    if (trig?.last_triggered_at) {
      const elapsed = Date.now() - Date.parse(trig.last_triggered_at);
      if (elapsed < MANUAL_RATE_LIMIT_MS) {
        const minsLeft = Math.ceil((MANUAL_RATE_LIMIT_MS - elapsed) / 60_000);
        return json(429, {
          error: `Rate limited. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.`,
          retry_after_minutes: minsLeft,
        });
      }
    }
    await admin.from('ai_search_trigger_log').upsert({
      venue_id: venueId,
      last_triggered_at: new Date().toISOString(),
      triggered_by: userId,
    }, { onConflict: 'venue_id' });
  }

  // Build venue list
  const venueQuery = admin.from('venues').select('id, name, city');
  const { data: allVenues, error: vErr } = venueId
    ? await venueQuery.eq('id', venueId)
    : await venueQuery.eq('is_active', true);
  if (vErr) return json(500, { error: vErr.message });

  // Active queries
  const qBase = admin.from('ai_search_queries')
    .select('id, venue_id, query, priority, consecutive_failures').eq('is_active', true);
  if (queryId) qBase.eq('id', queryId);
  else if (venueId) qBase.eq('venue_id', venueId);
  const { data: queryRows, error: qErr } = await qBase;
  if (qErr) return json(500, { error: qErr.message });

  const venuesById = new Map<string, { id: string; name: string; city: string | null }>();
  for (const v of (allVenues ?? []) as any[]) venuesById.set(v.id, v);

  const byVenue = new Map<string, any[]>();
  for (const q of (queryRows ?? []) as any[]) {
    if (!venuesById.has(q.venue_id)) continue;
    if (!byVenue.has(q.venue_id)) byVenue.set(q.venue_id, []);
    byVenue.get(q.venue_id)!.push(q);
  }

  const enabledEngines: Engine[] = ['chatgpt', 'claude', 'gemini'];
  if (perplexityKey) enabledEngines.push('perplexity');

  const { data: runRow } = await admin.from('ai_search_run_log')
    .insert({ trigger_source: triggerSource }).select('id').single();
  const runId = runRow?.id;

  let venuesProcessed = 0;
  let queriesTested = 0;
  let mentionsFound = 0;
  const errors: Array<{ venue_id: string; query: string; engine: string; error: string }> = [];

  let venueIdx = 0;
  for (const [vid, qs] of byVenue) {
    const venue = venuesById.get(vid)!;
    if (venueIdx > 0) await sleep(PER_VENUE_DELAY_MS);
    venueIdx++;
    venuesProcessed++;
    let aiVerifyBudget = MAX_AI_VERIFY_PER_VENUE;

    let qIdx = 0;
    for (const q of qs) {
      if (qIdx > 0) await sleep(PER_QUERY_DELAY_MS);
      qIdx++;

      let engineFailures = 0;
      for (const engine of (['chatgpt', 'claude', 'gemini', 'perplexity'] as Engine[])) {
        const enabled = enabledEngines.includes(engine);
        const model = MODELS[engine];

        // Skip Perplexity cleanly when key missing
        if (!enabled) {
          await admin.from('ai_search_snapshots').insert({
            venue_id: vid, query_id: q.id, query: q.query,
            engine, model, mentioned: null, position: null,
            top_competitors: [], response_excerpt: null,
            detection_method: 'engine_skipped',
            query_error: 'API key not configured',
          });
          continue;
        }

        queriesTested++;
        let result: { text: string; error?: string };
        if (engine === 'chatgpt' || engine === 'gemini') {
          result = await callOpenAIGateway(lovableKey, model, q.query);
        } else if (engine === 'claude') {
          result = await callClaude(anthropicKey, model, q.query);
        } else {
          result = await callPerplexity(perplexityKey, model, q.query);
        }

        if (result.error) {
          engineFailures++;
          errors.push({ venue_id: vid, query: q.query, engine, error: result.error });
          await admin.from('ai_search_snapshots').insert({
            venue_id: vid, query_id: q.id, query: q.query, engine, model,
            mentioned: null, position: null, top_competitors: [],
            response_excerpt: null, detection_method: null,
            query_error: result.error,
          });
          continue;
        }

        // Pass 1
        const heur = heuristicDetect(result.text, venue.name);
        let mentioned = heur.matched;
        let position = heur.position;
        let detectionMethod: string = 'heuristic';

        // Pass 2 (only when ambiguous and budget remaining)
        if (!heur.matched && heur.ambiguous) {
          if (aiVerifyBudget > 0) {
            aiVerifyBudget--;
            const verified = await aiVerifyMention({
              lovableKey, venueName: venue.name, city: venue.city,
              responseText: result.text,
            });
            if (verified) {
              mentioned = verified.mentioned;
              position = verified.position ?? position;
              detectionMethod = 'ai_verified';
            } else {
              detectionMethod = 'verification_skipped';
            }
          } else {
            detectionMethod = 'verification_skipped';
          }
        }

        if (mentioned) mentionsFound++;

        await admin.from('ai_search_snapshots').insert({
          venue_id: vid, query_id: q.id, query: q.query, engine, model,
          mentioned, position,
          top_competitors: heur.competitors,
          response_excerpt: result.text.slice(0, 1500),
          detection_method: detectionMethod,
          query_error: null,
        });
      }

      await admin.from('ai_search_queries').update({
        last_checked_at: new Date().toISOString(),
        consecutive_failures: engineFailures > 0 && engineFailures === enabledEngines.length
          ? q.consecutive_failures + 1 : 0,
      }).eq('id', q.id);
    }
  }

  if (runId) {
    await admin.from('ai_search_run_log').update({
      finished_at: new Date().toISOString(),
      venues_processed: venuesProcessed,
      queries_tested: queriesTested,
      mentions_found: mentionsFound,
      errors,
    }).eq('id', runId);
  }

  return json(200, {
    ok: true,
    venues_processed: venuesProcessed,
    queries_tested: queriesTested,
    mentions_found: mentionsFound,
    engines_active: enabledEngines,
    perplexity_skipped: !perplexityKey,
    errors,
  });
});
