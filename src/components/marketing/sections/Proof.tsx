// INTENTIONAL: "BarPulse" is preserved here by design — do NOT replace during brand sweeps.
// This case-study section keeps the original BarPulse product name. It is the one
// permitted exception to the app-wide Supreme Team Media terminology relabel.
import { CheckCircle2 } from "lucide-react";
import { Container, LiveDot, MonoLabel, Panel, SectionHeading } from "@/components/marketing/site/primitives";

const built = [
  "A weighted 4-pillar weekly scorecard — guest experience, revenue, labor, operations — scored per venue and per manager.",
  "Daily and weekly AI insights in plain English, each one cited back to the exact log or metric behind it.",
  "Manager performance tracking — shift feedback and task completion surfaced automatically.",
  "A strict no-fabrication rule: every claim traces to a source, and when the data isn't there the system says so instead of guessing.",
];

const placeholders = [
  "AI Lead Follow-Up System",
  "Smart Business Website",
  "Custom GPT Assistant",
  "Operational Dashboard",
];

const badges = [
  "Live in production",
  "Multi-location hospitality group",
  "Daily AI insights",
  "Source-cited recommendations",
  "Manager performance tracking",
];

export function Proof() {
  return (
    <section id="proof" className="section-light relative border-t border-border py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Case study"
          title="BarPulse — an AI operations platform running in production"
          sub="BarPulse — a live AI-assisted operations platform built for a multi-location hospitality group so ownership could finally see, in one place, how the business was really performing."
        />

        <div className="mt-7 flex flex-wrap gap-2">
          {badges.map((b, i) => (
            <span key={b} className={"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.78rem] " + (i === 0 ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-panel/60 text-foreground/85")}>
              {i === 0 && <LiveDot />}
              {b}
            </span>
          ))}
        </div>

        <Panel className="dark-card mt-12 overflow-hidden p-0 border-0">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="border-b border-border p-7 lg:col-span-2 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2">
                <LiveDot />
                <MonoLabel className="text-[0.62rem] text-foreground">Live in production</MonoLabel>
              </div>

              <dl className="mt-7 space-y-6">
                <div>
                  <span className="eyebrow">The client</span>
                  <dd className="font-display mt-2 text-lg text-foreground">A multi-location San Diego hospitality group</dd>
                </div>
                <div>
                  <span className="eyebrow">What was costing them</span>
                  <dd className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
                    Sales lived in the POS, labor in the scheduling app, daily execution in task tools, cost in inventory software — none of it connected. Ownership couldn&apos;t see how a busy weekend really performed until days later, if at all.
                  </dd>
                </div>
                <div>
                  <span className="eyebrow">Status</span>
                  <dd className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
                    Live in production, running every day, expanded on an ongoing retainer.
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-7 lg:col-span-3">
              <span className="eyebrow">What it now does for them</span>
              <ul className="mt-5 space-y-5">
                {built.map((b) => (
                  <li key={b} className="flex gap-3">
                    <CheckCircle2 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
                    <span className="text-[0.95rem] leading-relaxed text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <div className="mt-10">
          <span className="eyebrow">More case studies coming soon</span>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {placeholders.map((p) => (
              <div key={p} className="hover-lift rounded-md border border-dashed border-border bg-panel/40 p-5 text-sm text-muted-foreground">
                <span className="text-[0.65rem] font-medium tracking-wide text-accent">In flight</span>
                <p className="mt-3 text-[0.95rem] text-foreground/80">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}