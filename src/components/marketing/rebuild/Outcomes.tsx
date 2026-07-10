// Three asymmetric scenes. Each has a small drawn connected path
// in cobalt→cyan with a green completion mark. Same line language as hero.

function CheckDot() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#198A5A" />
      <path d="M9 16 L14 21 L23 12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LeadFlow() {
  return (
    <svg viewBox="0 0 320 140" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="o1" x1="0" x2="1"><stop offset="0" stopColor="#465CFF"/><stop offset="1" stopColor="#55D6FF"/></linearGradient>
      </defs>
      <g fontFamily="Instrument Sans, sans-serif" fontSize="11" fill="#5F6672">
        <rect x="10" y="55" width="60" height="30" rx="6" fill="#FFFFFF" stroke="#101218"/>
        <text x="40" y="74" textAnchor="middle" fill="#101218">Inquiry</text>
        <path d="M70 70 C 110 70, 130 40, 170 40 L 220 40" fill="none" stroke="url(#o1)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M70 70 C 110 70, 130 100, 170 100 L 220 100" fill="none" stroke="url(#o1)" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="220" y="25" width="70" height="30" rx="15" fill="#E9EDFF" stroke="#465CFF"/>
        <text x="255" y="44" textAnchor="middle" fill="#101218" fontFamily="Inter Tight" fontWeight="700">Booked</text>
        <rect x="220" y="85" width="70" height="30" rx="15" fill="#E9EDFF" stroke="#465CFF"/>
        <text x="255" y="104" textAnchor="middle" fill="#101218" fontFamily="Inter Tight" fontWeight="700">Human</text>
      </g>
    </svg>
  );
}

function BriefingFlow() {
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="o2" x1="0" x2="1"><stop offset="0" stopColor="#465CFF"/><stop offset="1" stopColor="#55D6FF"/></linearGradient>
      </defs>
      <g fontFamily="Instrument Sans, sans-serif" fontSize="11" fill="#5F6672">
        <rect x="10" y="20" width="60" height="24" rx="4" fill="#FFFFFF" stroke="#5F6672"/><text x="40" y="36" textAnchor="middle">Sales</text>
        <rect x="10" y="55" width="60" height="24" rx="4" fill="#FFFFFF" stroke="#5F6672"/><text x="40" y="71" textAnchor="middle">Labor</text>
        <rect x="10" y="90" width="60" height="24" rx="4" fill="#FFFFFF" stroke="#5F6672"/><text x="40" y="106" textAnchor="middle">Schedule</text>
        <rect x="10" y="125" width="60" height="24" rx="4" fill="#FFFFFF" stroke="#5F6672"/><text x="40" y="141" textAnchor="middle">Tasks</text>

        <path d="M70 32 C 130 32, 150 85, 200 85" fill="none" stroke="url(#o2)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M70 67 C 130 67, 150 85, 200 85" fill="none" stroke="url(#o2)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M70 102 C 130 102, 150 85, 200 85" fill="none" stroke="url(#o2)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M70 137 C 130 137, 150 85, 200 85" fill="none" stroke="url(#o2)" strokeWidth="2.5" strokeLinecap="round"/>

        <rect x="200" y="60" width="110" height="50" rx="8" fill="#FFFFFF" stroke="#101218"/>
        <text x="255" y="82" textAnchor="middle" fill="#101218" fontFamily="Inter Tight" fontWeight="700" fontSize="13">Daily brief</text>
        <text x="255" y="98" textAnchor="middle">what needs attention</text>
      </g>
    </svg>
  );
}

function AutomationFlow() {
  return (
    <svg viewBox="0 0 320 140" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="o3" x1="0" x2="1"><stop offset="0" stopColor="#465CFF"/><stop offset="1" stopColor="#55D6FF"/></linearGradient>
      </defs>
      <g fontFamily="Instrument Sans, sans-serif" fontSize="11" fill="#5F6672">
        <rect x="10" y="55" width="90" height="30" rx="6" fill="#FFFFFF" stroke="#101218"/>
        <text x="55" y="74" textAnchor="middle" fill="#101218">Draft ready</text>

        <path d="M100 70 L 160 70" fill="none" stroke="url(#o3)" strokeWidth="2.5" strokeLinecap="round"/>

        <rect x="160" y="50" width="70" height="40" rx="6" fill="#E9EDFF" stroke="#465CFF"/>
        <text x="195" y="66" textAnchor="middle" fill="#101218" fontFamily="Inter Tight" fontWeight="700">Your OK</text>
        <text x="195" y="82" textAnchor="middle" fontSize="10">one tap</text>

        <path d="M230 70 L 275 70" fill="none" stroke="url(#o3)" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="290" cy="70" r="12" fill="#198A5A"/>
        <path d="M283 70 L 289 76 L 297 66" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

const ITEMS = [
  {
    title: "Every good lead answered while they still care",
    body: "Replies in seconds — day, night, weekend. Qualifies, books, and hands off to a human the moment it matters.",
    label: "AI LEAD RESPONSE & BOOKING",
    Graphic: LeadFlow,
  },
  {
    title: "One honest view of how the business is doing",
    body: "A short daily brief built from your sales, labor, schedule, and tasks: what changed, what needs attention, and where every number came from.",
    label: "OWNER BRIEFING FROM YOUR LIVE DATA",
    Graphic: BriefingFlow,
  },
  {
    title: "The busywork comes off your plate",
    body: "Quiet quotes chased, past customers invited back, reviews requested while the customer's still smiling, the weekly report built for you — and nothing reaches a customer without your one-tap OK.",
    label: "APPROVAL-GATED AUTOMATION",
    Graphic: AutomationFlow,
  },
];

export function Outcomes() {
  return (
    <section id="outcomes" className="scroll-mt-24 border-t border-border bg-[hsl(var(--stm-cobalt-soft))]/30 py-20 md:py-28">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="max-w-3xl">
          <span className="eyebrow">WHAT WE FIX</span>
          <h2 className="font-display mt-4 text-balance text-foreground" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", lineHeight: 1.05 }}>
            Start with the problem that hurts most.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 md:gap-14 lg:grid-cols-12">
          {ITEMS.map((it, i) => {
            const spans = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-12"];
            const offsets = ["", "lg:col-start-8", ""];
            return (
              <article
                key={it.title}
                className={`rounded-2xl border border-border bg-[hsl(var(--stm-surface))] p-7 md:p-9 ${spans[i]} ${offsets[i] ?? ""}`}
              >
                <div className={`grid grid-cols-1 items-center gap-6 ${i === 2 ? "md:grid-cols-[1fr_auto]" : ""}`}>
                  <div>
                    <h3 className="font-display text-2xl text-foreground md:text-[1.7rem]" style={{ lineHeight: 1.15 }}>
                      &ldquo;{it.title}&rdquo;
                    </h3>
                    <p className="mt-4 text-[1rem] leading-relaxed text-foreground/85">
                      {it.body}
                    </p>
                    <p className="mt-4 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {it.label}
                    </p>
                  </div>
                  <div className={`${i === 2 ? "md:w-[360px]" : "mt-2"}`}>
                    <it.Graphic />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}