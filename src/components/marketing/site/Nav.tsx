import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
const links = [
  { href: "#lead-followup", label: "Lead Follow-Up" },
  { href: "#ops-dashboard", label: "Dashboard" },
  { href: "#assistant", label: "Assistant" },
  { href: "#automations", label: "Automations" },
  { href: "#proof", label: "Proof" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-10">
        <a href="#top" className="flex flex-col leading-tight">
          <span className="font-display text-base font-medium tracking-tight text-foreground md:text-lg">
            Supreme Team Media
          </span>
          <span className="hidden text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:block">
            AI Systems &amp; Operational Intelligence Studio
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="hidden text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground md:inline-block"
          >
            Log in
          </Link>
          <a
            href="#contact"
            className="hidden items-center rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 md:inline-flex"
          >
            Book a call
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            className="rounded-sm border border-border p-2 text-foreground md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-sm px-2 py-3 text-sm text-foreground hover:bg-panel"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-sm px-2 py-3 text-sm text-muted-foreground hover:bg-panel"
            >
              Log in
            </Link>
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground"
            >
              Book a call
            </a>
          </div>
        </div>
      )}
    </header>
  );
}