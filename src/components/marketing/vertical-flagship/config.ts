export type VerticalSlug = "hvac" | "auto" | "real-estate" | "legal" | "medspa" | "restaurants" | "pizza" | "tacos";
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
  stagesBySegment?: Record<string, { title: string; summary: string; items: string[] }[]>;
  heroProofPath?: string;
  heroProofLabel?: string;
  tertiaryLabel?: string;
  scope: string[];
  faqs: { q: string; a: string }[];
  safety?: string;
  research?: { copy: string; href: string; label: string };
  proofSlugs: string[];
};

export const FLAGSHIP_SLUGS: VerticalSlug[] = ["hvac", "auto", "real-estate", "legal", "medspa", "restaurants", "pizza", "tacos"];

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
  restaurants: {
    slug: "restaurants", name: "Bars & restaurants", eyebrow: "Hospitality growth, from discovery to regulars",
    title: "Get discovered. Fill more seats. Turn more guests into regulars.",
    description: "Brand, website, local search, paid media, reservations and direct ordering, events, guest marketing, reputation, and business systems—built around how your venue actually earns.",
    metaTitle: "Restaurant & Bar Marketing, Websites & Growth Systems | Supreme Team Media",
    metaDescription: "Branding, restaurant websites, local search, paid media, reservations/direct ordering, events, guest marketing, loyalty, reporting and systems for restaurants, bars and hospitality groups.",
    primaryLabel: "Show me where I’d start", secondaryLabel: "See the hospitality system",
    heroProofPath: "/work/barpulse", heroProofLabel: "See the hospitality system", tertiaryLabel: "Run the free hospitality check",
    segmentLabel: "What kind of hospitality business?", segments: [{ id: "restaurant", label: "Restaurant" }, { id: "nightlife", label: "Bar / Nightlife" }, { id: "group", label: "Multi-location group" }],
    needs: [
      { id: "brand-site-menu", label: "Our brand, site, or menu doesn’t sell the experience", detail: "Sharpen the identity, message, menu experience, creative direction, and path to action." },
      { id: "reservations-orders", label: "We need more reservations or direct orders", detail: "Improve discovery, conversion, reservation, waitlist, and direct-order paths." },
      { id: "events", label: "We need more event or private-party business", detail: "Present packages clearly and capture catering, event, table, or private-dining demand." },
      { id: "visibility", label: "We need better local search, ads, or social", detail: "Connect local visibility, paid demand, content, and event promotion." },
      { id: "retention", label: "We need to bring guests back more often", detail: "Build useful list growth, loyalty, review, referral, and win-back programs." },
      { id: "systems", label: "We need better reporting and operations across tools", detail: "Connect approved data, manager workflows, campaign measurement, and owner visibility." },
      { id: "whole-system", label: "We need the whole growth system", detail: "Plan the full journey from discovery through conversion, retention, and operations." },
    ],
    stages: [
      { title: "Get discovered", summary: "Show up when locals and visitors decide where to go.", items: ["Google Business Profile and local SEO", "SEO/AEO/GEO restaurant content", "Website and menu discoverability", "Paid search, social, and event promotion"] },
      { title: "Get chosen", summary: "Make the experience easy to understand and want.", items: ["Brand, identity, messaging, and copy", "Website and menu experience", "Creative, photography, and video direction", "Reviews, reservations, ordering, and events"] },
      { title: "Fill tables, orders, and events", summary: "Turn demand into a clear next step.", items: ["Reservation and direct-order conversion", "Private dining, events, and catering capture", "Slow-night and seasonal campaigns", "Remarketing and follow-up workflows"] },
      { title: "Build regulars", summary: "Create more reasons for guests to return.", items: ["Guest CRM and first-party list growth", "Email, SMS, push, and loyalty strategy", "VIP, birthday, review, and referral programs", "Win-back and reactivation"] },
      { title: "Run smarter", summary: "Give managers and owners a clearer operating view.", items: ["Reporting and attribution", "POS, reservation, and guest-data connections", "Manager workflows and campaign calendars", "AI-assisted insights where useful"] },
    ],
    stagesBySegment: {
      nightlife: [
        { title: "Own local nightlife discovery", summary: "Make recurring programming and the venue experience easy to find.", items: ["Nightlife search and local visibility", "Event and recurring-program promotion", "Paid social and campaign creative", "Content calendar and venue messaging"] },
        { title: "Turn interest into a plan", summary: "Make every night, table, and private event easier to choose.", items: ["Event-led website experience", "Guest list and table inquiry paths", "Cabana and private-event presentation", "Late-night inquiry handling where appropriate"] },
        { title: "Fill the room", summary: "Connect programming to measurable demand.", items: ["Repeat-event promotion", "Retargeting and seasonal campaigns", "Inquiry routing and follow-up", "Social creative and offer testing"] },
        { title: "Build the guest list", summary: "Keep the relationship after the night ends.", items: ["Guest CRM and list growth", "VIP and loyalty strategy", "Email, SMS, and win-back", "Review and referral programs"] },
        { title: "Run smarter", summary: "Coordinate marketing and operations around the calendar.", items: ["Event and campaign measurement", "Manager workflows", "Approved system connections", "Owner reporting"] },
      ],
      group: [
        { title: "Make every location findable", summary: "Build group strength without flattening local relevance.", items: ["Group brand architecture", "Location pages and local search", "Venue-specific content", "Coordinated paid media"] },
        { title: "Make each venue easy to choose", summary: "Clarify the right menu, experience, and action by location.", items: ["Location-aware website journeys", "Menus, reservations, ordering, and events", "Campaign creative and messaging", "Reputation by venue"] },
        { title: "Coordinate demand", summary: "Run campaigns across the group without losing local control.", items: ["Campaign calendar and routing", "Cross-location remarketing", "Private-event and catering capture", "Venue-level conversion paths"] },
        { title: "Build shared guest value", summary: "Use approved first-party data with a clear location strategy.", items: ["Cross-location guest marketing", "Loyalty and lifecycle strategy", "List growth and reactivation", "Review and referral programs"] },
        { title: "See the group clearly", summary: "Standardize what should be shared and preserve what should stay local.", items: ["Venue scorecards and reporting", "Standard manager workflows", "Campaign coordination", "System integration and owner visibility"] },
      ],
    },
    failures: [
      { title: "The venue looks better in person than online", body: "The brand, menu, creative, reviews, and reservation or ordering path should sell the same experience guests receive." },
      { title: "A slow night has no campaign behind it", body: "A practical calendar can connect events, offers, content, paid media, and guest follow-up to the nights that need demand." },
      { title: "Guest data stays trapped in separate tools", body: "A first-party strategy can clarify what is available, what can connect, and how to bring guests back without overpromising integrations." },
    ],
    workflow: ["Google, social, or event", "Site, menu, reservation, or order", "Visit, order, or inquiry", "Guest profile or list", "Follow-up, loyalty, or win-back", "Owner and manager reporting"],
    workflowBySegment: {
      restaurant: ["Google, social, or event", "Site, menu, reservation, or order", "Visit, order, or event inquiry", "Guest profile or list", "Follow-up, loyalty, or win-back", "Owner and manager reporting"],
      nightlife: ["Nightlife search, social, or event", "Event, guest-list, or table page", "Visit, table, or private-event inquiry", "Guest list or CRM", "Repeat-event promotion or VIP follow-up", "Manager reporting"],
      group: ["Search, campaign, or social", "Venue or location routing", "Local reservation, order, or inquiry", "Cross-location guest profile", "Location-aware loyalty or win-back", "Group and venue reporting"],
    },
    scope: ["Brand and identity", "Website, menu, and copy", "Local search and content", "Paid media and social", "Reservations and direct ordering", "Events and catering", "Guest CRM and loyalty", "Reputation", "Reporting and systems"],
    proofSlugs: ["barpulse", "big-paws-club", "kario-voss"],
    safety: "Reservation, ordering, POS, guest-data, loyalty, and messaging connections depend on the venue’s current platforms, permissions, accounts, and vendor requirements. Compatibility is confirmed before any integration is recommended.",
    faqs: [
      { q: "Do you replace our POS, reservation, or ordering platform?", a: "Not by default. We map the current guest journey and operating stack first, then confirm what should stay, improve, connect, or change." },
      { q: "Can you support one venue and a multi-location group?", a: "Yes. A single venue can focus on its clearest demand or retention gap. A group can add brand architecture, location-level search, campaign coordination, shared guest strategy, and standardized reporting." },
      { q: "Do you guarantee reservations, orders, or event bookings?", a: "No. Guest decisions and platform performance cannot be guaranteed. The work improves the strategy, creative, visibility, conversion paths, follow-up, and measurement around them." },
    ],
  },
  pizza: {
    slug: "pizza", name: "Pizza shops", eyebrow: "Growth systems for independent pizzerias",
    title: "Win the local search. Own more orders. Turn first-time customers into regulars.",
    description: "Brand, website, local visibility, direct ordering, ads, phone and online conversion, loyalty, catering, repeat-order marketing, and business systems—built for independent pizza shops.",
    metaTitle: "Pizza Shop Marketing, Websites & Direct-Order Growth | Supreme Team Media",
    metaDescription: "Branding, pizza websites, local SEO, paid media, direct-order customer journeys, loyalty, repeat-order marketing, catering and business systems for independent pizzerias.",
    primaryLabel: "Show me where I’d start", secondaryLabel: "Run the free pizza check",
    needs: [
      { id: "visibility", label: "We need more local discovery or Google visibility", detail: "Strengthen local search, neighborhood pages, reviews, content, and paid demand." },
      { id: "website", label: "Our website or menu makes ordering harder", detail: "Create a faster mobile journey with clearer menu, pickup, delivery, and order paths." },
      { id: "direct-relationship", label: "Too many customers live on third-party platforms", detail: "Build a stronger direct path and first-party customer relationship where it makes sense." },
      { id: "retention", label: "We need more repeat orders or loyalty", detail: "Plan reorder, loyalty, win-back, review, referral, and local-community campaigns." },
      { id: "phone-orders", label: "We need better phone-order or inquiry handling", detail: "Map how calls, orders, questions, and follow-up should move through the shop." },
      { id: "catering", label: "We need more catering or large orders", detail: "Present packages clearly and create a better path for local businesses, schools, and teams." },
      { id: "ads", label: "We need better ads, social, or content", detail: "Connect local offers, creative, landing pages, seasonal moments, and measurement." },
      { id: "systems", label: "We need the whole growth system", detail: "Plan discovery, ordering, customer ownership, repeat business, and shop visibility together." },
    ],
    stages: [
      { title: "Be the shop they find", summary: "Win useful local visibility when pizza intent is highest.", items: ["Google Business Profile and local SEO", "Pizza-near-me and neighborhood pages", "Website/menu SEO and AEO", "Reviews, local content, and paid media"] },
      { title: "Make ordering easy", summary: "Remove friction from menu to pickup, delivery, or catering.", items: ["Mobile-first website and menu architecture", "Direct online and phone-order paths", "Pickup and delivery presentation", "Catering, large orders, offers, and bundles"] },
      { title: "Own more of the relationship", summary: "Build a direct customer path around the technology that works.", items: ["First-party list growth", "Loyalty and direct-order messaging", "Review and referral requests", "Community and local marketing"] },
      { title: "Keep regulars coming back", summary: "Give customers a relevant reason to reorder.", items: ["Reorder reminders and win-back", "Family, weekday, and game-day offers", "Catering and event outreach", "Seasonal and birthday campaigns"] },
      { title: "Run the shop smarter", summary: "Connect marketing activity to clearer decisions.", items: ["POS, ordering, and CRM connections where feasible", "Campaign and order attribution", "Menu and content workflows", "Multi-location visibility and appropriate automation"] },
    ],
    failures: [
      { title: "Local intent lands on a slow, confusing menu", body: "The mobile experience should make the right location, menu, pickup, delivery, and order path obvious." },
      { title: "The marketplace owns the next order", body: "Third-party reach can remain useful while the brand, direct path, customer list, and loyalty program build a relationship the shop controls." },
      { title: "Catering is hidden behind the regular menu", body: "A dedicated large-order path can explain packages, timing, service area, and the next step for businesses, schools, teams, and events." },
    ],
    workflow: ["Google or social", "Local landing page and menu", "Direct order or phone", "Pickup or delivery", "Customer list and loyalty", "Reorder or win-back", "Review or referral"],
    scope: ["Brand and messaging", "Website and menu", "Local SEO and content", "Paid media and social", "Direct-order journey", "Phone-order workflow", "Loyalty and retention", "Catering", "Reporting and systems"],
    proofSlugs: ["big-paws-club", "barpulse", "kario-voss"],
    safety: "Already have ordering or POS software you like? Keep it. We can improve the brand, website, demand generation, customer journey, and retention around it—or confirm what can be connected before recommending a change. New platform options depend on existing accounts, access, and provider requirements.",
    faqs: [
      { q: "Do we have to replace Slice, Owner.com, Toast, Square, Clover, or our current ordering system?", a: "No. If the current platform works, the engagement can strengthen the brand, website, local demand, customer journey, and retention around it. Any connection or replacement is recommended only after compatibility and requirements are confirmed." },
      { q: "Can you help us build more direct orders?", a: "We can improve the direct-order journey, local visibility, menu experience, campaign messaging, customer list, and repeat-order strategy. We do not promise a specific order mix or claim integrations before they are verified." },
      { q: "Can the work support multiple locations?", a: "Yes. Scope can include location pages, local visibility, location-aware ordering paths, coordinated campaigns, shared customer strategy, and multi-location reporting." },
    ],
  },
  tacos: {
    slug: "tacos", name: "Taco Shops / Taquerías", eyebrow: "Local growth for taco shops and taquerías",
    title: "Be the taco shop people find, crave, and order from again.",
    description: "Brand, website, Google visibility, ordering paths, social content, reviews, loyalty, catering, and customer follow-up—built for neighborhood taquerías and taco shops.",
    metaTitle: "Taco Shop Marketing, Websites & Local Growth | Supreme Team Media",
    metaDescription: "Branding, websites, Google visibility, ordering paths, social content, loyalty, catering, reviews and growth systems for taco shops and taquerías.",
    primaryLabel: "Show me where I’d start", secondaryLabel: "Run the free taco-shop check",
    needs: [
      { id: "visibility", label: "We need more Google/Maps visibility", detail: "Improve Maps, local search, reviews, neighborhood discovery, and paid demand." },
      { id: "website", label: "Our website/menu makes ordering harder than it should", detail: "Create a fast mobile path through the menu, location, hours, and ordering choices." },
      { id: "direct-relationship", label: "We depend too much on third-party apps", detail: "Strengthen direct paths and customer relationships without assuming a platform replacement." },
      { id: "ads", label: "We need better social/content", detail: "Build useful creative direction for social, Reels, TikTok, offers, and neighborhood moments." },
      { id: "retention", label: "We need more repeat orders and loyalty", detail: "Plan consented loyalty, reorder, win-back, review, referral, and community campaigns." },
      { id: "catering", label: "We need more catering / large orders", detail: "Give businesses, schools, teams, and parties a clear large-order path." },
      { id: "leads", label: "We need better phone/order follow-up", detail: "Clarify how calls, orders, questions, and catering inquiries move through the shop." },
      { id: "systems", label: "We need the whole growth system", detail: "Connect discovery, ordering, retention, reporting, and shop workflows." },
    ],
    stages: [
      { title: "Own the local search", summary: "Win useful neighborhood discovery when taco intent is highest.", items: ["Google Business Profile and Maps", "Tacos-near-me and neighborhood search", "Search- and AI-readable menu/location pages", "Reviews, local paid search, social, and multi-location pages"] },
      { title: "Make it easy to order", summary: "Remove friction from craving to pickup, delivery, or a large order.", items: ["Mobile-first website and readable menu", "Direct online-order path where supported", "Click-to-call and phone-order path", "Pickup, delivery, hours, location, catering, combos, and specials"] },
      { title: "Look as good online as the food", summary: "Make the digital presence carry the shop’s real character.", items: ["Brand identity and menu design", "Food and content creative direction", "Social, TikTok, and Reels strategy", "Natural English/Spanish messaging and social proof"] },
      { title: "Turn first orders into regulars", summary: "Give customers relevant reasons to come back.", items: ["Loyalty and consented customer lists", "Email/SMS, reorder, and win-back", "Birthday, family, game-day, review, and referral offers", "Community promotions and catering follow-up"] },
      { title: "Run the shop smarter", summary: "Connect demand and customer activity to clearer decisions.", items: ["Existing POS/order/CRM connections where feasible", "Marketing and order attribution", "Review monitoring and customer-list workflows", "Phone/order automation, multi-location visibility, and staff support where in scope"] },
    ],
    failures: [
      { title: "A nearby customer cannot find the right menu", body: "Google, the website, location details, hours, and ordering path should agree before the customer loses the craving—or the patience." },
      { title: "The shop looks better in person than online", body: "Brand, menu, content, reviews, and ordering should express the real food and experience without fake photography or stereotypes." },
      { title: "The first order never becomes a relationship", body: "Consented loyalty, follow-up, review, referral, and win-back programs can support repeat business without unsupported promises." },
    ],
    workflow: ["Google / Maps / social", "Bilingual menu / site", "Direct order or phone", "Pickup or delivery", "Customer list / loyalty", "Reorder / win-back", "Review / referral"],
    scope: ["Brand and menu design", "Mobile website", "Google and local search", "Paid search and social", "Ordering and phone paths", "English/Spanish materials", "Loyalty and retention", "Catering", "Reviews", "Reporting and systems"],
    proofSlugs: ["barpulse", "big-paws-club", "kario-voss"],
    safety: "Already have ordering or POS software you like? Keep it. We can improve the brand, website, demand generation, customer journey, and retention around it—and confirm what can connect before recommending a change. Bilingual website, campaign, and customer-facing materials can be included in the project. Live Spanish-language sales/support coverage is scoped when needed.",
    faqs: [
      { q: "Do we have to replace Toast, Square, Clover, Owner.com, DoorDash, Uber Eats, ChowNow, Tacoter, or our current tools?", a: "No. If your current ordering or POS software works, keep it. We can strengthen the brand, website, demand, customer journey, and retention around it. Compatibility is confirmed before any connection or change is recommended." },
      { q: "Can the website and campaigns be bilingual?", a: "Yes. The project can include website, campaign, menu, and customer-facing materials in natural English and Spanish. Live Spanish-language sales or support coverage is scoped when needed." },
      { q: "Can you help with direct orders, loyalty, and catering?", a: "Yes, where the strategy and current tools support them. We can improve the paths, messaging, creative, list growth, and follow-up, but we do not promise a particular order mix or retention result." },
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