import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Hero, ScopeStrip } from "@/components/marketing/studio/sections/Hero";
import { SelectedWork } from "@/components/marketing/studio/sections/SelectedWork";
import { Capabilities } from "@/components/marketing/studio/sections/Capabilities";
import { BuyerChooser } from "@/components/marketing/studio/sections/BuyerChooser";
import { BarPulseFeature } from "@/components/marketing/studio/sections/BarPulseFeature";
import { WhySupremeTeam } from "@/components/marketing/studio/sections/WhySupremeTeam";
import { Founder } from "@/components/marketing/studio/sections/Founder";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { StudioReveal } from "@/components/marketing/studio/StudioReveal";
import { StudioMediaReel } from "@/components/marketing/studio/sections/StudioMediaReel";

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
        <StudioReveal><SelectedWork /></StudioReveal>
        <StudioReveal><StudioMediaReel /></StudioReveal>
        <ScopeStrip />
        <StudioReveal><BuyerChooser /></StudioReveal>
        <StudioReveal><Capabilities /></StudioReveal>
        <StudioReveal><BarPulseFeature /></StudioReveal>
        <StudioReveal><WhySupremeTeam /></StudioReveal>
        <StudioReveal><Founder /></StudioReveal>
        <StudioReveal><Inquiry /></StudioReveal>
      </main>
      <StudioFooter />
    </div>
  );
}
