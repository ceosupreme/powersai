import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Container } from "./primitives";

const SERVICES = [
  { to: "/services/websites", label: "Websites & digital products", note: "Credible sites, landing pages, commerce, and web apps" },
  { to: "/services/brand", label: "Brand & creative", note: "Positioning, identity, systems, and campaign creative" },
  { to: "/services/marketing", label: "Marketing & growth", note: "Campaigns, content, launches, and audience paths" },
  { to: "/services/ai-systems", label: "AI & business systems", note: "Dashboards, workflows, integrations, and automation" },
  { to: "/publishing", label: "Publishing & launch", note: "Books, apps, and digital products ready for release" },
];

export function StudioHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const servicesButtonRef = useRef<HTMLButtonElement | null>(null);
  const servicesPanelRef = useRef<HTMLDivElement | null>(null);
  const { pathname, search } = useLocation();
  const verticalSlug = pathname.match(/^\/for\/(hvac|auto|real-estate|legal|medspa)$/)?.[1];
  const sourceParams = new URLSearchParams(search);
  const biz = sourceParams.get("biz");
  const attributedContact = verticalSlug
    ? `/?src=for-${verticalSlug}${biz ? `&biz=${encodeURIComponent(biz)}` : ""}#contact`
    : "/#contact";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); setServicesOpen(false); }, [pathname]);

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

  useEffect(() => {
    if (!servicesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        servicesButtonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!servicesPanelRef.current?.contains(target) && !servicesButtonRef.current?.contains(target)) setServicesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [servicesOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all",
        scrolled ? "border-b border-border bg-[hsl(var(--paper)/0.95)] shadow-sm backdrop-blur" : "border-b border-transparent",
      )}
    >
      <Container className="flex h-[76px] items-center justify-between gap-6">
        <Link to="/" className="studio-display inline-flex min-h-11 items-center text-[1.05rem] leading-none tracking-tight md:text-[1.15rem]">
          Supreme Team Media
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex xl:gap-9">
          <Link to="/work" className="inline-flex min-h-11 items-center text-[1rem] text-foreground/80 hover:text-foreground">Work</Link>
          <div className="relative">
            <Button ref={servicesButtonRef} type="button" variant="ghost" aria-expanded={servicesOpen} aria-controls="studio-services-menu"
              onClick={() => setServicesOpen((value) => !value)}
              className="h-11 gap-1.5 px-1 text-[1rem] font-normal text-foreground/80 hover:bg-transparent hover:text-foreground">
              Services <ChevronDown size={15} className={cn("transition-transform", servicesOpen && "rotate-180")} />
            </Button>
            {servicesOpen && (
              <div id="studio-services-menu" ref={servicesPanelRef} className="studio-services-menu absolute left-1/2 top-[calc(100%+12px)] w-[680px] -translate-x-1/2 border border-border bg-[hsl(var(--paper))] p-3 shadow-xl">
                <div className="grid grid-cols-2 gap-1">
                  {SERVICES.map((service, index) => (
                    <Link key={service.to} to={service.to} onClick={() => setServicesOpen(false)} className={cn("group min-h-[92px] border-b border-border p-4 hover:bg-[hsl(var(--surface))]", index === SERVICES.length - 1 && "col-span-2")}>
                      <span className="studio-display block text-[1.02rem] group-hover:text-primary">{service.label}</span>
                      <span className="mt-2 block text-[0.8rem] leading-snug text-muted-foreground">{service.note}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link to="/#about" className="inline-flex min-h-11 items-center text-[1rem] text-foreground/80 hover:text-foreground">About</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to={attributedContact} className="studio-btn studio-btn-primary studio-header-cta">
            Start a project
          </Link>
          <Button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="studio-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-lg lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </Container>

      {open && (
        <div
          id="studio-mobile-menu"
          ref={panelRef}
          className="border-t border-border bg-[hsl(var(--paper))] lg:hidden"
        >
          <Container className="flex flex-col py-3">
            <Link to="/work" onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 text-[1rem]">Work</Link>
            <p className="studio-label px-2 pb-2 pt-5">Services</p>
            {SERVICES.map((service) => (
              <Link key={service.to} to={service.to} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 text-[0.98rem]">
                {service.label}
              </Link>
            ))}
            <Link to="/#about" onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 text-[1rem]">About</Link>
            <Link
              to={attributedContact}
              onClick={() => setOpen(false)}
              className="studio-btn studio-btn-primary mt-3 w-full"
            >
              Start a project
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
