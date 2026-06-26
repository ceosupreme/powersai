import { useEffect, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useRealtimeQualifierAgent,
  type SubmitQualifiedLeadPayload,
  type QualifierTranscriptTurn,
} from "@/hooks/useRealtimeQualifierAgent";
import { toast } from "sonner";

interface Props {
  projectType: string;
  capturedForProjectId?: string | null;
  onSubmitted: (leadId: string, isReady: boolean) => void;
}

export function VoiceQualifier({ projectType, capturedForProjectId = null, onSubmitted }: Props) {
  const [autoStarted, setAutoStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async (
    payload: SubmitQualifiedLeadPayload,
    transcript: QualifierTranscriptTurn[],
  ) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const qd = payload.qualifier_data || {};
      const name = String(qd.contact || qd.name || "Voice lead").slice(0, 200);
      const phone = String(qd.phone || "").slice(0, 40) || null;
      const email = String(qd.email || "").slice(0, 255) || null;
      const { data, error } = await supabase.functions.invoke("submit-inbound-lead", {
        body: {
          name,
          email,
          phone,
          message: payload.summary ?? null,
          project_type: projectType,
          qualifier_data: qd,
          is_ready: !!payload.is_ready,
          not_ready_reason: payload.not_ready_reason ?? null,
          transcript,
          conversation_channel: "voice",
          route_to: "self",
          captured_for_project_id: capturedForProjectId ?? null,
        },
      });
      if (error) throw error;
      onSubmitted((data as any)?.id ?? "", !!payload.is_ready);
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't save your info. Please try the form below.");
    } finally {
      setSubmitting(false);
    }
  };

  const agent = useRealtimeQualifierAgent({ projectType, onComplete: handleComplete });

  useEffect(() => {
    return () => agent.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    setAutoStarted(true);
    agent.connect();
  };

  if (!autoStarted) {
    return (
      <Card className="border-forest/30">
        <CardContent className="flex flex-col items-center gap-5 px-4 sm:px-6 py-8 sm:py-10 text-center">
          <div className="h-20 w-20 rounded-full bg-forest/10 flex items-center justify-center">
            <Mic className="h-9 w-9 text-forest" />
          </div>
          <div className="space-y-1">
            <p className="text-base sm:text-lg font-semibold">Talk to our intake assistant</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              A quick voice conversation — about 90 seconds. We'll ask a few simple questions
              and get back to you fast.
            </p>
          </div>
          <Button size="lg" onClick={start} className="bg-forest hover:bg-forest/90 text-bone h-14 px-8 text-base w-full sm:w-auto">
            <Mic className="h-4 w-4 mr-2" /> Start the call
          </Button>
          <p className="text-xs text-muted-foreground">You'll be asked to share your microphone.</p>
        </CardContent>
      </Card>
    );
  }

  if (agent.connectionState === "connecting") {
    return (
      <Card><CardContent className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-forest" />
        <p className="text-sm text-muted-foreground">Connecting…</p>
      </CardContent></Card>
    );
  }

  if (agent.connectionState === "error") {
    return (
      <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <MicOff className="h-10 w-10 text-destructive" />
        <p className="text-sm font-medium text-destructive">{agent.error || "Connection failed"}</p>
        <Button variant="outline" onClick={start}>Try again</Button>
      </CardContent></Card>
    );
  }

  return (
    <Card className="border-forest/30">
      <CardContent className="flex flex-col items-center gap-6 px-4 sm:px-6 py-8 sm:py-10">
        <div className="h-32 flex items-center justify-center">
          {agent.isSpeaking ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 bg-forest/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 bg-forest rounded-full flex items-center justify-center">
                <Volume2 className="h-9 w-9 text-bone" />
              </div>
            </div>
          ) : agent.isListening ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 bg-forest/15 rounded-full animate-pulse" />
              <div className="relative w-20 h-20 bg-forest/90 rounded-full flex items-center justify-center">
                <Mic className="h-9 w-9 text-bone" />
              </div>
            </div>
          ) : agent.isProcessing ? (
            <div className="relative w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <Loader2 className="h-9 w-9 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="relative w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <Mic className="h-9 w-9 text-muted-foreground" />
            </div>
          )}
        </div>
        <p className={cn(
          "text-sm font-medium",
          agent.isSpeaking && "text-forest",
          agent.isListening && "text-forest/80",
          agent.isProcessing && "text-muted-foreground",
        )}>
          {submitting ? "Saving your info…"
            : agent.isSpeaking ? "Assistant is speaking…"
            : agent.isListening ? "Listening…"
            : agent.isProcessing ? "Thinking…" : "Ready"}
        </p>

        {agent.interimAi && (
          <div className="bg-forest/5 border border-forest/15 rounded-lg p-3 max-w-md w-full">
            <p className="text-sm italic text-forest">"{agent.interimAi}"</p>
          </div>
        )}
        {agent.interimUser && (
          <div className="bg-muted rounded-lg p-3 max-w-md w-full">
            <p className="text-xs text-muted-foreground mb-1">You</p>
            <p className="text-sm">"{agent.interimUser}"</p>
          </div>
        )}

        {agent.transcript.length > 0 && (
          <div className="w-full max-w-md max-h-44 overflow-y-auto space-y-2 text-xs">
            {agent.transcript.slice(-6).map((t, i) => (
              <div key={i} className={cn("rounded p-2",
                t.role === "assistant" ? "bg-forest/5 text-forest" : "bg-muted")}>
                <span className="font-semibold mr-1">{t.role === "assistant" ? "AI" : "You"}:</span>
                {t.text}
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" onClick={agent.disconnect} className="min-h-11 w-full sm:w-auto">
          <PhoneOff className="h-4 w-4 mr-2" /> End call
        </Button>
      </CardContent>
    </Card>
  );
}