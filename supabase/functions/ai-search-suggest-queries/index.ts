// ai-search-suggest-queries — admin-only.
// Generates 8-12 natural-language questions a real customer might ask an LLM
// when looking for a venue like this one. Reuses Map Pack keywords + GBP +
// review themes for grounding. Returns suggestions; does not write.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Missing bearer token' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) return json(500, { error: 'LOVABLE_API_KEY not configured' });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims } = await userClient.auth.getClaims(token);
  if (!claims?.claims?.sub) return json(401, { error: 'Invalid session' });
  const userId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (!isAdmin) return json(403, { error: 'Admin role required' });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const venueId = typeof body.venue_id === 'string' ? body.venue_id : null;
  if (!venueId) return json(400, { error: 'venue_id required' });

  const { data: venue } = await admin.from('venues')
    .select('name, address, city, state').eq('id', venueId).maybeSingle();
  if (!venue) return json(404, { error: 'Venue not found' });

  const { data: snap } = await admin.from('gbp_snapshots')
    .select('primary_category, secondary_categories, description')
    .eq('venue_id', venueId).is('fetch_error', null)
    .order('captured_at', { ascending: false }).limit(1).maybeSingle();

  const { data: kws } = await admin.from('map_pack_keywords')
    .select('id, keyword, priority').eq('venue_id', venueId).eq('is_active', true);

  const { data: themes } = await admin.from('review_themes')
    .select('theme_label').eq('venue_id', venueId).eq('theme_sentiment', 'positive')
    .order('created_at', { ascending: false }).limit(50);

  const themeLabels = [...new Set((themes ?? []).map((t: any) => t.theme_label))].slice(0, 8);
  const kwSummary = (kws ?? []).slice(0, 12).map((k: any) => `${k.keyword} (${k.priority})`).join(', ') || 'none';

  const prompt = `You are a local SEO + AI-search visibility expert. A real customer is asking ChatGPT/Claude/Gemini/Perplexity for a recommendation. Generate 8-12 natural-language questions a person in ${venue.city ?? 'the area'} might type when looking for a venue like this one.

Venue: ${venue.name}
Location: ${venue.address ?? ''}${venue.city ? `, ${venue.city}` : ''}${venue.state ? `, ${venue.state}` : ''}
GBP primary category: ${snap?.primary_category ?? 'unknown'}
Secondary categories: ${(snap?.secondary_categories ?? []).join(', ') || 'none'}
Description: ${snap?.description?.slice(0, 250) ?? 'none'}
Customers praise: ${themeLabels.join(', ') || 'unknown'}
Map Pack keywords being tracked: ${kwSummary}

Rules:
- Questions should sound like real human prompts, not search keywords.
- Mix specific intent ("best happy hour with patio in Gaslamp") with broad ("good karaoke bar near me").
- Include neighborhood/city/scene where natural.
- Mark "high" priority for the questions most directly tied to the venue's strongest offerings.
- DO NOT include the venue name in the question (we want to test discoverability).
- Set source_keyword_match to a tracked Map Pack keyword if one closely overlaps, else leave blank.
Return ONLY valid JSON.`;

  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You return only valid JSON matching the requested schema.' },
        { role: 'user', content: prompt },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'suggest_queries',
          parameters: {
            type: 'object',
            properties: {
              queries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                    rationale: { type: 'string' },
                    source_keyword_match: { type: 'string' },
                  },
                  required: ['query', 'priority'],
                },
              },
            },
            required: ['queries'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'suggest_queries' } },
    }),
  });

  if (!aiRes.ok) {
    const text = await aiRes.text();
    return json(502, { error: `AI gateway error ${aiRes.status}: ${text.slice(0, 200)}` });
  }
  const aiJson = await aiRes.json();
  const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return json(502, { error: 'AI returned no tool call' });

  let parsed: any;
  try { parsed = JSON.parse(args); } catch { return json(502, { error: 'AI returned invalid JSON' }); }

  // Map source_keyword_match (string) → keyword id
  const kwByText = new Map<string, string>();
  for (const k of (kws ?? []) as any[]) kwByText.set(String(k.keyword).toLowerCase(), k.id);

  const queries = (parsed?.queries ?? [])
    .filter((q: any) => typeof q?.query === 'string')
    .slice(0, 12)
    .map((q: any) => {
      const matchText = typeof q.source_keyword_match === 'string'
        ? q.source_keyword_match.toLowerCase().trim() : '';
      return {
        query: String(q.query).trim(),
        priority: ['high', 'medium', 'low'].includes(q.priority) ? q.priority : 'medium',
        rationale: typeof q.rationale === 'string' ? q.rationale : '',
        source_keyword_id: matchText ? (kwByText.get(matchText) ?? null) : null,
      };
    });

  return json(200, { queries, context: { tracked_keywords: kws?.length ?? 0, top_themes: themeLabels } });
});
