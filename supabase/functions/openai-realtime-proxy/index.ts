import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-realtime";

serve(async (req) => {
  const __disabled = await guardIntegration('openai_voice', {});
  if (__disabled) return __disabled;
  // Handle WebSocket upgrade
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  // Get log context from query params
  const url = new URL(req.url);
  const logType = url.searchParams.get("logType") || "gm_log";
  const fieldsJson = url.searchParams.get("fields") || "[]";
  
  let fields: Array<{
    field_id: string;
    label: string;
    field_type: string;
    options?: string[];
    required: boolean;
    section: string;
  }> = [];
  
  try {
    fields = JSON.parse(decodeURIComponent(fieldsJson));
  } catch (e) {
    console.error("Failed to parse fields:", e);
  }

  console.log(`Starting voice interview for ${logType} with ${fields.length} fields`);

  // Upgrade to WebSocket
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  // Connect to OpenAI
  let openaiSocket: WebSocket | null = null;
  let sessionCreated = false;

  const connectToOpenAI = () => {
    console.log("Connecting to OpenAI Realtime API...");
    
    // Use subprotocols for authentication in Deno
    // OpenAI supports passing API key and beta header via Sec-WebSocket-Protocol
    openaiSocket = new WebSocket(
      OPENAI_REALTIME_URL,
      [
        "realtime",
        `openai-insecure-api-key.${OPENAI_API_KEY}`,
        "openai-beta.realtime-v1"
      ]
    );

    openaiSocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
    };

    openaiSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Detailed logging for debugging
        if (data.type === 'response.audio.delta') {
          console.log("[Proxy] Audio delta, length:", data.delta?.length || 0);
        } else if (data.type === 'error') {
          console.error("[Proxy] OpenAI error:", JSON.stringify(data.error));
        } else if (data.type === 'session.updated') {
          console.log("[Proxy] Session updated - modalities:", data.session?.modalities, "voice:", data.session?.voice);
        } else if (data.type === 'response.output_item.added') {
          console.log("[Proxy] Output item added:", data.item?.type);
        } else if (data.type === 'response.content_part.added') {
          console.log("[Proxy] Content part added:", data.part?.type);
        } else if (data.type === 'response.function_call_arguments.done') {
          console.log("[Proxy] Function call:", data.name, "args:", data.arguments);
        } else if (data.type === 'response.created') {
          console.log("[Proxy] Response created - AI will generate output");
        } else if (data.type === 'response.done') {
          // Log detailed info about what was generated
          const output = data.response?.output || [];
          console.log("[Proxy] Response complete - output count:", output.length, "output types:", output.map((o: any) => o.type));
        } else if (data.type === 'input_audio_buffer.speech_started') {
          console.log("[Proxy] User started speaking");
        } else if (data.type === 'input_audio_buffer.speech_stopped') {
          console.log("[Proxy] User stopped speaking");
        } else {
          console.log("[Proxy] Event:", data.type);
        }

        // When session is created, send our configuration
        if (data.type === "session.created" && !sessionCreated) {
          sessionCreated = true;
          console.log("[Proxy] Session created, sending configuration...");
          sendSessionUpdate();
        }

        // Forward all events to client
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(event.data);
        } else {
          console.warn("[Proxy] Cannot forward to client - socket not open, state:", clientSocket.readyState);
        }
      } catch (e) {
        console.error("[Proxy] Error processing OpenAI message:", e);
      }
    };

    openaiSocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
    };

    openaiSocket.onclose = (event) => {
      console.log("OpenAI connection closed:", event.code, event.reason);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
          type: "connection.closed",
          reason: event.reason || "OpenAI connection closed"
        }));
      }
    };
  };

  const sendSessionUpdate = () => {
    if (!openaiSocket || openaiSocket.readyState !== WebSocket.OPEN) return;

    // Build dynamic system prompt based on log type and fields
    const logTypeLabel = logType === "gm_log" ? "GM Daily Log" : "Shift Lead Daily Log";
    
    const fieldDescriptions = fields.map((f, i) => {
      let desc = `${i + 1}. "${f.label}" (${f.field_type})`;
      if (f.options && f.options.length > 0) {
        desc += ` - Options: ${f.options.join(", ")}`;
      }
      if (f.required) desc += " [REQUIRED]";
      return desc;
    }).join("\n");

    const systemPrompt = `You are a friendly assistant helping complete a ${logTypeLabel}. You MUST speak out loud using audio - never respond with only text.

CRITICAL: Always generate audio responses. Speak naturally and conversationally.

Your job:
1. Ask ONE question at a time about each field
2. Keep responses brief (1-2 sentences)
3. After the user answers, call save_answer with the field_id and value
4. Then call next_field to proceed
5. For select fields, match to the closest option
6. For yes/no fields, interpret as true/false
7. For numbers, extract the numeric value
8. When done, ask to confirm and call submit_log

FIELDS (ask in order):
${fieldDescriptions}

Begin by greeting them warmly and asking about the first field.`;

    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: systemPrompt,
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        // Use server VAD for speech detection - it will auto-create responses
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        },
        tools: [
          {
            type: "function",
            name: "save_answer",
            description: "Save the user's answer to a specific log field. Call this after the user answers each question.",
            parameters: {
              type: "object",
              properties: {
                field_id: { 
                  type: "string",
                  description: "The field_id of the field being answered"
                },
                value: { 
                  type: "string",
                  description: "The interpreted value from the user's response. For booleans, use 'true' or 'false'. For numbers, use the numeric string. For selects, use the exact option value."
                }
              },
              required: ["field_id", "value"]
            }
          },
          {
            type: "function",
            name: "next_field",
            description: "Move to the next field in the interview. Call this after saving an answer."
          },
          {
            type: "function",
            name: "skip_field",
            description: "Skip the current field if the user wants to skip it or if it's not applicable.",
            parameters: {
              type: "object",
              properties: {
                field_id: { 
                  type: "string",
                  description: "The field_id of the field to skip"
                }
              },
              required: ["field_id"]
            }
          },
          {
            type: "function",
            name: "submit_log",
            description: "Submit the completed log. Only call this when the user confirms they want to submit."
          }
        ],
        tool_choice: "auto",
        temperature: 0.7,
        max_response_output_tokens: 500
      }
    };

    console.log("Sending session update with", fields.length, "fields");
    openaiSocket.send(JSON.stringify(sessionUpdate));
    
    // Trigger initial response to start the interview
    // Wait for session update to be fully processed before triggering
    setTimeout(() => {
      if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
        console.log("Triggering initial AI response with explicit audio...");
        openaiSocket.send(JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["text", "audio"],
            instructions: "Greet the user warmly and ask them about the first field. You MUST generate audio output."
          }
        }));
      }
    }, 1000);
  };

  // Client socket handlers
  clientSocket.onopen = () => {
    console.log("Client connected");
    connectToOpenAI();
  };

  clientSocket.onmessage = (event) => {
    try {
      // Forward messages from client to OpenAI
      if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
        openaiSocket.send(event.data);
      }
    } catch (e) {
      console.error("Error forwarding client message:", e);
    }
  };

  clientSocket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
  };

  clientSocket.onclose = () => {
    console.log("Client disconnected");
    if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
      openaiSocket.close();
    }
  };

  return response;
});
