import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";

export function FreeCheckLine({
  line,
  href,
}: {
  line: string;
  href: string;
}) {
  return (
    <section className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone))] py-10">
      <Container>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[1rem] leading-relaxed text-foreground">{line}</p>
          <a
            href={href}
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground underline decoration-[hsl(var(--gold))] decoration-2 underline-offset-8 hover:decoration-[hsl(var(--green))]"
          >
            Run the free check
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </Container>
    </section>
  );
}
