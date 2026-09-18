import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "./primitives";

const LINKS = [
  { to: "/work", label: "Work" },
  { to: "/#services", label: "Capabilities" },
  { to: "/publishing", label: "Publishing" },
  { to: "/#process", label: "Process" },
  { to: "/#about", label: "About" },
];

export function StudioHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors",
        scrolled ? "border-b border-border bg-[hsl(var(--paper)/0.95)] backdrop-blur" : "border-b border-transparent",
      )}
    >
      <Container className="flex h-[72px] items-center justify-between gap-6">
        <Link to="/" className="studio-display text-[1.05rem] leading-none tracking-tight md:text-[1.15rem]">
          Supreme Team Media
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex xl:gap-8">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-[0.95rem] text-foreground/80 hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/#contact" className="studio-btn studio-btn-primary hidden lg:inline-flex">
            Discuss a project
          </Link>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="studio-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </Container>

      {open && (
        <div
          id="studio-mobile-menu"
          ref={panelRef}
          className="border-t border-border bg-[hsl(var(--paper))] lg:hidden"
        >
          <Container className="flex flex-col py-3">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center rounded-lg px-2 text-[0.98rem]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/#contact"
              onClick={() => setOpen(false)}
              className="studio-btn studio-btn-primary mt-3 w-full"
            >
              Discuss a project
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
