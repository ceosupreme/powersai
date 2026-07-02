import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";

function highlightMoney(text: string) {
  // wrap $-figures and %-figures in gold
  const parts = text.split(/(\$[\d,]+(?:[–-]\$?[\d,]+)?(?:K|\/mo|\/yr)?|\b\d+%|\b\d+-venue|\b\d+ ?venue)/g);
  return parts.map((p, i) =>
    /^(\$|\d+%|\d+-?venue)/i.test(p) ? (
      <span key={i} style={{ color: "hsl(var(--gold))" }} className="font-medium">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function ProofBand({ proofLine }: { proofLine: string }) {
  return (
    <section className="section-dark relative overflow-hidden py-20 md:py-24">
      <div aria-hidden className="radial-gold pointer-events-none absolute inset-x-0 top-0 h-[380px] opacity-70" />
      <Container className="relative">
        <Reveal>
          <span className="eyebrow" style={{ color: "hsl(var(--gold))" }}>Proof</span>
        </Reveal>
        <Reveal delay={120}>
          <p className="font-display mt-6 max-w-4xl text-[hsl(var(--bone))]" style={{ fontSize: "clamp(1.5rem,3vw,2.25rem)", lineHeight: 1.2 }}>
            {highlightMoney(proofLine)}
          </p>
        </Reveal>
        <Reveal delay={200}>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[0.85rem] text-[hsl(var(--bone))]">
            {["In production", "Multi-location", "Source-cited"].map((c) => (
              <li key={c} className="flex items-center gap-2">
                <Check size={14} style={{ color: "hsl(var(--gold))" }} />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={280}>
          <Link
            to="/work"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-medium underline decoration-2 underline-offset-8"
            style={{ color: "hsl(var(--gold))" }}
          >
            See the work
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}