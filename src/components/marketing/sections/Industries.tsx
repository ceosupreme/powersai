import { Container } from "@/components/marketing/site/primitives";
import { Link } from "react-router-dom";

const chips: { label: string; to?: string }[] = [
  { label: "Hospitality & restaurants", to: "/for/bars-restaurants" },
  { label: "Real estate" },
  { label: "Fitness" },
  { label: "Local service businesses", to: "/for/plumbing-hvac" },
  { label: "Coaches & creators" },
  { label: "Multi-location operators" },
];

const chipClass =
  "rounded-full border border-[hsl(var(--gold)/0.5)] bg-transparent px-4 py-2 text-[0.9rem] text-foreground transition-colors hover:bg-[hsl(var(--gold-tint))]";

export function Industries() {
  return (
    <section className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-20">
      <Container>
        <span className="eyebrow">Who this is for</span>
        <p className="font-display mt-4 max-w-3xl text-foreground" style={{ fontSize: "clamp(1.75rem,3.5vw,2.6rem)", lineHeight: 1.1 }}>
          If your team runs on more than three tools, you&apos;ll feel this working in the first month.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {chips.map((c) =>
            c.to ? (
              <Link key={c.label} to={c.to} className={chipClass}>
                {c.label}
              </Link>
            ) : (
              <span key={c.label} className={chipClass}>
                {c.label}
              </span>
            ),
          )}
        </div>
        <p className="mt-7 max-w-2xl text-[0.95rem] text-[hsl(var(--ink-soft))]">
          Owners and operators who want growth without adding more chaos — and who&apos;d rather have one clear answer than five dashboards.
        </p>
      </Container>
    </section>
  );
}