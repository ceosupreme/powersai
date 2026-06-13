// ============================================================================
// Centralized AI model routing + per-call observability
// ============================================================================
//
// SINGLE-FILE REVERT (if Claude output regresses):
//   Change AI_MODELS.user_facing_narrative back to Gemini:
//     { provider: 'google', modelId: 'google/gemini-2.5-pro',
//       pricing: { input: 1.25, output: 5 } }
//   No other edits required — call sites route by `taskType`, callAI dispatches
//   by provider.
//
//   NOTE on pre-migration state (for accurate rollback):
//     - generate-daily-insights was on google/gemini-2.5-pro
//     - ask-barpulse           was on google/gemini-2.5-pro
//     - generate-monday-briefing was on google/gemini-2.5-FLASH
//       (briefing was misconfigured on the utility tier; if reverting,
//        2.5-pro is the better choice for it, but the original state was Flash)
//
// PROVIDER ROUTING:
//   - provider='anthropic' → POST api.anthropic.com/v1/messages (direct;
//                            Lovable AI Gateway does not support Anthropic)
//   - provider='google' | 'openai' → POST Lovable AI Gateway
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Provider = "anthropic" | "google" | "openai";

export interface ModelEntry {
  provider: Provider;
  modelId: string;
  /** USD per 1M tokens */
  pricing: { input: number; output: number };
}

export type TaskType =
  | "user_facing_narrative"
  | "utility_classification"
  | "utility_parsing";

export const AI_MODELS: Record<TaskType, ModelEntry> = {
  // Claude Sonnet 4.6 — dateless format IS a pinned snapshot per Anthropic;
  // does NOT auto-upgrade. Used by generate-daily-insights,
  // generate-monday-briefing, ask-barpulse.
  user_facing_narrative: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    pricing: { input: 3, output: 15 },
  },
  // Sentiment classifier + task-performance brief.
  utility_classification: {
    provider: "google",
    modelId: "google/gemini-2.5-flash",
    pricing: { input: 0.3, output: 2.5 },
  },
  // parse-logs — strict-JSON extraction; routed to Sonnet 4.6 (pinned snapshot)
  // for reliable structured output. Only parse-logs uses this task type.
  utility_parsing: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    pricing: { input: 3, output: 15 },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Tool definition for Anthropic tool-use. Single-turn cap enforced by
 * callAI/callAIStream: at most ONE follow-up turn after tools execute; the
 * second model response is final even if it tries to call more tools.
 */
export interface AITool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (args: any) => Promise<unknown>;
}

export interface ToolCallRecord {
  name: string;
  input: any;
  result: unknown;
}

export interface CallAIInput {
  taskType: TaskType;
  functionName: string;
  venueId?: string | null;
  promptVersion?: string;
  system?: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  /** Passed through to Gateway calls only (Anthropic branch ignores). Use for tools / response_format. */
  gatewayExtras?: Record<string, unknown>;
  /** Anthropic tool-use (single-turn cap). Gateway branch ignores. */
  tools?: AITool[];
  toolChoice?: "auto" | "any" | { type: "tool"; name: string };
}

export interface CallAIResult {
  text: string;
  raw: any;
  usage: { input_tokens: number; output_tokens: number };
  modelId: string;
  provider: Provider;
  toolCalls?: ToolCallRecord[];
}

// ── Service-role client for log writes ────────────────────────────────────

function makeAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function writeLog(row: {
  function_name: string;
  venue_id: string | null;
  provider: Provider;
  model_id: string;
  prompt_version: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number;
  error_state: "success" | "error" | "timeout";
  error_message: string | null;
}): Promise<void> {
  try {
    const sb = makeAdminClient();
    const { error } = await sb.from("ai_call_log").insert(row);
    if (error) console.warn("[ai_call_log] insert failed:", error.message);
  } catch (e) {
    console.warn("[ai_call_log] write threw:", e instanceof Error ? e.message : e);
  }
}

function computeCost(
  pricing: { input: number; output: number },
  inTok: number | null,
  outTok: number | null,
): number | null {
  if (inTok == null && outTok == null) return null;
  const i = ((inTok ?? 0) / 1_000_000) * pricing.input;
  const o = ((outTok ?? 0) / 1_000_000) * pricing.output;
  return Number((i + o).toFixed(6));
}

// ── Non-streaming entry point ─────────────────────────────────────────────

export async function callAI(input: CallAIInput): Promise<CallAIResult> {
  const entry = AI_MODELS[input.taskType];
  if (!entry) throw new Error(`callAI: unknown taskType '${input.taskType}'`);

  const promptVersion = input.promptVersion ?? "v1";
  const started = performance.now();

  try {
    const result =
      entry.provider === "anthropic"
        ? await callAnthropic(entry, input)
        : await callGateway(entry, input);

    const latency_ms = Math.round(performance.now() - started);
    void writeLog({
      function_name: input.functionName,
      venue_id: input.venueId ?? null,
      provider: entry.provider,
      model_id: entry.modelId,
      prompt_version: promptVersion,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cost_usd: computeCost(entry.pricing, result.usage.input_tokens, result.usage.output_tokens),
      latency_ms,
      error_state: "success",
      error_message: null,
    });

    return result;
  } catch (err) {
    const latency_ms = Math.round(performance.now() - started);
    const msg = err instanceof Error ? err.message : String(err);
    void writeLog({
      function_name: input.functionName,
      venue_id: input.venueId ?? null,
      provider: entry.provider,
      model_id: entry.modelId,
      prompt_version: promptVersion,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      latency_ms,
      error_state: "error",
      error_message: msg.slice(0, 1000),
    });
    throw err;
  }
}

// ── Anthropic (direct) ─────────────────────────────────────────────────────

async function callAnthropic(entry: ModelEntry, input: CallAIInput): Promise<CallAIResult> {
  const key = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  // Anthropic requires system as top-level, messages as user/assistant only.
  const systemFromInput = input.system?.trim() || "";
  const systemFromMessages = input.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const system = [systemFromInput, systemFromMessages].filter(Boolean).join("\n\n");
  // Initial message array — content stays string-typed for the first turn.
  const messages: Array<{ role: "user" | "assistant"; content: any }> = input.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  const hasTools = (input.tools?.length ?? 0) > 0;
  const toolsForApi = hasTools
    ? input.tools!.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }))
    : undefined;

  const doPost = async (msgs: any[]) => {
    const body: Record<string, unknown> = {
      model: entry.modelId,
      max_tokens: input.maxTokens ?? 4096,
      messages: msgs,
    };
    if (system) body.system = system;
    if (input.temperature != null) body.temperature = input.temperature;
    if (toolsForApi) {
      body.tools = toolsForApi;
      body.tool_choice = input.toolChoice ?? { type: "auto" };
    }
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      if (resp.status === 429) throw new Error(`Anthropic 429: ${t.slice(0, 300)}`);
      if (resp.status === 401) throw new Error(`Anthropic 401 (bad key): ${t.slice(0, 300)}`);
      throw new Error(`Anthropic ${resp.status}: ${t.slice(0, 500)}`);
    }
    return await resp.json();
  };

  let data = await doPost(messages);
  let inputTokens = Number(data?.usage?.input_tokens ?? 0);
  let outputTokens = Number(data?.usage?.output_tokens ?? 0);
  const toolCalls: ToolCallRecord[] = [];

  // SINGLE-TURN tool loop: if first response wants tools, execute and post once more.
  // Second response is final regardless of stop_reason.
  if (hasTools && data?.stop_reason === "tool_use" && Array.isArray(data.content)) {
    const toolUseBlocks = data.content.filter((b: any) => b?.type === "tool_use");
    const toolByName = new Map(input.tools!.map((t) => [t.name, t]));
    const results = await Promise.all(
      toolUseBlocks.map(async (b: any) => {
        const tool = toolByName.get(b.name);
        let result: unknown;
        try {
          result = tool ? await tool.execute(b.input ?? {}) : { error: `unknown tool ${b.name}` };
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) };
        }
        toolCalls.push({ name: b.name, input: b.input ?? {}, result });
        return { type: "tool_result", tool_use_id: b.id, content: JSON.stringify(result) };
      }),
    );
    messages.push({ role: "assistant", content: data.content });
    messages.push({ role: "user", content: results });
    data = await doPost(messages);
    inputTokens += Number(data?.usage?.input_tokens ?? 0);
    outputTokens += Number(data?.usage?.output_tokens ?? 0);
  }

  const text = Array.isArray(data.content)
    ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text || "").join("")
    : "";

  return {
    text,
    raw: data,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    modelId: entry.modelId,
    provider: "anthropic",
    toolCalls: toolCalls.length ? toolCalls : undefined,
  };
}

// ── Lovable AI Gateway (OpenAI-compatible) ─────────────────────────────────

async function callGateway(entry: ModelEntry, input: CallAIInput): Promise<CallAIResult> {
  const key = (Deno.env.get("LOVABLE_API_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const msgs: Message[] = [];
  if (input.system) msgs.push({ role: "system", content: input.system });
  msgs.push(...input.messages);

  const body: Record<string, unknown> = {
    model: entry.modelId,
    messages: msgs,
    ...(input.gatewayExtras || {}),
  };
  if (input.temperature != null && body.temperature == null) body.temperature = input.temperature;
  if (input.maxTokens != null && body.max_tokens == null) body.max_tokens = input.maxTokens;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    if (resp.status === 429) throw new Error(`Lovable Gateway 429: ${t.slice(0, 300)}`);
    if (resp.status === 402) throw new Error("Lovable AI credits exhausted");
    throw new Error(`Lovable Gateway ${resp.status}: ${t.slice(0, 500)}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return {
    text,
    raw: data,
    usage: {
      input_tokens: Number(data?.usage?.prompt_tokens ?? 0),
      output_tokens: Number(data?.usage?.completion_tokens ?? 0),
    },
    modelId: entry.modelId,
    provider: entry.provider,
  };
}

// ── Streaming entry point (returns OpenAI-shape SSE Response) ─────────────
// Used by ask-barpulse. Anthropic SSE is translated to the OpenAI delta
// shape the existing client code expects (`data: {choices:[{delta:{content}}]}`).
// Token usage + log row are written after the stream ends.

export interface CallAIStreamInput extends CallAIInput {
  corsHeaders: Record<string, string>;
}

export function callAIStream(input: CallAIStreamInput): Promise<Response> {
  const entry = AI_MODELS[input.taskType];
  if (!entry) throw new Error(`callAIStream: unknown taskType '${input.taskType}'`);
  if (entry.provider === "anthropic") return streamAnthropic(entry, input);
  return streamGateway(entry, input);
}

async function streamAnthropic(entry: ModelEntry, input: CallAIStreamInput): Promise<Response> {
  const key = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const systemFromInput = input.system?.trim() || "";
  const systemFromMessages = input.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const system = [systemFromInput, systemFromMessages].filter(Boolean).join("\n\n");
  const messages: Array<{ role: "user" | "assistant"; content: any }> = input.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  const started = performance.now();
  const hasTools = (input.tools?.length ?? 0) > 0;
  const toolsForApi = hasTools
    ? input.tools!.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }))
    : undefined;

  // TRADE-OFF (accepted): when tools are present, first pass is non-streaming so
  // we can detect tool_use cleanly server-side. Costs one extra round-trip of
  // latency on every tool-using question, but avoids brittle mid-stream tool
  // detection in the SSE bridge. Tool-less questions stream immediately (no
  // regression on the existing path).
  const accumulatedToolEvidence: ToolCallRecord[] = [];
  let preInputTokens = 0;
  let preOutputTokens = 0;

  if (hasTools) {
    const preBody: Record<string, unknown> = {
      model: entry.modelId,
      max_tokens: input.maxTokens ?? 4096,
      messages,
      tools: toolsForApi,
      tool_choice: input.toolChoice ?? { type: "auto" },
    };
    if (system) preBody.system = system;
    if (input.temperature != null) preBody.temperature = input.temperature;

    const preResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(preBody),
    });
    if (!preResp.ok) {
      const t = await preResp.text().catch(() => "");
      void writeLog({
        function_name: input.functionName, venue_id: input.venueId ?? null,
        provider: "anthropic", model_id: entry.modelId,
        prompt_version: input.promptVersion ?? "v1",
        input_tokens: null, output_tokens: null, cost_usd: null,
        latency_ms: Math.round(performance.now() - started),
        error_state: "error", error_message: `Anthropic ${preResp.status}: ${t.slice(0, 500)}`,
      });
      return new Response(JSON.stringify({ error: `Anthropic ${preResp.status}` }), {
        status: preResp.status, headers: { ...input.corsHeaders, "Content-Type": "application/json" },
      });
    }
    const preData = await preResp.json();
    preInputTokens = Number(preData?.usage?.input_tokens ?? 0);
    preOutputTokens = Number(preData?.usage?.output_tokens ?? 0);

    if (preData?.stop_reason === "tool_use" && Array.isArray(preData.content)) {
      const toolUseBlocks = preData.content.filter((b: any) => b?.type === "tool_use");
      const toolByName = new Map(input.tools!.map((t) => [t.name, t]));
      const results = await Promise.all(
        toolUseBlocks.map(async (b: any) => {
          const tool = toolByName.get(b.name);
          let result: unknown;
          try {
            result = tool ? await tool.execute(b.input ?? {}) : { error: `unknown tool ${b.name}` };
          } catch (err) {
            result = { error: err instanceof Error ? err.message : String(err) };
          }
          accumulatedToolEvidence.push({ name: b.name, input: b.input ?? {}, result });
          return { type: "tool_result", tool_use_id: b.id, content: JSON.stringify(result) };
        }),
      );
      messages.push({ role: "assistant", content: preData.content });
      messages.push({ role: "user", content: results });
      // Fall through to streaming follow-up turn (SINGLE-TURN cap: this is the
      // final response; any further tool_use in the stream is ignored).
    } else {
      // No tools called — return the model's text directly as a synthetic SSE
      // so the client doesn't pay for a second round-trip with no tool use.
      const text = Array.isArray(preData.content)
        ? preData.content.filter((b: any) => b?.type === "text").map((b: any) => b.text || "").join("")
        : "";
      const encoder0 = new TextEncoder();
      void writeLog({
        function_name: input.functionName, venue_id: input.venueId ?? null,
        provider: "anthropic", model_id: entry.modelId,
        prompt_version: input.promptVersion ?? "v1",
        input_tokens: preInputTokens || null, output_tokens: preOutputTokens || null,
        cost_usd: computeCost(entry.pricing, preInputTokens, preOutputTokens),
        latency_ms: Math.round(performance.now() - started),
        error_state: "success", error_message: null,
      });
      const stream0 = new ReadableStream({
        start(controller) {
          if (text) {
            controller.enqueue(encoder0.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
            ));
          }
          controller.enqueue(encoder0.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream0, {
        headers: { ...input.corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }
  }

  const body: Record<string, unknown> = {
    model: entry.modelId,
    max_tokens: input.maxTokens ?? 4096,
    messages,
    stream: true,
  };
  if (system) body.system = system;
  if (input.temperature != null) body.temperature = input.temperature;
  // NOTE: do NOT send tools on the streaming follow-up — single-turn cap.

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    void writeLog({
      function_name: input.functionName,
      venue_id: input.venueId ?? null,
      provider: "anthropic",
      model_id: entry.modelId,
      prompt_version: input.promptVersion ?? "v1",
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      latency_ms: Math.round(performance.now() - started),
      error_state: "error",
      error_message: `Anthropic ${resp.status}: ${t.slice(0, 500)}`,
    });
    return new Response(JSON.stringify({ error: `Anthropic ${resp.status}` }), {
      status: resp.status,
      headers: { ...input.corsHeaders, "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      // Emit a synthetic SSE event up front carrying tool_evidence so the
      // client can render structured results (clients that don't know this
      // key ignore the delta payload entirely).
      if (accumulatedToolEvidence.length) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { tool_evidence: accumulatedToolEvidence } }] })}\n\n`,
          ),
        );
      }
      const reader = resp.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Anthropic SSE events are double-newline separated.
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const ev of events) {
            // Each event contains "event: <type>" + "data: <json>"
            const dataLine = ev.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const payload = dataLine.slice(6).trim();
            if (!payload) continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                const text = parsed.delta.text || "";
                if (text) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
                    ),
                  );
                }
              } else if (parsed.type === "message_start") {
                inputTokens = Number(parsed.message?.usage?.input_tokens ?? 0);
              } else if (parsed.type === "message_delta") {
                if (parsed.usage?.output_tokens != null) {
                  outputTokens = Number(parsed.usage.output_tokens);
                }
              }
            } catch {
              // ignore malformed event
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("[callAIStream/anthropic] stream error:", err);
      } finally {
        controller.close();
        const totalIn = inputTokens + preInputTokens;
        const totalOut = outputTokens + preOutputTokens;
        void writeLog({
          function_name: input.functionName,
          venue_id: input.venueId ?? null,
          provider: "anthropic",
          model_id: entry.modelId,
          prompt_version: input.promptVersion ?? "v1",
          input_tokens: totalIn || null,
          output_tokens: totalOut || null,
          cost_usd: computeCost(entry.pricing, totalIn, totalOut),
          latency_ms: Math.round(performance.now() - started),
          error_state: "success",
          error_message: null,
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...input.corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function streamGateway(entry: ModelEntry, input: CallAIStreamInput): Promise<Response> {
  const key = (Deno.env.get("LOVABLE_API_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const msgs: Message[] = [];
  if (input.system) msgs.push({ role: "system", content: input.system });
  msgs.push(...input.messages);

  const started = performance.now();
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: entry.modelId,
      messages: msgs,
      stream: true,
      ...(input.gatewayExtras || {}),
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    void writeLog({
      function_name: input.functionName,
      venue_id: input.venueId ?? null,
      provider: entry.provider,
      model_id: entry.modelId,
      prompt_version: input.promptVersion ?? "v1",
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      latency_ms: Math.round(performance.now() - started),
      error_state: "error",
      error_message: `Gateway ${resp.status}: ${t.slice(0, 500)}`,
    });
    return new Response(JSON.stringify({ error: `Gateway ${resp.status}` }), {
      status: resp.status,
      headers: { ...input.corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Gateway emits OpenAI-shape SSE; passthrough with tee for token tally.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = resp.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
                  ),
                );
              }
              if (parsed.usage) {
                inputTokens = Number(parsed.usage.prompt_tokens ?? inputTokens);
                outputTokens = Number(parsed.usage.completion_tokens ?? outputTokens);
              }
            } catch {
              // ignore
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("[callAIStream/gateway] stream error:", err);
      } finally {
        controller.close();
        void writeLog({
          function_name: input.functionName,
          venue_id: input.venueId ?? null,
          provider: entry.provider,
          model_id: entry.modelId,
          prompt_version: input.promptVersion ?? "v1",
          input_tokens: inputTokens || null,
          output_tokens: outputTokens || null,
          cost_usd: computeCost(entry.pricing, inputTokens, outputTokens),
          latency_ms: Math.round(performance.now() - started),
          error_state: "success",
          error_message: null,
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...input.corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
