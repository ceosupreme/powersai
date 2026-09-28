import { Link, useLocation } from "react-router-dom";
import { Container } from "./primitives";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { sanitizeBiz } from "@/pages/VerticalLanding";

const normalizeSlug = (slug: string) => slug === "bars-restaurants" ? "restaurants" : slug === "taquerias" ? "tacos" : slug === "plumbing-hvac" ? "plumbing" : slug;

/** Every link here points at a real, implemented route — never a dead link. */
export function StudioFooter({ language = "en" }: { language?: "en" | "es" }) {
  const { pathname, search } = useLocation();
  const routeSlug = pathname.match(/^\/for\/([a-z0-9-]{2,40})\/?$/)?.[1];
  const verticalSlug = routeSlug ? normalizeSlug(routeSlug) : null;
  const params = new URLSearchParams(search);
  const biz = sanitizeBiz(params.get("biz"));
  const queryLanguage = params.get("lang") === "es" ? "es" : null;
  const sourceParams = new URLSearchParams();
  if (verticalSlug) sourceParams.set("src", `for-${verticalSlug}`);
  else if (/^[a-z0-9-]{1,80}$/i.test(params.get("src") ?? "")) sourceParams.set("src", params.get("src") ?? "");
  if (biz) sourceParams.set("biz", biz);
  if (queryLanguage) sourceParams.set("lang", queryLanguage);
  const source = sourceParams.size ? `?${sourceParams.toString()}` : "";
  const contactHref = `/${source}#contact`;
  const auditHref = `/free-audit${source}`;
  const es = language === "es" || queryLanguage === "es";
  const { data: landers = [], isError } = usePublishedVerticalLanders();
  const industries = landers.map((row) => ({ ...row, slug: normalizeSlug(row.slug) }));
  return (
    <footer className="studio-band">
      <Container className="py-16 md:py-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="studio-display text-2xl">Supreme Team Media</p>
            <p className="mt-3 max-w-sm text-[1rem] text-muted-foreground">{es ? "Marcas, sitios web, campañas y sistemas construidos alrededor del problema del negocio." : "Brands, websites, campaigns, and systems built around the business problem."}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-1 text-[1rem] sm:grid-cols-3">
            <Link to="/work" className="inline-flex min-h-11 items-center hover:underline">{es ? "Trabajo" : "Work"}</Link>
            <Link to="/services/websites" className="inline-flex min-h-11 items-center hover:underline">{es ? "Sitios web" : "Websites"}</Link>
            <Link to="/services/brand" className="inline-flex min-h-11 items-center hover:underline">{es ? "Marca y creatividad" : "Brand & creative"}</Link>
            <Link to="/services/marketing" className="inline-flex min-h-11 items-center hover:underline">{es ? "Marketing y crecimiento" : "Marketing & growth"}</Link>
            <Link to="/services/ai-systems" className="inline-flex min-h-11 items-center hover:underline">{es ? "IA y sistemas" : "AI & systems"}</Link>
            <Link to="/publishing" className="inline-flex min-h-11 items-center hover:underline">{es ? "Publicación y lanzamiento" : "Publishing & Launch"}</Link>
            <Link to="/pricing" className="inline-flex min-h-11 items-center hover:underline">{es ? "Planes y precios" : "Plans & pricing"}</Link>
            <Link to="/startups" className="inline-flex min-h-11 items-center hover:underline">{es ? "Startups y fundadores" : "Startups & founders"}</Link>
            <Link to="/about" className="inline-flex min-h-11 items-center hover:underline">{es ? "Acerca de" : "About"}</Link>
            <Link to={contactHref} className="inline-flex min-h-11 items-center hover:underline">{es ? "Habla de un proyecto" : "Discuss a project"}</Link>
            <Link to={auditHref} className="inline-flex min-h-11 items-center hover:underline">{es ? "Revisión gratuita" : "Free business checkup"}</Link>
            <Link to="/industries" className="inline-flex min-h-11 items-center hover:underline">{es ? "Industrias" : "Industries"}</Link>
            <Link to="/hire" className="inline-flex min-h-11 items-center hover:underline">{es ? "¿Quieres contratar a Sean?" : "Hiring Sean?"}</Link>
            <Link to="/login" className="inline-flex min-h-11 items-center hover:underline">{es ? "Acceso para clientes" : "Client login"}</Link>
            <Link to="/privacy" className="inline-flex min-h-11 items-center hover:underline">{es ? "Privacidad" : "Privacy"}</Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center hover:underline">{es ? "Términos" : "Terms"}</Link>
            <a
              href="https://www.linkedin.com/in/supremepowers"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center hover:underline"
            >
              LinkedIn
            </a>
          </nav>
        </div>

        <nav aria-label="Industries" className="mt-10 border-t border-[hsl(var(--band-text)/0.16)] pt-7">
          <p className="studio-label mb-4" style={{ color: "hsl(var(--band-text) / 0.62)" }}>{es ? "Industrias" : "Industries"}</p>
           <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
             {industries.map((row) => <Link key={row.slug} to={`/for/${row.slug}`} className="inline-flex min-h-11 items-center hover:underline">{row.display_name}</Link>)}
             {isError && <span className="inline-flex min-h-11 items-center">Industry links are temporarily unavailable.</span>}
             <Link to="/industries" className="inline-flex min-h-11 items-center font-medium text-foreground hover:underline">{es ? "Ver todas" : "View all industries"}</Link>
          </div>
        </nav>

        <div className="mt-12 flex flex-col gap-2 border-t border-[hsl(var(--band-text)/0.16)] pt-6 text-sm text-muted-foreground md:flex-row md:justify-between">
          <span>&copy; {new Date().getFullYear()} Supreme Team Media</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-11 items-center hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>
      </Container>
    </footer>
  );
}
