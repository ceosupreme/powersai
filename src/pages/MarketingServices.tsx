import { ServicePage, type ServicePageContent } from "@/components/marketing/studio/ServicePage";

const content: ServicePageContent = {
  eyebrow: "Marketing & growth",
  title: "Turn attention into a path to choose you.",
  description: "Give people a clear reason to care, a useful place to land, and an obvious next step. Campaign messaging, landing-page copy, email, social content, launch support, and creative stay focused on the same audience and action.",
  path: "/services/marketing",
  seoTitle: "Marketing Strategy & Campaigns | Supreme Team Media",
  seoDescription: "Positioning, campaigns, landing pages, email, social content, launches and advertising support with a clear path from attention to action.",
  intent: "marketing",
  primaryCta: "Discuss marketing and growth",
  secondaryCta: "See marketing work",
  proofSlugs: ["big-paws-club", "coastal-beauties", "supreme-wellness-club"],
  problemTitle: "More activity is not the same as a better customer path.",
  problems: [
    { title: "The message changes from channel to channel.", body: "A clear campaign idea and message system should keep landing-page, email, social, and content copy focused without making every channel sound identical." },
    { title: "Attention has nowhere useful to go.", body: "Landing pages, email paths, offers, and follow-up need to connect the campaign to a realistic next action." },
    { title: "Content is being made without a system.", body: "A workable content structure helps the team create consistently around real audience needs and business priorities." },
  ],
  outcomesTitle: "A connected path from message to action.",
  outcomesIntro: "The work stays focused on a specific audience, offer, and decision, with no promises the market or platform may not keep.",
  outcomes: ["A sharper reason for people to care", "A clearer landing and response path", "Consistent copy and creative across selected channels", "A repeatable content or launch plan"],
  capabilitiesTitle: "Build the message, destination, and follow-up together.",
  capabilities: ["Positioning and campaign messaging", "Landing-page strategy and copy", "Email campaign copy", "Social and content copy", "Launch campaigns", "Event promotion", "Content systems and editorial planning", "Advertising creative and support when scoped", "Measurement planning around available data"],
  process: [
    { title: "Choose the objective", body: "Define the audience, offer, decision, channels, and what the campaign should help people understand or do." },
    { title: "Write and build the path", body: "Shape the campaign message, landing-page copy, creative, email or social content, and follow-up around one clear action." },
    { title: "Release and learn", body: "Launch the agreed work, review the information available, and define refinements or ongoing support when scoped." },
  ],
  connectedTitle: "Marketing works better when the offer, brand, and destination agree.",
  connectedBody: "Campaign work can connect to brand refinement, a purpose-built landing page, publishing support, or systems that make follow-up easier to manage.",
  connectedLinks: [{ label: "Brand & creative", to: "/services/brand" }, { label: "Websites & digital products", to: "/services/websites" }, { label: "Publishing & launch", to: "/publishing" }],
  faqs: [
    { q: "Can you help with one campaign or launch?", a: "Yes. A defined campaign, event, launch, landing page, or content package can be scoped as a focused engagement." },
    { q: "Do you manage advertising?", a: "Advertising strategy, creative, setup, or support can be included when scoped. Media spend, platform policies, and results remain separate from the creative engagement." },
    { q: "Do you guarantee leads, sales, or ROAS?", a: "No. The work improves the strategy, message, creative, and customer path, but no responsible studio can guarantee market response or platform performance." },
    { q: "Can you work with our existing team?", a: "Yes. Responsibilities, approvals, access, and handoffs can be defined around an internal team, outside partners, or a founder-led workflow." },
  ],
  finalTitle: "Give the right audience a reason to care—and a clear next step.",
  finalBody: "Share the offer, audience, current channels, and the point where attention stops turning into action.",
  tone: "marketing",
};

export default function MarketingServices() { return <ServicePage content={content} />; }