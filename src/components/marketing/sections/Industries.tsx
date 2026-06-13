import { Container } from "@/components/marketing/site/primitives";

const chips = [
  "Hospitality & restaurants",
  "Real estate",
  "Fitness",
  "Local service businesses",
  "Coaches & creators",
  "Multi-location operators",
];

export function Industries() {
  return (
    <section className="section-light section-light-tint relative border-t border-border py-20">
      <Container>
        <span className="eyebrow">Who this is for</span>
        <p className="font-display mt-4 max-w-3xl text-2xl text-foreground md:text-3xl">
          If your team runs on more than three tools, you&apos;ll feel this working in the first month.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c} className="hover-lift rounded-full border border-border bg-panel/60 px-4 py-2 text-[0.9rem] text-foreground/85">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-7 max-w-2xl text-[0.95rem] text-muted-foreground">
          Owners and operators who want growth without adding more chaos — and who&apos;d rather have one clear answer than five dashboards.
        </p>
      </Container>
    </section>
  );
}