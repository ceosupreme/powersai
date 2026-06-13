// ============================================================================
// ask-barpulse — global tool-aware assistant.
//
// Venue scope comes from the UI toggler (`context.bar_id`) OR a venue
// explicitly mentioned in the question (overrides toggler). Date is NOT
// constrained by the toggler — the model resolves it from the question via
// data tools. Shared registry from _shared/ai-tools.ts (same one
// insight-deep-dive uses). No more eager fetchDynamicContext.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIStream, type Message } from "../_shared/ai-models.ts";
import { buildTools, type ToolScope } from "../_shared/ai-tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAuth(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, email: user.email };
}

function detectVenueMention(question: string, venues: any[]): any | null {
  const q = question.toLowerCase();
  const sorted = [...venues].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
  for (const v of sorted) {
    if (v.name && q.includes(v.name.toLowerCase())) return v;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, context, messages: history } = await req.json();
    if (!question || typeof question !== "string" || question.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const defaultBarId: string | null = context?.bar_id || context?.barId || null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: allVenues } = await supabase.from("venues").select("id, name, bar_code");
    const venues = allVenues || [];

    const mentioned = detectVenueMention(question, venues);
    let venueId: string;
    let venueName: string;
    let barCode: string | null;
    if (mentioned) {
      venueId = mentioned.id;
      venueName = mentioned.name;
      barCode = mentioned.bar_code || null;
    } else if (defaultBarId) {
      const v = venues.find((x: any) => x.id === defaultBarId);
      venueId = defaultBarId;
      venueName = v?.name || "Unknown";
      barCode = v?.bar_code || null;
    } else {
      return new Response(JSON.stringify({ error: "No venue context. Please select a venue." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scope: ToolScope = { venueId, barCode, venueName };
    const tools = buildTools(supabase, scope);

    const today = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayStr = `${today.toISOString().split("T")[0]} (${dayNames[today.getDay()]})`;

    const venueNote = mentioned
      ? `The user mentioned "${mentioned.name}" in their question — answer about ${mentioned.name}.`
      : `The user is currently viewing ${venueName} — default to ${venueName} unless a specific venue is named.`;

    const sys = `You are BarPulse AI, a data-grounded assistant for bar and restaurant managers.

TODAY: ${todayStr}
VENUE: ${venueName} (id ${venueId})${barCode ? `, bar_code ${barCode}` : ""}
${venueNote}

You have data tools. Call them with whatever date or range the user asks about — they default to this venue's scope. Resolve dates from the question:
- "yesterday", "last Tuesday", "May 14" → call get_daily_metrics or get_metric_range
- "last week", "this month" → get_metric_range or get_weekly_scorecard
- "who closed?", "who got overtime?" → get_labor_for_day
- "has this happened before?" for a tagged employee → get_employee_prior_insights
- "why did this insight fire?" → get_insight_source_logs

Response rules:
- Every reply that uses a data tool MUST include a prose answer with the actual figures inline. The evidence card shown in the UI is supplementary sourcing — NEVER reply with only a card, and NEVER say "see the card" or equivalent.
- Lead with the answer: number + unit + date/venue context. 1-3 sentences typical, longer only for explicit trend asks.
- NEVER narrate, describe, apologize for, or reference your own tool usage, retrieval process, or prior turns. Forbidden phrasings include: "via tool", "I called", "I retrieved", "I should have", "coincidentally", "I won't skip", "now properly retrieved", "let me check", "checking the data". Just give the answer.
- If a tool returns no data, say so directly (e.g. "No metrics recorded for May 12.") — do not explain the lookup.
- NEVER fabricate numbers. If you don't have a tool result, call a tool or say you don't have the data.
- Cite the exact numbers you used.
- Other venues available if the user names one: ${venues.map((v: any) => v.name).filter(Boolean).join(", ")}.`;


    const convo: Message[] = [];
    if (Array.isArray(history)) {
      for (const m of history.slice(-20)) {
        if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          convo.push({ role: m.role, content: m.content });
        }
      }
    }
    convo.push({ role: "user", content: question });

    return await callAIStream({
      taskType: "user_facing_narrative",
      functionName: "ask-barpulse",
      venueId,
      promptVersion: "v2-tools",
      system: sys,
      messages: convo,
      tools,
      corsHeaders,
    });
  } catch (err) {
    console.error("[ask-barpulse] error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
