import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "#outcomes", label: "How we help" },
  { href: "#barpulse", label: "Proof" },
  { href: "#process", label: "How it starts" },
  { href: "#founder", label: "About" },
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
          ? "border-b border-border bg-[hsl(var(--stm-bg)/0.9)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-10">
        <a href="#top" className="flex flex-col leading-tight whitespace-nowrap">
          <span className="font-display text-base tracking-tight text-foreground md:text-lg">
            Supreme Team Media
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="whitespace-nowrap text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="hidden whitespace-nowrap text-sm text-foreground/70 transition-colors hover:text-foreground md:inline-block"
          >
            Log in
          </Link>
          <Link
            to="/free-audit"
            className="hidden items-center whitespace-nowrap rounded-full bg-[hsl(var(--stm-cobalt))] px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-lg md:inline-flex"
          >
            Free checkup
          </Link>
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
        <div className="border-t border-border bg-[hsl(var(--stm-bg))]/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-sm px-2 py-3 text-sm text-foreground hover:bg-[hsl(var(--stm-cobalt-soft))]"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-sm px-2 py-3 text-sm text-muted-foreground hover:bg-[hsl(var(--stm-cobalt-soft))]"
            >
              Log in
            </Link>
            <Link
              to="/free-audit"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-[hsl(var(--stm-cobalt))] px-4 py-2.5 text-sm font-medium text-white"
            >
              Free checkup
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}