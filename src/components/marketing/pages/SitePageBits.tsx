import { Link } from "react-router-dom";
import {
  AppWindow, ArrowRight, BarChart3, BookOpen, CalendarCheck, Camera, ChevronRight, Compass, CreditCard, Gift, GraduationCap,
  Images, LayoutDashboard, LayoutTemplate, Lightbulb, Magnet, Mail, MapPin, Megaphone, MessageCircle, MessageSquareText,
  MonitorSmartphone, Palette, PenLine, Phone, PhoneCall, PhoneMissed, Printer, Repeat, Rocket, Share2, ShieldCheck,
  ShoppingCart, Sparkles, Star, Store, Target, Users, Video, Workflow, type LucideIcon,
} from "lucide-react";
import { openAtTop } from "@/components/marketing/blog/BlogCard";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { useServicePages, type ServicePageRow } from "@/hooks/useSitePages";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import "./sitePages.css";

/** Icons a service row may name (rows store the name, the page draws it). */
const ICONS: Record<string, LucideIcon> = {
  AppWindow, BarChart3, BookOpen, CalendarCheck, Camera, Compass, CreditCard, Gift, GraduationCap, Images, LayoutDashboard,
  LayoutTemplate, Lightbulb, Magnet, Mail, MapPin, Megaphone, MessageCircle, MessageSquareText, MonitorSmartphone, Palette,
  PenLine, Phone, PhoneCall, PhoneMissed, Printer, Repeat, Rocket, Share2, ShieldCheck, ShoppingCart, Sparkles, Star, Store,
  Target, Users, Video, Workflow,
};
export function ServiceIcon({ name }: { name: string | null | undefined }) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon aria-hidden />;
}

/** The family pages each service belongs to, for breadcrumbs and the contact form. */
export const FAMILIES: Record<string, { label: string; servicePage?: "websites" | "brand" | "marketing" | "systems" | "publishing" }> = {
  "/services/websites": { label: "Websites", servicePage: "websites" },
  "/services/brand": { label: "Brand and creative", servicePage: "brand" },
  "/services/marketing": { label: "Marketing and growth", servicePage: "marketing" },
  "/services/ai-systems": { label: "AI and business systems", servicePage: "systems" },
  "/publishing": { label: "Publishing and launch", servicePage: "publishing" },
  "/startups": { label: "Startups and founders" },
};

/** A headline whose ending (the accent) shows in gold, when the row names one. */
export function Accent({ text, accent }: { text: string; accent?: string | null }) {
  const at = accent ? text.lastIndexOf(accent) : -1;
  if (!accent || at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<em className="sp-accent">{accent}</em>{text.slice(at + accent.length)}</>;
}

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="sp-crumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={item.label} style={{ display: "contents" }}>
          {i > 0 && <ChevronRight aria-hidden />}
          {item.to ? <Link to={item.to} onClick={openAtTop}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Slug to display name for every published industry page. */
export function useIndustryNames() {
  const { data = [] } = usePublishedVerticalLanders();
  const names = new Map<string, string>();
  data.forEach((row) => names.set(row.slug, row.display_name));
  return names;
}

/** Tell the contact form what the visitor is asking about (fills the note only if it's empty). */
export function prefillContact(text: string) {
  window.dispatchEvent(new CustomEvent("stm:contact-prefill", { detail: text }));
}

/** The dark band before the contact form: free checkup first, price second. */
export function CheckupBand({ title, accent, body, src, priceLabel = "Get my price", onPrice }: { title: string; accent?: string; body: string; src: string; priceLabel?: string; onPrice?: () => void }) {
  return (
    <section className="sp-band sp-dark">
      <div className="sp-wrap sp-band-in">
        <div>
          <h2><Accent text={title} accent={accent} /></h2>
          <p>{body}</p>
        </div>
        <div className="sp-band-acts">
          <Link className="sp-btn sp-btn-gold" to={`/free-audit?src=${src}`} onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `${src}_checkup` }); openAtTop(); }}>
            Run my free checkup <ArrowRight aria-hidden />
          </Link>
          <a className="sp-btn sp-btn-ghost" href="#contact" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `${src}_price` }); onPrice?.(); }}>
            {priceLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

/** On a family page (Websites, Brand, Marketing, AI and systems, Publishing,
 *  Startups): every service in that family, each linking to its own page. */
export function FamilyServices({ family, heading = "Every service in this group." }: { family: string; heading?: string }) {
  const { data = [] } = useServicePages();
  const rows = data.filter((row) => row.family_path === family);
  if (!rows.length) return null;
  return (
    <section className="sp-family" aria-labelledby={`family-services-${family.replace(/\W+/g, "-")}`}>
      <div className="sp-wrap">
        <div className="sp-eyebrow">Services</div>
        <h2 id={`family-services-${family.replace(/\W+/g, "-")}`} className="sp-h2">{heading}</h2>
        <div className="sp-family-grid">
          {rows.map((row) => <ServiceCard key={row.slug} row={row} from={`family_${family.replace(/\W+/g, "_")}`} />)}
        </div>
        <p style={{ marginTop: 26 }}><Link className="sp-link" to="/services" onClick={openAtTop}>See all services <ArrowRight aria-hidden /></Link></p>
      </div>
    </section>
  );
}

/** A service card. `trace` adds the homepage's hover effect: a gold line runs around the card's edge. */
export function ServiceCard({ row, from, trace = false }: { row: ServicePageRow; from: string; trace?: boolean }) {
  return (
    <Link to={`/services/${row.slug}`} className={trace ? "has-trace" : undefined} onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `${from}_service_${row.slug.replace(/-/g, "_")}` }); openAtTop(); }}>
      {trace && <svg className="sp-trace" aria-hidden="true"><rect x="1" y="1" rx="15" pathLength={100} /></svg>}
      <span className="sp-family-icon"><ServiceIcon name={row.icon} /></span>
      <span><b>{row.name}</b>{row.summary && <small>{row.summary}</small>}</span>
    </Link>
  );
}

export { MapPin };
