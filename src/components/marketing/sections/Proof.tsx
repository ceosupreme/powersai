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
    <section id="proof" className="section-dark relative overflow-hidden border-t border-[hsl(var(--gold)/0.3)] py-20 md:py-28">
      <div aria-hidden className="grain absolute inset-0" />
      <div aria-hidden className="radial-green pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-40" />
      <Container className="relative">
        <SectionHeading
          eyebrow="Case study"
          title="BarPulse — an AI operations platform running in production"
          sub="BarPulse — a live AI-assisted operations platform built for a multi-location hospitality group so ownership could finally see, in one place, how the business was really performing."
        />

        <div className="mt-10 grid grid-cols-3 gap-6 border-y border-[hsl(var(--gold)/0.2)] py-8">
          {[
            { n: "8", k: "venues", color: "hsl(var(--gold))", pulse: false },
            { n: "$10K/mo", k: "engagement", color: "hsl(var(--rust-light))", pulse: false },
            { n: "LIVE", k: "in production", color: "hsl(var(--gold))", pulse: true },
          ].map((s) => (
            <div key={s.k}>
              <div className="font-display flex items-baseline gap-2" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", color: s.color, lineHeight: 1 }}>
                {s.n}
                {s.pulse && <span className="inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--gold))] live-dot" />}
              </div>
              <div className="font-mono-label mt-2" style={{ color: "hsl(var(--bone) / 0.7)" }}>{s.k}</div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {badges.map((b, i) => (
            <span key={b} className={"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.78rem] " + (i === 0 ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]" : "border-[hsl(var(--bone)/0.15)] bg-[hsl(var(--bone)/0.05)] text-[hsl(var(--bone))]")}>
              {i === 0 && <LiveDot />}
              {b}
            </span>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--bone)/0.04)]">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="border-b border-[hsl(var(--bone)/0.12)] p-7 lg:col-span-2 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2">
                <LiveDot />
                <MonoLabel className="text-[0.62rem]" style={{ color: "hsl(var(--gold))" }}>Live in <span className="font-serif-accent" style={{ letterSpacing: 0 }}>production</span></MonoLabel>
              </div>

              <dl className="mt-7 space-y-6">
                <div>
                  <span className="eyebrow">The client</span>
                  <dd className="font-display mt-2 text-lg text-[hsl(var(--bone))]">A multi-location San Diego hospitality group</dd>
                </div>
                <div>
                  <span className="eyebrow">What was costing them</span>
                  <dd className="mt-2 text-[0.95rem] leading-relaxed text-[hsl(var(--bone)/0.75)]">
                    Sales lived in the POS, labor in the scheduling app, daily execution in task tools, cost in inventory software — none of it connected. Ownership couldn&apos;t see how a busy weekend really performed until days later, if at all.
                  </dd>
                </div>
                <div>
                  <span className="eyebrow">Status</span>
                  <dd className="mt-2 text-[0.95rem] leading-relaxed text-[hsl(var(--bone)/0.75)]">
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
                    <CheckCircle2 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
                    <span className="text-[0.95rem] leading-relaxed text-[hsl(var(--bone))]">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <span className="eyebrow">More case studies coming soon</span>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {placeholders.map((p) => (
              <div key={p} className="rounded-lg border border-dashed border-[hsl(var(--bone)/0.2)] bg-[hsl(var(--bone)/0.03)] p-5 transition-colors hover:border-[hsl(var(--gold)/0.5)]">
                <span className="font-mono-label" style={{ color: "hsl(var(--gold))" }}>In flight</span>
                <p className="mt-3 text-[0.95rem] text-[hsl(var(--bone))]">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}