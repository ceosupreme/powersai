export function Founder() {
  return (
    <section id="founder" className="scroll-mt-24 border-t border-border py-20 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-4">
            <div
              aria-label="Founder photo placeholder"
              className="aspect-[4/5] w-full max-w-[360px] rounded-2xl border border-border"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--stm-cobalt-soft)) 0%, hsl(var(--stm-bg)) 100%)",
              }}
            />
          </div>
          <div className="md:col-span-8">
            <span className="eyebrow">WHO YOU'RE WORKING WITH</span>
            <p className="font-display mt-5 text-balance text-foreground" style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)", lineHeight: 1.2 }}>
              I'm Sean — San Diego, 30 years in marketing and operations. I build every system myself. There's no account manager and no hand-off: the person you talk to is the person who builds it, and the person who answers when something needs attention.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}