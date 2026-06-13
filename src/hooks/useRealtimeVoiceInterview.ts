import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  AudioRecorder, 
  AudioQueue, 
  encodeAudioForAPI, 
  decodeAudioFromAPI,
  primeAudioContext 
} from '@/utils/audioHelpers';
import type { LogSection, LogFormValues } from '@/types/logs';

interface VoiceInterviewField {
  field_id: string;
  label: string;
  field_type: string;
  options?: string[];
  required: boolean;
  section: string;
}

interface UseRealtimeVoiceInterviewOptions {
  logType: string;
  sections: LogSection[];
  values: LogFormValues;
  onValueChange: (fieldId: string, value: unknown) => void;
  onSubmit: () => void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type ConversationState = 'idle' | 'listening' | 'speaking' | 'processing';

export function useRealtimeVoiceInterview({
  logType,
  sections,
  values,
  onValueChange,
  onSubmit,
}: UseRealtimeVoiceInterviewOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Flatten fields from sections
  const fields: VoiceInterviewField[] = sections.flatMap(section =>
    section.fields.map(field => ({
      field_id: field.field_id,
      label: field.form_fields.label,
      field_type: field.form_fields.field_type,
      options: field.form_fields.options_json as string[] | undefined,
      required: field.required,
      section: section.name,
    }))
  );

  const currentField = fields[currentFieldIndex];
  const progress = fields.length > 0 ? ((currentFieldIndex + 1) / fields.length) * 100 : 0;

  const connect = useCallback(async () => {
    try {
      setError(null);
      setConnectionState('connecting');

      // Prime audio context for iOS Safari (plays silent audio to unlock)
      audioContextRef.current = await primeAudioContext();

      // Build WebSocket URL with log context
      const fieldsParam = encodeURIComponent(JSON.stringify(fields));
      const wsUrl = `wss://coucprydwkljhibezqjp.supabase.co/functions/v1/openai-realtime-proxy?logType=${logType}&fields=${fieldsParam}`;
      
      console.log('Connecting to voice interview...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set up audio queue for playback
      audioQueueRef.current = new AudioQueue(audioContextRef.current, {
        onPlaybackStart: () => setConversationState('speaking'),
        onPlaybackEnd: () => setConversationState('listening'),
      });

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        setConversationState('listening');
        startRecording();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleOpenAIEvent(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
        setConnectionState('error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        setConversationState('idle');
        stopRecording();
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnectionState('error');
    }
  }, [logType, fields]);

  const disconnect = useCallback(() => {
    stopRecording();
    audioQueueRef.current?.clear();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionState('disconnected');
    setConversationState('idle');
  }, []);

  const startRecording = useCallback(() => {
    if (recorderRef.current) return;

    const recorder = new AudioRecorder((audioData) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const base64Audio = encodeAudioForAPI(audioData);
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio,
        }));
      }
    });

    recorder.start().catch(err => {
      console.error('Failed to start recording:', err);
      setError('Microphone access denied');
    });

    recorderRef.current = recorder;
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  }, []);

  const handleOpenAIEvent = useCallback((data: any) => {
    // Comprehensive logging for debugging
    const eventType = data.type;
    if (eventType !== 'response.audio.delta') {
      console.log('[Voice Interview] Event:', eventType, data);
    } else {
      console.log('[Voice Interview] Audio delta received, length:', data.delta?.length || 0);
    }

    switch (eventType) {
      case 'response.audio.delta':
        // Decode and queue audio for playback
        if (data.delta) {
          try {
            const audioBytes = decodeAudioFromAPI(data.delta);
            console.log('[Voice Interview] Queueing audio bytes:', audioBytes.length);
            audioQueueRef.current?.addToQueue(audioBytes);
          } catch (err) {
            console.error('[Voice Interview] Failed to decode audio:', err);
          }
        }
        break;

      case 'response.audio_transcript.delta':
        // AI is speaking - update transcript
        if (data.delta) {
          setAiTranscript(prev => prev + data.delta);
        }
        break;

      case 'response.audio_transcript.done':
        // AI finished speaking this segment
        console.log('[Voice Interview] AI transcript complete');
        setAiTranscript('');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        if (data.transcript) {
          console.log('[Voice Interview] User said:', data.transcript);
          setTranscript(data.transcript);
        }
        break;

      case 'input_audio_buffer.speech_started':
        console.log('[Voice Interview] User started speaking');
        setConversationState('listening');
        setTranscript('');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[Voice Interview] User stopped speaking');
        setConversationState('processing');
        break;

      case 'response.function_call_arguments.done':
        // Handle function calls from AI
        console.log('[Voice Interview] Function call:', data.name);
        handleFunctionCall(data);
        break;

      case 'response.created':
        console.log('[Voice Interview] Response created - AI will speak');
        setConversationState('speaking');
        break;

      case 'response.done':
        // Response complete
        console.log('[Voice Interview] Response complete');
        break;

      case 'session.created':
        console.log('[Voice Interview] Session created');
        break;

      case 'session.updated':
        console.log('[Voice Interview] Session configured');
        break;

      case 'error':
        console.error('[Voice Interview] OpenAI error:', data.error);
        setError(data.error?.message || 'An error occurred');
        break;

      case 'connection.closed':
        setError(data.reason || 'Connection closed');
        setConnectionState('disconnected');
        break;

      default:
        // Log unhandled events for debugging
        console.log('[Voice Interview] Unhandled event:', eventType);
    }
  }, []);

  const handleFunctionCall = useCallback((data: any) => {
    const { name } = data;
    let args: Record<string, any> = {};
    
    try {
      args = JSON.parse(data.arguments || '{}');
    } catch (e) {
      console.error('[Voice Interview] Failed to parse function arguments:', e);
      return;
    }

    console.log('[Voice Interview] Function call:', name, 'args:', args, 'call_id:', data.call_id);

    switch (name) {
      case 'save_answer':
        if (args.field_id && args.value !== undefined) {
          // Convert value based on field type
          const field = fields.find(f => f.field_id === args.field_id);
          let parsedValue: unknown = args.value;
          
          if (field) {
            switch (field.field_type) {
              case 'boolean':
                parsedValue = args.value === 'true' || args.value === true;
                break;
              case 'number':
              case 'rating_1_10':
                parsedValue = parseFloat(args.value);
                break;
            }
          }
          
          onValueChange(args.field_id, parsedValue);
          console.log(`[Voice Interview] Saved answer for ${args.field_id}:`, parsedValue);
        }
        break;

      case 'next_field':
        console.log('[Voice Interview] Moving to next field');
        setCurrentFieldIndex(prev => Math.min(prev + 1, fields.length - 1));
        setTranscript('');
        break;

      case 'skip_field':
        console.log('[Voice Interview] Skipping field:', args.field_id);
        if (args.field_id) {
          setCurrentFieldIndex(prev => Math.min(prev + 1, fields.length - 1));
          setTranscript('');
        }
        break;

      case 'submit_log':
        console.log('[Voice Interview] Submitting log...');
        onSubmit();
        disconnect();
        break;

      default:
        console.log('[Voice Interview] Unknown function:', name);
    }

    // Send function call output back to OpenAI
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Voice Interview] Sending function output for call_id:', data.call_id);
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: data.call_id,
          output: JSON.stringify({ success: true }),
        },
      }));
      
      // Trigger response to continue conversation - MUST include modalities for audio output
      console.log('[Voice Interview] Triggering next response with audio modalities');
      wsRef.current.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
        },
      }));
    } else {
      console.error('[Voice Interview] WebSocket not open, cannot send function output');
    }
  }, [fields, onValueChange, onSubmit, disconnect]);

  const skipCurrentField = useCallback(() => {
    console.log('[Voice Interview] Manual skip triggered');
    setCurrentFieldIndex(prev => Math.min(prev + 1, fields.length - 1));
    setTranscript('');
    
    // Notify OpenAI about the skip
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
        }
      }));
    }
  }, [fields.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    connectionState,
    conversationState,
    isConnected: connectionState === 'connected',
    isListening: conversationState === 'listening',
    isSpeaking: conversationState === 'speaking',
    isProcessing: conversationState === 'processing',
    
    // Progress
    currentFieldIndex,
    currentField,
    totalFields: fields.length,
    progress,
    
    // Transcripts
    transcript,
    aiTranscript,
    
    // Error handling
    error,
    
    // Actions
    connect,
    disconnect,
    skipCurrentField,
  };
}
