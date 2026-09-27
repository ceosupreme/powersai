import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Hero } from "@/components/marketing/studio/sections/Hero";
import { AfterClick } from "@/components/marketing/studio/sections/AfterClick";
import { HomeIndustries } from "@/components/marketing/studio/sections/HomeIndustries";
import { SelectedWork } from "@/components/marketing/studio/sections/SelectedWork";
import { HomeProcess } from "@/components/marketing/studio/sections/HomeProcess";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { StudioReveal } from "@/components/marketing/studio/StudioReveal";
import { OfferSection } from "@/components/marketing/offer/OfferSection";

export default function MarketingSite() {
  const { user, isLoading } = useAuth();
  const { hash } = useLocation();

  useStudioHead({
    title: "Supreme Team Media | Websites That Run Your Business",
    description:
      "Websites, branding, marketing and connected business systems for companies that need a stronger customer experience and a smarter way to run the work behind it.",
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
        <AfterClick />
        <HomeIndustries />
        <StudioReveal><SelectedWork /></StudioReveal>
        <StudioReveal><OfferSection source="home" compact /></StudioReveal>
        <StudioReveal><HomeProcess /></StudioReveal>
        <StudioReveal><Inquiry /></StudioReveal>
      </main>
      <StudioFooter />
    </div>
  );
}
