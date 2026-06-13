import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-models.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CurrentMetrics {
  assigned: number;
  completed: number;
  inRed: number;
  resolutionRate: number | null; // 0-1
  onTimeRate: number | null;     // 0-1
  totalAssigned?: number | null;
  totalOutstanding?: number | null;
  completedThisWeek?: number | null;
}

interface TrendPoint {
  weekStart: string;
  resolutionRate: number | null; // 0-1
}

interface BriefRequest {
  barId: string;
  weekId: string;
  venueName?: string;
  gmName?: string;
  current: CurrentMetrics;
  previous?: { resolutionRate: number | null };
  trend4?: TrendPoint[];
  forceRegenerate?: boolean;
}

const fmtPct = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.round(v * 100)}%`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = (await req.json()) as BriefRequest;
    const { barId, weekId, venueName, gmName, current, previous, trend4, forceRegenerate } = body;

    if (!barId || !weekId || !current) {
      return new Response(JSON.stringify({ error: 'barId, weekId, current required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache hit?
    if (!forceRegenerate) {
      const { data: cached } = await supabase
        .from('task_performance_briefs')
        .select('short_brief, long_brief, generated_at')
        .eq('bar_id', barId)
        .eq('week_id', weekId)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({
            short_brief: cached.short_brief || '',
            long_brief: cached.long_brief || '',
            cached: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insufficient-data gate → empty briefs, no API call
    if (!gmName || ((current.totalAssigned ?? 0) === 0 && current.assigned === 0)) {
      await supabase.from('task_performance_briefs').upsert({
        bar_id: barId,
        week_id: weekId,
        short_brief: '',
        long_brief: '',
        generated_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ short_brief: '', long_brief: '', cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = (Deno.env.get('LOVABLE_API_KEY') || '').replace(/[^\x20-\x7E]/g, '').trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trendStr = (trend4 || [])
      .map(t => `${t.weekStart}: ${fmtPct(t.resolutionRate)}`)
      .join(' → ') || 'n/a';

    const userPrompt = `Venue: ${venueName || 'Unknown'}
GM: ${gmName}

THIS WEEK:
- Total Assigned (cumulative workload as of week end): ${current.totalAssigned ?? '—'}
- Outstanding (open backlog at week end): ${current.totalOutstanding ?? '—'}
- Completed This Week: ${current.completedThisWeek ?? '—'}
- Due This Week: ${current.assigned}
- Closed of those due: ${current.completed}
- In the Red (past-due, still open): ${current.inRed}
- Resolution Rate: ${fmtPct(current.resolutionRate)}
- On-Time Rate: ${fmtPct(current.onTimeRate)}

LAST WEEK Resolution Rate: ${fmtPct(previous?.resolutionRate)}

4-WEEK Resolution Rate trend (oldest → newest):
${trendStr}

Generate two interpretations as a trusted ops advisor speaking to Chad (the owner). Every interpretation must answer:
1. What does this data mean in plain English?
2. Is it good, neutral, or a concern?
3. What is the one specific action Chad should take?

Tone: direct, brief, specific to the actual numbers. NEVER say "Great job" or "Keep it up." Reference the GM by name. If the same insight could apply to any week, you're being too generic.

short_brief: 1-2 sentences for collapsed card view.
long_brief: 3-4 sentences for expanded view, covering trend direction and slip/improvement pattern in addition to the action.`;

    let aiJson: any;
    try {
      const r = await callAI({
        taskType: 'utility_classification',
        functionName: 'generate-task-performance-brief',
        venueId: barId,
        system: 'You write concise, data-grounded weekly task performance briefs for bar owners. Use the task_performance_brief tool to return structured output.',
        messages: [{ role: 'user', content: userPrompt }],
        gatewayExtras: {
          tools: [{
            type: 'function',
            function: {
              name: 'task_performance_brief',
              description: 'Return the two interpretation strings.',
              parameters: {
                type: 'object',
                properties: {
                  short_brief: { type: 'string', description: '1-2 sentence interpretation for collapsed card.' },
                  long_brief: { type: 'string', description: '3-4 sentence interpretation for expanded card.' },
                },
                required: ['short_brief', 'long_brief'],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'task_performance_brief' } },
        },
      });
      aiJson = r.raw;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[task-perf-brief] AI call failed: ${msg}`);
      const isBilling = /402|credit|billing|quota|exhausted/i.test(msg);
      return new Response(
        JSON.stringify({
          short_brief: '',
          long_brief: '',
          fallback: true,
          reason: isBilling ? 'BILLING_ERROR' : 'AI_UNAVAILABLE',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;
    const result = rawArgs ? (typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs) : {};
    const short_brief = (result.short_brief || '').trim();
    const long_brief = (result.long_brief || '').trim();

    await supabase.from('task_performance_briefs').upsert({
      bar_id: barId,
      week_id: weekId,
      short_brief,
      long_brief,
      generated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ short_brief, long_brief, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[task-perf-brief] error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
