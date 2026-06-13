import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopOffender { name: string; count: number; breakdown: Record<string, number>; }
interface CurrentMetrics {
  activeEmployees: number;
  hoursWorked: number;
  otHours: number;
  violations: number;
  exposure: number;
  missingWageAlerts: number;
  topOffenders: TopOffender[];
}
interface TrendPoint {
  weekStart: string;
  weekLabel: string;
  breakdown: Record<string, number>;
  total: number;
}
interface BriefRequest {
  barId: string;
  weekId: string;
  venueName?: string;
  weekStart?: string;
  weekEnd?: string;
  current: CurrentMetrics;
  previous?: { violations: number };
  trend4?: TrendPoint[];
  forceRegenerate?: boolean;
}

const METRIC_LABELS: Record<string, string> = {
  late_meal: 'late meal',
  missed_meal: 'missed meal',
  overtime: 'overtime',
  multi_location: 'multi-location shift',
  no_clockout: 'no-clockout',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = (await req.json()) as BriefRequest;
    const { barId, weekId, venueName, weekStart, weekEnd, current, previous, trend4, forceRegenerate } = body;

    if (!barId || !weekId || !current) {
      return new Response(JSON.stringify({ error: 'barId, weekId, current required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache hit?
    if (!forceRegenerate) {
      const { data: cached } = await supabase
        .from('employee_performance_briefs')
        .select('short_brief, long_brief, is_quiet, generated_at')
        .eq('bar_id', barId)
        .eq('week_id', weekId)
        .maybeSingle();
      if (cached) {
        return new Response(
          JSON.stringify({
            short_brief: cached.short_brief || '',
            long_brief: cached.long_brief || '',
            is_quiet: !!cached.is_quiet,
            cached: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Quiet-week gate
    const prevOt = (previous as any)?.otHours;
    const otsBothZero = current.otHours === 0;
    const otWithin10pct = typeof prevOt === 'number'
      ? Math.abs(current.otHours - prevOt) <= Math.max(1, prevOt * 0.1)
      : true;
    const isQuiet =
      current.violations === 0 &&
      current.exposure === 0 &&
      (otsBothZero || otWithin10pct);

    if (isQuiet) {
      await supabase.from('employee_performance_briefs').upsert({
        bar_id: barId,
        week_id: weekId,
        short_brief: '',
        long_brief: '',
        is_quiet: true,
        generated_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ short_brief: '', long_brief: '', is_quiet: true, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const offendersStr = current.topOffenders.length
      ? current.topOffenders.map(o => {
          const bd = Object.entries(o.breakdown)
            .map(([k, v]) => `${v} ${METRIC_LABELS[k] || k}`)
            .join(', ');
          return `${o.name}: ${o.count} (${bd})`;
        }).join('\n')
      : 'none';

    const trendStr = (trend4 || [])
      .map(t => `${t.weekLabel}: ${t.total}`)
      .join(' → ') || 'n/a';

    const violDelta = current.violations - (previous?.violations ?? 0);

    const userPrompt = `Venue: ${venueName || 'Unknown'}
Week: ${weekStart || ''} → ${weekEnd || ''}

THIS WEEK:
- Active employees: ${current.activeEmployees}
- Hours worked: ${current.hoursWorked}
- OT hours: ${current.otHours}
- Labor compliance violations: ${current.violations}
- Premium pay exposure (missed meals × wage): $${current.exposure.toFixed(2)}
- Missed-meal alerts missing a wage on file: ${current.missingWageAlerts}

PRIOR WEEK violations: ${previous?.violations ?? 0} (delta ${violDelta >= 0 ? '+' : ''}${violDelta})

4-week violations trend (oldest → newest, weekly totals):
${trendStr}

Top offenders this week:
${offendersStr}

You are writing for Chad, the bar owner reviewing his team's labor compliance for the week.

Generate two interpretations:
1. short_brief: 1-2 sentences for the collapsed card.
2. long_brief: ~3 sentences for the expanded view.

Rules:
- Cite specific data: employee names, exact counts, dollar amounts.
- If the data points to a concrete operational lever (e.g., enforce meal-break timing on Friday closes, review schedule overlaps causing OT), name it. Otherwise say nothing prescriptive.
- Stay grounded in numbers. Do NOT speculate about employee motivation, attitude, intent, or future behavior beyond what the metrics directly show.
- NEVER use "Great job", "Keep it up", or other generic praise.
- Be direct and specific to this week's numbers — if the same sentence could apply to any week, you're being too generic.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You write concise, data-grounded labor compliance briefs for bar owners. Use the employee_performance_brief tool to return structured output.' },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'employee_performance_brief',
            description: 'Return the two interpretation strings for the Employee Performance module.',
            parameters: {
              type: 'object',
              properties: {
                short_brief: { type: 'string', description: '1-2 sentence interpretation for collapsed card.' },
                long_brief: { type: 'string', description: '~3 sentence interpretation for expanded card.' },
              },
              required: ['short_brief', 'long_brief'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'employee_performance_brief' } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error(`[emp-perf-brief] AI gateway error ${aiResp.status}: ${errText}`);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add funds in Settings → Workspace → Usage.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI generation failed', detail: errText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;
    const result = rawArgs ? (typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs) : {};
    const short_brief = (result.short_brief || '').trim();
    const long_brief = (result.long_brief || '').trim();

    await supabase.from('employee_performance_briefs').upsert({
      bar_id: barId,
      week_id: weekId,
      short_brief,
      long_brief,
      is_quiet: false,
      generated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ short_brief, long_brief, is_quiet: false, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[emp-perf-brief] error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
