const STEPS = [
  {
    n: "1",
    title: "I look — free.",
    body: "Two minutes. The checkup reads what's already public — your Google listing, your website, your reviews. You don't lift a finger.",
  },
  {
    n: "2",
    title: "You see the money.",
    body: "A ranked list of what's slipping and what each one costs — your prices, math shown. Nothing there? I tell you straight, and you've lost nothing.",
  },
  {
    n: "3",
    title: "We fix the first problem, prove it works, and expand only when it earns the next step.",
    body: "Live in 48 hours — or the setup fee comes back.",
  },
];

export function Process() {
  return (
    <section id="process" className="scroll-mt-24 border-t border-border py-20 md:py-28">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="max-w-3xl">
          <span className="eyebrow">HOW IT STARTS</span>
          <h2 className="font-display mt-4 text-balance text-foreground" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", lineHeight: 1.05 }}>
            Start small. Prove it. Then expand.
          </h2>
        </div>

        <div className="relative mt-14">
          {/* Drawn cobalt path joining the three steps (desktop only) */}
          <svg
            aria-hidden
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
            className="pointer-events-none absolute left-0 right-0 top-8 hidden h-10 w-full md:block"
          >
            <defs>
              <linearGradient id="proc-grad" x1="0" x2="1">
                <stop offset="0" stopColor="#465CFF" />
                <stop offset="1" stopColor="#55D6FF" />
              </linearGradient>
            </defs>
            <path
              d="M 100 20 C 400 -10, 500 40, 800 20 S 1050 -10, 1100 20"
              fill="none"
              stroke="url(#proc-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          <ol className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-[hsl(var(--stm-surface))] p-6 md:p-7">
                <div
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full font-display text-lg text-white"
                  style={{ backgroundColor: "hsl(var(--stm-cobalt))" }}
                >
                  {s.n}
                </div>
                <h3 className="font-display mt-5 text-xl text-foreground md:text-[1.35rem]" style={{ lineHeight: 1.2 }}>
                  &ldquo;{s.title}&rdquo;
                </h3>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-foreground/85">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}