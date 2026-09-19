import { ServicePage, type ServicePageContent } from "@/components/marketing/studio/ServicePage";

const content: ServicePageContent = {
  eyebrow: "Brand & creative",
  title: "Build a brand people recognize—and know what to do with.",
  description: "Clarify what the business stands for, how it should sound, and how it should look. Positioning, voice, message architecture, identity, and creative applications work together so the brand is easier to recognize and choose.",
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
    { title: "The message is broad or forgettable.", body: "Positioning, voice, and message architecture clarify why the brand matters, how it should speak, and what people should remember." },
    { title: "Creative assets are one-offs instead of a system.", body: "Reusable direction and applications make future work faster without making every expression identical." },
  ],
  outcomesTitle: "A recognizable system with room to move.",
  outcomesIntro: "The goal is clarity people can recognize: a distinct position, a consistent voice, and a visual identity that works wherever the business shows up.",
  outcomes: ["A sharper position and point of view", "A clear voice and message structure", "A coherent visual identity", "Stronger application across web and campaigns"],
  capabilitiesTitle: "Build the words and visuals people will associate with the business.",
  capabilities: ["Positioning and differentiation", "Voice and message architecture", "Naming and tagline support when appropriate", "Identity and art direction", "Visual systems and brand guidance", "Campaign concepts and creative", "Presentation and sales materials", "Graphics and content assets", "Digital brand application", "Launch and rollout support"],
  process: [
    { title: "Find what sets you apart", body: "Review the audience, offer, existing perception, useful assets, and the gaps that make the brand harder to understand or remember." },
    { title: "Shape the message and identity", body: "Develop the position, voice, key messages, and visual direction, then test them against the places where the brand needs to work." },
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
  finalBody: "Share what the business needs to be known for and where the current message or identity falls short.",
  tone: "brand",
};

export default function BrandServices() { return <ServicePage content={content} />; }