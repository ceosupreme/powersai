// Text-chat qualifier fallback. Stateless turn endpoint: the client sends the
// full prior message list + new user text; we call Lovable AI Gateway with
// the shared qualifier system prompt + submit_qualified_lead tool, and
// return either the next assistant message or the tool-call payload the
// client should POST to submit-inbound-lead.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import {
  buildSystemPrompt,
  loadQualifierContext,
  SUBMIT_TOOL_SCHEMA,
} from "../_shared/qualifier-prompt.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const Body = z.object({
  project_type: z.string().min(1).max(80),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(50),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ctx = await loadQualifierContext(parsed.data.project_type);
  const system = buildSystemPrompt(ctx);

  // Lovable AI Gateway uses OpenAI-compatible chat-completions tool calling.
  const tools = [{
    type: "function" as const,
    function: {
      name: SUBMIT_TOOL_SCHEMA.name,
      description: SUBMIT_TOOL_SCHEMA.description,
      parameters: SUBMIT_TOOL_SCHEMA.parameters,
    },
  }];

  const upstream = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": LOVABLE_API_KEY,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...parsed.data.messages],
      tools,
      tool_choice: "auto",
      temperature: 0.7,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("[qualifier-chat] upstream", upstream.status, text);
    return new Response(JSON.stringify({ error: "AI request failed", status: upstream.status }), {
      status: upstream.status === 402 || upstream.status === 429 ? upstream.status : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await upstream.json();
  const msg = result?.choices?.[0]?.message;
  const toolCall = msg?.tool_calls?.[0];
  let submitPayload: unknown = null;
  if (toolCall?.function?.name === SUBMIT_TOOL_SCHEMA.name) {
    try { submitPayload = JSON.parse(toolCall.function.arguments || "{}"); }
    catch { submitPayload = null; }
  }

  return new Response(JSON.stringify({
    reply: msg?.content ?? "",
    submit: submitPayload,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});