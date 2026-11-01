/**
 * Client proposals published as unlisted pages at /proposal/:slug.
 *
 * Each record is the full content of one proposal, so a new proposal is a new
 * record here (and nothing else). The page renders every section from the
 * record, logs views to site_events, and sends an acceptance through the same
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
  /** Program or service name. Shown small above the headline. */
  title: string;
  /** The benefit headline, one line per entry. The H1. */
  headline: string[];
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
  /** A YouTube, Loom or Vimeo share link, or a direct .mp4/.webm file URL. Empty string hides the video block. */
  videoUrl: string;
  /** Path to a downloadable PDF under /public, or empty to hide the button. */
  pdfUrl: string;
  /** Three short facts shown big at the top. */
  headlineFacts: { label: string; value: string }[];
  /** One line under the facts that qualifies them. */
  factsNote: string;
  /** The system in five short steps, shown before the detail. */
  journey: { title: string; steps: { label: string; body: string }[] };
  /** The opening note to the client, in the sender's words. */
  opening: string[];
  outcomes: { label: string; title: string; body: string }[];
  blocks: ProposalBlock[];
  /** What the program produces each month, shown as four big figures. */
  monthly: { value: string; label: string }[];
  /** What the monthly fee pays for: the improvement loop. */
  growthLoop: { title: string; intro: string; steps: { title: string; body: string }[] };
  /** The division of work, two columns. */
  whoDoesWhat: { title: string; us: string[]; them: string[] };
  markets: {
    title: string;
    body: string;
    home: string;
    travelNote: string;
    scopeNote: string;
  };
  pricing: {
    title: string;
    lines: { label: string; amount: string; body: string }[];
    plainRules: string[];
    /** One line that adds the pieces up for the pilot. */
    summary: string;
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
    buttonLabel: string;
    confirmationTitle: string;
    confirmationBody: string;
  };
  /** Appears in the agreement-request record so the owner alert reads clearly. */
  internalLabel: string;
};

export const PROPOSALS: Record<string, ProposalRecord> = {
  "cpn-boston": {
    slug: "cpn-boston",
    title: "Appointment Growth Program",
    headline: ["More qualified owners.", "More seats filled.", "Less chasing."],
    subtitle: "A managed growth system for CPN: advertising and social content bring in interest. Screening, booking and automated follow-up turn that interest into appointments. We manage the marketing. Your team handles the conversations.",
    client: {
      company: "Consumer Protection Networks",
      contact: "Erik Green",
      location: "Boston and the markets your team travels to",
    },
    preparedOn: "November 1, 2026",
    preparedBy: {
      name: "Sean Mayo",
      company: "Supreme Team Media",
      email: "supremeteammedia@gmail.com",
      site: "supremeteammedia.com",
    },
    videoUrl: "/proposal-media/cpn-boston.mp4",
    pdfUrl: "",
    headlineFacts: [
      { label: "Attract", value: "Interested owners in your markets" },
      { label: "Convert", value: "Inquiries into booked, attended seats" },
      { label: "Improve", value: "Managed and tuned every month" },
    ],
    factsNote: "Customized, run and improved for CPN by Supreme Team Media, for fixed fees with no percentage of sales and no per-lead charges.",
    journey: {
      title: "One connected path from interest to attendance.",
      steps: [
        { label: "Attract", body: "Ads and social content reach owners in your presentation markets." },
        { label: "Capture", body: "A clear campaign page explains the presentation and captures interest." },
        { label: "Qualify and book", body: "Screening questions and available sessions guide owners to the right appointment." },
        { label: "Follow up", body: "Confirmations, reminders and rebooking support attendance." },
        { label: "Improve", body: "Campaign results guide the next creative, targeting and follow-up decisions." },
      ],
    },
    opening: [
      "Erik, thanks for the time on Friday. Your team already has presentations, salespeople and lead sources. This adds a digital acquisition channel alongside your direct mail, not another list of names for your team to chase.",
      "We connect the marketing and the follow-up in one managed program. You gain another way to reach interested owners, prepare them for the meeting and support attendance, while building a channel you control. Everything is on this page, and you can print it or save it as a PDF for your team from the bottom.",
    ],
    outcomes: [
      {
        label: "The immediate goal",
        title: "More of the right people in the room",
        body: "Campaigns focused on owners your team can help, in the markets where you have presentations scheduled, with the screening, scheduling and chasing handled.",
      },
      {
        label: "The lasting advantage",
        title: "Your own acquisition channel",
        body: "Your creative, pages, advertising accounts, social channels and lead records stay yours. The foundation can be pointed at a new city in a day and keeps working as long as the results justify it.",
      },
    ],
    blocks: [
      {
        number: "01",
        title: "Marketing that creates interest",
        body: "Campaign strategy, messaging and paid advertising around your offer and your locations. We start with one primary paid channel, Meta and Instagram, aimed at timeshare owners where your team will be, test different approaches, and manage the budget you approve. Google can be added as a second channel once eligibility is confirmed and we agree on it.",
      },
      {
        number: "02",
        title: "A clear path to the right session",
        body: "A campaign page for each market, plain answers to the questions owners ask, and a short qualifier: where they live, which resort or developer, years owned, paid off or financed, annual fees, and what they want. Booking is tied to your actual dates and venues, with a phone or video option for people who won't come to a group. Contact details and screening answers travel with the appointment.",
      },
      {
        number: "03",
        title: "Follow-up without the routine chasing",
        body: "Automated confirmations, reminders, a courtesy call with a human option, rebooking for no-shows, and follow-up for the people who are interested but not ready. Questions that need personal judgment go to your named contact with the owner's details attached. Every inquiry is exclusive to CPN, never shared or resold.",
      },
      {
        number: "04",
        title: "Creative and social, handled by us",
        body: "We write, produce and cut the video, the ad variations and the weekly social content that support the campaign, with professional voiceover, motion graphics and licensed footage. No monthly filming obligation: your team can appear when it adds value, but production does not depend on it.",
        note: "Nothing in the video or the ads promises an exit, implies a government program or a connection to any resort, or pressures anyone with today-only language. The campaign invites owners to understand their options and book a conversation with your team.",
      },
    ],
    monthly: [
      { value: "6 to 8", label: "short clips produced by STM each month" },
      { value: "2 to 3", label: "new advertising variations each month" },
      { value: "Weekly", label: "social posting and performance review" },
      { value: "Monday", label: "report on spend, bookings and attendance" },
    ],
    growthLoop: {
      title: "The system does the routine work. We keep improving the results.",
      intro: "Your monthly fee pays for active marketing management, not software access and a report. Every change is judged by attendance, not clicks, and you can open the dashboard any time between Monday reports.",
      steps: [
        { title: "Test the message", body: "Compare creative and campaign approaches to learn what attracts suitable owners in each market." },
        { title: "Follow the outcome", body: "Track spend, qualified bookings, attendance and, when you share them, the sales that came from it." },
        { title: "Refine the next cycle", body: "Use those results to improve the ads, the pages, the screening and the follow-up before spend goes up." },
      ],
    },
    whoDoesWhat: {
      title: "Who does what",
      us: [
        "Strategy, advertising management and creative production, with no filming required from your team",
        "Campaign pages, screening, booking and the automated follow-up",
        "Weekly social posting, the Monday report and the month-to-month optimization",
      ],
      them: [
        "Share the presentation dates, venues and screening priorities for each market",
        "Approve the message and the advertising budget, paid directly to the platforms",
        "Handle the personal questions, the presentations and the sales conversations",
      ],
    },
    markets: {
      title: "Boston, and every market the team travels to",
      body: "The program follows your presentation calendar, not a radius. A mail drop for an event in another city has to be printed and in the mail weeks ahead. A campaign for that same event is a geography change and a venue line on the calendar, running from the same video and page.",
      home: "Boston runs continuously as the home market.",
      travelNote: "Each travel market gets its own campaign window that opens two to three weeks before your presentations there and closes the day after, aimed at owners who live where the team will be. The where-they-live answer on the page routes each person to the right calendar.",
      scopeNote: "Included scope: the home market plus up to three travel markets active at any one time. If your calendar runs hotter than that, we agree on the extra before adding it.",
    },
    pricing: {
      title: "Your investment",
      lines: [
        {
          label: "One-time foundation",
          amount: "$3,000",
          body: "$1,500 to begin and $1,500 when the launch deliverables are ready. Strategy, launch creative, the campaign pages, screening, booking, automated follow-up and the reporting setup.",
        },
        {
          label: "Monthly management",
          amount: "$3,000 a month",
          body: "Begins the day the campaign goes live, not the day we sign. Campaign management, creative production, social posting, automation upkeep, reporting and ongoing improvement.",
        },
        {
          label: "Advertising budget",
          amount: "$3,000 to $5,000 a month",
          body: "Initial planning range, total across the selected markets, and separate from our fees. You approve the budget and pay the platforms directly, so every dollar is visible to you, market by market.",
        },
      ],
      plainRules: [
        "No percentage of your sales.",
        "No per-lead charges.",
        "Your creative, pages, accounts and lead records stay yours.",
      ],
      summary: "Completing both live pilot months comes to $15,000 to $19,000 in total, including the foundation and the planned advertising budget. You can stop at the day-30 review before a second monthly management fee.",
    },
    pilot: {
      title: "How the pilot works",
      phases: [
        {
          when: "Before launch",
          title: "Build your foundation",
          body: "Confirm your markets, dates, screening priorities and message. We build the pages, booking, follow-up, social channels, tracking and dashboard, and produce the launch creative for your approval. Target launch: within three weeks of receiving the inputs and approvals.",
        },
        {
          when: "Live days 1 to 30",
          title: "Launch and learn",
          body: "The campaign goes live and the monthly fee starts. We track inquiries, qualified bookings and attendance, and you see spend, bookings and attendance every Monday.",
        },
        {
          when: "Day 30",
          title: "Continue, adjust or stop",
          body: "We review the first month's numbers together and you decide whether to proceed before the second monthly management fee is charged.",
        },
        {
          when: "Live days 31 to 60",
          title: "Build on what works",
          body: "Refine the campaign, open the first travel-market windows against your calendar, and increase spend or add a channel only when we agree on it.",
        },
      ],
      assurance: {
        title: "First-month assurance",
        body: "Zero qualified attending households in the first 30 live days? We refund that month's $3,000 management fee and pause, provided the agreed advertising budget was funded and your presentation dates were available.",
      },
      definition: {
        title: "What counts",
        body: "A qualified attending household is one that lives in a market where you have a presentation scheduled in the campaign window, owns a timeshare or decides for the household that does, meets the screening answers your team can work with, booked a presentation, and attended. Each household counts once. The screening answers are agreed with your team before launch, so results are measured against a shared definition.",
      },
      after: "After the 60 days the program continues month to month with 30 days' notice. A performance arrangement is available once there are real numbers to base it on.",
    },
    afterAccept: {
      title: "Your next source of appointments starts here.",
      intro: "Approve the plan and request the agreement with the form. Sean sends the one-page agreement and the $1,500 starting invoice the same business day, and build starts the day it clears. To start, he will ask you for:",
      items: [
        "Your presentation calendar and venues for the next eight weeks, in Boston and in every market the team is traveling to.",
        "Logo and brand files, plus anything you already use: mailers, photos, and the questions your agents hear most.",
        "A copy of your current client agreement, so the video and the page describe the process exactly as it works.",
        "Your business name and address for the agreement, and the email for the invoice.",
      ],
    },
    accept: {
      buttonLabel: "Approve the plan and request the agreement",
      confirmationTitle: "Thank you, Erik. The agreement is on its way.",
      confirmationBody: "Sean will send the one-page agreement and the $1,500 starting invoice to the email you entered the same business day, and will call the number you gave to set the kickoff and collect the calendar.",
    },
    internalLabel: "Appointment Growth Program, CPN Boston",
  },
};

export function getProposal(slug: string | undefined): ProposalRecord | null {
  if (!slug) return null;
  return PROPOSALS[slug] ?? null;
}

/** True when the video link is a direct media file rather than a hosted player. */
export function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

/** Turns a share link into an embeddable player URL. Returns null for anything unrecognized. */
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
  } catch {
    return null;
  }
  return null;
}
