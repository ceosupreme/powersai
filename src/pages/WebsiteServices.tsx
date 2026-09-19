import { ServicePage, type ServicePageContent } from "@/components/marketing/studio/ServicePage";

const content: ServicePageContent = {
  eyebrow: "Websites & digital products",
  title: "Websites people trust. Experiences that give them a reason to act.",
  description: "Help people understand your offer quickly, trust what they see, and know what to do next. Strategy, website and landing-page copy, UX, design, and development stay connected from the first page to launch.",
  path: "/services/websites",
  seoTitle: "Websites & Digital Products | Supreme Team Media",
  seoDescription: "Strategy, design and development for credible business websites, landing pages, ecommerce, web apps and responsive digital products.",
  intent: "websites",
  primaryCta: "Discuss a website or digital product",
  secondaryCta: "See website work",
  proofSlugs: ["big-paws-club", "kario-voss", "barpulse"],
  problemTitle: "A polished website can still lose the sale.",
  problems: [
    { title: "People cannot quickly understand the offer.", body: "Clear positioning, useful website copy, and a strong information hierarchy should answer what you do, who it is for, and why it matters." },
    { title: "Mobile visitors get a weaker experience.", body: "Responsive design should preserve hierarchy, readability, media, and conversion paths instead of merely shrinking the desktop layout." },
    { title: "The site gets attention but not enough action.", body: "Calls to action, forms, commerce, and content paths should match what visitors are ready to do next." },
  ],
  outcomesTitle: "A website that makes the business easier to understand and choose.",
  outcomesIntro: "The right people should find what they need quickly, feel confident in the business, and reach a next step that makes sense.",
  outcomes: ["Clear positioning, copy, and information hierarchy", "A polished mobile and desktop experience", "Useful conversion and contact paths", "A maintainable foundation for content and growth"],
  capabilitiesTitle: "Strategy, copy, design, and development can stay connected.",
  capabilities: ["Business and brand websites", "Campaign and offer landing pages", "Website and landing-page copy", "Positioning and conversion messaging", "Ecommerce and product presentation", "Web apps and internal dashboards", "Responsive UX and interface design", "Content architecture and migration support", "Forms, integrations, and conversion paths", "Performance, launch QA, handoff, and scoped support"],
  process: [
    { title: "Clarify the job", body: "Define the audience, offer, key messages, required functionality, and the action the website needs to support." },
    { title: "Write, design, and build", body: "Shape the copy and structure, establish the visual direction, and build the responsive experience with clear review points." },
    { title: "Test and launch", body: "Check the agreed experience, prepare handoff, and connect launch or continued support when included." },
  ],
  connectedTitle: "A website can be the project—or the place the rest of the work comes together.",
  connectedBody: "Brand direction, campaign strategy, publishing assets, and business systems can connect to the website when the job benefits from one coordinated approach.",
  connectedLinks: [{ label: "Brand & creative", to: "/services/brand" }, { label: "Marketing & growth", to: "/services/marketing" }, { label: "AI & business systems", to: "/services/ai-systems" }],
  faqs: [
    { q: "Can you improve an existing website?", a: "Yes. The first step is deciding what is useful to keep, what needs revision, and whether focused improvements or a rebuild is the better use of effort." },
    { q: "Do you write website copy too?", a: "Yes. Positioning, message hierarchy, website or landing-page copy, visual design, and implementation can be scoped together so the finished experience speaks with one clear voice." },
    { q: "Can the site include ecommerce, forms, or integrations?", a: "Yes, when they fit the project. Specific platforms, account ownership, third-party costs, and integration requirements are defined in scope." },
    { q: "Do you guarantee conversion results?", a: "No. The work can improve clarity, credibility, usability, and conversion paths, but business results also depend on the offer, audience, traffic, and follow-through." },
  ],
  finalTitle: "Build a website people can understand, trust, and act on.",
  finalBody: "Share the current site, what is not working, and what you need the next version to help the business accomplish.",
  tone: "websites",
};

export default function WebsiteServices() { return <ServicePage content={content} />; }