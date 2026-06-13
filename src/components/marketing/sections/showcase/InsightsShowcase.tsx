import { useEffect, useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { ShowcaseShell } from "./ShowcaseShell";

const INSIGHT = "Saturday dinner covers are down 14% vs trailing 4-week avg — driven entirely by a drop in 7–9pm walk-ins.";

export function InsightsShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [typed, setTyped] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setTyped("");
    setShowSource(false);
    let i = 0;
    const typer = setInterval(() => {
      i++;
      setTyped(INSIGHT.slice(0, i));
      if (i >= INSIGHT.length) clearInterval(typer);
    }, 22);
    const src = setTimeout(() => setShowSource(true), INSIGHT.length * 22 + 400);
    const loop = setTimeout(() => setTick((t) => t + 1), INSIGHT.length * 22 + 8000);
    return () => { clearInterval(typer); clearTimeout(src); clearTimeout(loop); };
  }, [inView, tick]);

  return (
    <ShowcaseShell
      id="insights"
      eyebrow="Source-Cited AI Insights"
      title={<>Plain-English findings — every claim traced to the data behind it.</>}
      sub="No hallucinated metrics. Every insight your AI surfaces links back to the exact query, window, and source — so you trust it enough to act."
      bullets={[
        "Cited from your live POS, CRM, and ops data",
        "Owner-approves before any action is taken",
        "Daily digest, on schedule, in plain English",
      ]}
    >
      <div ref={ref} className="glow-border relative overflow-hidden rounded-xl p-5 md:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent live-dot" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground/80">stm/insights.daily</span>
          </div>
          <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Today · 7:02am</span>
        </div>

        <div className="mt-6">
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-accent">Insight #042</div>
          <p className="font-display mt-3 min-h-[112px] text-[1.2rem] leading-snug text-foreground md:text-[1.35rem]">
            <span className={typed.length < INSIGHT.length ? "type-caret" : ""}>{typed}</span>
          </p>
        </div>

        <div className={"mt-5 transition-all duration-500 " + (showSource ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
          <div className="rounded-md border border-border bg-background/50 p-3">
            <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">Source</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[0.7rem] text-accent">
                POS · last 28d <ExternalLink size={10} />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[0.7rem] text-foreground/80">
                Scheduling · cover counts
              </span>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Confidence 0.92</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[0.78rem] font-medium text-accent-foreground">
              <Check size={13} /> Approve action
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-3 py-2 text-[0.78rem] text-foreground/80">
              <X size={13} /> Dismiss
            </button>
            <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              Will draft Sat. promo + staff brief
            </span>
          </div>
        </div>
      </div>
    </ShowcaseShell>
  );
}