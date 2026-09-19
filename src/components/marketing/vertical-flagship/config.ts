export type VerticalSlug = "hvac" | "auto" | "real-estate" | "legal" | "medspa";
export type FocusKey = "brand" | "website" | "visibility" | "ads" | "leads" | "retention" | "systems";

export type VerticalConfig = {
  slug: VerticalSlug;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  primaryLabel: string;
  secondaryLabel: string;
  segmentLabel?: string;
  segments?: { id: string; label: string }[];
  needs: { id: FocusKey | string; label: string; detail: string }[];
  stages: { title: string; summary: string; items: string[] }[];
  failures: { title: string; body: string }[];
  workflow: string[];
  workflowBySegment?: Record<string, string[]>;
  scope: string[];
  faqs: { q: string; a: string }[];
  safety?: string;
  research?: { copy: string; href: string; label: string };
  proofSlugs: string[];
};

export const FLAGSHIP_SLUGS: VerticalSlug[] = ["hvac", "auto", "real-estate", "legal", "medspa"];

export const VERTICALS: Record<VerticalSlug, VerticalConfig> = {
  hvac: {
    slug: "hvac", name: "HVAC", eyebrow: "Growth systems for HVAC companies",
    title: "Be the HVAC company homeowners find, trust, and call first.",
    description: "Brand, website, local visibility, paid media, reviews, lead follow-up, and business systems—built around the service areas and jobs you actually want more of.",
    metaTitle: "HVAC Marketing, Web Design & Growth Systems | Supreme Team Media",
    metaDescription: "HVAC branding, web design, local visibility, paid media, lead conversion, reputation, retention, reporting and business systems from Supreme Team Media.",
    primaryLabel: "Show me where I’d start", secondaryLabel: "Run the free HVAC check",
    needs: [
      { id: "visibility", label: "Get found in the right service areas", detail: "Local search, service-area content, listings, seasonal campaigns, and paid demand." },
      { id: "brand", label: "Build more homeowner trust", detail: "Positioning, identity, reviews, creative direction, and clear service messaging." },
      { id: "website", label: "Make the website convert", detail: "Fast mobile pages, financing and offer presentation, calls, forms, chat, and booking paths." },
      { id: "leads", label: "Book more of the demand we already earn", detail: "After-hours response, estimate follow-up, routing, reactivation, and review requests." },
      { id: "systems", label: "See what is working", detail: "Attribution, CRM cleanup, integrations, workflows, and owner reporting." },
    ],
    stages: [
      { title: "Get found", summary: "Show up where local demand begins.", items: ["Local SEO and Google Business Profile", "SEO/AEO service-area content", "Google Ads and appropriate paid media", "Seasonal demand campaigns"] },
      { title: "Get chosen", summary: "Make trust easy before the first call.", items: ["Brand positioning and identity", "Conversion-focused website", "Service, financing, and offer presentation", "Reviews, creative, photography/video direction", "Messaging and copy"] },
      { title: "Book more work", summary: "Give every good opportunity a clear next step.", items: ["Calls, forms, chat, and booking", "After-hours inquiry handling", "Estimate follow-up", "Customer reactivation", "CRM routing and handoff"] },
      { title: "Run smarter", summary: "Connect marketing activity to business visibility.", items: ["Attribution and reporting", "CRM and workflow cleanup", "Integrations and automation", "Dashboards and owner visibility"] },
    ],
    failures: [
      { title: "A homeowner arrives after hours", body: "The site should answer the immediate question, capture the job clearly, and route it without pretending every inquiry is the same." },
      { title: "An unsold replacement estimate goes quiet", body: "A considered follow-up path keeps the estimate useful without turning the customer experience into spam." },
      { title: "The past-customer list is not worked", body: "Seasonal service, maintenance, review, and reactivation campaigns can create value from relationships already earned." },
    ],
    workflow: ["Search or ad", "HVAC website", "Service inquiry", "Qualify and route", "Call or estimate", "Follow-up", "Review or reactivation", "Owner reporting"],
    scope: ["Brand strategy", "Website and landing pages", "Local SEO and content", "Paid media", "Campaign creative", "Reputation", "Lead conversion", "CRM and nurture", "Retention", "Reporting and systems"],
    proofSlugs: ["barpulse", "big-paws-club", "kario-voss"],
    faqs: [
      { q: "Do you replace our CRM or field-service software?", a: "Not by default. We first map the tools and handoffs you already use, then confirm what should stay, improve, connect, or change." },
      { q: "Can we start with one problem?", a: "Yes. The diagnostic can isolate the highest-leverage starting point while keeping the broader growth system in view." },
      { q: "Do you guarantee rankings or booked jobs?", a: "No. Search position and customer decisions cannot be guaranteed. We build and improve the strategy, creative, conversion paths, and measurement around them." },
    ],
  },
  auto: {
    slug: "auto", name: "Automotive", eyebrow: "Growth for sales and fixed operations",
    title: "Move more inventory. Fill more bays. Keep customers coming back.",
    description: "Brand, website, advertising, shopper/service conversion, reputation, CRM follow-up, and lifecycle marketing—connected around how your automotive business actually makes money.",
    metaTitle: "Automotive Marketing, Websites & Growth Systems | Supreme Team Media",
    metaDescription: "Automotive marketing, websites, paid media, CRM follow-up, reputation and lifecycle systems for dealerships, service centers, tire and body shops.",
    primaryLabel: "Choose your growth path", secondaryLabel: "Run the free automotive check",
    segmentLabel: "Which side of the business?", segments: [{ id: "sales", label: "Sales / dealership" }, { id: "service", label: "Service / repair" }],
    needs: [
      { id: "website", label: "Our website makes choosing harder", detail: "Clarify inventory or service presentation and shorten the path to action." },
      { id: "ads", label: "We need better demand", detail: "Connect search, paid, social, retargeting, offers, and landing pages." },
      { id: "leads", label: "Interest is not becoming appointments", detail: "Improve response, routing, booking, and CRM follow-up." },
      { id: "retention", label: "Our customer list is underused", detail: "Build maintenance, lifecycle, aged-unit, and reactivation campaigns." },
      { id: "systems", label: "Reporting is fragmented", detail: "Create useful attribution and operating visibility across approved tools." },
    ],
    stages: [
      { title: "Be the obvious choice", summary: "Make the brand, website, inventory or service offer easier to trust.", items: ["Positioning and identity", "Website and landing pages", "Inventory or service presentation", "Reviews, social, and reputation"] },
      { title: "Create demand", summary: "Reach shoppers and service customers with a reason to act.", items: ["Search, paid media, and retargeting", "Inventory, offer, and seasonal campaigns", "Campaign creative and copy", "Local visibility"] },
      { title: "Turn interest into appointments", summary: "Reduce friction between intent and a real conversation.", items: ["VDP, trade-in, finance, and test-drive paths", "Service booking paths", "Lead response and routing", "CRM follow-up"] },
      { title: "Build lifetime value", summary: "Keep the relationship useful after the first transaction.", items: ["Service nurture and reminders", "Database campaigns", "Lapsed-customer reactivation", "Attribution and reporting"] },
    ],
    failures: [
      { title: "A shopper reaches a dead-end page", body: "The next step should stay obvious across inventory, trade-in, finance, and appointment paths." },
      { title: "A service customer cannot book quickly", body: "Local intent is valuable only when the service page and appointment path make it easy to act." },
      { title: "The CRM has names but no lifecycle", body: "Relevant nurture can reconnect sales, service, maintenance, and ownership moments." },
    ],
    workflow: ["Search or ad", "Inventory or service page", "Inquiry", "CRM follow-up", "Appointment", "Sale or service", "Lifecycle nurture"],
    workflowBySegment: {
      sales: ["Ad or search", "Inventory / VDP", "Inquiry", "CRM follow-up", "Appointment / test drive", "Sold", "Service nurture"],
      service: ["Local search", "Service page", "Appointment", "Reminder", "Completed service", "Review", "Maintenance / reactivation"],
    },
    scope: ["Dealership or shop brand", "Websites and landing pages", "Search and paid media", "Retargeting and social", "Appointment paths", "CRM follow-up", "Reputation", "Lifecycle campaigns", "Reporting"],
    proofSlugs: ["barpulse", "coastal-beauties", "allmighty-supreme"],
    safety: "DMS, CRM, scheduling, and inventory-feed compatibility is confirmed during discovery. No integration is assumed before the client’s vendors and access are reviewed.",
    faqs: [
      { q: "Does this work for both sales and service?", a: "Yes. The strategy can support both, or begin with the side where the clearest opportunity exists. The customer paths and reporting are treated separately where they should be." },
      { q: "Will you connect to our DMS, CRM, or inventory feed?", a: "Possibly, after compatibility, permissions, cost, and vendor requirements are confirmed during discovery." },
      { q: "Can you work with our current agency or internal team?", a: "Yes. Scope can focus on strategy, creative, conversion, systems, or implementation gaps without replacing work that is already effective." },
    ],
  },
  "real-estate": {
    slug: "real-estate", name: "Real estate", eyebrow: "Owned growth for real estate",
    title: "Build the brand people remember. Own the audience you worked to earn.",
    description: "Brand, website/IDX strategy, local content, search visibility, paid media, listing marketing, CRM nurture, and database reactivation for agents, teams, and brokerages.",
    metaTitle: "Real Estate Marketing, Websites & Lead Nurture | Supreme Team Media",
    metaDescription: "Real estate branding, websites, local search, paid media, listing campaigns, CRM nurture and database reactivation for agents, teams and brokerages.",
    primaryLabel: "Build your growth path", secondaryLabel: "Run the free real estate check",
    segmentLabel: "Built around your model", segments: [{ id: "agent", label: "Agent" }, { id: "team", label: "Team" }, { id: "brokerage", label: "Brokerage" }],
    needs: [
      { id: "brand", label: "Our brand blends in", detail: "Clarify the market position, message, identity, and proof." },
      { id: "website", label: "Our site does not build an owned audience", detail: "Plan a flagship experience, local content, capture, and useful search paths." },
      { id: "visibility", label: "We need more local authority", detail: "Build neighborhood, seller, search, AI-discovery, and reputation foundations." },
      { id: "leads", label: "Leads go cold before a real conversation", detail: "Improve routing, alerts, nurture, re-engagement, and human handoff." },
      { id: "retention", label: "Our database is underused", detail: "Create past-client, homeowner, referral, and long-cycle relationship campaigns." },
    ],
    stages: [
      { title: "Build authority", summary: "Be known for a market, point of view, and standard of service.", items: ["Personal, team, or brokerage brand", "Messaging and flagship website", "Neighborhood and market content", "SEO/AEO/GEO strategy", "Reviews and social proof"] },
      { title: "Create demand", summary: "Give buyers and sellers a reason to enter your world.", items: ["Listing launches and seller campaigns", "Google and Meta paid media", "Social and content", "Retargeting and landing pages"] },
      { title: "Capture and nurture", summary: "Turn attention into an owned relationship.", items: ["IDX and lead-capture strategy", "CRM routing and listing alerts", "Follow-up and nurture", "Behavior-based re-engagement", "Conversation handoff"] },
      { title: "Stay remembered", summary: "Remain useful across a long decision cycle.", items: ["Database activation", "Homeowner and seller updates", "Past-client nurture", "Referral campaigns", "Email and social systems"] },
    ],
    failures: [
      { title: "The portal owns the relationship", body: "Paid lead sources can support growth, but the brand, content, website, and database should create value the business keeps." },
      { title: "Local expertise stays in the agent’s head", body: "Useful neighborhood and market content can turn real knowledge into authority people can discover and remember." },
      { title: "The database hears from you only at listing time", body: "Consistent, relevant updates create a healthier path to referrals, repeat business, and future conversations." },
    ],
    workflow: ["Neighborhood, search, or social", "Branded site / IDX", "Saved search or capture", "CRM nurture", "Agent conversation", "Transaction", "Past-client / referral cycle"],
    scope: ["Positioning and identity", "Website and IDX strategy", "Local content", "SEO/AEO/GEO", "Listing campaigns", "Paid media", "CRM nurture", "Database reactivation", "Referral systems", "Reporting"],
    proofSlugs: ["coastal-beauties", "big-paws-club", "barpulse"],
    safety: "IDX, MLS, listing-feed, and provider requirements vary by market and vendor. Availability, licensing, data rules, and compatibility are confirmed before scope is finalized.",
    faqs: [
      { q: "Do you provide IDX for every market?", a: "No universal availability is assumed. IDX, MLS, and vendor requirements are confirmed for the client’s market before recommending an implementation." },
      { q: "Can this work with our existing CRM?", a: "Often, yes. We map the current system first and confirm access, data quality, workflow gaps, and integration options before proposing changes." },
      { q: "Do we have to stop buying portal leads?", a: "No. The goal is to strengthen the brand, audience, website, and database you own—not make a blanket decision about every paid source." },
    ],
  },
  legal: {
    slug: "legal", name: "Legal", eyebrow: "Growth systems for law firms",
    title: "Be the firm people trust before they ever speak to you.",
    description: "Positioning, website, search and AI visibility, paid media, reviews, intake, follow-up, and reporting—built around the matters your firm actually wants.",
    metaTitle: "Law Firm Marketing, Websites & Intake Systems | Supreme Team Media",
    metaDescription: "Law firm positioning, websites, SEO and AI visibility, paid media, reputation, intake workflows, follow-up and retained-matter reporting.",
    primaryLabel: "Find the first priority", secondaryLabel: "Run the free law firm check",
    needs: [
      { id: "visibility", label: "The right clients cannot find us", detail: "Improve local, organic, AI-search, practice-area, and paid discovery." },
      { id: "brand", label: "Our firm is hard to distinguish", detail: "Clarify positioning, message, attorney credibility, and reputation." },
      { id: "website", label: "Our website does not build enough trust", detail: "Make practice areas, process, expectations, and consultation paths clearer." },
      { id: "leads", label: "Intake is inconsistent", detail: "Strengthen forms, calls, booking, routing, response, and approved-system handoff." },
      { id: "systems", label: "We cannot see what signs", detail: "Connect source, campaign, practice-area, and intake-stage reporting." },
    ],
    stages: [
      { title: "Get found", summary: "Create a credible path from need to firm.", items: ["SEO, local, and AI-search structure", "Google Ads and LSAs where appropriate", "Practice-area and location pages", "Local listings"] },
      { title: "Build trust", summary: "Answer the questions that precede a consultation.", items: ["Brand and website", "Messaging and copy", "Attorney bios", "Reviews and reputation", "Process and expectation content"] },
      { title: "Convert the right inquiries", summary: "Make intake clearer for prospective clients and staff.", items: ["Forms, calls, and consultation booking", "Lead routing and follow-up", "CRM and intake workflow", "Secure approved-system handoff"] },
      { title: "Know what signs", summary: "Measure beyond clicks and form fills.", items: ["Source and campaign reporting", "Practice-area attribution", "Pipeline visibility", "Intake-stage reporting", "Systems and integrations"] },
    ],
    failures: [
      { title: "The website sounds like every other firm", body: "Clear positioning and useful explanations help the right prospective client understand why the firm may fit." },
      { title: "An inquiry waits without a clear next step", body: "Documented routing and response workflows reduce ambiguity while leaving qualification and legal judgment with the firm." },
      { title: "Marketing reports leads, not retained matters", body: "A better measurement plan connects source and practice area to the intake stages the firm is permitted to track." },
    ],
    workflow: ["Search or referral", "Practice page", "Intake", "Qualification and handoff", "Consultation", "Retainer / onboarding", "Source reporting"],
    scope: ["Firm positioning", "Website and copy", "SEO, local, and AI visibility", "Paid media", "Attorney and practice content", "Reviews", "Intake UX", "CRM workflow", "Attribution and reporting"],
    research: { copy: "Clio’s 2026 reporting says 79% of prospective clients expect a response within 24 hours, while many firms still miss email and phone inquiries.", href: "https://www.clio.com/about/press/grow-ai/", label: "Read the Clio source" },
    proofSlugs: ["barpulse", "allmighty-supreme", "kario-voss"],
    safety: "STM does not provide legal advice or promise case outcomes. Advertising rules vary by jurisdiction; final claims and campaigns remain subject to firm approval. Conflict checks and sensitive client data stay within the firm’s approved systems and processes.",
    faqs: [
      { q: "Do you guarantee cases or search rankings?", a: "No. Case outcomes, retained matters, and rankings cannot be guaranteed. The work focuses on strategy, presentation, demand, intake, follow-up, and useful measurement." },
      { q: "Do you perform conflict checks?", a: "No. Conflict procedures remain governed by the firm and its approved legal software. Any handoff must respect those systems." },
      { q: "How do you handle attorney-advertising requirements?", a: "Requirements vary. The firm approves final claims, disclaimers, targeting, and campaign language before release." },
    ],
  },
  medspa: {
    slug: "medspa", name: "Med spa", eyebrow: "Growth systems for aesthetic practices",
    title: "Look premium. Get booked. Keep patients coming back.",
    description: "Brand, website, local search, paid media, social/content, booking paths, lead nurture, reviews, and retention systems—built to make the marketing match the experience.",
    metaTitle: "Med Spa Marketing, Branding, Websites & Retention | Supreme Team Media",
    metaDescription: "Med spa branding, websites, local search, paid media, social content, consultation conversion, reviews, memberships and patient retention systems.",
    primaryLabel: "Choose what needs attention", secondaryLabel: "Run the free med spa check",
    needs: [
      { id: "brand", label: "Our brand/site doesn’t match the experience", detail: "Align the identity, treatment positioning, visual content, and digital experience." },
      { id: "leads", label: "We need more qualified consultations", detail: "Connect discovery, campaign messaging, treatment pages, and booking paths." },
      { id: "ads", label: "Ads generate interest but follow-up is weak", detail: "Improve landing pages, capture, routing, nurture, and consultation handoff." },
      { id: "retention", label: "We need more repeat visits / memberships", detail: "Build relevant reminders, memberships, email/SMS, reviews, referrals, and reactivation." },
      { id: "visibility", label: "We’re launching or opening a new location", detail: "Coordinate brand, local visibility, content, campaigns, website, and launch paths." },
      { id: "systems", label: "We need the whole growth system", detail: "Map the experience from discovery through booking, retention, and reporting." },
    ],
    stages: [
      { title: "Create desire", summary: "Make the marketing feel as considered as the experience.", items: ["Brand and identity", "Treatment positioning and messaging", "Visual creative and content", "Consented before/after presentation", "Social presence"] },
      { title: "Get discovered", summary: "Meet local interest with relevant, credible content.", items: ["Local SEO and Google Business Profile", "Treatment and service pages", "Google and appropriate paid media", "Content and launch campaigns"] },
      { title: "Turn interest into bookings", summary: "Give qualified interest a clear path to consultation.", items: ["Conversion website and landing pages", "Online booking path", "Lead capture and follow-up", "CRM routing and nurture", "Appropriate next-step communication"] },
      { title: "Keep patients coming back", summary: "Support the relationship beyond one appointment.", items: ["Membership and loyalty marketing", "Treatment reminders", "Email and SMS campaigns", "Reactivation", "Reviews, referrals, and reporting"] },
    ],
    failures: [
      { title: "The digital experience feels cheaper than the practice", body: "The brand, treatment presentation, content, and booking path should reinforce the same level of care." },
      { title: "Campaign interest stalls before consultation", body: "The promise, landing page, response, and booking experience need to work as one path." },
      { title: "Retention depends on front-desk memory", body: "Approved reminders, membership communication, and reactivation systems can support a more consistent patient relationship." },
    ],
    workflow: ["Search or social", "Treatment / landing page", "Consultation request", "Follow-up", "Booking", "Review", "Rebooking / reactivation"],
    scope: ["Brand and positioning", "Website and treatment pages", "Local search", "Paid media", "Social and content", "Consultation conversion", "CRM nurture", "Membership and retention", "Reviews and reporting"],
    proofSlugs: ["supreme-wellness-club", "coastal-beauties", "barpulse"],
    safety: "STM does not provide medical advice, make medical promises, or fabricate before-and-after material. Patient data should remain in approved practice systems; security, integrations, claims, consent, and platform requirements are confirmed with the client.",
    faqs: [
      { q: "Do you provide patient-management software?", a: "Not by default. We assess the approved practice systems already in use and confirm what can be connected or improved before proposing any integration." },
      { q: "Can you create before-and-after content?", a: "We can design the presentation and content system using properly consented, client-approved assets. We do not fabricate patient results." },
      { q: "Are you HIPAA-certified?", a: "We do not make that claim. Sensitive patient information should remain inside approved practice systems, with security and access requirements confirmed during discovery." },
    ],
  },
};

export function isFocus(value: string | null): value is FocusKey {
  return ["brand", "website", "visibility", "ads", "leads", "retention", "systems"].includes(value ?? "");
}