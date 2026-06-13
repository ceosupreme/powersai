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
    <section className="section-light section-light-tint relative border-t border-border py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="What you get"
          title="One clear picture of your whole operation"
          sub="Instead of jumping between five dashboards, you get a single live view that turns your existing data into plain-English answers and the next action to take — delivered where your team already works."
        />

        <div className="mt-12 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <Panel className="dark-card p-6 border-0">
            <div className="flex items-center justify-between">
              <MonoLabel className="text-[0.6rem]">Before</MonoLabel>
              <span className="text-[0.7rem] text-muted-foreground">Disconnected tools</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {fragmented.map((t) => (
                <div key={t.label} className="flex items-center gap-3 rounded-md border border-dashed border-border bg-background/40 px-3 py-3">
                  <t.icon size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground/80">{t.label}</span>
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-destructive/60" />
                </div>
              ))}
            </div>
            <p className="mt-5 text-[0.85rem] leading-relaxed text-muted-foreground">
              Four logins. Four reports. No single answer to &ldquo;how did this week actually go?&rdquo;
            </p>
          </Panel>

          <div className="flex items-center justify-center py-2 lg:py-0">
            <ArrowRight className="text-accent rotate-90 lg:rotate-0" size={22} />
          </div>

          <Panel className="dark-card p-6 border-0">
            <div className="flex items-center justify-between">
              <MonoLabel className="text-[0.6rem] text-accent">After</MonoLabel>
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
                <div key={r.label} className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2.5">
                  <span className="text-[0.85rem] text-muted-foreground">{r.label}</span>
                  <span className={r.tone === "accent" ? "text-[0.85rem] text-accent" : r.tone === "warn" ? "text-[0.85rem] text-accent-soft" : "text-[0.85rem] text-foreground"}>
                    {r.val}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-[0.85rem] text-foreground/85">
              <Sparkles size={14} className="text-accent" />
              One answer. One next move.
            </p>
          </Panel>
        </div>

        <div className="mt-12 overflow-x-auto">
          <div className="flex min-w-full items-stretch gap-3 md:gap-2">
            {flow.map((step, i) => (
              <div key={step} className="flex flex-1 items-center gap-3 md:gap-2">
                <div className="hover-lift flex flex-1 flex-col items-start rounded-md border border-border bg-panel/70 px-4 py-5 backdrop-blur-sm md:items-center md:py-6 md:text-center">
                  <span className="text-[0.7rem] font-medium tracking-wide text-accent">
                    Step 0{i + 1}
                  </span>
                  <span className="font-display mt-3 text-base text-foreground md:text-lg">{step}</span>
                </div>
                {i < flow.length - 1 && (
                  <ArrowRight size={16} className="shrink-0 text-accent" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-base text-muted-foreground md:text-lg">
          You don&apos;t need more software. You need a clearer operating system — one that pays you back in time saved, leads recovered, and decisions made on time.
        </p>
      </Container>
    </section>
  );
}