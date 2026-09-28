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
import { PricingTeaser } from "@/components/marketing/studio/sections/PricingTeaser";
import { Testimonials } from "@/components/marketing/studio/Testimonials";
import { ROUTE_META } from "@/config/routeMeta";

export default function MarketingSite() {
  const { user, isLoading } = useAuth();
  const { hash } = useLocation();

  useStudioHead({ ...ROUTE_META["/"], path: "/" });

  // Arriving from another route with a hash (e.g. /#services) must still scroll.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    // Artwork and the published-work query can grow sections above a deep link
    // after the browser's initial fragment jump. Keep it anchored while loading.
    let active = true;
    const align = () => {
      if (active && Math.abs(el.getBoundingClientRect().top) > 90) {
        el.scrollIntoView({ block: "start", behavior: "instant" });
      }
    };
    const frame = requestAnimationFrame(align);
    const observer = new ResizeObserver(align);
    const main = document.querySelector("main");
    if (main) observer.observe(main);
    const done = window.setTimeout(() => { active = false; observer.disconnect(); }, 4000);
    const cancel = () => { active = false; observer.disconnect(); };
    window.addEventListener("wheel", cancel, { once: true, passive: true });
    window.addEventListener("touchstart", cancel, { once: true, passive: true });
    return () => {
      cancel();
      cancelAnimationFrame(frame);
      clearTimeout(done);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
    };
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
        <Testimonials />
        <StudioReveal><HomeProcess /></StudioReveal>
        <StudioReveal><PricingTeaser /></StudioReveal>
        <StudioReveal><Inquiry /></StudioReveal>
      </main>
      <StudioFooter />
    </div>
  );
}
