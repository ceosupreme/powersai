import { Link } from "react-router-dom";
import { getStudioMedia } from "@/config/studioMedia";
import { BrowserFrame } from "../BrowserFrame";
import { Container } from "../primitives";
import { requestServiceIntent } from "../serviceIntent";

const LABELS = ["Operating visibility", "Team workflows", "AI-assisted insights"];

export function BarPulseFeature() {
  const media = getStudioMedia("work-barpulse");

  return (
    <section id="barpulse" className="studio-band studio-section">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <span className="studio-eyebrow block" style={{ color: "hsl(var(--band-text) / 0.75)" }}>
              Featured system · BarPulse
            </span>
            <h2 className="studio-display mt-5 text-balance" style={{ fontSize: "clamp(2rem, 3.6vw, 3.1rem)" }}>
              Built for the work behind the business.
            </h2>
            <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground md:text-lg">
              For an eight-venue hospitality group, Sean built BarPulse to connect operating information, customize
              scorecards and reporting, and make management workflows easier to review.
            </p>
            <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-muted-foreground">
              The engagement included integrations with Toast, 7shifts and Asana, plus weekly reviews and refinements
              with ownership.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {LABELS.map((l) => (
                <span
                  key={l}
                  className="rounded-lg border border-[hsl(var(--band-text)/0.28)] px-3 py-2 text-[0.85rem]"
                >
                  {l}
                </span>
              ))}
            </div>
            <p className="mt-7 text-[0.82rem] text-muted-foreground">
              Historical implementation. Demonstrations use permitted or clearly labeled sample data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/work/barpulse" className="studio-btn studio-btn-primary">
                Explore the BarPulse project
              </Link>
              <a
                href="#contact"
                onClick={() => requestServiceIntent("ai-systems")}
                className="studio-btn studio-btn-outline"
              >
                Discuss a similar system
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            {media?.src && (
              <BrowserFrame className="studio-browser-frame-dark">
                <img
                  src={media.src}
                  alt={media.alt}
                  width={media.width}
                  height={media.height}
                  loading="lazy"
                  className="size-full"
                  style={{
                    aspectRatio: media.aspectRatio,
                    objectFit: media.objectFit,
                    objectPosition: media.objectPosition ?? "center",
                  }}
                />
              </BrowserFrame>
            )}

            <div className="mt-5 rounded-lg border border-[hsl(var(--band-text)/0.2)] p-5">
              <p className="studio-label" style={{ color: "hsl(var(--band-text) / 0.65)" }}>
                Historical integration example
              </p>
              <div className="studio-system-flow mt-5" aria-label="Toast POS, 7shifts, and Asana flowed into BarPulse, then into briefs, tasks, and insights">
                <div className="studio-system-sources">
                  <span>Toast POS</span><span>7shifts</span><span>Asana</span>
                </div>
                <span className="studio-system-arrow" aria-hidden>→</span>
                <strong>BarPulse</strong>
                <span className="studio-system-arrow" aria-hidden>→</span>
                <div className="studio-system-outputs">
                  <span>Brief</span><span>Tasks</span><span>Insights</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[hsl(var(--band-text)/0.16)] pt-5">
                <div><span className="studio-display block text-[0.88rem]">Discovery</span><span className="mt-1 block text-[0.72rem] leading-snug text-muted-foreground">Weekly review needs</span></div>
                <div><span className="studio-display block text-[0.88rem]">Integration</span><span className="mt-1 block text-[0.72rem] leading-snug text-muted-foreground">One operating picture</span></div>
                <div><span className="studio-display block text-[0.88rem]">Refinement</span><span className="mt-1 block text-[0.72rem] leading-snug text-muted-foreground">Scoring and reporting</span></div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
