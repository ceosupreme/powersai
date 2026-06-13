import { Bot, MessageSquare, Sparkles, User2 } from "lucide-react";
import { Container, Eyebrow } from "@/components/marketing/site/primitives";

const CARDS = [
  { from: "Lead", who: "Maya", text: "Table for 6 on Saturday?", tone: "lead" },
  { from: "AI", who: "Assistant", text: "Booked. Confirmation sent.", tone: "ai" },
  { from: "Insight", who: "Daily", text: "Lead reply time crept to 38m.", tone: "ins" },
  { from: "Lead", who: "Jordan", text: "Still have weekend availability?", tone: "lead" },
  { from: "AI", who: "Assistant", text: "Yes — Sun 6:45 open. Hold?", tone: "ai" },
  { from: "Insight", who: "Daily", text: "Sat covers -14% vs 4-wk avg.", tone: "ins" },
  { from: "Lead", who: "Alex", text: "Do you do private events?", tone: "lead" },
  { from: "AI", who: "Assistant", text: "We do — sending menu now.", tone: "ai" },
];

export function ChatMarquee() {
  return (
    <section className="relative border-t border-border py-16">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>Always-on</Eyebrow>
          <h3 className="font-display mt-3 text-2xl tracking-tight text-foreground md:text-3xl">
            A glimpse of what runs in the background, all day.
          </h3>
        </div>
      </Container>

      <div className="marquee mt-10">
        <div className="marquee-track gap-3 pr-3">
          {[...CARDS, ...CARDS].map((c, i) => {
            const Icon = c.tone === "ai" ? Bot : c.tone === "ins" ? Sparkles : User2;
            const ring = c.tone === "ai"
              ? "border-accent/40 bg-accent/10"
              : c.tone === "ins"
              ? "border-accent/30 bg-background/60"
              : "border-border bg-background/60";
            return (
              <div key={i} className={"w-[280px] shrink-0 rounded-lg border bg-panel/70 p-4 backdrop-blur-sm " + ring}>
                <div className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-accent">
                    <Icon size={10} />
                  </span>
                  {c.from} · {c.who}
                </div>
                <p className="mt-3 text-[0.85rem] leading-snug text-foreground/90">{c.text}</p>
                <div className="mt-3 flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">
                  <MessageSquare size={9} />
                  just now
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}