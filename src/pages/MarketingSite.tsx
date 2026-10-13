import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { HomeOpening } from "@/components/marketing/studio/home-opening/HomeOpening";
import { AfterDark } from "@/components/marketing/studio/sections/AfterDark";
import { BoostBrands, GetAttention } from "@/components/marketing/studio/sections/HomeUsps";
import { SelectedWork } from "@/components/marketing/studio/sections/SelectedWork";
import { StartingPoint } from "@/components/marketing/studio/sections/StartingPoint";
import { HomeBlog } from "@/components/marketing/studio/sections/HomeBlog";
import { HomeFaq } from "@/components/marketing/studio/sections/HomeFaq";
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
      <main>
        <HomeOpening />
        {/* The slide stack, one owner's story: "We build websites that get
            attention" (the bench), then the 3 AM scene slides up over it ("We
            build websites that work while you sleep"), then the rooftop ("We
            boost brands higher, faster").
            Work follows as its own section, the proof right after the
            promises: the featured brands switch on as it scrolls in.
            Then "Where are you starting from?": four situations, each with
            one next step, and the free checkup for anyone who can't pick.
            Then the three newest blog posts (hidden until one is published),
            then the questions owners ask before they reach out (which also
            cover how a project works, so there's no separate section for it).
            Industry pages stay linked from the header and footer. */}
        <div className="stm-stack">
          <GetAttention />
          <div className="stm-stack-hold" aria-hidden="true" />
          <AfterDark />
          <div className="stm-stack-hold long" aria-hidden="true" />
          <BoostBrands />
          <div className="stm-stack-hold" aria-hidden="true" />
        </div>
        <div className="stm-after-stack">
          <SelectedWork />
          <Testimonials />
          <StartingPoint />
          <HomeBlog />
          <HomeFaq />
          <StudioReveal><PricingTeaser /></StudioReveal>
          <StudioReveal><Inquiry /></StudioReveal>
        </div>
      </main>
      <StudioFooter />
    </div>
  );
}
