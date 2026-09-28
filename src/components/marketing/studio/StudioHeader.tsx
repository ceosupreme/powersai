import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Container } from "./primitives";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import { StudioMotion } from "./StudioMotion";

const SERVICES = [
  { to: "/services/websites", label: "Websites & digital products", labelEs: "Sitios web y productos digitales", note: "Credible sites, landing pages, commerce, and web apps", noteEs: "Sitios confiables, páginas de campaña, comercio y aplicaciones web" },
  { to: "/services/brand", label: "Brand & creative", labelEs: "Marca y creatividad", note: "Positioning, identity, systems, and campaign creative", noteEs: "Posicionamiento, identidad, sistemas y creatividad para campañas" },
  { to: "/services/marketing", label: "Marketing & growth", labelEs: "Marketing y crecimiento", note: "Campaigns, content, launches, and audience paths", noteEs: "Campañas, contenido, lanzamientos y recorridos de audiencia" },
  { to: "/services/ai-systems", label: "AI & business systems", labelEs: "IA y sistemas de negocio", note: "Dashboards, workflows, integrations, and automation", noteEs: "Paneles, flujos de trabajo, integraciones y automatización" },
  { to: "/publishing", label: "Publishing & launch", labelEs: "Publicación y lanzamiento", note: "Books, apps, and digital products ready for release", noteEs: "Libros, aplicaciones y productos digitales listos para salir" },
  { to: "/startups", label: "Startups & founders", labelEs: "Startups y fundadores", note: "Validate the idea, build the brand, launch, and grow", noteEs: "Valida la idea, crea la marca, lanza y crece" },
  { to: "/pricing", label: "Plans & pricing", labelEs: "Planes y precios", note: "Compare website, care, growth, and systems options", noteEs: "Compara opciones de sitio, soporte, crecimiento y sistemas" },
];

const normalizeSlug = (slug: string) => slug === "bars-restaurants" ? "restaurants" : slug === "taquerias" ? "tacos" : slug === "plumbing-hvac" ? "plumbing" : slug;

export function StudioHeader({ language = "en" }: { language?: "en" | "es" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileIndustriesOpen, setMobileIndustriesOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const servicesButtonRef = useRef<HTMLButtonElement | null>(null);
  const servicesPanelRef = useRef<HTMLDivElement | null>(null);
  const industriesButtonRef = useRef<HTMLButtonElement | null>(null);
  const industriesPanelRef = useRef<HTMLDivElement | null>(null);
  const { pathname, search } = useLocation();
  const { data: landers = [], isLoading: industriesLoading, isError: industriesError } = usePublishedVerticalLanders();
  const industries = landers.map((row) => ({ ...row, slug: normalizeSlug(row.slug) }));
  const routeSlug = pathname.match(/^\/for\/([a-z0-9-]{2,40})\/?$/)?.[1];
  const verticalSlug = routeSlug ? normalizeSlug(routeSlug) : null;
  const sourceParams = new URLSearchParams(search);
  const biz = sanitizeBiz(sourceParams.get("biz"));
  const contactParams = new URLSearchParams();
  const existingSrc = sourceParams.get("src");
  if (verticalSlug) contactParams.set("src", `for-${verticalSlug}`);
  else if (/^[a-z0-9-]{1,80}$/i.test(existingSrc ?? "")) contactParams.set("src", existingSrc ?? "");
  if (biz) contactParams.set("biz", biz);
  if (sourceParams.get("lang") === "es") contactParams.set("lang", "es");
  if (/^[a-z0-9-]{1,40}$/i.test(sourceParams.get("intent") ?? "")) contactParams.set("intent", sourceParams.get("intent") ?? "");
  if (/^[a-z0-9-]{1,40}$/i.test(sourceParams.get("offer") ?? "")) contactParams.set("offer", sourceParams.get("offer") ?? "");
  const attributedContact = `/${contactParams.size ? `?${contactParams.toString()}` : ""}#contact`;
  const labels = language === "es"
    ? { work: "Trabajo", services: "Servicios", industries: "Industrias", about: "Acerca de", start: "Inicia un proyecto", open: "Abrir menú", close: "Cerrar menú", viewAll: "Ver todas las industrias" }
    : { work: "Work", services: "Services", industries: "Industries", about: "About", start: "Start a project", open: "Open menu", close: "Close menu", viewAll: "View all industries" };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
    setIndustriesOpen(false);
    setMobileServicesOpen(false);
    setMobileIndustriesOpen(false);
  }, [pathname]);

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
    if (!servicesOpen && !industriesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const focusTarget = servicesOpen ? servicesButtonRef.current : industriesButtonRef.current;
        setServicesOpen(false);
        setIndustriesOpen(false);
        focusTarget?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!servicesPanelRef.current?.contains(target) && !servicesButtonRef.current?.contains(target)) setServicesOpen(false);
      if (!industriesPanelRef.current?.contains(target) && !industriesButtonRef.current?.contains(target)) setIndustriesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [servicesOpen, industriesOpen]);

  return (
    <><StudioMotion /><header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all",
        scrolled ? "border-b border-border bg-[hsl(var(--paper)/0.97)] shadow-sm backdrop-blur" : "border-b border-border bg-[hsl(var(--paper))]",
      )}
    >
      <Container className="flex h-[76px] items-center justify-between gap-6">
        <Link to="/" className="studio-display inline-flex min-h-11 items-center text-[1.05rem] leading-none tracking-tight md:text-[1.15rem]">
          Supreme Team Media
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex xl:gap-9">
          <div className="relative">
            <Button ref={servicesButtonRef} type="button" variant="ghost" aria-expanded={servicesOpen} aria-controls="studio-services-menu"
              onClick={() => { setServicesOpen((value) => !value); setIndustriesOpen(false); }}
              className="h-11 gap-1.5 px-1 text-[1rem] font-normal text-foreground/80 hover:bg-transparent hover:text-foreground">
              {labels.services} <ChevronDown size={15} className={cn("transition-transform", servicesOpen && "rotate-180")} />
            </Button>
            {servicesOpen && (
              <div id="studio-services-menu" ref={servicesPanelRef} className="studio-services-menu absolute left-1/2 top-[calc(100%+12px)] w-[680px] -translate-x-1/2 border border-border bg-[hsl(var(--paper))] p-3 shadow-xl">
                <div className="grid grid-cols-2 gap-1">
                  {SERVICES.map((service, index) => (
                    <Link key={service.to} to={service.to} onClick={() => setServicesOpen(false)} className="group min-h-[92px] border-b border-border p-4 hover:bg-[hsl(var(--surface))]">
                      <span className="studio-display block text-[1.02rem] group-hover:text-primary">{language === "es" ? service.labelEs : service.label}</span>
                      <span className="mt-2 block text-[0.8rem] leading-snug text-muted-foreground">{language === "es" ? service.noteEs : service.note}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <Button ref={industriesButtonRef} type="button" variant="ghost" aria-expanded={industriesOpen} aria-controls="studio-industries-menu"
              onClick={() => { setIndustriesOpen((value) => !value); setServicesOpen(false); }}
              className="h-11 gap-1.5 px-1 text-[1rem] font-normal text-foreground/80 hover:bg-transparent hover:text-foreground">
              {labels.industries} <ChevronDown size={15} className={cn("transition-transform", industriesOpen && "rotate-180")} />
            </Button>
            {industriesOpen && (
              <div id="studio-industries-menu" ref={industriesPanelRef} className="studio-industries-menu absolute left-1/2 top-[calc(100%+12px)] w-[560px] -translate-x-1/2 border border-border bg-[hsl(var(--paper))] p-3 shadow-xl">
                <Link to="/industries" onClick={() => setIndustriesOpen(false)} className="group flex min-h-14 items-center justify-between border-b border-border px-4 font-medium hover:bg-[hsl(var(--surface))]">
                  {labels.viewAll} <span aria-hidden>↗</span>
                </Link>
                {industriesLoading ? <p className="px-4 py-5 text-sm text-muted-foreground" role="status">Loading industries…</p> : industriesError ? <p className="px-4 py-5 text-sm text-muted-foreground" role="status">Direct links are temporarily unavailable. Use View all industries.</p> : (
                  <div className="grid grid-cols-2 gap-px pt-2">
                    {industries.map((industry) => <Link key={industry.slug} to={`/for/${industry.slug}`} onClick={() => setIndustriesOpen(false)} className="flex min-h-12 items-center px-4 text-sm hover:bg-[hsl(var(--surface))] hover:text-primary">{industry.display_name}</Link>)}
                  </div>
                )}
              </div>
            )}
          </div>
          <Link to="/work" className="inline-flex min-h-11 items-center text-[1rem] text-foreground/80 hover:text-foreground">{labels.work}</Link>
          <Link to="/about" className="inline-flex min-h-11 items-center text-[1rem] text-foreground/80 hover:text-foreground">{labels.about}</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to={attributedContact} onClick={() => trackSiteEvent({ event_type: "cta_click", label: "start_project" })} className="home-btn-amber studio-header-cta">
            {labels.start}
          </Link>
          <Button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="studio-mobile-menu"
            aria-label={open ? labels.close : labels.open}
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
            <Button type="button" variant="ghost" aria-expanded={mobileServicesOpen} aria-controls="studio-mobile-services" onClick={() => { setMobileServicesOpen((value) => !value); setMobileIndustriesOpen(false); }} className="flex min-h-[48px] w-full justify-between rounded-none border-b border-border px-2 text-[1rem] font-normal">
              {labels.services}<ChevronDown size={16} className={cn("transition-transform", mobileServicesOpen && "rotate-180")} />
            </Button>
            {mobileServicesOpen && <div id="studio-mobile-services" className="border-b border-border bg-[hsl(var(--surface))] px-3 py-1">{SERVICES.map((service) => (
              <Link key={service.to} to={service.to} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 text-[0.94rem] last:border-0">{language === "es" ? service.labelEs : service.label}</Link>
            ))}</div>}
            <Button type="button" variant="ghost" aria-expanded={mobileIndustriesOpen} aria-controls="studio-mobile-industries" onClick={() => { setMobileIndustriesOpen((value) => !value); setMobileServicesOpen(false); }} className="flex min-h-[48px] w-full justify-between rounded-none border-b border-border px-2 text-[1rem] font-normal">
              {labels.industries}<ChevronDown size={16} className={cn("transition-transform", mobileIndustriesOpen && "rotate-180")} />
            </Button>
            {mobileIndustriesOpen && <div id="studio-mobile-industries" className="border-b border-border bg-[hsl(var(--surface))] px-3 py-1">
              <Link to="/industries" onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 font-medium">{labels.viewAll}</Link>
              {industriesLoading ? <p className="px-2 py-4 text-sm text-muted-foreground" role="status">Loading industries…</p> : industriesError ? <p className="px-2 py-4 text-sm text-muted-foreground" role="status">Direct links are temporarily unavailable.</p> : industries.map((industry) => <Link key={industry.slug} to={`/for/${industry.slug}`} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 text-[0.94rem] last:border-0">{industry.display_name}</Link>)}
            </div>}
            <Link to="/work" onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 text-[1rem]">{labels.work}</Link>
            <Link to="/about" onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-border px-2 text-[1rem]">{labels.about}</Link>
            <div className="flex gap-5 border-b border-border px-2 py-2 text-sm"><Link to="/privacy" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center">{language === "es" ? "Privacidad" : "Privacy"}</Link><Link to="/terms" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center">{language === "es" ? "Términos" : "Terms"}</Link></div>
            <Link
              to={attributedContact}
              onClick={() => { setOpen(false); trackSiteEvent({ event_type: "cta_click", label: "start_project" }); }}
              className="home-btn-amber mt-3 w-full justify-center"
            >
              {labels.start}
            </Link>
          </Container>
        </div>
      )}
    </header></>
  );
}
