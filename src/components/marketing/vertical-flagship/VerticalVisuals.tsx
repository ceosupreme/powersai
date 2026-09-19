import type { VerticalSlug } from "./config";

export function VerticalHeroVisual({ slug }: { slug: VerticalSlug }) {
  const labels: Record<VerticalSlug, string[]> = {
    hvac: ["Local demand", "Trusted website", "Booked work", "Owner view"],
    auto: ["Inventory", "Service", "Appointments", "Lifecycle"],
    "real-estate": ["Authority", "Owned audience", "Nurture", "Referrals"],
    legal: ["Visibility", "Trust", "Intake", "Signed matters"],
    medspa: ["Desire", "Discovery", "Bookings", "Retention"],
  };
  return <div className={`vertical-hero-visual vertical-hero-${slug}`} aria-hidden="true"><svg viewBox="0 0 720 520" role="presentation"><path className="vertical-orbit" d="M80 280 C170 80 470 70 640 250 C520 450 210 475 80 280Z"/><path className="vertical-route" d="M94 320 C220 220 240 370 370 245 S555 165 630 292"/><circle className="vertical-core" cx="360" cy="260" r="72"/><circle className="vertical-pulse" cx="360" cy="260" r="98"/>{labels[slug].map((label, index) => { const points = [[105,325],[224,135],[525,122],[618,300]][index]; return <g key={label} transform={`translate(${points[0]} ${points[1]})`}><rect x="-69" y="-27" width="138" height="54" rx="4"/><text textAnchor="middle" y="5">{label}</text></g>; })}<text className="vertical-core-text" x="360" y="254" textAnchor="middle">SUPREME TEAM</text><text className="vertical-core-text" x="360" y="276" textAnchor="middle">GROWTH SYSTEM</text></svg></div>;
}

export function JourneyDiagram({ stages, active }: { stages: string[]; active: number }) {
  return <div className="vertical-demo-track">{stages.map((stage, index) => <div key={stage} className={index === active ? "is-active" : index < active ? "is-complete" : ""}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong></div>)}</div>;
}