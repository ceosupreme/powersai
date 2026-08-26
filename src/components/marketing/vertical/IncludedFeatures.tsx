import { Check } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";

export function IncludedFeatures({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-14 md:py-20">
      <Container>
        <Reveal>
          <span className="eyebrow">Everything else included</span>
        </Reveal>
        <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-2">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-[hsl(var(--ink-soft))]">
              <Check size={16} className="mt-0.5 shrink-0" style={{ color: "hsl(var(--green))" }} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
