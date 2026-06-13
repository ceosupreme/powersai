import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Save, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSaveVoiceNote, useTranscribeAudio } from '@/hooks/useVoiceNotes';

interface VoiceNoteCaptureProps {
  barId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function VoiceNoteCapture({ barId, onComplete, onCancel }: VoiceNoteCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeAudio = useTranscribeAudio();
  const saveVoiceNote = useSaveVoiceNote();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 1000) {
          toast.error('Recording too short');
          return;
        }

        // Transcribe
        try {
          const text = await transcribeAudio.mutateAsync(audioBlob);
          setTranscript(text);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Transcription failed');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect in 1-second chunks
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Could not access microphone');
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleSave = async () => {
    if (!transcript) return;

    try {
      await saveVoiceNote.mutateAsync({ barId, transcript });
      toast.success('Voice note saved');
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleDiscard = () => {
    setTranscript(null);
    chunksRef.current = [];
  };

  const isTranscribing = transcribeAudio.isPending;
  const isSaving = saveVoiceNote.isPending;

  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 gap-6">
        {/* Recording button */}
        <div className="h-48 flex items-center justify-center">
          {isTranscribing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
              </div>
              <p className="text-muted-foreground">Transcribing...</p>
            </div>
          ) : transcript ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="h-12 w-12 text-white" />
              </div>
              <p className="text-green-600 font-medium">Transcript ready</p>
            </div>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "relative w-32 h-32 rounded-full flex items-center justify-center transition-all",
                isRecording
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-destructive hover:bg-destructive/90"
              )}
            >
              {isRecording && (
                <>
                  <div className="absolute w-40 h-40 bg-destructive/20 rounded-full animate-ping" />
                  <div className="absolute w-36 h-36 bg-destructive/30 rounded-full animate-pulse" />
                </>
              )}
              <div className="relative flex flex-col items-center">
                {isRecording ? (
                  <MicOff className="h-12 w-12 text-white" />
                ) : (
                  <Mic className="h-12 w-12 text-white" />
                )}
              </div>
            </button>
          )}
        </div>

        {/* Instructions */}
        {!transcript && !isTranscribing && (
          <p className="text-muted-foreground text-center">
            {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
          </p>
        )}

        {/* Transcript display */}
        {transcript && (
          <div className="w-full max-w-md bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Transcript:</p>
            <p className="text-foreground">{transcript}</p>
          </div>
        )}

        {/* Action buttons */}
        {transcript && (
          <div className="flex gap-3 w-full max-w-md">
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={isSaving}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Note
            </Button>
          </div>
        )}

        {/* Cancel button when not showing transcript */}
        {!transcript && !isRecording && !isTranscribing && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
