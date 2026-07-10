import { ArrowRight, Database, Calendar, MessageSquare, BarChart3, ShoppingCart, Sparkles } from "lucide-react";
import { Container, SectionHeading, MonoLabel, Panel, LiveDot } from "@/components/marketing/site/primitives";

const flow = [
  "Your existing tools",
  "One source of truth",
  "Plain-English insights",
  "Clear next actions",
  "Confident decisions",
];

const fragmented = [
  { icon: ShoppingCart, label: "POS" },
  { icon: Calendar, label: "Scheduling" },
  { icon: MessageSquare, label: "CRM" },
  { icon: Database, label: "Spreadsheets" },
];

export function ConnectiveLayer() {
  return (
    <section id="whole-operation" className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="What you get"
          title="One clear picture of your whole operation"
          sub="Instead of jumping between five dashboards, you get a single live view that turns your existing data into plain-English answers and the next action to take — delivered where your team already works."
        />

        <div className="mt-12 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <Panel className="p-6 border-0 bg-[hsl(var(--surface))] rounded-2xl" style={{ border: "1px solid hsl(var(--line))" }}>
            <div className="flex items-center justify-between">
              <MonoLabel className="text-[0.6rem]" style={{ color: "hsl(var(--rust))" }}>Before · Disconnected</MonoLabel>
              <span className="font-mono-label" style={{ fontSize: "0.6rem", color: "hsl(var(--rust))" }}>DISCONNECTED</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {fragmented.map((t) => (
                <div key={t.label} className="flex items-center gap-3 rounded-md border border-dashed px-3 py-3" style={{ borderColor: "hsl(var(--rust) / 0.5)" }}>
                  <t.icon size={16} style={{ color: "hsl(var(--rust))" }} />
                  <span className="text-sm text-foreground">{t.label}</span>
                  <span className="ml-auto h-2 w-2 rounded-full" style={{ background: "hsl(var(--rust))" }} />
                </div>
              ))}
            </div>
            <p className="mt-5 text-[0.85rem] leading-relaxed text-[hsl(var(--ink-soft))]">
              Four logins. Four reports. No single answer to &ldquo;how did this week actually go?&rdquo;
            </p>
          </Panel>

          <div className="flex items-center justify-center py-2 lg:py-0">
            <ArrowRight className="rotate-90 lg:rotate-0 live-dot" size={26} style={{ color: "hsl(var(--gold))" }} />
          </div>

          <Panel className="dark-card p-6 border-0">
            <div className="flex items-center justify-between">
              <MonoLabel className="text-[0.6rem]" style={{ color: "hsl(var(--gold))" }}>After · One live view</MonoLabel>
              <span className="inline-flex items-center gap-2 text-[0.7rem] text-foreground">
                <LiveDot /> One live view
              </span>
            </div>
            <div className="mt-5 space-y-2.5">
              {[
                { label: "Revenue · this week", val: "On pace", tone: "ok" },
                { label: "Open lead follow-ups", val: "3 waiting", tone: "warn" },
                { label: "Labor vs target", val: "Within range", tone: "ok" },
                { label: "Top action for today", val: "Re-engage Sat. inquiries", tone: "accent" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-md border border-[hsl(var(--bone)/0.12)] bg-[hsl(var(--bone)/0.04)] px-3 py-2.5">
                  <span className="text-[0.85rem] text-[hsl(var(--bone)/0.75)]">{r.label}</span>
                  <span className={"text-[0.85rem] " + (r.tone === "accent" ? "text-[hsl(var(--gold))]" : r.tone === "warn" ? "text-[hsl(var(--rust-light))]" : "text-[hsl(var(--bone))]")}>
                    {r.val}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-[0.85rem] text-[hsl(var(--bone))]">
              <Sparkles size={14} style={{ color: "hsl(var(--gold))" }} />
              One answer. One next move.
            </p>
          </Panel>
        </div>

        <div className="relative mt-14 overflow-x-auto">
          <div className="flex min-w-full items-stretch gap-3 md:gap-3">
            {flow.map((step, i) => (
              <div key={step} className="flex flex-1 items-center gap-3 md:gap-2">
                <div className="card-lift flex flex-1 flex-col items-start px-4 py-5 md:items-center md:py-6 md:text-center">
                  <span className="font-mono-label" style={{ fontSize: "0.7rem", color: "hsl(var(--gold))" }}>0{i + 1}</span>
                  <span className="font-display mt-3 text-base text-foreground md:text-lg">{step}</span>
                </div>
                {i < flow.length - 1 && (
                  <span aria-hidden className="shrink-0" style={{ color: "hsl(var(--gold))", backgroundImage: "radial-gradient(circle, hsl(var(--gold)) 1px, transparent 1.5px)", backgroundSize: "6px 2px", backgroundRepeat: "repeat-x", width: 22, height: 2 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-base text-[hsl(var(--ink-soft))] md:text-lg">
          You don&apos;t need more software. You need a clearer operating system — one that pays you back in time saved, leads recovered, and decisions made on time.
        </p>
      </Container>
    </section>
  );
}