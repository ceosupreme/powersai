// context-programming-suggest
// Calls Lovable AI Gateway to suggest a venue's programming context
// (primary_category, audience_demographics, programming_features, themes)
// from venue name + reviews + recent campaign titles. The user reviews and
// confirms via the admin panel before it's saved.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { venue_id } = await req.json();
    if (!venue_id) return json({ error: 'venue_id required' }, 400);

    const { data: venue, error: vErr } = await supabase
      .from('venues')
      .select('id, name, city, state')
      .eq('id', venue_id)
      .maybeSingle();
    if (vErr || !venue) return json({ error: 'venue not found' }, 404);

    const [{ data: themes }, { data: campaigns }] = await Promise.all([
      supabase.from('review_themes').select('theme_label, theme_category, theme_sentiment, excerpt')
        .eq('venue_id', venue_id).limit(40),
      supabase.from('marketing_campaigns').select('title, type, description')
        .eq('venue_id', venue_id).limit(20).order('created_at', { ascending: false }),
    ]);

    const systemPrompt = `You are a hospitality marketing analyst. Given facts about a bar/restaurant, suggest its programming profile. Be conservative — only assert things supported by evidence. Output via the suggest_programming tool.`;
    const userPrompt = `Venue: ${venue.name} (${[venue.city, venue.state].filter(Boolean).join(', ')})

Recent review themes (label / category / sentiment):
${(themes ?? []).map((t: any) => `- ${t.theme_label} / ${t.theme_category} / ${t.theme_sentiment}: ${t.excerpt ?? ''}`).slice(0, 30).join('\n') || '(none)'}

Recent campaigns:
${(campaigns ?? []).map((c: any) => `- [${c.type}] ${c.title}`).join('\n') || '(none)'}

Suggest the venue's programming profile.`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_programming',
            description: 'Programming profile suggestion',
            parameters: {
              type: 'object',
              properties: {
                primary_category: {
                  type: 'string',
                  enum: ['sports_bar','music_venue','cocktail_lounge','dive_bar','brunch_spot',
                         'neighborhood_pub','family_friendly','late_night','other'],
                },
                audience_demographics: { type: 'array', items: { type: 'string' } },
                programming_features: { type: 'array', items: { type: 'string' } },
                themes: { type: 'array', items: { type: 'string' } },
                rationale: { type: 'string' },
              },
              required: ['primary_category', 'audience_demographics', 'programming_features', 'themes', 'rationale'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_programming' } },
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      if (r.status === 429) return json({ error: 'Rate limit, try again shortly.' }, 429);
      if (r.status === 402) return json({ error: 'AI credits exhausted.' }, 402);
      console.error('[context-programming-suggest] AI error', r.status, txt);
      return json({ error: 'AI gateway error' }, 500);
    }
    const data = await r.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    if (!args) return json({ error: 'no suggestion returned' }, 500);

    // Persist as suggestion (does not auto-confirm).
    const { error: upErr } = await supabase
      .from('venue_programming_context')
      .upsert({
        venue_id,
        ai_suggested_at: new Date().toISOString(),
        ai_suggestion: args,
      }, { onConflict: 'venue_id' });
    if (upErr) console.error('[context-programming-suggest] persist error', upErr.message);

    return json({ ok: true, suggestion: args });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[context-programming-suggest]', msg);
    return json({ error: msg }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
