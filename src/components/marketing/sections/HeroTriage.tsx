import { useState } from "react";
import { ArrowRight, HelpCircle } from "lucide-react";

const OPTIONS = [
  { key: "A", label: "Recover missed leads", target: "#lead-followup" },
  { key: "B", label: "See my whole business in one view", target: "#ops-dashboard" },
  { key: "C", label: "Automate manual work", target: "#automations" },
];

export function HeroTriage() {
  const [picked, setPicked] = useState<string | null>(null);

  function go() {
    const target = OPTIONS.find((o) => o.key === picked)?.target ?? "#contact";
    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="glow-border relative overflow-hidden rounded-xl p-6 md:p-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle size={14} className="text-accent" />
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground/80">
            stm/triage
          </span>
        </div>
        <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
          30s
        </span>
      </div>

      <h3 className="font-display mt-5 text-2xl leading-tight tracking-tight text-foreground md:text-[1.7rem]">
        How can we help?
      </h3>
      <p className="mt-2 text-[0.9rem] text-muted-foreground">
        Pick what hurts most — we&apos;ll jump to the right place.
      </p>

      <div className="mt-5 space-y-2">
        {OPTIONS.map((o) => {
          const on = picked === o.key;
          return (
            <button
              key={o.key}
              onClick={() => setPicked(o.key)}
              className={
                "w-full text-left flex items-center gap-3 rounded-md border px-3.5 py-3 transition-all duration-200 " +
                (on
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background/40 hover:border-accent/40 hover:bg-accent/5")
              }
            >
              <span
                className={
                  "inline-flex h-7 w-7 items-center justify-center rounded-md border font-mono text-[0.7rem] " +
                  (on
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background/50 text-foreground/80")
                }
              >
                {o.key}
              </span>
              <span className="text-[0.92rem] text-foreground">{o.label}</span>
              {on && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent live-dot" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={go}
          disabled={!picked}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          OK <ArrowRight size={13} />
        </button>
        <a
          href="#contact"
          className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          None of these → talk to a human
        </a>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border pt-4">
        {[
          { k: "Tools", v: "200+" },
          { k: "Reply time", v: "<5s" },
          { k: "Audit log", v: "Full" },
        ].map((m) => (
          <div key={m.k}>
            <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">
              {m.k}
            </div>
            <div className="mt-1 text-[0.8rem] text-foreground">{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}