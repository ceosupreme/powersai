import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, Clock, Mail, MapPin } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { getStudioMedia } from "@/config/studioMedia";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { useCityPages } from "@/hooks/useSitePages";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { SITE_SERVICES } from "./siteNav";
import "./studioFooter.css";

const normalizeSlug = (slug: string) => slug === "bars-restaurants" ? "restaurants" : slug === "taquerias" ? "tacos" : slug === "plumbing-hvac" ? "plumbing" : slug;

/**
 * The sitewide footer: who we are and how to reach us on the left, the free
 * checkup on the right, three short link columns (services, company, get in
 * touch), the industry and city pages folded away under two headings, and
 * the legal line. Every link points at a real, implemented route.
 */
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
  // The main industries here; every industry is on the Industries page.
  const industries = landers.filter((row) => row.sort_order < 100).map((row) => ({ ...row, slug: normalizeSlug(row.slug) }));
  const { data: cities = [] } = useCityPages();
  const mark = getStudioMedia("home-opening-mark");
  const year = new Date().getFullYear();
  const t = (en: string, esText: string) => (es ? esText : en);
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label: `footer_${label}` });

  return (
    <footer className="stm-footer studio-band">
      <div className="stm-footer-in">
        <div className="stm-footer-top">
          <div className="stm-footer-brand">
            <Link to="/" className="stm-footer-logo" aria-label="Supreme Team Media home">
              {mark?.src && <img src={mark.src} alt="" width={mark.width} height={mark.height} loading="lazy" />}
              <span>Supreme Team Media</span>
            </Link>
            <p className="stm-footer-tag">{t("Marketing, websites, media and the systems behind them, built by one team since 2002.", "Marketing, sitios web, medios y los sistemas detrás de ellos, hechos por un solo equipo desde 2002.")}</p>
            <ul className="stm-footer-facts">
              <li><MapPin aria-hidden /><span>{t("Carlsbad Village, North County San Diego", "Carlsbad Village, North County San Diego")}</span></li>
              <li><Mail aria-hidden /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
              <li><Clock aria-hidden /><span>{t("We reply within one business day", "Respondemos en un día hábil")}</span></li>
            </ul>
            <p className="stm-footer-trust"><strong>500+</strong> {t("businesses trust us", "negocios confían en nosotros")}<i aria-hidden /><strong>4.9★</strong> {t("client satisfaction", "satisfacción de clientes")}</p>
          </div>
          <div className="stm-footer-cta">
            <small>{t("Free business checkup", "Revisión gratuita del negocio")}</small>
            <p className="stm-footer-cta-title">{t("See what's costing you customers.", "Mira qué te está costando clientes.")}</p>
            <p>{t("Type in your business name and city. About two minutes, no phone call.", "Escribe el nombre de tu negocio y tu ciudad. Unos dos minutos, sin llamadas.")}</p>
            <Link to={auditHref} className="stm-footer-btn" onClick={() => track("checkup")}>{t("Get my free report", "Ver mi informe gratis")} <ArrowRight aria-hidden /></Link>
          </div>
        </div>

        <div className="stm-footer-cols">
          <nav aria-label={t("Services", "Servicios")}>
            <h3>{t("Services", "Servicios")}</h3>
            <ul>
              {SITE_SERVICES.map((service) => <li key={service.to}><Link to={service.to}>{es ? service.labelEs : service.label}</Link></li>)}
              <li><Link to="/services">{t("All services", "Todos los servicios")}</Link></li>
              <li><Link to="/pricing">{t("Packages", "Paquetes")}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t("Company", "Empresa")}>
            <h3>{t("Company", "Empresa")}</h3>
            <ul>
              <li><Link to="/work">{t("Work", "Trabajo")}</Link></li>
              <li><Link to="/about">{t("About", "Acerca de")}</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/industries">{t("Industries", "Industrias")}</Link></li>
              <li><Link to="/areas">{t("Areas we serve", "Zonas que atendemos")}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t("Get in touch", "Contacto")}>
            <h3>{t("Get in touch", "Contacto")}</h3>
            <ul>
              <li><Link to={contactHref}>{t("Discuss a project", "Habla de un proyecto")}</Link></li>
              <li><Link to={auditHref}>{t("Free business checkup", "Revisión gratuita")}</Link></li>
              <li><Link to="/login">{t("Client login", "Acceso para clientes")}</Link></li>
              <li><a href="https://www.linkedin.com/in/supremepowers" target="_blank" rel="noreferrer">LinkedIn</a></li>
            </ul>
          </nav>
        </div>

        <div className="stm-footer-more">
          <details>
            <summary>{t("Industries we work with", "Industrias que atendemos")} <ChevronDown aria-hidden /></summary>
            <div className="stm-footer-more-list">
              {industries.map((row) => <Link key={row.slug} to={`/for/${row.slug}`}>{row.display_name}</Link>)}
              {isError && <span>{t("Industry links are temporarily unavailable.", "Los enlaces de industrias no están disponibles por ahora.")}</span>}
              <Link to="/industries" className="stm-footer-more-all">{t("View all industries", "Ver todas")} <ArrowRight aria-hidden /></Link>
            </div>
          </details>
          {cities.length > 0 && <details>
            <summary>{t("Areas we serve", "Zonas que atendemos")} <ChevronDown aria-hidden /></summary>
            <div className="stm-footer-more-list">
              {cities.map((city) => <Link key={city.slug} to={`/areas/${city.slug}`}>{city.name}</Link>)}
              <Link to="/areas" className="stm-footer-more-all">{t("All areas", "Ver todas")} <ArrowRight aria-hidden /></Link>
            </div>
          </details>}
        </div>

        <div className="stm-footer-bar">
          <span>&copy; {year} Supreme Team Media</span>
          <nav aria-label={t("Legal", "Legal")}>
            <Link to="/privacy">{t("Privacy", "Privacidad")}</Link>
            <Link to="/terms">{t("Terms", "Términos")}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
