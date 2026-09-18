import { ServicePage, type ServicePageContent } from "@/components/marketing/studio/ServicePage";

const content: ServicePageContent = {
  eyebrow: "Websites & digital products",
  title: "Websites people trust. Experiences that give them a reason to act.",
  description: "Supreme Team Media designs and builds business websites, landing pages, ecommerce experiences, web apps, dashboards, and responsive interfaces around clarity, credibility, performance, and a useful next step.",
  path: "/services/websites",
  seoTitle: "Websites & Digital Products | Supreme Team Media",
  seoDescription: "Strategy, design and development for credible business websites, landing pages, ecommerce, web apps and responsive digital products.",
  intent: "websites",
  primaryCta: "Discuss a website or digital product",
  secondaryCta: "See website work",
  proofSlugs: ["big-paws-club", "kario-voss", "barpulse"],
  problemTitle: "A website should do more than look finished.",
  problems: [
    { title: "People cannot quickly understand the offer.", body: "The structure, message, and first-screen decisions need to make the business easier to trust and navigate." },
    { title: "Mobile visitors get a weaker experience.", body: "Responsive design should preserve hierarchy, readability, media, and conversion paths instead of merely shrinking the desktop layout." },
    { title: "The site has traffic but no useful next step.", body: "Calls to action, forms, commerce, and content paths should reflect what visitors are ready to do." },
  ],
  outcomesTitle: "A clearer, more credible digital front door.",
  outcomesIntro: "The goal is an experience that makes the right information easy to find, presents the business with confidence, and supports the next useful action.",
  outcomes: ["A clear story and information hierarchy", "A polished mobile and desktop experience", "Intentional conversion and contact paths", "A maintainable foundation for content or growth"],
  capabilitiesTitle: "The build can meet the business where it is.",
  capabilities: ["Business and brand websites", "Campaign and offer landing pages", "Ecommerce and product presentation", "Web apps and internal dashboards", "Responsive interface and design systems", "Content architecture and migration support", "Forms, integrations, and conversion paths", "Launch QA, handoff, and scoped support"],
  process: [
    { title: "Frame the job", body: "Clarify the audience, offer, required functionality, available content, and the action the experience needs to support." },
    { title: "Shape and build", body: "Create the structure, visual direction, responsive interface, and working experience with visible review points." },
    { title: "Test and launch", body: "Check the agreed experience, prepare handoff, and connect launch or continued support when included." },
  ],
  connectedTitle: "A website can be the project—or the place the rest of the work comes together.",
  connectedBody: "Brand direction, campaign strategy, publishing assets, and business systems can connect to the website when the job benefits from one coordinated approach.",
  connectedLinks: [{ label: "Brand & creative", to: "/services/brand" }, { label: "Marketing & growth", to: "/services/marketing" }, { label: "AI & business systems", to: "/services/ai-systems" }],
  faqs: [
    { q: "Can you improve an existing website?", a: "Yes. The first step is deciding what is useful to keep, what needs revision, and whether focused improvements or a rebuild is the better use of effort." },
    { q: "Do you work on both content and design?", a: "Yes. Content structure, messaging support, visual design, and implementation can be scoped together so the finished experience works as one system." },
    { q: "Can the site include ecommerce, forms, or integrations?", a: "Yes, when they fit the project. Specific platforms, account ownership, third-party costs, and integration requirements are defined in scope." },
    { q: "Do you guarantee conversion results?", a: "No. The work can improve clarity, credibility, usability, and conversion paths, but business results also depend on the offer, audience, traffic, and follow-through." },
  ],
  finalTitle: "Give the business a digital experience that earns attention and directs it well.",
  finalBody: "Share what exists, what is not working, and what the next version needs to help people do.",
  tone: "websites",
};

export default function WebsiteServices() { return <ServicePage content={content} />; }