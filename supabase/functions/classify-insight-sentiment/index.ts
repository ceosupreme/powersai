// Classifies an insight's sentiment as positive | neutral | negative.
// Modes:
//   - { insight_id }: classify a single insight (used right after generation)
//   - { backfill: true, limit?: number }: bulk classify rows still at default 'neutral'
//     where created_at is older than 5 minutes (so brand new rows don't get backfilled here)
//
// Uses Lovable AI Gateway (google/gemini-2.5-flash-lite) with tool-calling for
// structured output. Defaults to 'neutral' if the model fails or is ambiguous.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-models.ts";

type Sentiment = "positive" | "neutral" | "negative";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface InsightRow {
  id: string;
  title: string | null;
  summary: string | null;
  detail: string | null;
  severity: string | null;
  pillar: string | null;
}

const TOOL = {
  type: "function" as const,
  function: {
    name: "classify_sentiment",
    description:
      "Classify an operational insight as positive (a win/improvement), neutral (informational/observational), or negative (problem/concern).",
    parameters: {
      type: "object",
      properties: {
        sentiment: {
          type: "string",
          enum: ["positive", "neutral", "negative"],
          description:
            "positive = something went well or improved; negative = a problem, drop, miss, or concern; neutral = informational/observational with no clear positive or negative valence.",
        },
        reason: { type: "string", description: "One short sentence explanation." },
      },
      required: ["sentiment"],
      additionalProperties: false,
    },
  },
};

async function classifyOne(row: InsightRow): Promise<Sentiment> {
  if (!LOVABLE_API_KEY) return "neutral";
  const userText =
    `Title: ${row.title ?? ""}\n` +
    `Summary: ${row.summary ?? ""}\n` +
    `Detail: ${(row.detail ?? "").slice(0, 1500)}\n` +
    `Severity: ${row.severity ?? ""}\n` +
    `Pillar: ${row.pillar ?? ""}`;

  try {
    const r = await callAI({
      taskType: "utility_classification",
      functionName: "classify-insight-sentiment",
      system:
        "You classify operational insights for a hospitality business. Logs may be written in Spanish or English — classify correctly regardless of language. Use the classify_sentiment tool.\n\n" +
        "POSITIVE means a win or improvement. Mark positive when the log includes ANY of: recognition, shoutouts, kudos, praise, employee called out for great work, exceeded targets, smooth execution, guest compliments, problem-solved-well, team teamwork callouts, 'great job', 'crushed it', record sales, beat goals, customer thank-yous.\n\n" +
        "NEGATIVE means a problem or concern: drops, misses, complaints, violations, write-ups, equipment failures, missed targets, poor service, conflict.\n\n" +
        "NEUTRAL means purely informational/observational with NO praise and NO concern — e.g. 'inventory delivered at 9am', 'pre-shift held'. Do NOT use neutral as a fallback for unclear positive content; if recognition or praise language is present, classify positive.",
      messages: [{ role: "user", content: userText }],
      gatewayExtras: {
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "classify_sentiment" } },
      },
    });

    const call = r.raw.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) return "neutral";
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    const s = parsed?.sentiment;
    if (s === "positive" || s === "negative" || s === "neutral") return s;
    return "neutral";
  } catch (e) {
    console.warn("[classify-insight-sentiment] error:", e);
    return "neutral";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try {
    body = await req.json();
  } catch (_) {}

  // Single classify mode
  if (body?.insight_id) {
    const { data, error } = await supabase
      .from("insights")
      .select("id,title,summary,detail,severity,pillar")
      .eq("id", body.insight_id)
      .maybeSingle();
    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message ?? "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sentiment = await classifyOne(data as InsightRow);
    const { error: upErr } = await supabase
      .from("insights")
      .update({ sentiment })
      .eq("id", data.id);
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ id: data.id, sentiment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Backfill mode
  const limit = Math.min(500, Math.max(1, Number(body?.limit ?? 100)));
  const onlyUnclassified = body?.only_unclassified !== false; // default true

  // Pull rows: by default rows still at 'neutral' (unclassified default).
  // If backfill_all is true, classify everything regardless.
  // Order ascending so older unclassified rows (the backlog) get worked through first
  // alongside any newly-created neutral rows. The 10-min cron at limit=80 will drain
  // the ~788 historical backlog over ~2 hours and then idle on new rows only.
  // Ordering: by default ascending (drain backlog). If `recent_first` or `since` is provided,
  // prioritize the newest neutral rows so freshly mis-classified content surfaces fast.
  const recentFirst = body?.recent_first === true || !!body?.since;
  let q = supabase
    .from("insights")
    .select("id,title,summary,detail,severity,pillar,sentiment,created_at,source_date")
    .order(recentFirst ? "source_date" : "created_at", { ascending: !recentFirst, nullsFirst: false })
    .limit(limit);

  if (body?.since) {
    q = q.gte("source_date", String(body.since));
  }

  if (onlyUnclassified && !body?.backfill_all) {
    q = q.eq("sentiment", "neutral");
  }

  const { data, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let classified = 0;
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  const errors: string[] = [];

  for (const row of data || []) {
    const sentiment = await classifyOne(row as InsightRow);
    const { error: upErr } = await supabase
      .from("insights")
      .update({ sentiment })
      .eq("id", row.id);
    if (upErr) {
      errors.push(`${row.id}: ${upErr.message}`);
    } else {
      classified++;
      if (sentiment === "positive") positive++;
      else if (sentiment === "negative") negative++;
      else neutral++;
    }
    // tiny delay to avoid bursts
    await new Promise((r) => setTimeout(r, 60));
  }

  return new Response(
    JSON.stringify({
      classified,
      positive,
      negative,
      neutral,
      errors: errors.slice(0, 10),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
