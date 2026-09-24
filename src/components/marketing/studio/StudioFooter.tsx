import { Link, useLocation } from "react-router-dom";
import { Container } from "./primitives";

/** Every link here points at a real, implemented route — never a dead link. */
export function StudioFooter({ language = "en" }: { language?: "en" | "es" }) {
  const { pathname, search } = useLocation();
  const routeSlug = pathname.match(/^\/for\/(hvac|auto|real-estate|legal|medspa|restaurants|bars-restaurants|pizza|tacos|taquerias)$/)?.[1];
  const verticalSlug = routeSlug === "bars-restaurants" ? "restaurants" : routeSlug === "taquerias" ? "tacos" : routeSlug;
  const params = new URLSearchParams(search);
  const biz = params.get("biz");
  const source = verticalSlug ? `?src=for-${verticalSlug}${biz ? `&biz=${encodeURIComponent(biz)}` : ""}` : "";
  const contactHref = verticalSlug ? `/${source}#contact` : "/#contact";
  const auditHref = verticalSlug ? `/free-audit${source}` : "/free-audit";
  const es = language === "es";
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
            <Link to="/#about" className="inline-flex min-h-11 items-center hover:underline">{es ? "Acerca de" : "About"}</Link>
            <Link to={contactHref} className="inline-flex min-h-11 items-center hover:underline">{es ? "Habla de un proyecto" : "Discuss a project"}</Link>
            <Link to={auditHref} className="inline-flex min-h-11 items-center hover:underline">{es ? "Revisión gratuita" : "Free business checkup"}</Link>
            <Link to="/industries" className="inline-flex min-h-11 items-center hover:underline">{es ? "Industrias" : "Industries"}</Link>
            <Link to="/hire" className="inline-flex min-h-11 items-center hover:underline">{es ? "¿Quieres contratar a Sean?" : "Hiring Sean?"}</Link>
            <Link to="/login" className="inline-flex min-h-11 items-center hover:underline">{es ? "Acceso para clientes" : "Client login"}</Link>
            <a
              href="https://www.linkedin.com/in/sean-mayo-3055aa287/"
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
            <Link to="/for/hvac" className="inline-flex min-h-11 min-w-11 items-center hover:underline">HVAC</Link>
            <Link to="/for/auto" className="inline-flex min-h-11 items-center hover:underline">{es ? "Automotriz" : "Automotive"}</Link>
            <Link to="/for/real-estate" className="inline-flex min-h-11 items-center hover:underline">{es ? "Bienes raíces" : "Real estate"}</Link>
            <Link to="/for/legal" className="inline-flex min-h-11 min-w-11 items-center hover:underline">Legal</Link>
            <Link to="/for/medspa" className="inline-flex min-h-11 items-center hover:underline">{es ? "Spa médico" : "Med spa"}</Link>
            <Link to="/for/restaurants" className="inline-flex min-h-11 items-center hover:underline">{es ? "Bares y restaurantes" : "Bars & restaurants"}</Link>
            <Link to="/for/pizza" className="inline-flex min-h-11 items-center hover:underline">{es ? "Pizzerías" : "Pizza shops"}</Link>
            <Link to="/for/tacos" className="inline-flex min-h-11 items-center hover:underline">{es ? "Taquerías / restaurantes de tacos" : "Taco shops / Taquerías"}</Link>
          </div>
        </nav>

        <div className="mt-12 flex flex-col gap-2 border-t border-[hsl(var(--band-text)/0.16)] pt-6 text-sm text-muted-foreground md:flex-row md:justify-between">
          <span>&copy; {new Date().getFullYear()} Supreme Team Media</span>
          <a href="mailto:hello@supremeteammedia.com" className="inline-flex min-h-11 items-center hover:underline">
            hello@supremeteammedia.com
          </a>
        </div>
      </Container>
    </footer>
  );
}
