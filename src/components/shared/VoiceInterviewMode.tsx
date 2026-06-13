import { useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2, SkipForward, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useRealtimeVoiceInterview } from '@/hooks/useRealtimeVoiceInterview';
import type { LogSection, LogFormValues, LogType } from '@/types/logs';
import { LOG_TYPE_INFO } from '@/types/logs';

interface VoiceInterviewModeProps {
  logType: LogType;
  sections: LogSection[];
  values: LogFormValues;
  onValueChange: (fieldId: string, value: unknown) => void;
  onSubmit: () => void;
}

export function VoiceInterviewMode({
  logType, sections, values, onValueChange, onSubmit,
}: VoiceInterviewModeProps) {
  const {
    connectionState, isListening, isSpeaking, isProcessing,
    currentFieldIndex, currentField, totalFields, progress,
    transcript, aiTranscript, error, connect, disconnect, skipCurrentField,
  } = useRealtimeVoiceInterview({ logType, sections, values, onValueChange, onSubmit });

  const logInfo = LOG_TYPE_INFO[logType];

  useEffect(() => {
    if (connectionState === 'disconnected' && !error) connect();
    
    return () => {
      disconnect();
    };
  }, []);

  if (connectionState === 'connecting' || connectionState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        {connectionState === 'connecting' ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-muted-foreground">Connecting to voice assistant...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <MicOff className="h-16 w-16 text-destructive" />
            <p className="text-destructive font-medium">{error || 'Connection failed'}</p>
            <Button onClick={connect}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{logInfo.label}</span>
          <span>Question {currentFieldIndex + 1} of {totalFields}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main interview card */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-8">
          {/* Voice indicator */}
          <div className="h-40 flex items-center justify-center">
            {isSpeaking ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 bg-primary/20 rounded-full animate-ping" />
                <div className="absolute w-24 h-24 bg-primary/30 rounded-full animate-pulse" />
                <div className="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                  <Volume2 className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
            ) : isListening ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 bg-green-500/20 rounded-full animate-pulse" />
                <div className="absolute w-24 h-24 bg-green-500/30 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <Mic className="h-10 w-10 text-white" />
                </div>
              </div>
            ) : isProcessing ? (
              <div className="relative w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              </div>
            ) : (
              <div className="relative w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <Mic className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Status text */}
          <p className={cn(
            "text-sm font-medium",
            isSpeaking && "text-primary",
            isListening && "text-green-500",
            isProcessing && "text-muted-foreground"
          )}>
            {isSpeaking ? 'AI is speaking...' : isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Ready'}
          </p>

          {/* Current question */}
          {currentField && (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{currentField.section}</p>
              <p className="text-lg font-medium text-foreground">
                {currentField.label}
                {currentField.required && <span className="text-destructive ml-1">*</span>}
              </p>
              {currentField.options && currentField.options.length > 0 && (
                <p className="text-sm text-muted-foreground">Options: {currentField.options.join(', ')}</p>
              )}
            </div>
          )}

          {/* AI transcript */}
          {aiTranscript && (
            <div className="bg-primary/10 rounded-lg p-4 max-w-md w-full">
              <p className="text-sm italic">"{aiTranscript}"</p>
            </div>
          )}

          {/* User transcript */}
          {transcript && (
            <div className="bg-muted rounded-lg p-4 max-w-md w-full">
              <p className="text-xs text-muted-foreground mb-1">You said:</p>
              <p className="text-sm text-foreground">"{transcript}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={skipCurrentField}>
          <SkipForward className="h-4 w-4 mr-2" />
          Skip
        </Button>
        <Button onClick={onSubmit} className="flex-1">
          <Send className="h-4 w-4 mr-2" />
          End & Submit
        </Button>
      </div>

      {/* Debug info (visible in dev) */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs font-mono space-y-1">
          <div>Connection: {connectionState}</div>
          <div>Field: {currentFieldIndex + 1}/{totalFields}</div>
          <div>Listening: {isListening ? 'yes' : 'no'} | Speaking: {isSpeaking ? 'yes' : 'no'} | Processing: {isProcessing ? 'yes' : 'no'}</div>
          {error && <div className="text-destructive">Error: {error}</div>}
        </div>
      )}
    </div>
  );
}
