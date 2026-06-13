import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, User2 } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { ShowcaseShell } from "./ShowcaseShell";

type Msg = { who: "lead" | "ai"; text: string };
const SCRIPT: Msg[] = [
  { who: "lead", text: "Hey — do you have a table for 6 on Saturday?" },
  { who: "ai", text: "Yes! 7:30 or 8:15 are open. Want me to hold 7:30?" },
  { who: "lead", text: "7:30 works." },
  { who: "ai", text: "Booked. Confirmation sent. I'll text a reminder Friday." },
];
const STAGES = ["New", "Contacted", "Booked"] as const;

export function LeadFollowUpShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setStep(0);
    const t: ReturnType<typeof setTimeout>[] = [];
    SCRIPT.forEach((_, i) => {
      t.push(setTimeout(() => setStep(i + 1), 700 + i * 1100));
    });
    return () => t.forEach(clearTimeout);
  }, [inView]);

  const stage = step >= 4 ? 2 : step >= 2 ? 1 : 0;

  return (
    <ShowcaseShell
      id="lead-followup"
      eyebrow="AI Lead Follow-Up"
      title={<>Every inquiry answered in seconds — never sits in an inbox.</>}
      sub="The moment a lead lands, your AI replies on-brand, qualifies, and moves them through the CRM. You wake up to booked calls instead of unread messages."
      bullets={[
        "Instant first reply across web, SMS, DM",
        "Auto-qualifies and routes to the right stage",
        "Hands off to a human when it matters",
      ]}
    >
      <div ref={ref} className="glow-border relative overflow-hidden rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent live-dot" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground/80">stm/leads.inbox</span>
          </div>
          <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Live</span>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-7 space-y-2.5 min-h-[280px]">
            {SCRIPT.slice(0, step).map((m, i) => (
              <div key={i} className={"flex animate-fade-in " + (m.who === "ai" ? "justify-end" : "justify-start")}>
                <div className={"max-w-[85%] rounded-lg px-3 py-2 text-[0.85rem] leading-snug " + (m.who === "ai" ? "border border-accent/30 bg-accent/10 text-foreground" : "border border-border bg-background/50 text-foreground/90")}>
                  <div className="mb-1 flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">
                    {m.who === "ai" ? (<><MessageSquare size={9} /> AI Assistant</>) : (<><User2 size={9} /> Lead · Maya R.</>)}
                  </div>
                  {m.text}
                </div>
              </div>
            ))}
            {step < SCRIPT.length && inView && (
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

          <div className="col-span-12 md:col-span-5 rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Lead card</span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[0.6rem] text-accent">Auto-qualified</span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-panel text-[0.7rem] text-foreground">MR</span>
              <div>
                <div className="text-[0.85rem] text-foreground">Maya R.</div>
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Saturday · 7:30pm · Party of 6</div>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {STAGES.map((s, i) => {
                const done = i <= stage;
                return (
                  <div key={s} className={"flex items-center justify-between rounded-md border px-3 py-2 transition-colors duration-500 " + (done ? "border-accent/40 bg-accent/10" : "border-border bg-background/40")}>
                    <span className={"text-[0.78rem] " + (done ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                    {done ? <CheckCircle2 size={13} className="text-accent" /> : <span className="h-2 w-2 rounded-full border border-border" />}
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