// extract-review-themes
// Reads google_reviews rows that have not yet been processed (no row in
// review_extraction_runs) and asks Lovable AI to extract normalized themes
// per review. Persists structured rows in review_themes.
//
// Cadence: daily 06:45 PT (after sync-google-ratings @ 06:30).
// Cost: tens of reviews × small prompts on gemini-3-flash-preview ≈ pennies.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'google/gemini-3-flash-preview';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const BATCH_SIZE = 25;
const MIN_TEXT_LEN = 12;

const ALLOWED_CATEGORIES = [
  'food', 'drinks', 'service', 'atmosphere', 'event', 'menu_item',
  'staff', 'value', 'cleanliness', 'safety', 'other',
];
const ALLOWED_SENTIMENTS = ['positive', 'negative', 'neutral'];
const ALLOWED_CONFIDENCE = ['high', 'medium', 'low'];

const SYSTEM_PROMPT = `You extract structured themes from individual customer reviews of a bar/restaurant.

For each review, return:
- themes: array of distinct topics the review touches on
  - label: SHORT canonical lower_snake_case (e.g. "slow_service", "friendly_staff", "wings", "cocktails", "karaoke", "live_music", "happy_hour", "late_night_atmosphere", "dirty_bathroom", "loud_music", "great_view", "long_wait", "overpriced"). Normalize variants — "slow service", "slow servers", "service was slow", "took forever" all collapse to slow_service.
  - category: one of ${ALLOWED_CATEGORIES.join(', ')}
  - sentiment: positive | negative | neutral (specific to this theme in this review)
  - context: optional short tag for timing or scope (e.g. "late_night", "weekend", "friday", "happy_hour", "lunch"). Omit if absent.
  - excerpt: a short anonymized fragment (≤100 chars) from the review supporting this theme. Strip names of people/staff.
- overall_sentiment: positive | negative | neutral for the review as a whole.
- confidence: high | medium | low — low if the review is terse, sarcastic, ambiguous, or non-English.

RULES:
- Use canonical labels consistently — same concept, same label across reviews.
- Do not invent details not present in the review. Excerpts must be substrings of the review text (paraphrase only to anonymize).
- If a review touches multiple themes with different sentiments, emit one theme per topic.
- Skip reviews with no extractable theme: return empty themes array and confidence "low".`;

const TOOL = {
  type: 'function',
  function: {
    name: 'submit_review_themes',
    description: 'Submit extracted themes for each review.',
    parameters: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              review_id: { type: 'string' },
              overall_sentiment: { type: 'string', enum: ALLOWED_SENTIMENTS },
              confidence: { type: 'string', enum: ALLOWED_CONFIDENCE },
              themes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    category: { type: 'string', enum: ALLOWED_CATEGORIES },
                    sentiment: { type: 'string', enum: ALLOWED_SENTIMENTS },
                    context: { type: 'string' },
                    excerpt: { type: 'string' },
                  },
                  required: ['label', 'category', 'sentiment'],
                  additionalProperties: false,
                },
              },
            },
            required: ['review_id', 'overall_sentiment', 'confidence', 'themes'],
            additionalProperties: false,
          },
        },
      },
      required: ['results'],
      additionalProperties: false,
    },
  },
};

function normalizeLabel(s: string): string {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: Record<string, unknown> = {};
  try { if (req.method === 'POST') body = await req.json(); } catch { /* noop */ }
  const venueFilter = (body.venue_id as string | undefined) ?? null;
  const force = body.force === true;

  // Pull venues to iterate.
  const { data: venues, error: venueErr } = await supabase
    .from('venues')
    .select('id, name')
    .eq('is_active', true);
  if (venueErr) {
    return new Response(JSON.stringify({ error: venueErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const targets = (venues ?? []).filter((v) => !venueFilter || v.id === venueFilter);
  const summary: Array<Record<string, unknown>> = [];

  for (const venue of targets) {
    try {
      // Reviews with text.
      const { data: reviews, error: rErr } = await supabase
        .from('google_reviews')
        .select('id, review_text, rating, publish_time')
        .eq('bar_id', venue.id)
        .not('review_text', 'is', null);
      if (rErr) throw rErr;

      const candidate = (reviews ?? []).filter(
        (r) => (r.review_text ?? '').trim().length >= MIN_TEXT_LEN,
      );
      if (candidate.length === 0) {
        summary.push({ venue: venue.name, processed: 0, themes: 0, note: 'no reviews with text' });
        continue;
      }

      // Skip reviews already processed unless force=true.
      let toProcess = candidate;
      if (!force) {
        const ids = candidate.map((r) => r.id);
        const { data: doneRows } = await supabase
          .from('review_extraction_runs')
          .select('review_id')
          .in('review_id', ids);
        const done = new Set((doneRows ?? []).map((r) => r.review_id));
        toProcess = candidate.filter((r) => !done.has(r.id));
      }
      if (toProcess.length === 0) {
        summary.push({ venue: venue.name, processed: 0, themes: 0, note: 'all caught up' });
        continue;
      }

      let totalThemes = 0;
      let totalProcessed = 0;
      const errors: string[] = [];

      for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
        const batch = toProcess.slice(i, i + BATCH_SIZE);
        const userMsg = JSON.stringify({
          reviews: batch.map((r) => ({
            review_id: r.id,
            rating: r.rating,
            text: (r.review_text ?? '').slice(0, 1500),
          })),
        });

        let parsed: any | null = null;
        let aiError: string | null = null;
        try {
          const resp = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: MODEL,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMsg },
              ],
              tools: [TOOL],
              tool_choice: { type: 'function', function: { name: 'submit_review_themes' } },
            }),
          });
          if (!resp.ok) {
            aiError = `gateway ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
          } else {
            const data = await resp.json();
            const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
            if (args) parsed = JSON.parse(args);
          }
        } catch (e) {
          aiError = e instanceof Error ? e.message : String(e);
        }

        const resultsByReviewId = new Map<string, any>();
        if (parsed?.results) {
          for (const r of parsed.results) resultsByReviewId.set(r.review_id, r);
        }

        for (const rev of batch) {
          const out = resultsByReviewId.get(rev.id);
          if (aiError || !out) {
            await supabase.from('review_extraction_runs').upsert({
              review_id: rev.id, venue_id: venue.id, model: MODEL,
              ok: false, error: aiError ?? 'no_result_for_review',
            });
            continue;
          }

          const themeRows: Array<Record<string, unknown>> = [];
          const seen = new Set<string>();
          for (const t of (out.themes ?? [])) {
            const label = normalizeLabel(t.label ?? '');
            if (!label || seen.has(label)) continue;
            seen.add(label);
            const cat = ALLOWED_CATEGORIES.includes(t.category) ? t.category : 'other';
            const sent = ALLOWED_SENTIMENTS.includes(t.sentiment) ? t.sentiment : 'neutral';
            themeRows.push({
              review_id: rev.id,
              venue_id: venue.id,
              theme_label: label,
              theme_category: cat,
              theme_sentiment: sent,
              context: t.context ? String(t.context).slice(0, 60) : null,
              excerpt: t.excerpt ? String(t.excerpt).slice(0, 240) : null,
              confidence: ALLOWED_CONFIDENCE.includes(out.confidence) ? out.confidence : 'medium',
            });
          }

          if (themeRows.length > 0) {
            const { error: insErr } = await supabase
              .from('review_themes')
              .upsert(themeRows, { onConflict: 'review_id,theme_label', ignoreDuplicates: true });
            if (insErr) errors.push(`review ${rev.id}: ${insErr.message}`);
            else totalThemes += themeRows.length;
          }

          await supabase.from('review_extraction_runs').upsert({
            review_id: rev.id, venue_id: venue.id, model: MODEL, ok: true, error: null,
          });
          totalProcessed++;
        }
      }

      summary.push({
        venue: venue.name,
        processed: totalProcessed,
        themes: totalThemes,
        errors: errors.length ? errors.slice(0, 5) : undefined,
      });
    } catch (e) {
      summary.push({
        venue: venue.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, summary }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
