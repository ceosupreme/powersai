import { Link } from "react-router-dom";
import { Container, MonoLabel } from "@/components/marketing/site/primitives";

const links = [
  { href: "#what-i-build", label: "What I Build" },
  { href: "#proof", label: "Proof" },
  { href: "#contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-panel/40">
      <Container className="py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <p className="font-display text-lg text-foreground">Supreme Team Media</p>
            <MonoLabel className="mt-1 block text-[0.62rem]">
              AI Systems &amp; Operational Intelligence Studio
            </MonoLabel>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground md:justify-center">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
            <Link to="/auth" className="transition-colors hover:text-foreground">Log in</Link>
          </nav>

          <div className="text-sm md:text-right">
            <a href="mailto:hello@supremeteammedia.com" className="text-foreground transition-colors hover:text-accent">
              hello@supremeteammedia.com
            </a>
            <p className="mt-1 text-muted-foreground">Phone &amp; social — coming soon</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 md:flex-row md:items-center">
          <MonoLabel className="text-[0.6rem]">
            © {new Date().getFullYear()} Supreme Team Media · All rights reserved
          </MonoLabel>
          <MonoLabel className="text-[0.6rem] text-accent">Built for real-world business</MonoLabel>
        </div>
      </Container>
    </footer>
  );
}