/**
 * Client proposals published as unlisted pages at /proposal/:slug.
 *
 * Each record is the full content of one proposal, so a new proposal is a new
 * record here (and nothing else). The page renders every section from the
 * record, logs views to site_events, and sends an agreement request through the same
 * submit-inbound-lead intake the public contact form uses, so the owner alert
 * and the CRM record fire with no extra backend.
 *
 * Keep these pages out of search: the route is not in ROUTE_META (so it is
 * never prerendered or added to the sitemap), the page sets a noindex meta tag,
 * and robots.txt disallows /proposal/.
 */

export type ProposalBlock = {
  number: string;
  title: string;
  body: string;
  /** Short line under the body, in smaller type. Optional. */
  note?: string;
};

export type ProposalPhase = {
  when: string;
  title: string;
  body: string;
};

export type ProposalRecord = {
  slug: string;
  /** Program or service name. The H1. */
  title: string;
  /** One or two short lines under the title. */
  subtitle: string;
  client: {
    company: string;
    contact: string;
    location: string;
  };
  preparedOn: string;
  preparedBy: {
    name: string;
    company: string;
    email: string;
    site: string;
  };
  /** Optional hosted-player share link. A named studio-media MP4 takes priority. */
  videoUrl: string;
  videoMediaKey?: string;
  videoTranscript?: string;
  /** Path to a downloadable PDF under /public, or empty to hide the button. */
  pdfUrl: string;
  /** Three short facts shown big at the top. */
  headlineFacts: { label: string; value: string }[];
  /** The opening note to the client, in the sender's words. */
  opening: string[];
  journey: {
    title: string;
    steps: { label: string; title: string; body: string; handoff: string }[];
  };
  outcomes: { label: string; title: string; body: string }[];
  blocks: ProposalBlock[];
  monthly: { value: string; label: string }[];
  markets: {
    title: string;
    body: string;
    home: string;
    travelNote: string;
    scopeNote: string;
  };
  pricing: {
    title: string;
    lines: { label: string; amount: string; cadence: string; body: string }[];
    plainRules: string[];
  };
  pilot: {
    title: string;
    phases: ProposalPhase[];
    assurance: { title: string; body: string };
    definition: { title: string; body: string };
    after: string;
  };
  afterAccept: {
    title: string;
    intro: string;
    items: string[];
  };
  accept: {
    title: string;
    body: string;
    buttonLabel: string;
    confirmationTitle: string;
    confirmationBody: string;
  };
  /** Appears in the request record so the owner alert reads clearly. */
  internalLabel: string;
};

export const PROPOSALS: Record<string, ProposalRecord> = {
  "cpn-boston": {
    slug: "cpn-boston",
    title: "Appointment Growth Program",
    subtitle: "More of the right people at your presentations. A marketing channel you own.",
    client: {
      company: "Consumer Protection Networks",
      contact: "Erik Green",
      location: "Boston and the markets your team travels to",
    },
    preparedOn: "October 30, 2026",
    preparedBy: {
      name: "Allmighty Supreme Mayo",
      company: "Supreme Team Media",
      email: "supremeteammedia@gmail.com",
      site: "supremeteammedia.com",
    },
    videoUrl: "",
    videoMediaKey: "proposal-cpn-explainer",
    videoTranscript: "CPN wants more suitable timeshare owners at its presentations, without adding routine scheduling and follow-up to the team's day. Supreme Team Media proposes an appointment program built around that goal, with exclusive inquiries and assets that belong to CPN. We start with one primary paid channel, covering Boston and up to three active travel markets around your presentation calendar. Owners learn what to expect, complete screening, choose a session, and receive confirmations and reminders. Questions needing judgment go to your team, while we handle routine coordination. Monthly content keeps the message current. Reporting tracks spend, qualified bookings, attendance, and the sales CPN reports, so decisions follow the numbers. The pilot covers sixty live days. At day thirty, you can continue, adjust, or stop before the second monthly program fee. The proposal below explains the scope, responsibilities, investment, and first-month assurance. Review it, and request the agreement when you're ready to take the next step.",
    pdfUrl: "",
    headlineFacts: [
      { label: "Included markets", value: "Boston + up to 3 travel markets" },
      { label: "Pilot", value: "60 live days" },
      { label: "Your decision", value: "Continue, adjust or stop at day 30" },
    ],
    opening: [
      "Erik, the goal is more suitable timeshare owners in the room, in Boston and wherever your team is presenting, without adding routine scheduling and follow-up to your day.",
      "Supreme Team Media builds and manages the appointment program around your calendar. We introduce owners to your team, explain what to expect, and handle screening, booking and reminders. Your team handles the presentations and personal conversations.",
    ],
    journey: {
      title: "From first impression to presentation day.",
      steps: [
        { label: "Discover", title: "Reach owners in the right market.", body: "A campaign on one primary paid channel introduces owners to CPN in the locations where your team is presenting.", handoff: "STM manages the campaign. CPN approves the advertising budget." },
        { label: "Understand", title: "Help owners know what to expect.", body: "A main video featuring your team, short ads and answer clips explain the consultation before an owner books.", handoff: "CPN supplies the expertise. STM produces the content." },
        { label: "Qualify", title: "Screen for the people you can help.", body: "A short screening step uses the criteria we agree with your team before launch. Inquiries are exclusive to CPN.", handoff: "STM manages screening. Questions needing judgment go to your named contact." },
        { label: "Book", title: "Connect each owner to a session.", body: "Market-specific campaign pages show the presentation dates and venues that match your calendar.", handoff: "CPN confirms the dates. STM maintains the booking process." },
        { label: "Attend", title: "Keep the appointment moving.", body: "Confirmations, reminders and rescheduling reduce routine coordination. Reporting connects spend to qualified bookings, attendance and CPN-reported sales.", handoff: "STM handles routine follow-up. CPN leads the personal conversation." },
      ],
    },
    outcomes: [
      { label: "The immediate goal", title: "More suitable households attending", body: "Owners understand the consultation, complete screening and book into the sessions on your calendar." },
      { label: "The lasting value", title: "A channel that belongs to CPN", body: "Your finished videos, campaign pages, advertising and social accounts, and lead records stay yours. The foundation can support future venues and markets." },
    ],
    blocks: [
      { number: "01", title: "Prepare owners before arrival", body: "A main video featuring your team, supported by short ads and answer clips, introduces CPN and explains what to expect from the consultation." },
      { number: "02", title: "Book into your sessions", body: "Market-specific pages, short screening and booking connect suitable owners to your presentation dates and venues. Boston plus up to three travel markets can be active at once." },
      { number: "03", title: "Reduce routine follow-up", body: "Confirmations, reminders and rescheduling keep appointments moving. Questions that need judgment go to a named CPN contact. Your inquiries are exclusive, never shared or resold." },
      { number: "04", title: "Build your own channel", body: "CPN keeps the finished videos, campaign pages, advertising and social accounts, and lead records. The work creates a foundation you can reuse for future venues and markets." },
    ],
    monthly: [
      { value: "6–8", label: "clips from a monthly recording" },
      { value: "2–3", label: "ad variations each month" },
      { value: "Weekly", label: "Facebook, Instagram and YouTube posting" },
      { value: "Managed", label: "campaigns, booking, follow-up and reporting" },
    ],
    markets: {
      title: "Built around your presentation calendar.",
      body: "Start with one primary paid channel. Activate markets according to your presentation dates and the budget you approve, with local pages and booking details for each selected location.",
      home: "Boston is the home market.",
      travelNote: "Up to three travel markets may be active alongside Boston. We agree on which markets to activate as your calendar develops.",
      scopeNote: "Extra channels and mail-response integration can be scoped later, before that work is added.",
    },
    pricing: {
      title: "The investment",
      lines: [
        { label: "Foundation", amount: "$3,000", cadence: "one-time setup", body: "$1,500 to begin; $1,500 when the launch deliverables are ready. Includes the main video and launch content, page, screening and booking, tested follow-up and reporting setup." },
        { label: "Program", amount: "$3,000", cadence: "per month, starting at launch", body: "Campaign management, monthly recording and content, weekly posting, booking and follow-up upkeep, plus a dashboard and weekly report." },
        { label: "Advertising", amount: "$3,000–$5,000", cadence: "per month · initial planning range", body: "Total across the selected markets. CPN approves the budget and pays the advertising platforms directly. This is separate from the program fee." },
      ],
      plainRules: ["No percentage of sales.", "No per-lead fee.", "Your finished assets, accounts and lead records stay yours."],
    },
    pilot: {
      title: "The launch and pilot",
      phases: [
        { when: "Before launch", title: "Build the foundation", body: "Confirm screening, calendar, materials and access. Target launch within three weeks once these are in place, with timely approvals." },
        { when: "Live days 1–30", title: "Manage and measure", body: "Run the campaign and appointment process. Report spend, qualified bookings, attendance and CPN-reported sales each week." },
        { when: "Day 30", title: "Make a real decision", body: "Review qualified attendance, acquisition cost and early sales. Continue, adjust or stop before the second monthly fee." },
        { when: "Live days 31–60", title: "Continue if it makes sense", body: "Use the first month's results to guide the next month of the pilot if you decide to continue." },
      ],
      assurance: {
        title: "A clear first-month assurance",
        body: "If the first 30 live days produce zero qualified attending households, we refund that month's $3,000 program fee and pause, provided the agreed advertising funding and presentation dates are available.",
      },
      definition: {
        title: "Agree on qualified attendance before launch",
        body: "We agree on the screening criteria with your team before the campaign goes live, so the results are measured against a shared definition.",
      },
      after: "After the pilot, the program continues month to month with 30 days' notice.",
    },
    afterAccept: {
      title: "Let's build your next source of appointments.",
      intro: "Request the agreement and $1,500 starting invoice. Then we confirm the presentations, arrange the first recording and begin the build.",
      items: [
        "Confirm presentation dates, venues and the first markets to activate.",
        "Agree on screening criteria and name the CPN contact for questions that need judgment.",
        "Gather the materials and account access, arrange the first recording and begin the build.",
      ],
    },
    accept: {
      title: "Ready for the next step?",
      body: "Send your details so Allmighty can prepare the agreement and $1,500 starting invoice. Questions are welcome before you decide.",
      buttonLabel: "Request the agreement",
      confirmationTitle: "Your request is saved.",
      confirmationBody: "Allmighty will follow up using the details you provided to send the agreement and $1,500 starting invoice.",
    },
    internalLabel: "Appointment Growth Program, CPN Boston",
  },
};

export function getProposal(slug: string | undefined): ProposalRecord | null {
  if (!slug) return null;
  return PROPOSALS[slug] ?? null;
}

/** Turns a share link into an embeddable player URL. Returns null for anything unrecognized. */
export function toEmbedUrl(url: string): string | null {
  if (!url) return null;
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
  } catch {
    return null;
  }
  return null;
}
