import { ServicePage, type ServicePageContent } from "@/components/marketing/studio/ServicePage";

const content: ServicePageContent = {
  eyebrow: "Brand & creative",
  title: "Build a brand people recognize—and know what to do with.",
  description: "Supreme Team Media helps shape positioning, identity direction, visual systems, campaign creative, presentation materials, and digital brand applications that make the business feel coherent wherever it appears.",
  path: "/services/brand",
  seoTitle: "Brand Strategy & Creative Direction | Supreme Team Media",
  seoDescription: "Brand positioning, identity direction, visual systems, campaign creative and digital applications built for real business use.",
  intent: "brand",
  primaryCta: "Discuss brand or creative work",
  secondaryCta: "See brand work",
  proofSlugs: ["kario-voss", "big-paws-club", "coastal-beauties"],
  problemTitle: "Good work gets overlooked when the presentation does not hold together.",
  problems: [
    { title: "The business looks different everywhere.", body: "A practical visual system makes the website, social content, campaigns, and sales materials feel like the same brand." },
    { title: "The message is broad or forgettable.", body: "Positioning and message support help clarify what the brand should stand for and what people should remember." },
    { title: "Creative assets are one-offs instead of a system.", body: "Reusable direction and applications make future work faster without making every expression identical." },
  ],
  outcomesTitle: "A recognizable system with room to move.",
  outcomesIntro: "The aim is not decoration for its own sake. It is a clearer identity that supports decisions, earns recognition, and works across real touchpoints.",
  outcomes: ["A sharper position and creative direction", "A coherent visual language", "Reusable rules and core assets", "Stronger application across web and campaigns"],
  capabilitiesTitle: "Creative direction that reaches the places customers actually see.",
  capabilities: ["Positioning and message support", "Identity and art direction", "Visual systems and brand guidance", "Campaign concepts and creative", "Presentation and sales materials", "Graphics and content assets", "Digital brand application", "Launch and rollout support"],
  process: [
    { title: "Find the signal", body: "Review the audience, offer, existing perception, useful assets, and the gaps that make the brand harder to understand or remember." },
    { title: "Build the language", body: "Develop the message and visual direction, then test it against the real places where the brand needs to perform." },
    { title: "Apply it", body: "Create the agreed system and priority assets, with clear guidance for continued use and future work." },
  ],
  connectedTitle: "The strongest brand systems are designed for use, not just presentation.",
  connectedBody: "The identity can flow directly into a website, campaign, publishing package, or product experience so the public-facing work stays coherent.",
  connectedLinks: [{ label: "Websites & digital products", to: "/services/websites" }, { label: "Marketing & growth", to: "/services/marketing" }, { label: "Publishing & launch", to: "/publishing" }],
  faqs: [
    { q: "Can you work with an existing logo or brand?", a: "Yes. The work can refine, extend, or better apply what already exists rather than replacing it without a reason." },
    { q: "Is this only for a full rebrand?", a: "No. A focused identity direction, campaign system, presentation, or set of digital assets can stand alone." },
    { q: "Will we receive usable files and guidance?", a: "Deliverables, formats, ownership or licensing, and the level of guidance are defined in the proposal for the specific engagement." },
    { q: "Can brand work connect directly to a website?", a: "Yes. Brand and website work can be scoped together so the identity is developed in the context of a working customer experience." },
  ],
  finalTitle: "Make the business easier to recognize, trust, and choose.",
  finalBody: "Share what the brand is trying to become and where the current presentation stops helping.",
  tone: "brand",
};

export default function BrandServices() { return <ServicePage content={content} />; }