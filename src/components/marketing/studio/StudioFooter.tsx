import { Link, useLocation } from "react-router-dom";
import { Container } from "./primitives";

/** Every link here points at a real, implemented route — never a dead link. */
export function StudioFooter() {
  const { pathname, search } = useLocation();
  const routeSlug = pathname.match(/^\/for\/(hvac|auto|real-estate|legal|medspa|restaurants|bars-restaurants|pizza|tacos|taquerias)$/)?.[1];
  const verticalSlug = routeSlug === "bars-restaurants" ? "restaurants" : routeSlug === "taquerias" ? "tacos" : routeSlug;
  const params = new URLSearchParams(search);
  const biz = params.get("biz");
  const source = verticalSlug ? `?src=for-${verticalSlug}${biz ? `&biz=${encodeURIComponent(biz)}` : ""}` : "";
  const contactHref = verticalSlug ? `/${source}#contact` : "/#contact";
  const auditHref = verticalSlug ? `/free-audit${source}` : "/free-audit";
  return (
    <footer className="studio-band">
      <Container className="py-16 md:py-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="studio-display text-2xl">Supreme Team Media</p>
            <p className="mt-3 max-w-sm text-[1rem] text-muted-foreground">Brands, websites, campaigns, and systems built around the business problem.</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-1 text-[1rem] sm:grid-cols-3">
            <Link to="/work" className="inline-flex min-h-11 items-center hover:underline">Work</Link>
            <Link to="/services/websites" className="inline-flex min-h-11 items-center hover:underline">Websites</Link>
            <Link to="/services/brand" className="inline-flex min-h-11 items-center hover:underline">Brand &amp; creative</Link>
            <Link to="/services/marketing" className="inline-flex min-h-11 items-center hover:underline">Marketing &amp; growth</Link>
            <Link to="/services/ai-systems" className="inline-flex min-h-11 items-center hover:underline">AI &amp; systems</Link>
            <Link to="/publishing" className="inline-flex min-h-11 items-center hover:underline">Publishing &amp; Launch</Link>
            <Link to="/#about" className="inline-flex min-h-11 items-center hover:underline">About</Link>
            <Link to={contactHref} className="inline-flex min-h-11 items-center hover:underline">Discuss a project</Link>
            <Link to={auditHref} className="inline-flex min-h-11 items-center hover:underline">Free business checkup</Link>
            <Link to="/industries" className="inline-flex min-h-11 items-center hover:underline">Industries</Link>
            <Link to="/hire" className="inline-flex min-h-11 items-center hover:underline">Hiring Sean?</Link>
            <Link to="/login" className="inline-flex min-h-11 items-center hover:underline">Client login</Link>
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
          <p className="studio-label mb-4" style={{ color: "hsl(var(--band-text) / 0.62)" }}>Industries</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <Link to="/for/hvac" className="inline-flex min-h-11 items-center hover:underline">HVAC</Link>
            <Link to="/for/auto" className="inline-flex min-h-11 items-center hover:underline">Automotive</Link>
            <Link to="/for/real-estate" className="inline-flex min-h-11 items-center hover:underline">Real estate</Link>
            <Link to="/for/legal" className="inline-flex min-h-11 items-center hover:underline">Legal</Link>
            <Link to="/for/medspa" className="inline-flex min-h-11 items-center hover:underline">Med spa</Link>
            <Link to="/for/restaurants" className="inline-flex min-h-11 items-center hover:underline">Bars &amp; restaurants</Link>
            <Link to="/for/pizza" className="inline-flex min-h-11 items-center hover:underline">Pizza shops</Link>
            <Link to="/for/tacos" className="inline-flex min-h-11 items-center hover:underline">Taco shops / Taquerías</Link>
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
