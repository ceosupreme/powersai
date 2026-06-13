// ============================================================================
// insight-deep-dive — two modes in ONE function:
//   mode: 'initial'   — pre-resolves source records server-side, emits them
//                       as a synthetic SSE tool_evidence event, then streams
//                       AI narrative (## What Happened + ## Data Used, plus
//                       a conditional ## What To Do when a specific,
//                       data-grounded fix is warranted).
//   mode: 'followup'  — tool-aware Q&A bound to this insight's venue/date/
//                       employee; same shared tool registry as ask-barpulse.
// Context handoff: client posts insightId + bar_id; this function loads the
// rest (venue name, GM, source_date, employee, source log) from the DB so
// "Unknown Venue" / "Unknown" never reach the prompt.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIStream, type Message } from "../_shared/ai-models.ts";
import { buildTools, type ToolScope } from "../_shared/ai-tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

async function resolveVenue(supabase: any, barId: string) {
  // barId may be a UUID (venues.id) or a bar_code string (e.g. "WFBG").
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barId);
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, bar_code, gm_name")
    .eq(isUuid ? "id" : "bar_code", barId)
    .maybeSingle();

  const resolvedVenueId = venue?.id || (isUuid ? barId : null);

  // Prefer venue_leadership_contacts (matches useVenueGM client hook).
  const { data: lead } = resolvedVenueId
    ? await supabase
        .from("venue_leadership_contacts")
        .select("display_name, is_primary, created_at")
        .eq("venue_id", resolvedVenueId)
        .eq("role_type", "gm")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return {
    venueId: resolvedVenueId,
    venueName: venue?.name || null,
    barCode: venue?.bar_code || null,
    gmName: lead?.display_name || venue?.gm_name || null,
  };
}

async function loadInsight(supabase: any, insightId: string) {
  const { data: insight } = await supabase
    .from("insights")
    .select(
      "id, bar_id, title, summary, pillar, severity, source_date, source_type, source_metric, source_value, source_log_id, source_log_type, generated_by, evidence_ids",
    )
    .eq("id", insightId)
    .maybeSingle();
  if (!insight) return null;

  const { data: emps } = await supabase
    .from("insight_employees")
    .select("employee_id, role, employee_profiles(employee_name)")
    .eq("insight_id", insightId);
  return {
    ...insight,
    employees: (emps || []).map((e: any) => ({
      employee_id: e.employee_id,
      role: e.role,
      employee_name: e.employee_profiles?.employee_name || null,
    })),
  };
}

function summarizeSource(toolResult: any): string {
  if (!toolResult) return "no source resolved";
  if (toolResult.error) return `error: ${toolResult.error}`;
  const src = toolResult.source;
  if (!src) {
    const note = toolResult.note || "unresolved";
    const n = toolResult.candidates?.length || 0;
    return `unresolved (${note}, ${n} same-day candidate log(s))`;
  }
  const lines: string[] = [];
  lines.push(`Source: ${src.log_type} (${src.log_id})`);
  if (src.asana_url) lines.push(`Asana: ${src.asana_url}`);
  const log = src.log || {};
  const keys = [
    "date", "author_name", "gm_on_duty", "shift", "overall_shift_summary",
    "pacing", "staffing_issues", "guest_vibe", "wins", "incidents",
    "summary_notes", "staff_performance_notes",
  ];
  for (const k of keys) {
    const v = log[k];
    if (v != null && v !== "") {
      const s = String(v);
      lines.push(`${k}: ${s.length > 600 ? s.slice(0, 600) + "…" : s}`);
    }
  }
  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode: "initial" | "followup" | "solution" =
      body.mode === "followup" ? "followup"
      : body.mode === "solution" ? "solution"
      : "initial";
    const insightId: string | undefined = body.insight_id || body.insightId;
    const barId: string | undefined = body.bar_id || body.barId;

    if (!barId) {
      return new Response(JSON.stringify({ error: "bar_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const venue = await resolveVenue(supabase, barId);
    if (!venue.venueName) {
      return new Response(JSON.stringify({ error: `venue not found: ${barId}` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insight = insightId ? await loadInsight(supabase, insightId) : null;

    const scope: ToolScope = {
      venueId: venue.venueId,
      barCode: venue.barCode,
      venueName: venue.venueName,
      employeeId: insight?.employees?.[0]?.employee_id ?? null,
      insightId: insightId ?? null,
    };
    const tools = buildTools(supabase, scope);

    // ── FOLLOWUP MODE ─────────────────────────────────────────────────────
    if (mode === "followup") {
      const question: string = String(body.question || "").trim();
      if (!question) {
        return new Response(JSON.stringify({ error: "question required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const history: Message[] = Array.isArray(body.messages)
        ? body.messages
            .slice(-20)
            .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
            .map((m: any) => ({ role: m.role, content: String(m.content || "") }))
        : [];

      const today = new Date().toISOString().split("T")[0];
      const empLine = insight?.employees?.length
        ? `\n- Tagged employee(s): ${insight.employees.map((e: any) => e.employee_name || e.employee_id).join(", ")}`
        : "";
      const sys = `You are BarPulse AI helping a manager dig into a specific insight. The user is asking follow-up questions.

VENUE: ${venue.venueName} (GM: ${venue.gmName || "unknown"})
TODAY: ${today}
INSIGHT CONTEXT:
- Title: ${insight?.title || "(none)"}
- Pillar: ${insight?.pillar || "—"} | Severity: ${insight?.severity || "—"}
- Source date: ${insight?.source_date || "—"}
- Source metric: ${insight?.source_metric || "—"} = ${insight?.source_value ?? "—"}${empLine}

You have data tools. Call them with whatever date/range the user asks about — they default to this venue. When the user says "this venue", "this employee", "this date", they mean the insight above.

Response rules:
- Every reply that uses a data tool MUST include a prose answer with the actual figures inline. The evidence card shown in the UI is supplementary sourcing — NEVER reply with only a card, and NEVER say "see the card" or equivalent.
- Lead with the answer: number + unit + date/venue context. 1-3 sentences.
- NEVER narrate, describe, apologize for, or reference your own tool usage, retrieval process, or prior turns. Forbidden phrasings include: "via tool", "I called", "I retrieved", "I should have", "coincidentally", "I won't skip", "now properly retrieved", "let me check", "checking the data". Just give the answer.
- If a tool returns no data, say so directly (e.g. "No metrics recorded for May 12.") — do not explain the lookup.
- NEVER fabricate numbers. Call a tool or say you don't have the data. Cite exact numbers.`;

      const messages: Message[] = [...history, { role: "user", content: question }];

      return await callAIStream({
        taskType: "user_facing_narrative",
        functionName: "insight-deep-dive",
        venueId: venue.venueId,
        promptVersion: "v2-followup",
        system: sys,
        messages,
        tools,
        corsHeaders,
      });
    }

    // ── SOLUTION MODE ─────────────────────────────────────────────────────
    // On-demand deep solution for a specific insight. Tool-aware like followup,
    // but with no user question — a fixed prompt asks the model to investigate
    // and produce Diagnosis + What To Do.
    if (mode === "solution") {
      if (!insightId) {
        return new Response(JSON.stringify({ error: "insight_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const empLine = insight?.employees?.length
        ? `\n- Tagged employee(s): ${insight.employees.map((e: any) => e.employee_name || e.employee_id).join(", ")}`
        : "";

      const sys = `You are BarPulse AI producing a deep solution for a specific insight, on demand for the venue's GM. The user clicked to request this — they want a concrete plan and will wait while you investigate. Use your data tools to gather what you need before answering.

VENUE: ${venue.venueName} (GM: ${venue.gmName || "unknown"}) | TODAY: ${today}

INSIGHT:
- Title: ${insight?.title || "(none)"}
- Pillar: ${insight?.pillar || "—"} | Severity: ${insight?.severity || "—"}
- Source date: ${insight?.source_date || "—"}
- Source metric: ${insight?.source_metric || "—"} = ${insight?.source_value ?? "—"}${empLine}

Investigate, then solve:
- Pull what you need to reason about THIS insight — metric ranges around the source date, the weekly scorecard, labor for the day, and the source log. Call the tools; do not guess.
- Call get_venue_prior_insights to pull this venue's recent insights, and judge from their titles and summaries whether this same issue has happened before. If it has, say so and recommend the structural fix that stops it recurring (a par level, a schedule change, a checklist item) — not just the one-off patch.
- For a sales/revenue/metric issue, determine traffic-driven vs ticket-driven from the data, isolate the weakest day(s) or daypart, and give specific recovery moves.

You may call get_venue_contacts to see this venue's saved contacts (vendors, trades, reps, etc.). If a contact clearly fits the issue, name them and their contact method in your recommendation (e.g. "call your plumber, Mike — 555-1234"). Only name a contact that genuinely matches the problem — do not attach an unrelated contact just because one exists. If there are no contacts, or none fit, give the same recommendation without a name and do NOT mention that contacts are missing or suggest adding any. Contacts are a bonus when present, never a dependency.

Output exactly:

## Diagnosis
What's driving this, grounded in the figures you pulled. Exact numbers and dates.

## What To Do
The specific actions you'd take if this were your venue. At most 4 bullets, ordered by impact. Each must be concrete and tied to the data — if a bullet could have been written without investigating this insight, cut it.

Rules:
- Never fabricate numbers. Every figure comes from a tool result. If a tool returns nothing, say so plainly and work with what you have.
- Do NOT recommend specific outside vendors, companies, or prices — you don't have that data.
- Never narrate your tool usage, retrieval, or process. Just give the diagnosis and the plan.
- Depth means specific and well-reasoned, not long. No filler.`;

      return await callAIStream({
        taskType: "user_facing_narrative",
        functionName: "insight-deep-dive",
        venueId: venue.venueId,
        promptVersion: "v2-solution",
        system: sys,
        messages: [{ role: "user", content: "Produce the deep solution for this insight." }],
        tools,
        corsHeaders,
      });
    }



    // ── INITIAL MODE ──────────────────────────────────────────────────────
    // Pre-resolve the source record(s) deterministically so we can render
    // them as tool_evidence AND embed them in the prompt for `## Data Used`.
    const srcTool = tools.find((t) => t.name === "get_insight_source_logs")!;
    const sourceResult = insightId ? await srcTool.execute({ insight_id: insightId }) : null;

    // Pull 14d daily metrics for context (lean — Toast columns only).
    let recentMetrics: any[] = [];
    if (venue.barCode) {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data } = await supabase
        .from("daily_metrics")
        .select("date, net_sales, labor_pct, splh, tip_pct, comps_pct, void_pct, guests, avg_check")
        .eq("bar_id", venue.barCode)
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: false })
        .limit(14);
      recentMetrics = data || [];
    }

    // Legacy/optional fields posted by older client code.
    const insightTitle: string = body.insight_title || insight?.title || "(insight)";
    const insightSummary: string = body.insight_summary || insight?.summary || "";
    const pillar: string = body.pillar || insight?.pillar || "General";
    const priority: string = body.priority || insight?.severity || "Medium";

    const empLine = insight?.employees?.length
      ? `\n- Tagged employee(s): ${insight.employees.map((e: any) => e.employee_name || e.employee_id).join(", ")}`
      : "";

    const sourceBlock = summarizeSource(sourceResult);
    const metricsBlock = recentMetrics.length
      ? `\nRECENT DAILY METRICS (last 14d):\n${JSON.stringify(recentMetrics, null, 2)}`
      : "";

    const systemPrompt = `You are BarPulse AI doing a deep dive on a specific insight for a venue manager.

VENUE: ${venue.venueName}
GM: ${venue.gmName || "unknown"}

INSIGHT:
- Title: ${insightTitle}
- Summary: ${insightSummary}
- Pillar: ${pillar} | Priority: ${priority}
- Source date: ${insight?.source_date || "—"}
- Source metric: ${insight?.source_metric || "—"} = ${insight?.source_value ?? "—"}
- Generated by: ${insight?.generated_by || "—"}${empLine}

PRE-RESOLVED SOURCE RECORD (this is the actual log/data the insight fired from):
${sourceBlock}
${metricsBlock}

Produce these sections in order. ## What Happened and ## Data Used are ALWAYS required. ## What To Do is CONDITIONAL (rule below). Output no other sections.

## What Happened
2-3 sentences with exact numbers from the source record / metrics above. Reference the insight's source_date and metric value directly. Do not editorialize.

## Data Used
Bullet list of the exact records referenced:
- Venue: ${venue.venueName}
- GM: ${venue.gmName || "unknown"}
- Source log type + date (from the pre-resolved source above)
- Each metric you cited, with its value and date

## What To Do
Include this section ONLY when you can name a specific fix that adds something beyond restating the problem. If the best honest recommendation just echoes the insight ("out of soap" → "restock the soap"), omit it entirely — no header, no filler. A thin or generic What To Do is worse than none. When in doubt, omit.

When included:
- State the specific action you would take if this were your venue, grounded in the exact numbers and dates above. Test: if the sentence could have been written without reading this insight's data, cut it.
- For a sales/revenue/metric dip, judge from the metrics whether the drop is traffic-driven (guests down vs. the other days in the 14-day window) or ticket-driven (avg_check down), name the weakest day or days, and give the concrete move.
- At most 3 short bullets or a short paragraph. No essays.
- Do NOT claim the issue is recurring, repeated, or a pattern — you can see only the source record and the last 14 days, not prior history.

Across all sections: use only the data above. Never invent numbers, estimate dollar impact the data doesn't support, or add outside benchmarks.`;

    // Wrap callAIStream so we can prepend a tool_evidence SSE event carrying
    // the pre-resolved source record. (No tools passed → no extra latency from
    // the non-stream-first-pass; this is a clean streaming path.)
    const aiResp = await callAIStream({
      taskType: "user_facing_narrative",
      functionName: "insight-deep-dive",
      venueId: venue.venueId,
      promptVersion: "v2-initial",
      system: systemPrompt,
      messages: [{ role: "user", content: `Provide the deep dive for: ${insightTitle}` }],
      corsHeaders,
    });

    if (!aiResp.ok || !aiResp.body) return aiResp;

    const encoder = new TextEncoder();
    const evidence = sourceResult
      ? [{ name: "get_insight_source_logs", input: { insight_id: insightId }, result: sourceResult }]
      : [];

    const composed = new ReadableStream({
      async start(controller) {
        // Prepend synthetic tool_evidence event so the client renders the
        // resolved source (Asana link, log fields) alongside the narrative.
        if (evidence.length) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { tool_evidence: evidence } }] })}\n\n`,
          ));
        }
        const reader = aiResp.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(composed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[insight-deep-dive] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
