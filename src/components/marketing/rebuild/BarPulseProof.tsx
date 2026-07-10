// INTENTIONAL: "BarPulse" preserved by design — one permitted exception to
// the Supreme Team Media terminology rule. This is the case-study product view.

export function BarPulseProof() {
  return (
    <section
      id="barpulse"
      className="scroll-mt-24 py-20 md:py-28"
      style={{ backgroundColor: "hsl(var(--stm-band-dark))", color: "#FFFFFF" }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <span
          className="inline-flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.06em]"
          style={{ color: "#55D6FF" }}
        >
          <span style={{ display: "inline-block", width: 12, height: 2, backgroundColor: "#55D6FF" }} />
          PROOF, NOT A PITCH DECK
        </span>
        <h2
          className="font-display mt-5 text-balance"
          style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", lineHeight: 1.05, color: "#FFFFFF" }}
        >
          Eight locations. One clear answer every morning.
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>
          BarPulse connects sales, labor, manager tasks, and guest feedback for a multi-location San Diego hospitality group. Ownership used to find out how a busy weekend really went days later, if at all. Now it's one view, every morning: what changed, what needs attention, and where every recommendation came from — and when the data isn't there, the system says so instead of guessing.
        </p>

        {/* Counters */}
        <div className="mt-10 grid grid-cols-3 gap-6 border-y py-8" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
          {[
            { n: "8", k: "LOCATIONS" },
            { n: "LIVE", k: "IN PRODUCTION" },
            { n: "DAILY", k: "RUNNING" },
          ].map((s) => (
            <div key={s.k}>
              <div
                className="font-display"
                style={{ fontSize: "clamp(1.6rem,4vw,2.8rem)", lineHeight: 1, color: "#FFFFFF" }}
              >
                {s.n}
              </div>
              <div
                className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {s.k}
              </div>
            </div>
          ))}
        </div>

        {/* Product view — single large card, three cobalt-ringed callouts */}
        <div
          className="mt-12 rounded-2xl p-6 md:p-10"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <div
            className="mb-6 font-mono-label"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.65rem", letterSpacing: "0.14em" }}
          >
            MONDAY MORNING · ALL VENUES
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                label: "What changed",
                body: "Net sales down 6% at Waterfront vs same weekend last year. Labor held steady. Guest volume flat.",
              },
              {
                label: "What needs attention",
                body: "Two late meal breaks Saturday — Waterfront BOH. One void spike on the Sunday brunch shift.",
              },
              {
                label: "Where it came from",
                body: "Toast POS · 7shifts labor · manager task log · guest feedback. All source-linked, all dated.",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "rgba(70,92,255,0.10)",
                  border: "2px solid #465CFF",
                }}
              >
                <div
                  className="text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "#55D6FF" }}
                >
                  {c.label}
                </div>
                <p
                  className="font-display mt-3"
                  style={{ fontSize: "1.1rem", lineHeight: 1.35, color: "#FFFFFF" }}
                >
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}