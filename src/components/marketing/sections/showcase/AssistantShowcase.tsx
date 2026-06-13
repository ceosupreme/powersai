import { useEffect, useState } from "react";
import { Bot, User2 } from "lucide-react";
import { ShowcaseShell } from "./ShowcaseShell";

type Convo = { q: string; a: string[] };

const CONVOS: Convo[] = [
  { q: "What's slipping this week?", a: [
    "Sat. dinner covers are -14% vs 4-wk avg.",
    "Online lead reply time crept to 38m (target 5m).",
    "Want a draft fix-it brief for the FOH team?",
  ]},
  { q: "Re-write our Saturday promo.", a: [
    "Draft: \"Locals' Saturday — half-priced bottles til 7. Walk in or grab a 7:30 table.\"",
    "Tone matches your last 6 winning posts. Want SMS + IG variants?",
  ]},
  { q: "Summarize last month's reviews.", a: [
    "82 reviews, avg 4.6. Up from 4.4.",
    "Praise: bartenders, patio, new menu. Friction: wait at door on Fri nights.",
    "Recommend: door-host SOP + a 2-line ack reply to every <4★.",
  ]},
  { q: "Draft a follow-up to inactive leads.", a: [
    "Pulled 47 leads with no reply >14d.",
    "Drafted 3 SMS variants by source. Routing to your inbox for approval.",
  ]},
];

export function AssistantShowcase() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    const t: ReturnType<typeof setTimeout>[] = [];
    CONVOS[active].a.forEach((_, i) => {
      t.push(setTimeout(() => setVisible(i + 1), 400 + i * 800));
    });
    return () => t.forEach(clearTimeout);
  }, [active]);

  const convo = CONVOS[active];

  return (
    <ShowcaseShell
      id="assistant"
      reverse
      alt
      eyebrow="Custom AI Assistants"
      title={<>An internal AI trained on your business — not the open internet.</>}
      sub="Your SOPs, menus, listings, playbooks, and policies — answered instantly for staff and customers, with sources. Click a question to see it in action."
      bullets={[
        "Grounded in your real documents",
        "Routes to a human when confidence drops",
        "Web, SMS, Slack, or embedded in your site",
      ]}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-5 space-y-2">
          {CONVOS.map((c, i) => {
            const on = i === active;
            return (
              <button key={c.q} onClick={() => setActive(i)} className={"w-full text-left rounded-md border px-3 py-3 transition-colors duration-300 " + (on ? "border-accent/50 bg-accent/10 text-foreground" : "border-border bg-background/40 text-foreground/80 hover:border-accent/30 hover:bg-accent/5")}>
                <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Ask · {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[0.85rem]">{c.q}</div>
              </button>
            );
          })}
        </div>

        <div className="glow-border col-span-12 md:col-span-7 relative overflow-hidden rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent live-dot" />
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground/80">stm/assistant</span>
            </div>
            <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Trained on 142 docs</span>
          </div>

          <div className="mt-5 min-h-[280px] space-y-2.5">
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[88%] rounded-lg border border-border bg-background/50 px-3 py-2 text-[0.85rem]">
                <div className="mb-1 flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">
                  <User2 size={9} /> Owner
                </div>
                {convo.q}
              </div>
            </div>
            {convo.a.slice(0, visible).map((line, i) => (
              <div key={i} className="flex justify-end animate-fade-in">
                <div className="max-w-[88%] rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[0.85rem]">
                  <div className="mb-1 flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-accent">
                    <Bot size={9} /> Assistant
                  </div>
                  {line}
                </div>
              </div>
            ))}
            {visible < convo.a.length && (
              <div className="flex justify-end">
                <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent live-dot" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent live-dot" style={{ animationDelay: "200ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent live-dot" style={{ animationDelay: "400ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ShowcaseShell>
  );
}