import { Link } from "react-router-dom";
import { Container } from "../primitives";
import { requestServiceIntent } from "../serviceIntent";

const LABELS = ["Operating visibility", "Team workflows", "AI-assisted insights"];

export function BarPulseFeature() {
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
            <div className="rounded-xl border border-[hsl(var(--band-text)/0.2)] p-6">
              <p className="studio-label" style={{ color: "hsl(var(--band-text) / 0.6)" }}>
                Engagement shape
              </p>
              <ul className="mt-4 space-y-4 text-[0.95rem]">
                <li>
                  <span className="studio-display block text-[1.05rem]">Discovery</span>
                  <span className="text-muted-foreground">What ownership needed to review each week.</span>
                </li>
                <li>
                  <span className="studio-display block text-[1.05rem]">Integration</span>
                  <span className="text-muted-foreground">Toast, 7shifts and Asana connected into one picture.</span>
                </li>
                <li>
                  <span className="studio-display block text-[1.05rem]">Refinement</span>
                  <span className="text-muted-foreground">Scoring and reporting tuned with ownership over time.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
