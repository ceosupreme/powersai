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
  /** A YouTube, Loom or Vimeo share link. Empty string hides the video block. */
  videoUrl: string;
  /** Path to a downloadable PDF under /public, or empty to hide the button. */
  pdfUrl: string;
  /** Three short facts shown big at the top. */
  headlineFacts: { label: string; value: string }[];
  /** The opening note to the client, in the sender's words. */
  opening: string[];
  outcomes: { label: string; title: string; body: string }[];
  blocks: ProposalBlock[];
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
  /** Appears in the acceptance record so the owner alert reads clearly. */
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
    preparedOn: "October 31, 2026",
    preparedBy: {
      name: "Sean Mayo",
      company: "Supreme Team Media",
      email: "supremeteammedia@gmail.com",
      site: "supremeteammedia.com",
    },
    videoUrl: "",
    pdfUrl: "",
    headlineFacts: [
      { label: "One monthly fee", value: "$3,000 a month" },
      { label: "Judge it on results", value: "60-day pilot" },
      { label: "Nothing hidden", value: "No percentage, no per-lead charges" },
    ],
    opening: [
      "Erik, thanks for the time on Friday. You said you want more of the right people at your presentations, in Boston and wherever the team is presenting that week, and that you are open to video, social and ads if they produce.",
      "This is one program that covers it, with a clear division of work, a defined scope, and a pilot you can judge on results. The short version is on this page. The two-page version is attached for your team.",
    ],
    outcomes: [
      {
        label: "Now",
        title: "More qualified households in the room",
        body: "Timeshare owners booked, reminded and attending your presentations, in Boston and in each market you travel to, with the screening, scheduling and chasing handled.",
      },
      {
        label: "Lasting",
        title: "A channel you own",
        body: "An acquisition channel that can be pointed at a new city in a day. Your video, your pages, your ad and social accounts, and your lead records stay yours, so the foundation keeps working and can grow if the results justify it.",
      },
    ],
    blocks: [
      {
        number: "01",
        title: "The video, plus monthly clips",
        body: "One produced video that explains how the process works and invites owners to a presentation, shot once with you or one of your agents. Every ad and clip comes from that one shoot, and a defined set of short clips each month keeps the ads and the social channels fresh.",
      },
      {
        number: "02",
        title: "Campaign page, screening and booking",
        body: "One campaign page template with a city version for each market you present in. It carries the video, plain answers to the questions owners ask, and a short qualifier: where they live, which resort or developer, years owned, paid off or financed, annual fees, what they have tried, and what they want. A booking calendar shows the presentations and venues for that market, with a phone or video option for people who will not come to a group.",
      },
      {
        number: "03",
        title: "Advertising that follows your calendar",
        body: "The primary paid channel to start is Meta and Instagram, aimed at timeshare owners where your team will be, with retargeting of people who engaged. Google is added once eligibility is confirmed. You set the advertising budget and pay the platforms directly, so every dollar is visible to you, market by market.",
      },
      {
        number: "04",
        title: "Weekly content on channels in your name",
        body: "Social channels set up in your name and kept active with weekly content cut from the same shoot, so the people who look you up after a mailer or an ad find a business that is present and current.",
      },
      {
        number: "05",
        title: "Follow-up and attendance handled",
        body: "Everything after the click runs itself: confirmation, reminders, a courtesy call with a human option, rebooking for no-shows, and follow-up for the people who are interested but not ready. Your team never calls anyone to chase an appointment.",
      },
      {
        number: "06",
        title: "Managed and improved every month",
        body: "A dashboard you can open any time and a Monday report on bookings, attendance, and what is working, so budget decisions are made on numbers. The campaign is tuned against attendance, not clicks.",
        note: "Nothing in the video or the ads promises an exit, implies a government program or a connection to any resort, or pressures anyone with today-only language. The campaign invites owners to understand their options and book a conversation with your team.",
      },
    ],
    markets: {
      title: "Boston, and every market the team travels to",
      body: "The program follows your presentation calendar, not a radius. A mail drop for an event in another city has to be printed and in the mail weeks ahead. A campaign for that same event is a geography change and a venue line on the calendar, running from the same video and page.",
      home: "Boston runs continuously as the home market.",
      travelNote: "Each travel market gets its own campaign window that opens two to three weeks before your presentations there and closes the day after, aimed at owners who live where the team will be. The where-they-live answer on the page routes each person to the right calendar.",
      scopeNote: "Included scope: the home market plus up to three travel markets active at any one time. If your calendar runs hotter than that, we agree on the extra before adding it.",
    },
    pricing: {
      title: "What it costs",
      lines: [
        {
          label: "Foundation",
          amount: "$3,000",
          body: "Paid in two halves, half to start and half at launch. Covers the video production, the campaign page template with the Boston version, the booking calendar, the follow-up system and the dashboard.",
        },
        {
          label: "Program",
          amount: "$3,000 a month",
          body: "Starts the day the campaign goes live, not the day we sign. Covers the campaigns, the monthly clips, the weekly content, the follow-up and the Monday report.",
        },
        {
          label: "Advertising",
          amount: "You set it",
          body: "Paid by you directly to the platforms, so every dollar is visible to you, market by market.",
        },
      ],
      plainRules: [
        "No percentage of your sales.",
        "No per-lead charges.",
        "Your video, pages, accounts and lead records stay yours.",
      ],
    },
    pilot: {
      title: "How the pilot works",
      phases: [
        {
          when: "Days 1 to 10",
          title: "Build",
          body: "Campaign page template and the Boston version, qualifier, booking calendar on your presentations, confirmations and reminders, social channels, tracking and dashboard. The video is shot and cut in this window.",
        },
        {
          when: "Week 3",
          title: "Live",
          body: "The campaign goes live and the monthly fee starts. The first appointments can be on your calendar within three weeks of the start.",
        },
        {
          when: "Live weeks 2 to 8",
          title: "Optimize",
          body: "Tune against bookings and attendance, scale the budget on what is working, open the first travel-market windows against your calendar, add Google once eligibility is confirmed.",
        },
        {
          when: "Day 30",
          title: "Decision point",
          body: "You see the first month's numbers and decide: continue, adjust, or stop at the end of the 60 days.",
        },
      ],
      assurance: {
        title: "The assurance",
        body: "If the first live month produces zero qualified attending households while the campaign is funded and your presentation dates are available, the first month's program fee is refunded.",
      },
      definition: {
        title: "What counts",
        body: "A qualified attending household is one that lives in a market where you have a presentation scheduled in the campaign window, owns a timeshare or decides for the household that does, meets the screening answers your team can work with, booked a presentation, and attended. Each household counts once.",
      },
      after: "After the 60 days the program runs month to month. A performance arrangement is available once there are real numbers to base it on.",
    },
    afterAccept: {
      title: "What happens after you accept",
      intro: "You get the one-page agreement and the foundation invoice the same day. Build starts the day the first half clears. To start, I will ask you for:",
      items: [
        "Your presentation calendar and venues for the next eight weeks, in Boston and in every market the team is traveling to.",
        "Logo and brand files, and fifteen minutes with you or one of your agents on camera.",
        "A copy of your current client agreement, so the video and the page describe the process exactly as it works.",
        "Your business name and address for the agreement, and the email for the invoice.",
      ],
    },
    accept: {
      title: "Ready to start?",
      body: "Accept here and the agreement and invoice go out today. Questions first are welcome, by email or a quick call.",
      buttonLabel: "Accept and start",
      confirmationTitle: "Accepted. Thank you, Erik.",
      confirmationBody: "The one-page agreement and the foundation invoice are on their way to the email you entered, today. Sean will reach out at the number you gave to set the kickoff and collect the calendar.",
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
