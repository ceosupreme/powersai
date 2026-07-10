import { useState } from "react";
import { ChevronDown } from "lucide-react";

const ITEMS = [
  {
    q: "Will anything reach a customer without my approval?",
    a: "No. Every message waits for a one-tap yes — yours or mine — and you can edit any message before it sends.",
  },
  {
    q: "Do we have to switch systems or learn software?",
    a: "No. It runs on top of what you already use. Your total learning curve is tapping \u201Capprove\u201D on your phone.",
  },
  {
    q: "What does a first project cost?",
    a: "The checkup is free, forever. The starter system runs from $49 a month. Bigger installs are quoted after the checkup — priced off what you're actually losing, not a package off a shelf.",
  },
  {
    q: "How fast is this, really?",
    a: "Live in 48 hours or the setup fee comes back.",
  },
  {
    q: "What happens to our business data?",
    a: "It stays yours. Your customer list is never sold, shared, or used for anyone else's business — and you can take it with you anytime.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 border-t border-border py-20 md:py-24">
      <div className="mx-auto w-full max-w-4xl px-6 md:px-10">
        <span className="eyebrow">FAQ</span>
        <h2 className="font-display mt-4 text-balance text-foreground" style={{ fontSize: "clamp(1.8rem,3.5vw,2.5rem)", lineHeight: 1.1 }}>
          Common questions
        </h2>

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <li key={it.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-lg text-foreground md:text-xl">{it.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p className="pb-6 text-[1rem] leading-relaxed text-foreground/85">
                    {it.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}