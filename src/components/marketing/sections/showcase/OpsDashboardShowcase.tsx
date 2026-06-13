import { useEffect, useState } from "react";
import { ShoppingCart, Calendar, Users, ListChecks, TrendingUp } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { ShowcaseShell } from "./ShowcaseShell";

const SOURCES = [
  { icon: ShoppingCart, label: "POS" },
  { icon: Calendar, label: "Scheduling" },
  { icon: Users, label: "CRM" },
  { icon: ListChecks, label: "Tasks" },
];

const METRICS = [
  { k: "Revenue · WTD", v: "$48,210", tone: "ok" },
  { k: "Open follow-ups", v: "3 waiting", tone: "warn" },
  { k: "Labor vs target", v: "Within range", tone: "ok" },
  { k: "Top action", v: "Re-engage Sat. inquiries", tone: "accent" },
];

export function OpsDashboardShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [connected, setConnected] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setConnected(0);
    const t: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= SOURCES.length; i++) {
      t.push(setTimeout(() => setConnected(i), 500 + i * 600));
    }
    return () => t.forEach(clearTimeout);
  }, [inView]);

  const visibleMetrics = Math.min(connected, METRICS.length);

  return (
    <ShowcaseShell
      id="ops-dashboard"
      reverse
      alt
      eyebrow="AI Operations Dashboard"
      title={<>Every tool in your business, condensed into one live view.</>}
      sub="POS, scheduling, CRM, and tasks flow into one operating picture — so owners stop tab-hopping and start acting on what's actually changing."
      bullets={[
        "Plug into the tools you already use",
        "Live numbers, not stale weekly exports",
        "One owner view across every location",
      ]}
    >
      <div ref={ref} className="glow-border relative overflow-hidden rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent live-dot" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground/80">stm/ops.dashboard</span>
          </div>
          <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">{connected}/4 connected</span>
        </div>

        <div className="relative mt-6 grid grid-cols-12 items-center gap-4">
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[14, 38, 62, 86].map((y, i) => (
              <path key={y} d={`M 22 ${y} C 38 ${y}, 42 50, 55 50`} fill="none" stroke="hsl(var(--accent))" strokeOpacity={i < connected ? 0.8 : 0.15} strokeWidth="0.6" vectorEffect="non-scaling-stroke" className={i < connected ? "flow-line" : ""} />
            ))}
          </svg>

          <div className="col-span-4 space-y-2.5">
            {SOURCES.map((s, i) => {
              const on = i < connected;
              return (
                <div key={s.label} className={"flex items-center gap-2.5 rounded-md border px-3 py-2 transition-all duration-500 " + (on ? "border-accent/40 bg-accent/10" : "border-border bg-background/40 opacity-70")}>
                  <span className={"inline-flex h-7 w-7 items-center justify-center rounded-md border " + (on ? "border-accent/40 bg-accent/15 text-accent" : "border-border text-muted-foreground")}>
                    <s.icon size={13} strokeWidth={1.7} />
                  </span>
                  <span className="text-[0.78rem] text-foreground/90">{s.label}</span>
                  {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent live-dot" />}
                </div>
              );
            })}
          </div>

          <div className="col-span-8 rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Owner view · this week</span>
              <span className="inline-flex items-center gap-1 text-[0.6rem] text-accent">
                <TrendingUp size={11} /> +12.4% vs last
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {METRICS.map((m, i) => {
                const on = i < visibleMetrics;
                return (
                  <div key={m.k} className={"rounded-md border border-border bg-background/40 p-3 transition-opacity duration-500 " + (on ? "opacity-100" : "opacity-30")}>
                    <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">{m.k}</div>
                    <div className={"mt-1.5 font-display text-[0.95rem] " + (m.tone === "accent" ? "text-accent" : m.tone === "warn" ? "text-accent-soft" : "text-foreground")}>
                      {on ? m.v : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ShowcaseShell>
  );
}