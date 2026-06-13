import { useEffect, useState } from "react";
import { Webhook, Database, GitBranch, Send, Bell } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { ShowcaseShell } from "./ShowcaseShell";

const NODES = [
  { icon: Webhook, label: "Trigger", sub: "New lead" },
  { icon: Database, label: "Enrich", sub: "CRM lookup" },
  { icon: GitBranch, label: "Decide", sub: "Score > 70" },
  { icon: Send, label: "Action", sub: "SMS + book" },
  { icon: Bell, label: "Notify", sub: "Owner ping" },
];

export function AutomationsShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [fire, setFire] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    setFire(-1);
    const loop = setInterval(() => { setFire(i % NODES.length); i++; }, 700);
    return () => clearInterval(loop);
  }, [inView]);

  return (
    <ShowcaseShell
      id="automations"
      eyebrow="Workflow Automations"
      title={<>Stop being the integration between your tools.</>}
      sub="Quiet, reliable automations stitch your stack together — intake, scheduling, reporting, billing — firing in sequence without anyone copying anything anywhere."
      bullets={[
        "Runs across 200+ tools you already use",
        "Human-in-the-loop where it actually matters",
        "Full audit log of every step",
      ]}
    >
      <div ref={ref} className="glow-border relative overflow-hidden rounded-xl p-5 md:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent live-dot" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground/80">stm/flow.lead-to-book</span>
          </div>
          <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">14 runs today</span>
        </div>

        <div className="relative mt-8">
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
            <path d="M 8 15 L 92 15" fill="none" stroke="hsl(var(--accent))" strokeOpacity="0.25" strokeWidth="0.4" vectorEffect="non-scaling-stroke" strokeDasharray="2 3" />
            <path d="M 8 15 L 92 15" fill="none" stroke="hsl(var(--accent))" strokeWidth="0.6" vectorEffect="non-scaling-stroke" className="flow-line" />
          </svg>

          <div className="relative grid grid-cols-5 gap-2">
            {NODES.map((n, i) => {
              const on = i <= fire;
              const lit = i === fire;
              return (
                <div key={n.label} className={"flex flex-col items-center rounded-lg border bg-background/60 px-2 py-4 text-center transition-all duration-300 " + (lit ? "border-accent shadow-[0_0_30px_-6px_hsl(var(--accent))] -translate-y-0.5" : on ? "border-accent/40" : "border-border opacity-60")}>
                  <span className={"inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300 " + (on ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-muted-foreground")}>
                    <n.icon size={15} strokeWidth={1.7} />
                  </span>
                  <div className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">{n.label}</div>
                  <div className="mt-0.5 text-[0.72rem] text-foreground/85">{n.sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 rounded-md border border-border bg-background/50 p-4">
          <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">Run log</div>
          <div className="mt-2 space-y-1 font-mono text-[0.72rem] text-foreground/80">
            <div><span className="text-accent">▸</span> 09:42:11 · Trigger · POST /lead · ok</div>
            <div><span className="text-accent">▸</span> 09:42:11 · Enrich · matched contact #4821</div>
            <div><span className="text-accent">▸</span> 09:42:12 · Decide · score 84 → continue</div>
            <div><span className="text-accent">▸</span> 09:42:12 · Action · SMS sent · hold booked</div>
          </div>
        </div>
      </div>
    </ShowcaseShell>
  );
}