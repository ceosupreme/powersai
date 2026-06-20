import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, MessageSquare, Mic, FormInput } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffectiveQualifierFields, useQualifierConfig } from "@/hooks/useEffectiveQualifierFields";
import type { ProjectType } from "@/lib/effectivePillars";
import { VoiceQualifier } from "@/components/qualifier/VoiceQualifier";
import { ChatQualifier } from "@/components/qualifier/ChatQualifier";
import { FormQualifier } from "@/components/qualifier/FormQualifier";

// Map landing slug -> vertical config key + display copy.
const SLUG_TO_TYPE: Record<string, { projectType: ProjectType; brand: string; tagline: string }> = {
  "home-services": {
    projectType: "home_services" as ProjectType,
    brand: "Home Services",
    tagline: "Get a real estimate fast — no phone tag.",
  },
};

export default function QualifyLanding() {
  const { slug = "home-services" } = useParams();
  const cfg = SLUG_TO_TYPE[slug] ?? SLUG_TO_TYPE["home-services"];
  const projectType = cfg.projectType;

  // Fields are loaded for the form fallback; voice + chat load their own copy
  // server-side via the edge functions so the public page doesn't need auth.
  const fieldsQ = useEffectiveQualifierFields(null, projectType);
  const configQ = useQualifierConfig(projectType);

  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [submittedReady, setSubmittedReady] = useState(false);

  useEffect(() => {
    document.title = `${cfg.brand} — talk to our intake assistant`;
  }, [cfg.brand]);

  const handleSubmitted = (id: string, ready: boolean) => {
    setSubmittedLeadId(id);
    setSubmittedReady(ready);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Use bone bg + forest accents inline so the page is self-contained even
  // if visited outside the marketing site shell.
  const fields = useMemo(() => fieldsQ.data ?? [], [fieldsQ.data]);

  return (
    <div className="min-h-screen bg-[hsl(40,33%,96%)] text-foreground">
      <header className="border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-forest" />
            <span className="font-semibold">{cfg.brand}</span>
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
            {cfg.tagline}
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
            <TabsTrigger value="voice" className="text-sm"><Mic className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Voice</span></TabsTrigger>
            <TabsTrigger value="chat" className="text-sm"><MessageSquare className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Chat</span></TabsTrigger>
            <TabsTrigger value="form" className="text-sm"><FormInput className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Form</span></TabsTrigger>
          </TabsList>
          <TabsContent value="voice" className="mt-5">
            <VoiceQualifier projectType={projectType} onSubmitted={handleSubmitted} />
          </TabsContent>
          <TabsContent value="chat" className="mt-5">
            <ChatQualifier projectType={projectType} onSubmitted={handleSubmitted} />
          </TabsContent>
          <TabsContent value="form" className="mt-5">
            {fieldsQ.isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-10">Loading…</div>
            ) : (
              <FormQualifier projectType={projectType} fields={fields} onSubmitted={handleSubmitted} />
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