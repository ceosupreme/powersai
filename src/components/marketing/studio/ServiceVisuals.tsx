import { getStudioMedia } from "@/config/studioMedia";
import { BrowserFrame } from "./BrowserFrame";

export type ServiceVisualTone = "websites" | "brand" | "marketing" | "systems";

const MEDIA = {
  bigPaws: "work-big-paws-club",
  kario: "work-kario-voss",
  wellness: "work-supreme-wellness-club",
  coastal: "work-coastal-beauties",
  barpulse: "work-barpulse",
} as const;

function ProjectImage({ mediaKey, alt, eager = false, className = "" }: { mediaKey: string; alt?: string; eager?: boolean; className?: string }) {
  const media = getStudioMedia(mediaKey);
  if (!media?.src) return null;
  return <img src={media.src} alt={alt ?? media.alt} width={media.width} height={media.height} loading={eager ? "eager" : "lazy"} className={`size-full object-cover ${className}`} style={{ objectPosition: media.objectPosition ?? "top center" }} />;
}

export function ServiceHeroVisual({ tone }: { tone: ServiceVisualTone }) {
  if (tone === "websites") return (
    <div className="service-visual service-websites-hero" aria-label="Responsive website work for Big Paws Club, Kario Voss, and Supreme Wellness Club">
      <BrowserFrame className="service-websites-browser"><ProjectImage mediaKey={MEDIA.bigPaws} eager /></BrowserFrame>
      <BrowserFrame className="service-websites-tablet"><ProjectImage mediaKey={MEDIA.kario} eager /></BrowserFrame>
      <div className="studio-device-phone"><ProjectImage mediaKey={MEDIA.wellness} eager /></div>
    </div>
  );
  if (tone === "brand") return (
    <div className="service-visual service-brand-board" aria-label="Editorial identity board using real Kario Voss, Big Paws Club, Coastal Beauties, and Supreme Wellness Club work">
      <div className="brand-type-block" aria-hidden="true"><span className="studio-label">VOICE / RHYTHM</span><strong className="studio-display">Distinct by design.</strong><i className="studio-serif">Built to stay recognizable.</i></div>
      <div className="brand-crop brand-crop-kario"><ProjectImage mediaKey={MEDIA.kario} eager /></div>
      <div className="brand-crop brand-crop-paws"><ProjectImage mediaKey={MEDIA.bigPaws} eager /></div>
      <div className="brand-crop brand-crop-coastal"><ProjectImage mediaKey={MEDIA.coastal} eager /></div>
      <div className="brand-swatches" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="brand-grid-fragment" aria-hidden="true" />
    </div>
  );
  if (tone === "marketing") return (
    <div className="service-visual service-marketing-hero" aria-label="Campaign ecosystem illustrated with real Big Paws Club, Coastal Beauties, and Supreme Wellness Club work">
      <div className="campaign-message"><span className="studio-label">Message</span><strong className="studio-display">One clear idea</strong></div>
      <div className="campaign-arrow" aria-hidden="true">→</div>
      <div className="campaign-channels">
        <div className="campaign-tile campaign-landing"><span>Landing</span><ProjectImage mediaKey={MEDIA.wellness} eager /></div>
        <div className="campaign-tile campaign-social"><span>Social</span><ProjectImage mediaKey={MEDIA.coastal} eager /></div>
        <div className="campaign-tile campaign-email"><span>Email</span><ProjectImage mediaKey={MEDIA.bigPaws} eager /></div>
      </div>
      <div className="campaign-action studio-display">Action</div>
    </div>
  );
  return (
    <div className="service-visual service-systems-hero" aria-label="BarPulse shown as the connected layer between business tools and operating outputs">
      <div className="systems-node-stack systems-sources"><span>Toast POS</span><span>7shifts</span><span>Asana</span></div>
      <span className="systems-connector" aria-hidden="true">→</span>
      <BrowserFrame className="systems-browser studio-browser-frame-dark"><ProjectImage mediaKey={MEDIA.barpulse} eager /></BrowserFrame>
      <span className="systems-connector" aria-hidden="true">→</span>
      <div className="systems-node-stack systems-outputs"><span>Brief</span><span>Tasks</span><span>Insights</span></div>
      <p className="systems-context">Historical BarPulse integration example</p>
    </div>
  );
}

const FLOW: Record<ServiceVisualTone, { eyebrow: string; title: string; steps: string[] }> = {
  websites: { eyebrow: "Customer path", title: "From visit to useful next step", steps: ["Arrival", "Understand", "Trust", "Act"] },
  brand: { eyebrow: "Brand application", title: "One brand system, many surfaces", steps: ["Identity", "Website", "Campaign", "Presentation", "Content"] },
  marketing: { eyebrow: "Marketing path", title: "A connected route from attention to response", steps: ["Attention", "Relevance", "Proof", "Action", "Follow-up"] },
  systems: { eyebrow: "Operating model", title: "Connect the work before adding complexity", steps: ["Sources / tools", "Connected workflow", "Reporting", "Tasks", "Insights"] },
};

export function ServiceExplainerVisual({ tone }: { tone: ServiceVisualTone }) {
  const flow = FLOW[tone];
  return (
    <section className={`service-explainer service-explainer-${tone}`} aria-labelledby={`${tone}-explainer-title`}>
      <div className="service-explainer-copy"><span className="studio-eyebrow">{flow.eyebrow}</span><h2 id={`${tone}-explainer-title`} className="studio-display">{flow.title}</h2></div>
      <ol className="service-flow-list">
        {flow.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong>{index < flow.steps.length - 1 && <i aria-hidden="true">→</i>}</li>)}
      </ol>
      {tone === "systems" && <p className="service-flow-note">Conceptual workflow. Tool connections and outputs depend on the actual operation and agreed scope.</p>}
    </section>
  );
}

export function ServiceMediaBand({ tone }: { tone: ServiceVisualTone }) {
  if (tone === "websites") return (
    <div className="service-media-band website-responsive-band" aria-label="Big Paws Club shown across desktop, tablet, and phone views">
      <BrowserFrame className="responsive-desktop"><ProjectImage mediaKey={MEDIA.bigPaws} /></BrowserFrame>
      <BrowserFrame className="responsive-tablet"><ProjectImage mediaKey={MEDIA.bigPaws} className="object-top" /></BrowserFrame>
      <div className="studio-device-phone responsive-phone"><ProjectImage mediaKey={MEDIA.bigPaws} /></div>
      <p className="media-caption">One real project. Hierarchy designed to hold across screen sizes.</p>
    </div>
  );
  if (tone === "brand") return (
    <div className="service-media-band brand-editorial-spread" aria-label="Editorial spread of real brand-led web projects">
      <div className="brand-spread-large"><ProjectImage mediaKey={MEDIA.kario} /></div>
      <div className="brand-spread-copy" aria-hidden="true"><span className="studio-label">SYSTEM / APPLICATION</span><strong className="studio-display">A visual language built for use.</strong></div>
      <div className="brand-spread-small"><ProjectImage mediaKey={MEDIA.coastal} /></div>
      <div className="brand-spread-stripe" aria-hidden="true" />
    </div>
  );
  if (tone === "marketing") return (
    <div className="service-media-band marketing-spread" aria-label="Launch and content spread using real project work">
      <div className="marketing-spread-main"><ProjectImage mediaKey={MEDIA.wellness} /></div>
      <div className="marketing-tiles"><div><span className="studio-label">LANDING</span><ProjectImage mediaKey={MEDIA.bigPaws} /></div><div><span className="studio-label">CONTENT</span><ProjectImage mediaKey={MEDIA.coastal} /></div></div>
      <div className="marketing-ribbon studio-display" aria-hidden="true">Message → destination → response</div>
    </div>
  );
  return (
    <div className="service-media-band systems-media-band" aria-label="Real BarPulse interface and a conceptual comparison between scattered steps and a connected operating view">
      <BrowserFrame className="studio-browser-frame-dark systems-media-screen"><ProjectImage mediaKey={MEDIA.barpulse} /></BrowserFrame>
      <div className="systems-compare"><div><span className="studio-label">Scattered steps</span><p>Separate tools<br />Manual handoffs<br />Fragmented review</p></div><span aria-hidden="true">→</span><div><span className="studio-label">Connected operating view</span><p>Agreed sources<br />Defined workflow<br />Useful outputs</p></div></div>
      <p className="media-caption">Conceptual process view based on the historical BarPulse case—not a claim about current client data.</p>
    </div>
  );
}

export function ServiceEntryVisual({ tone }: { tone: ServiceVisualTone | "publishing" }) {
  if (tone === "publishing") return <div className="entry-visual entry-publishing" aria-hidden="true"><span className="entry-book" /><span className="entry-phone" /><span className="entry-listing" /><i>→</i><i>→</i></div>;
  if (tone === "systems") return <div className="entry-visual entry-systems" aria-hidden="true"><span>Inputs</span><i>→</i><strong>Workflow</strong><i>→</i><span>Insights</span></div>;
  if (tone === "marketing") return <div className="entry-visual entry-marketing" aria-hidden="true"><strong>Message</strong><i>→</i><span>Landing</span><span>Email</span><span>Social</span><i>→</i><strong>Action</strong></div>;
  if (tone === "brand") return <div className="entry-visual entry-brand" aria-hidden="true"><strong className="studio-display">Aa</strong><span /><span /><span /><i /></div>;
  return <div className="entry-visual entry-websites" aria-hidden="true"><span className="entry-browser" /><span className="entry-mobile" /></div>;
}

export function ProjectMontage({ className = "" }: { className?: string }) {
  return <div className={`studio-project-montage ${className}`} aria-label="Selected Supreme Team Media project work"><div><ProjectImage mediaKey={MEDIA.kario} /></div><div><ProjectImage mediaKey={MEDIA.barpulse} /></div><div><ProjectImage mediaKey={MEDIA.bigPaws} /></div><blockquote className="studio-display">Creative judgment. Practical implementation.</blockquote></div>;
}
