const STACK_LINE =
  "WORKS WITH YOUR STACK — Toast · Square · QuickBooks · Google Workspace · Calendly · Twilio · HubSpot · 7shifts · + 200 more";

export function TechStack() {
  return (
    <section aria-label="Works with your stack" className="relative border-y border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-6">
      <div className="marquee">
        <div className="marquee-track gap-16 pr-16">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="font-mono-label whitespace-nowrap" style={{ fontSize: "0.72rem", color: "hsl(var(--ink-soft))" }}>
              {STACK_LINE}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}