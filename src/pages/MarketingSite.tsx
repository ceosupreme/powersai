import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Nav } from "@/components/marketing/rebuild/Nav";
import { Hero } from "@/components/marketing/rebuild/Hero";
import { Problem } from "@/components/marketing/rebuild/Problem";
import { Outcomes } from "@/components/marketing/rebuild/Outcomes";
import { BarPulseProof } from "@/components/marketing/rebuild/BarPulseProof";
import { Process } from "@/components/marketing/rebuild/Process";
import { Founder } from "@/components/marketing/rebuild/Founder";
import { FAQ } from "@/components/marketing/rebuild/FAQ";
import { Contact } from "@/components/marketing/rebuild/Contact";
import { Footer } from "@/components/marketing/rebuild/Footer";

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
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Problem />
        <Outcomes />
        <BarPulseProof />
        <Process />
        <Founder />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}