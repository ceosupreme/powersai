import { useState } from "react";
import { ArrowRight } from "lucide-react";

const OPTIONS = [
  {
    key: "A",
    label: "Recover missed leads",
    target: "#lead-followup",
    prefill: "I want to recover missed leads.",
  },
  {
    key: "B",
    label: "See my whole business in one view",
    target: "#whole-operation",
    prefill: "I want one live view of my whole business.",
  },
  {
    key: "C",
    label: "Automate manual work",
    target: "#automations",
    prefill: "I want to automate manual work.",
  },
];

function scrollWithHighlight(target: string) {
  const el = document.querySelector<HTMLElement>(target);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.setAttribute("data-arrival-highlight", "true");
  window.setTimeout(() => el.removeAttribute("data-arrival-highlight"), 2000);
}

function prefillContact(text: string | null) {
  if (text) {
    try { sessionStorage.setItem("stm.contact.prefill", text); } catch { /* ignore */ }
  } else {
    try { sessionStorage.removeItem("stm.contact.prefill"); } catch { /* ignore */ }
  }
  window.dispatchEvent(new CustomEvent("stm:contact-prefill", { detail: text ?? "" }));
}

export function HeroTriage() {
  const [picked, setPicked] = useState<string | null>(null);

  function go() {
    const opt = OPTIONS.find((o) => o.key === picked);
    if (opt) {
      // Selected an option: scroll to Contact with prefilled message.
      prefillContact(opt.prefill);
      scrollWithHighlight("#contact");
    } else {
      // No selection: plain scroll to contact, no prefill.
      prefillContact(null);
      scrollWithHighlight("#contact");
    }
  }

  function pick(key: string) {
    setPicked(key);
    const opt = OPTIONS.find((o) => o.key === key);
    if (opt) scrollWithHighlight(opt.target);
  }

  return (
    <div className="card-lift relative overflow-hidden p-7 md:p-8" style={{ boxShadow: "0 0 0 1px hsl(var(--gold) / 0.35), 0 24px 60px -40px hsl(var(--ink) / 0.25)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--gold))] live-dot" />
          <span className="font-mono-label" style={{ fontSize: "0.62rem", color: "hsl(var(--gold))" }}>stm/triage</span>
        </div>
        <span className="font-mono-label" style={{ fontSize: "0.6rem", color: "hsl(var(--ink-soft))" }}>live</span>
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
              onClick={() => pick(o.key)}
              className={
                "w-full text-left flex items-center gap-3 rounded-md border px-3.5 py-3 transition-all duration-200 " +
                (on
                  ? "border-accent bg-accent/[0.06]"
                  : "border-border bg-transparent hover:border-accent/40 hover:bg-accent/[0.04]")
              }
            >
              <span
                className={
                  "inline-flex h-7 w-7 items-center justify-center rounded-md border text-[0.7rem] font-medium " +
                  (on
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-foreground/70")
                }
              >
                {o.key}
              </span>
              <span className="text-[0.92rem] text-foreground">{o.label}</span>
              {on && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--signal))] live-dot" />
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
          className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          None of these → talk to a human
        </a>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[hsl(var(--line))] pt-4">
        {[
          { k: "Tools", v: "200+" },
          { k: "Reply time", v: "<5s" },
          { k: "Audit log", v: "Full" },
        ].map((m) => (
          <div key={m.k}>
            <div className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {m.k}
            </div>
            <div className="mt-1 text-[0.8rem] text-foreground">{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}