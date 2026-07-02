import { Link } from "react-router-dom";
import { Container, MonoLabel } from "@/components/marketing/site/primitives";

const links = [
  { href: "#lead-followup", label: "Systems" },
  { href: "#proof", label: "Proof" },
  { href: "#contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="section-dark relative border-t-2 border-[hsl(var(--gold)/0.5)]">
      <Container className="py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <p className="font-display text-lg text-[hsl(var(--bone))]">Supreme Team Media</p>
            <MonoLabel className="mt-1 block text-[0.62rem]" style={{ color: "hsl(var(--gold))" }}>
              AI Systems &amp; Operational Intelligence Studio
            </MonoLabel>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[hsl(var(--bone)/0.75)] md:justify-center">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-[hsl(var(--gold))]">
                {l.label}
              </a>
            ))}
            <Link to="/work" className="transition-colors hover:text-[hsl(var(--gold))]">Work</Link>
            <Link to="/auth" className="transition-colors hover:text-[hsl(var(--gold))]">Log in</Link>
          </nav>

          <div className="text-sm md:text-right">
            <a href="mailto:hello@supremeteammedia.com" className="text-[hsl(var(--bone))] transition-colors hover:text-[hsl(var(--gold))]">
              hello@supremeteammedia.com
            </a>
            <p className="mt-1 text-[hsl(var(--bone)/0.6)]">Phone &amp; social — coming soon</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-[hsl(var(--bone)/0.12)] pt-6 md:flex-row md:items-center">
          <MonoLabel className="text-[0.6rem]" style={{ color: "hsl(var(--bone) / 0.6)" }}>
            © {new Date().getFullYear()} Supreme Team Media · All rights reserved
          </MonoLabel>
          <MonoLabel className="text-[0.6rem]" style={{ color: "hsl(var(--gold))" }}>Powered by Supreme Team OS</MonoLabel>
        </div>
      </Container>
    </footer>
  );
}