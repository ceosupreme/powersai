import { PhoneAtNight, FadingQuote, LateReport } from "./icons/spot";

const MOMENTS = [
  {
    Illo: PhoneAtNight,
    title: "The lead that arrived after hours",
    body: "The phone rings after close. Voicemail. That customer is already calling the next name on Google — and they won't call back.",
    loss: "A job worth thousands, gone before morning.",
  },
  {
    Illo: FadingQuote,
    title: "The quote nobody followed up on",
    body: "You sent it Tuesday. They went quiet, and everybody was too busy working to chase it.",
    loss: "Chased quotes close. Quiet ones never do.",
  },
  {
    Illo: LateReport,
    title: "The problem you learned about too late",
    body: "The bad week shows up after payroll's run and the orders are placed.",
    loss: "By the time the report lands, the money's already spent.",
  },
];

export function Problem() {
  return (
    <section id="moments" className="scroll-mt-24 border-t border-border py-20 md:py-28">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="max-w-3xl">
          <span className="eyebrow">THE GAPS</span>
          <h2 className="font-display mt-4 text-balance text-foreground" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", lineHeight: 1.05 }}>
            The gaps between your tools are costing you.
          </h2>
        </div>

        <div className="mt-14 space-y-16 md:space-y-20">
          {MOMENTS.map((m, i) => {
            const reverse = i % 2 === 1;
            return (
              <div key={m.title} className={`grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-12 ${reverse ? "" : ""}`}>
                <div className={`md:col-span-4 ${reverse ? "md:order-2" : ""}`}>
                  <m.Illo className="h-auto w-full max-w-[220px]" />
                </div>
                <div className={`md:col-span-8 ${reverse ? "md:order-1" : ""}`}>
                  <h3 className="font-display text-2xl text-foreground md:text-3xl" style={{ lineHeight: 1.15 }}>
                    &ldquo;{m.title}&rdquo;
                  </h3>
                  <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-foreground/85">
                    {m.body}
                  </p>
                  <p className="mt-4 max-w-2xl text-[1rem] font-medium text-[hsl(var(--stm-loss))]">
                    &rarr; {m.loss}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-16 max-w-3xl text-[0.95rem] text-muted-foreground">
          No scare-stats here — the free checkup puts YOUR number on it. Your prices, your math, shown.
        </p>
      </div>
    </section>
  );
}