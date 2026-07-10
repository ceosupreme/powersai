import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageSquare, Mic, FormInput } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffectiveQualifierFields, useQualifierConfig } from "@/hooks/useEffectiveQualifierFields";
import type { ProjectType } from "@/lib/effectivePillars";
import { VoiceQualifier } from "@/components/qualifier/VoiceQualifier";
import { ChatQualifier } from "@/components/qualifier/ChatQualifier";
import { FormQualifier } from "@/components/qualifier/FormQualifier";

interface Props {
  projectType: ProjectType;
  brand: string;
  tagline: string;
  /** When this intake is for a specific client (per-client URL), pass the
   *  resolved venues.id so submitted leads carry it through to follow-up. */
  capturedForProjectId: string | null;
}

/**
 * Shared UI for both /qualify/:slug (vertical, capturedForProjectId=null)
 * and /q/:venueSlug (client-specific). Pure presentation + the 3 qualifier
 * widgets — no qualifier logic lives here.
 */
export function QualifierShell({ projectType, brand, tagline, capturedForProjectId }: Props) {
  const fieldsQ = useEffectiveQualifierFields(null, projectType);
  const configQ = useQualifierConfig(projectType);

  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [submittedReady, setSubmittedReady] = useState(false);

  useEffect(() => {
    document.title = `${brand} — talk to our intake assistant`;
  }, [brand]);

  const handleSubmitted = (id: string, ready: boolean) => {
    setSubmittedLeadId(id);
    setSubmittedReady(ready);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fields = useMemo(() => fieldsQ.data ?? [], [fieldsQ.data]);

  return (
    <div className="stm-marketing min-h-screen bg-[hsl(40,33%,96%)] text-foreground">
      <header className="border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-forest" />
            <span className="font-semibold">{brand}</span>
          </div>
          <span className="text-[11px] sm:text-xs text-muted-foreground">Powered by intake AI</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-10 space-y-6 sm:space-y-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="space-y-3 text-center">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-forest font-semibold">
            New customer intake
          </p>
          <h1 className="text-[28px] leading-tight sm:text-4xl md:text-5xl font-semibold tracking-tight">
            {tagline}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Tell us what you need in a quick voice or text conversation. We'll get back to you
            today — usually within the hour.
          </p>
        </div>

        {submittedLeadId && (
          <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-forest mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-forest">Thanks — we've got your details.</p>
              <p className="text-muted-foreground">
                {submittedReady
                  ? "A team member will reach out shortly."
                  : "We'll follow up to confirm a few more details."}
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="voice" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-11">
            <TabsTrigger value="voice" className="text-xs sm:text-sm gap-1 sm:gap-1.5"><Mic className="h-4 w-4" /> Voice</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs sm:text-sm gap-1 sm:gap-1.5"><MessageSquare className="h-4 w-4" /> Chat</TabsTrigger>
            <TabsTrigger value="form" className="text-xs sm:text-sm gap-1 sm:gap-1.5"><FormInput className="h-4 w-4" /> Form</TabsTrigger>
          </TabsList>
          <TabsContent value="voice" className="mt-5">
            <VoiceQualifier
              projectType={projectType}
              capturedForProjectId={capturedForProjectId}
              onSubmitted={handleSubmitted}
            />
          </TabsContent>
          <TabsContent value="chat" className="mt-5">
            <ChatQualifier
              projectType={projectType}
              capturedForProjectId={capturedForProjectId}
              onSubmitted={handleSubmitted}
            />
          </TabsContent>
          <TabsContent value="form" className="mt-5">
            {fieldsQ.isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-10">Loading…</div>
            ) : (
              <FormQualifier
                projectType={projectType}
                fields={fields}
                capturedForProjectId={capturedForProjectId}
                onSubmitted={handleSubmitted}
              />
            )}
          </TabsContent>
        </Tabs>

        {configQ.data?.ready_definition && (
          <p className="text-xs text-center text-muted-foreground max-w-md mx-auto pt-2">
            We use what you share to match you with the right team. We only contact you about
            your request.
          </p>
        )}
      </main>
    </div>
  );
}

/** Shared "not found" panel reused by both qualifier routes. */
export function QualifierNotFound({ message }: { message: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(40,33%,96%)] px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function QualifierLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(40,33%,96%)] text-muted-foreground text-sm">
      Loading…
    </div>
  );
}