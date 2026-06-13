import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranscribeAudio } from '@/hooks/useVoiceNotes';
import { useIntegrationDisabled } from '@/hooks/useIntegrationDisabled';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({ onTranscript, disabled, className }: VoiceInputButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const voiceDisabled = useIntegrationDisabled('openai_voice');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcribeAudio = useTranscribeAudio();

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) {
          toast.error('Recording too short');
          setState('idle');
          return;
        }

        setState('transcribing');
        try {
          const text = await transcribeAudio.mutateAsync(audioBlob);
          onTranscript(text);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Transcription failed');
        } finally {
          setState('idle');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setState('recording');
    } catch (err) {
      console.error('Mic access failed:', err);
      toast.error('Could not access microphone');
      setState('idle');
    }
  }, [transcribeAudio, onTranscript]);

  const handleClick = useCallback(() => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  }, [state, startRecording, stopRecording]);

  if (voiceDisabled) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={disabled || state === 'transcribing'}
      className={cn(
        'shrink-0',
        state === 'recording' && 'bg-red-100 border-red-500 text-red-600 hover:bg-red-200',
        className
      )}
      title={
        state === 'recording'
          ? 'Stop recording'
          : state === 'transcribing'
            ? 'Transcribing...'
            : 'Start voice input'
      }
    >
      {state === 'transcribing' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === 'recording' ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
