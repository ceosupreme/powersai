import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Nav } from "@/components/marketing/site/Nav";
import { Hero } from "@/components/marketing/sections/Hero";
import { TechStack } from "@/components/marketing/sections/TechStack";
import { LeadFollowUpShowcase } from "@/components/marketing/sections/showcase/LeadFollowUpShowcase";
import { InsightsShowcase } from "@/components/marketing/sections/showcase/InsightsShowcase";
import { ChatMarquee } from "@/components/marketing/sections/ChatMarquee";
import { AssistantShowcase } from "@/components/marketing/sections/showcase/AssistantShowcase";
import { AutomationsShowcase } from "@/components/marketing/sections/showcase/AutomationsShowcase";
import { ContentShowcase } from "@/components/marketing/sections/showcase/ContentShowcase";
import { Proof } from "@/components/marketing/sections/Proof";
import { ConnectiveLayer } from "@/components/marketing/sections/ConnectiveLayer";
import { WhatIBuild } from "@/components/marketing/sections/WhatIBuild";
import { Process } from "@/components/marketing/sections/Process";
import { Industries } from "@/components/marketing/sections/Industries";
import { FAQ } from "@/components/marketing/sections/FAQ";
import { FinalCTA } from "@/components/marketing/sections/FinalCTA";
import { Contact } from "@/components/marketing/sections/Contact";
import { Footer } from "@/components/marketing/sections/Footer";

export default function Marketing() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Supreme Team Media — AI Systems & Operational Intelligence Studio";

    const ensureMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("content");
      el.setAttribute("content", content);
      return () => { if (prev !== null) el!.setAttribute("content", prev); };
    };
    const restoreDesc = ensureMeta(
      "description",
      "Supreme Team Media builds practical AI systems that turn fragmented operations — POS, scheduling, tasks, marketing — into one live operating picture.",
    );
    const restoreOgT = ensureMeta(
      "og:title",
      "Supreme Team Media — AI Systems & Operational Intelligence Studio",
      "property",
    );
    const restoreOgD = ensureMeta(
      "og:description",
      "A strategic AI-systems partner that turns scattered tools into one operating picture. Real proof, no buzzwords.",
      "property",
    );

    return () => {
      document.title = prevTitle;
      restoreDesc(); restoreOgT(); restoreOgD();
    };
  }, []);

  // Signed-in visitors don't see marketing — send them to the existing app landing.
  if (!isLoading && user) return <Navigate to="/portfolio" replace />;

  return (
    <div className="stm-marketing relative min-h-screen">
      <div aria-hidden className="grain fixed inset-0 z-0" />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <TechStack />
        <LeadFollowUpShowcase />
        <InsightsShowcase />
        <ChatMarquee />
        <AssistantShowcase />
        <AutomationsShowcase />
        <ContentShowcase />
        <Proof />
        <ConnectiveLayer />
        <WhatIBuild />
        <Process />
        <Industries />
        <FAQ />
        <FinalCTA />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}