/** Unlisted proposals at /proposal/:slug. Content is separate from presentation. */
export type ProposalBlock = { number: string; title: string; body: string; note?: string };
export type ProposalPhase = { when: string; title: string; body: string };
export type ProposalRecord = {
  slug: string;
  title: string;
  subtitle: string;
  heroHeadline?: string;
  client: { company: string; contact: string; location: string };
  preparedOn: string;
  preparedBy: { name: string; company: string; email: string; site: string };
  videoUrl: string;
  pdfUrl: string;
  headlineFacts: { label: string; value: string }[];
  factsNote: string;
  journey: { title: string; steps: { label: string; body: string }[] };
  opening: string[];
  outcomes: { label: string; title: string; body: string }[];
  blocks: ProposalBlock[];
  monthly: { value: string; label: string }[];
  growthLoop?: { title: string; body: string; steps: { title: string; body: string }[] };
  whoDoesWhat: { title: string; us: string[]; them: string[] };
  markets: { title: string; body: string; home: string; travelNote: string; scopeNote: string };
  pricing: {
    title: string;
    lines: { label: string; amount: string; body: string }[];
    plainRules: string[];
    summary?: string;
  };
  pilot: {
    title: string;
    phases: ProposalPhase[];
    assurance: { title: string; body: string };
    definition: { title: string; body: string };
    after: string;
  };
  afterAccept: { title: string; intro: string; items: string[] };
  accept: { title: string; body: string; buttonLabel: string; confirmationTitle: string; confirmationBody: string };
  internalLabel: string;
};

export const PROPOSALS: Record<string, ProposalRecord> = {
  "cpn-boston": {
    slug: "cpn-boston",
    title: "Automated Lead Generation Program",
    heroHeadline: "More qualified owners.\nMore seats filled.\nLess chasing.",
    subtitle: "A managed growth system for CPN: advertising and social content bring in interest. Screening, booking and automated follow-up turn that interest into appointments. We manage the marketing. Your team handles the conversations.",
    client: { company: "Consumer Protection Networks", contact: "Erik Green", location: "Boston and selected travel markets" },
    preparedOn: "November 1, 2026",
    preparedBy: { name: "Allmighty Supreme Mayo", company: "Supreme Team Media", email: "supremeteammedia@gmail.com", site: "supremeteammedia.com" },
    // Add the approved, hosted video URL here after the revised cut is exported.
    // Keep empty until then: no fake player, broken media, or old video presented as the new cut.
    videoUrl: "",
    pdfUrl: "",
    headlineFacts: [
      { label: "Attract", value: "Interested local owners" },
      { label: "Convert", value: "Inquiries into appointments" },
      { label: "Improve", value: "Managed every month" },
    ],
    factsNote: "Built on GoHighLevel. Customized and managed by Supreme Team Media.",
    opening: [
      "Erik, your team already has presentations, salespeople and lead sources. This adds a digital acquisition channel alongside your direct mail—not another list of names for your team to chase.",
      "We connect the marketing and the follow-up in one managed program. You gain another way to reach interested owners, prepare them for the meeting and support attendance, while building a channel under your control.",
    ],
    outcomes: [
      { label: "The immediate goal", title: "More of the right people in the room", body: "Campaigns focused on owners your team can help, in the markets where you have presentations scheduled." },
      { label: "The lasting advantage", title: "Your own acquisition channel", body: "Your creative, pages, advertising accounts, social channels and lead records stay yours. The foundation can support future venues and markets." },
    ],
    journey: {
      title: "One connected path from interest to attendance.",
      steps: [
        { label: "Attract", body: "Ads and social content reach owners in your presentation markets." },
        { label: "Capture", body: "A clear campaign page explains the consultation and captures interest." },
        { label: "Qualify & book", body: "Screening questions and available sessions guide owners to the right appointment." },
        { label: "Follow up", body: "Confirmations, reminders and rebooking support attendance." },
        { label: "Improve", body: "Campaign results guide the next creative, targeting and follow-up decisions." },
      ],
    },
    blocks: [
      { number: "01", title: "Marketing that creates interest", body: "Campaign strategy, messaging and paid advertising around your offer and locations. We start with one primary paid channel, test different approaches and manage the budget you approve." },
      { number: "02", title: "A clear path to the right session", body: "Market-specific pages, relevant screening questions and booking tied to your actual dates and venues. Contact details and screening answers travel with the appointment." },
      { number: "03", title: "Follow-up without the routine chasing", body: "Automated confirmations, reminders, rescheduling and follow-up keep interested owners moving. Questions that need personal judgment go to your named contact. Inquiries are never shared or resold." },
      { number: "04", title: "Creative and social, handled by STM", body: "We create the videos, ad variations and weekly social content that support the campaign. No monthly filming obligation. Your team can appear when it adds value, but production does not depend on it." },
      { number: "05", title: "Campaigns that follow your team", body: "Boston stays the home market. Selected travel markets get focused campaigns around the presentation calendar, supported by the same reusable pages, creative and booking system." },
      { number: "06", title: "A managed service—not a one-time setup", body: "We review campaign performance, refresh creative, maintain the automations and refine the path to attendance. A dashboard and weekly report keep the work and results visible." },
    ],
    growthLoop: {
      title: "The system does the routine work. We keep improving the results.",
      body: "Your monthly fee pays for active marketing management—not just software access or a report.",
      steps: [
        { title: "Test the message", body: "Compare creative and campaign approaches to learn what attracts suitable owners." },
        { title: "Follow the outcome", body: "Track spending, qualified bookings, attendance and sales reported by your team." },
        { title: "Refine the next cycle", body: "Use those results to improve ads, pages, screening and follow-up before increasing spend." },
      ],
    },
    monthly: [
      { value: "6–8", label: "short clips produced by STM" },
      { value: "2–3", label: "new advertising variations" },
      { value: "Weekly", label: "social posting and performance review" },
      { value: "Monday", label: "report on spending, bookings and attendance" },
    ],
    whoDoesWhat: {
      title: "We run the marketing. You run the presentations.",
      us: ["Strategy, advertising and creative production", "Campaign pages, screening and appointment automation", "Social posting, performance reporting and optimization"],
      them: ["Share presentation dates, venues and screening priorities", "Approve the message and advertising budget", "Handle personal questions, presentations and sales conversations"],
    },
    markets: {
      title: "Keep Boston growing. Support the next market.",
      body: "Your digital campaigns work alongside direct mail. We adapt the message, location and booking options to the places your team is presenting—without rebuilding the entire system for every trip.",
      home: "Boston is the home market.",
      travelNote: "Travel campaigns open ahead of scheduled presentations. The approved advertising budget is allocated across the selected markets.",
      scopeNote: "Includes Boston plus up to three travel markets active at a time.",
    },
    pricing: {
      title: "Your investment",
      lines: [
        { label: "One-time foundation", amount: "$3,000", body: "$1,500 to begin; $1,500 when the launch deliverables are ready. Strategy, launch creative, campaign pages, screening, booking, automated follow-up and reporting setup." },
        { label: "Monthly management", amount: "$3,000 / month", body: "Begins when the campaign goes live. Campaign management, creative production, social posting, automation upkeep, reporting and ongoing improvements." },
        { label: "Advertising budget", amount: "$3,000–$5,000 / month", body: "Initial total planning range across selected markets. Separate from STM's fees. You approve the budget and pay the advertising platforms directly." },
      ],
      plainRules: ["No percentage of sales.", "No per-lead charges.", "Your assets, accounts and lead records stay yours."],
      summary: "Completing both live pilot months: $15,000–$19,000 total, including setup and the planned advertising budget. You can stop at the day-30 review before a second monthly program fee.",
    },
    pilot: {
      title: "A focused start",
      phases: [
        { when: "Before launch", title: "Build your foundation", body: "Confirm your markets, dates and message. Configure the system and approve the launch creative. Target launch: within three weeks of receiving the required inputs and approvals." },
        { when: "Live days 1–30", title: "Launch and learn", body: "Activate the campaign. Track inquiries, qualified bookings and attendance. Review performance every week." },
        { when: "Day 30", title: "Continue, adjust or stop", body: "Review results together. Decide whether to proceed before the second monthly program fee is charged." },
        { when: "Live days 31–60", title: "Build on what works", body: "Refine the campaign and support upcoming markets. Increase spend or add a channel only when agreed." },
      ],
      assurance: { title: "First-month assurance", body: "Zero qualified attending households in the first 30 live days? We refund that month's $3,000 program fee and pause, provided the agreed campaign funding and presentation dates were available." },
      definition: { title: "How we judge results", body: "Qualified households meet the screening criteria we agree with your team and attend a scheduled presentation. Each household counts once. We review acquisition cost and reported sales alongside attendance." },
      after: "After the pilot, service continues month to month with 30 days' notice.",
    },
    afterAccept: {
      title: "Your next source of appointments starts here.",
      intro: "Approve the direction and request the agreement. We will send the agreement and $1,500 starting invoice, then confirm the kickoff.",
      items: ["Confirm your upcoming markets, presentation dates and priorities.", "Share existing brand assets, campaign materials and the questions owners ask.", "Approve the launch message. We configure, produce and prepare the campaign."],
    },
    accept: {
      title: "Ready to put the plan in motion?",
      body: "Request the agreement below, or arrange a short proposal review first. We will confirm the next step with you directly.",
      buttonLabel: "Approve plan & request agreement",
      confirmationTitle: "Your request is received.",
      confirmationBody: "Allmighty will follow up with the agreement and $1,500 starting invoice. Your contact details have been sent to Supreme Team Media.",
    },
    internalLabel: "Automated Lead Generation Program — CPN Boston",
  },
};

export function getProposal(slug: string | undefined): ProposalRecord | null {
  return slug ? PROPOSALS[slug] ?? null : null;
}
export function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}
export function toEmbedUrl(url: string): string | null {
  if (!url || isVideoFile(url)) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}?rel=0`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/embed/")) return `${u.origin}${u.pathname}?rel=0`;
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
    }
    if (host === "loom.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === "player.vimeo.com") return url;
  } catch { return null; }
  return null;
}
