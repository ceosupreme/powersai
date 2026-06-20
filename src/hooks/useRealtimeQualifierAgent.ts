// Reuses the audio plumbing from useRealtimeVoiceInterview (AudioRecorder /
// AudioQueue / connection state) but talks to the config-driven
// openai-realtime-qualifier proxy instead of the log-interview proxy. The
// agent decides what to ask from server-side qualifier config; this hook
// only owns mic + speaker + transcript + the final tool-call payload.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioRecorder, AudioQueue,
  encodeAudioForAPI, decodeAudioFromAPI, primeAudioContext,
} from "@/utils/audioHelpers";

export type QualifierConnectionState = "disconnected" | "connecting" | "connected" | "error";
export type QualifierConversationState = "idle" | "listening" | "speaking" | "processing";

export interface QualifierTranscriptTurn {
  role: "user" | "assistant";
  text: string;
  at: string;
}

export interface SubmitQualifiedLeadPayload {
  qualifier_data: Record<string, string>;
  is_ready: boolean;
  not_ready_reason?: string;
  summary?: string;
}

interface Options {
  projectType: string;
  onComplete: (payload: SubmitQualifiedLeadPayload, transcript: QualifierTranscriptTurn[]) => void;
}

export function useRealtimeQualifierAgent({ projectType, onComplete }: Options) {
  const [connectionState, setConnectionState] = useState<QualifierConnectionState>("disconnected");
  const [conversationState, setConversationState] = useState<QualifierConversationState>("idle");
  const [interimUser, setInterimUser] = useState("");
  const [interimAi, setInterimAi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<QualifierTranscriptTurn[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const queueRef = useRef<AudioQueue | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const aiBufferRef = useRef("");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    stopRecording();
    queueRef.current?.clear();
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setConnectionState("disconnected");
    setConversationState("idle");
  }, [stopRecording]);

  const startRecording = useCallback(() => {
    if (recorderRef.current) return;
    const recorder = new AudioRecorder((audioData) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: encodeAudioForAPI(audioData),
        }));
      }
    });
    recorder.start().catch((err) => {
      console.error("[qualifier-agent] mic error", err);
      setError("Microphone access denied");
    });
    recorderRef.current = recorder;
  }, []);

  const handleToolCall = useCallback((data: any) => {
    if (data.name !== "submit_qualified_lead") return;
    let args: SubmitQualifiedLeadPayload | null = null;
    try { args = JSON.parse(data.arguments || "{}"); } catch { args = null; }
    if (!args) return;
    // Acknowledge to the model so it can wrap up.
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: data.call_id,
          output: JSON.stringify({ ok: true }),
        },
      }));
      wsRef.current.send(JSON.stringify({
        type: "response.create",
        response: { modalities: ["text", "audio"] },
      }));
    }
    onCompleteRef.current(args, transcript);
  }, [transcript]);

  const handleEvent = useCallback((data: any) => {
    switch (data.type) {
      case "response.audio.delta":
        if (data.delta) {
          try { queueRef.current?.addToQueue(decodeAudioFromAPI(data.delta)); }
          catch (e) { console.error("[qualifier-agent] audio decode", e); }
        }
        break;
      case "response.audio_transcript.delta":
        if (data.delta) {
          aiBufferRef.current += data.delta;
          setInterimAi(aiBufferRef.current);
        }
        break;
      case "response.audio_transcript.done": {
        const text = aiBufferRef.current.trim();
        aiBufferRef.current = "";
        setInterimAi("");
        if (text) {
          setTranscript((t) => [...t, { role: "assistant", text, at: new Date().toISOString() }]);
        }
        break;
      }
      case "conversation.item.input_audio_transcription.completed":
        if (data.transcript) {
          setInterimUser("");
          setTranscript((t) => [...t, {
            role: "user", text: data.transcript, at: new Date().toISOString(),
          }]);
        }
        break;
      case "input_audio_buffer.speech_started":
        setConversationState("listening");
        setInterimUser("");
        break;
      case "input_audio_buffer.speech_stopped":
        setConversationState("processing");
        break;
      case "response.created":
        setConversationState("speaking");
        break;
      case "response.function_call_arguments.done":
        handleToolCall(data);
        break;
      case "error":
        setError(data.error?.message || "Voice error");
        break;
      case "connection.closed":
        setError(data.reason || "Connection closed");
        setConnectionState("disconnected");
        break;
    }
  }, [handleToolCall]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      setConnectionState("connecting");
      audioCtxRef.current = await primeAudioContext();
      queueRef.current = new AudioQueue(audioCtxRef.current, {
        onPlaybackStart: () => setConversationState("speaking"),
        onPlaybackEnd: () => setConversationState("listening"),
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const wsUrl =
        supabaseUrl.replace(/^https?:/, "wss:") +
        `/functions/v1/openai-realtime-qualifier?project_type=${encodeURIComponent(projectType)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("connected");
        setConversationState("listening");
        startRecording();
      };
      ws.onmessage = (event) => {
        try { handleEvent(JSON.parse(event.data)); }
        catch (e) { console.error("[qualifier-agent] parse", e); }
      };
      ws.onerror = () => { setError("Connection error"); setConnectionState("error"); };
      ws.onclose = () => { setConnectionState("disconnected"); setConversationState("idle"); stopRecording(); };
    } catch (err) {
      console.error("[qualifier-agent] connect", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnectionState("error");
    }
  }, [projectType, handleEvent, startRecording, stopRecording]);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connectionState, conversationState,
    isConnected: connectionState === "connected",
    isListening: conversationState === "listening",
    isSpeaking: conversationState === "speaking",
    isProcessing: conversationState === "processing",
    interimUser, interimAi, transcript, error,
    connect, disconnect,
  };
}