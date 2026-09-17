import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Hero, ScopeStrip } from "@/components/marketing/studio/sections/Hero";
import { SelectedWork } from "@/components/marketing/studio/sections/SelectedWork";
import { Capabilities } from "@/components/marketing/studio/sections/Capabilities";
import { InteractiveStudioMap } from "@/components/marketing/studio/sections/InteractiveStudioMap";
import { BarPulseFeature } from "@/components/marketing/studio/sections/BarPulseFeature";
import { ProcessSection } from "@/components/marketing/studio/sections/ProcessSection";
import { Founder } from "@/components/marketing/studio/sections/Founder";
import { FAQ } from "@/components/marketing/studio/sections/FAQ";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { StudioReveal } from "@/components/marketing/studio/StudioReveal";

export default function MarketingSite() {
  const { user, isLoading } = useAuth();
  const { hash } = useLocation();

  useStudioHead({
    title: "Supreme Team Media | Websites, Branding, Marketing & AI Systems",
    description:
      "Founder-led websites, branding, digital marketing and custom AI business systems. Explore Sean Mayo's work and discuss your next project with Supreme Team Media.",
    path: "/",
  });

  // Arriving from another route with a hash (e.g. /#services) must still scroll.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) window.requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }, [hash]);

  // Preserved behavior: signed-in visitors go straight into the app.
  if (!isLoading && user) return <Navigate to="/portfolio" replace />;

  return (
    <div className="stm-studio relative min-h-screen">
      <StudioHeader />
      <main>
        <Hero />
        <ScopeStrip />
        <StudioReveal><SelectedWork /></StudioReveal>
        <StudioReveal><Capabilities /></StudioReveal>
        <StudioReveal><InteractiveStudioMap /></StudioReveal>
        <StudioReveal><BarPulseFeature /></StudioReveal>
        <StudioReveal><ProcessSection /></StudioReveal>
        <StudioReveal><Founder /></StudioReveal>
        <StudioReveal><FAQ /></StudioReveal>
        <StudioReveal><Inquiry /></StudioReveal>
      </main>
      <StudioFooter />
    </div>
  );
}
