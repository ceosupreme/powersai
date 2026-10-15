import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { HomeOpening } from "@/components/marketing/studio/home-opening/HomeOpening";
import { AfterDark } from "@/components/marketing/studio/sections/AfterDark";
import { SelectedWork } from "@/components/marketing/studio/sections/SelectedWork";
import { HomeCheckup } from "@/components/marketing/studio/sections/HomeCheckup";
import { StartingPoint } from "@/components/marketing/studio/sections/StartingPoint";
import { HomeBlog } from "@/components/marketing/studio/sections/HomeBlog";
import { HomeFaq } from "@/components/marketing/studio/sections/HomeFaq";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { StudioReveal } from "@/components/marketing/studio/StudioReveal";
import { HomePackages } from "@/components/marketing/studio/sections/HomePackages";
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
        {/* The opening: header, hero, then the free checkup with the form
            right on the page, then the services board. After that one promise
            slide, the 3 AM scene ("We build websites that work while you
            sleep", with the overnight activity boxes), then the proof: Work,
            with the featured brands switching on as it scrolls in, and the
            client reviews. Then "Where are you starting from?": four
            situations, each with one next step. Then the blog (hidden until a
            post is published), the questions owners ask before they reach out
            (which also cover how a project works, so there's no separate
            section for it), "Let's build yours" pointing to packages, and the
            contact form. Industry pages stay linked from the header and footer. */}
        <HomeOpening afterHero={<HomeCheckup />} />
        <AfterDark />
        <SelectedWork />
        <Testimonials />
        <StartingPoint />
        <HomeBlog />
        <HomeFaq />
        <StudioReveal><HomePackages /></StudioReveal>
        <StudioReveal><Inquiry /></StudioReveal>
      </main>
      <StudioFooter />
    </div>
  );
}
