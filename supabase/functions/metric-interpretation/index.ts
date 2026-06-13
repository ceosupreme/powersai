import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Tile {
  label: string;
  value: string;
}

interface Body {
  pillar?: string;
  metricLabel?: string;
  scoreKey?: string;
  gmName?: string | null;
  venueName?: string | null;
  weekStart?: string | null;
  tiles?: Tile[];
  comparison?: { label: string; pct: number; fromTo: string; isGood: boolean } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    const {
      pillar = "performance",
      metricLabel = "metric",
      gmName,
      venueName = "the venue",
      weekStart = "this week",
      tiles = [],
      comparison,
    } = body;

    if (!Array.isArray(tiles) || tiles.length === 0) {
      return new Response(JSON.stringify({ error: "No tiles provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const gmRef = gmName && gmName.trim() ? gmName : "the GM";
    const tileText = tiles.map((t) => `- ${t.label}: ${t.value}`).join("\n");
    const compText = comparison
      ? `${comparison.label} ${comparison.pct >= 0 ? "+" : ""}${comparison.pct.toFixed(1)}% (${comparison.fromTo})`
      : "none";

    const systemPrompt = `You are a direct operations advisor for ${venueName}. The GM is ${gmRef}.
Metric: ${metricLabel} (${pillar}) for week of ${weekStart}.

Raw values:
${tileText}

Comparison: ${compText}

In 2-3 sentences total:
1. What do these numbers actually mean?
2. Is this good, neutral, or a concern?
3. What is the ONE action ${gmRef} should take this week?

Be specific to the numbers above. Reference exact values. Never generic. Never congratulatory. No emojis. No bullet lists — flowing prose only.
If the data above is insufficient to answer usefully, respond with the single word: INSUFFICIENT`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Interpret ${metricLabel} for ${gmRef}.` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("metric-interpretation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
