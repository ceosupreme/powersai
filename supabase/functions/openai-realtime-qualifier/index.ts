// Realtime voice qualifier — sibling of openai-realtime-proxy. Reuses the same
// WS bridge to OpenAI Realtime but builds its system prompt + tool schema
// from the per-vertical qualifier config (project_type_qualifier_fields +
// project_type_qualifier_config). The proxy forwards the
// `response.function_call_arguments.done` event for `submit_qualified_lead`
// straight to the client so the page can POST it to submit-inbound-lead.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildSystemPrompt, loadQualifierContext, SUBMIT_TOOL_SCHEMA } from "../_shared/qualifier-prompt.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-realtime";

serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }
  if (!OPENAI_API_KEY) {
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  const url = new URL(req.url);
  const projectType = url.searchParams.get("project_type") || "home_services";

  let ctx;
  try {
    ctx = await loadQualifierContext(projectType);
  } catch (e) {
    console.error("[realtime-qualifier] context load failed", e);
    return new Response("Qualifier config load failed", { status: 500 });
  }

  if (!ctx.fields.length) {
    return new Response(`No qualifier fields configured for project_type=${projectType}`, { status: 400 });
  }

  const { socket: client, response } = Deno.upgradeWebSocket(req);
  let openai: WebSocket | null = null;
  let configured = false;

  const configure = () => {
    if (!openai || openai.readyState !== WebSocket.OPEN) return;
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: buildSystemPrompt(ctx),
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 900,
        },
        tools: [SUBMIT_TOOL_SCHEMA],
        tool_choice: "auto",
        temperature: 0.7,
        max_response_output_tokens: 600,
      },
    };
    openai.send(JSON.stringify(sessionUpdate));
    setTimeout(() => {
      if (openai && openai.readyState === WebSocket.OPEN) {
        openai.send(JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["text", "audio"],
            instructions: `Greet the caller warmly in one short sentence, mention you're the intake assistant for a ${ctx.vertical_label} team, and ask how you can help today.`,
          },
        }));
      }
    }, 600);
  };

  const connectOpenAI = () => {
    openai = new WebSocket(OPENAI_REALTIME_URL, [
      "realtime",
      `openai-insecure-api-key.${OPENAI_API_KEY}`,
      "openai-beta.realtime-v1",
    ]);

    openai.onopen = () => console.log("[realtime-qualifier] OpenAI connected");
    openai.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "session.created" && !configured) {
          configured = true;
          configure();
        }
        if (data.type === "response.function_call_arguments.done") {
          console.log("[realtime-qualifier] tool call:", data.name);
        }
        if (data.type === "error") {
          console.error("[realtime-qualifier] OpenAI error:", JSON.stringify(data.error));
        }
        if (client.readyState === WebSocket.OPEN) client.send(event.data);
      } catch (e) {
        console.error("[realtime-qualifier] parse error", e);
      }
    };
    openai.onerror = (e) => console.error("[realtime-qualifier] OpenAI ws error", e);
    openai.onclose = (e) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "connection.closed", reason: e.reason || "closed" }));
      }
    };
  };

  client.onopen = () => connectOpenAI();
  client.onmessage = (event) => {
    if (openai && openai.readyState === WebSocket.OPEN) openai.send(event.data);
  };
  client.onclose = () => {
    if (openai && openai.readyState === WebSocket.OPEN) openai.close();
  };
  client.onerror = (e) => console.error("[realtime-qualifier] client ws error", e);

  return response;
});