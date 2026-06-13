// map-pack-suggest-keywords — admin-only.
// Returns 10–15 AI-suggested keywords for a venue, leveraging GBP categories
// and review themes when present. Does not write anything.

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

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json(401, { error: 'Invalid session' });
  const userId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (!isAdmin) return json(403, { error: 'Admin role required' });

  if (!lovableKey) return json(500, { error: 'LOVABLE_API_KEY not configured' });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const venueId = typeof body.venue_id === 'string' ? body.venue_id : null;
  if (!venueId) return json(400, { error: 'venue_id required' });

  // Gather venue context
  const { data: venue } = await admin
    .from('venues')
    .select('name, address, city, state')
    .eq('id', venueId)
    .maybeSingle();
  if (!venue) return json(404, { error: 'Venue not found' });

  const { data: snap } = await admin
    .from('gbp_snapshots')
    .select('primary_category, secondary_categories, description')
    .eq('venue_id', venueId)
    .is('fetch_error', null)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: themes } = await admin
    .from('review_themes')
    .select('theme_label, theme_sentiment, confidence')
    .eq('venue_id', venueId)
    .eq('theme_sentiment', 'positive')
    .order('created_at', { ascending: false })
    .limit(50);

  // Top theme labels by frequency
  const labelCounts = new Map<string, number>();
  for (const t of themes ?? []) {
    labelCounts.set(t.theme_label, (labelCounts.get(t.theme_label) ?? 0) + 1);
  }
  const topThemes = [...labelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label]) => label);

  const prompt = `You are a local SEO expert. Suggest 10-15 high-intent local search keywords a customer in San Diego might type into Google when looking for a venue like this one.

Venue: ${venue.name}
Address: ${venue.address ?? 'unknown'}${venue.city ? `, ${venue.city}` : ''}${venue.state ? `, ${venue.state}` : ''}
Primary GBP category: ${snap?.primary_category ?? 'unknown'}
Secondary categories: ${(snap?.secondary_categories ?? []).join(', ') || 'none'}
Description: ${snap?.description?.slice(0, 300) ?? 'none'}
Customers praise these themes: ${topThemes.join(', ') || 'unknown'}

Rules:
- Keywords should be 2-5 words, conversational, what a real searcher types.
- Include neighborhood/city when relevant.
- Mix venue-type terms (e.g. "sports bar") with intent terms (e.g. "happy hour", "karaoke night", "patio bar").
- Set priority: "high" for keywords most directly tied to the venue's strongest offerings (use review themes + primary category), "medium" for adjacent terms, "low" for broader category terms.
- Return ONLY valid JSON.`;

  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You return only valid JSON matching the requested schema.' },
        { role: 'user', content: prompt },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'suggest_keywords',
          description: 'Return suggested local search keywords',
          parameters: {
            type: 'object',
            properties: {
              keywords: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    keyword: { type: 'string' },
                    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                    rationale: { type: 'string' },
                  },
                  required: ['keyword', 'priority'],
                },
              },
            },
            required: ['keywords'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'suggest_keywords' } },
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

  const keywords = (parsed?.keywords ?? [])
    .filter((k: any) => typeof k?.keyword === 'string')
    .slice(0, 15)
    .map((k: any) => ({
      keyword: String(k.keyword).trim(),
      priority: ['high', 'medium', 'low'].includes(k.priority) ? k.priority : 'medium',
      rationale: typeof k.rationale === 'string' ? k.rationale : '',
    }));

  return json(200, { keywords, context: { primary_category: snap?.primary_category ?? null, top_themes: topThemes } });
});
