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
  whoDoesWhat: { title: string; /** Section headline. Defaults to the CPN wording when omitted. */ headline?: string; us: string[]; them: string[] };
  markets: {
    title: string;
    body: string;
    home: string;
    travelNote: string;
    scopeNote: string;
    /** Shows the example eight-week market calendar beside the text (home market plus travel windows). */
    showCalendar?: boolean;
    /** Shows an example text exchange beside the text instead of the calendar. */
    textPreview?: { caption: string; messages: { from: "agent" | "lead"; text: string }[]; note: string };
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
      showCalendar: true,
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
  keegan: {
    slug: "keegan",
    title: "Exclusive Lead Engine",
    headline: ["Your own exclusive leads.", "People who expect your call.", "Delivered into Cassi."],
    subtitle: "A managed lead system for Keegan: ads and an active social presence bring in drivers who want coverage, a page with your name on it qualifies and books them, and every lead lands in Cassi the moment it comes in. We run the marketing. You keep doing the part you're good at.",
    client: {
      company: "Keegan Sundberg",
      contact: "Keegan Sundberg",
      location: "San Diego, selling in the states you're licensed in",
    },
    preparedOn: "November 4, 2026",
    preparedBy: {
      name: "Sean Mayo",
      company: "Supreme Team Media",
      email: "supremeteammedia@gmail.com",
      site: "supremeteammedia.com",
    },
    videoUrl: "",
    pdfUrl: "",
    headlineFacts: [
      { label: "Exclusive", value: "Every lead is yours alone, never shared or resold" },
      { label: "Expected", value: "They know who's calling and why before you dial" },
      { label: "Owned", value: "Your pages, ad account, profiles and audience stay yours" },
    ],
    factsNote: "Built, run and improved for you by Supreme Team Media for flat fees, with no per-lead charges and no cut of your commissions.",
    journey: {
      title: "One connected path from a scroll to a booked call.",
      steps: [
        { label: "Attract", body: "Ads and weekly social content reach truckers and 1099 workers in the states you're licensed in." },
        { label: "Build trust", body: "They see a real, licensed agent with a name, a face and helpful content, not a faceless quote form." },
        { label: "Qualify and book", body: "A short page with your name on it asks the right questions, verifies the phone number and offers your calendar." },
        { label: "Deliver", body: "The lead lands in Cassi within seconds, and a text confirms your name, your photo and the number you'll call from." },
        { label: "Improve", body: "Each week's conversations and policies decide the next ads, the next posts and the next round of questions." },
      ],
    },
    opening: [
      "Keegan, thanks for walking me through how you work. Cassi works, you like it, and it stays. What you need is a better source of the people who land in it, and a reason for them to pick up when you call.",
      "Most vendor leads come from ads selling a money idea, so the person who fills out the form isn't expecting an insurance agent to call. This program flips that. The ads say plainly what this is, the page has your name on it, and the person knows you're calling before the phone rings. We build it, run it and improve it every week, and every lead belongs to you.",
    ],
    outcomes: [
      {
        label: "The immediate goal",
        title: "More real conversations from every dollar",
        body: "Fewer people who don't answer or don't remember asking, and more who pick up because they asked for you by name. Measured in conversations and issued policies, not in rows on a spreadsheet.",
      },
      {
        label: "The lasting advantage",
        title: "Your own lead source and your own audience",
        body: "Your ad account, your page, your social profiles and the audience they build stay yours. The same system can be pointed at a second niche, and later at the agents you bring onto your team.",
      },
    ],
    blocks: [
      {
        number: "01",
        title: "Ads that say what this is",
        body: "Facebook and Instagram campaigns aimed at truckers, owner-operators and company drivers who don't have coverage or a retirement plan through work. The ads are honest about the offer: life insurance and protection for drivers and their families, and a licensed agent named Keegan will call. Fewer curious clicks, more people who are ready for the conversation. We start with one niche, test several angles, and manage the budget you approve.",
        note: "Ads run only in the states where you're licensed, under the financial products category Meta requires for insurance, and use only language you and your carriers approve before anything goes live. No tax-free or be-your-own-bank hype, and no income claims.",
      },
      {
        number: "02",
        title: "A page with your name on it",
        body: "A short page built around you: your photo, your license, what the call covers and what happens next. It asks a few qualifying questions, verifies the phone number, records consent naming you, and offers your calendar. The thank-you screen and a confirmation text show the exact number you'll call from, with a save-my-contact button so your call doesn't get screened out. Every lead is exclusive to you and is sent into your Cassi account in real time, so your existing follow-up fires automatically.",
      },
      {
        number: "03",
        title: "A social presence that makes you real",
        body: "We set up your business profiles on Facebook, Instagram, TikTok and YouTube and run an active content campaign for drivers and 1099 workers: short, useful videos and posts about protecting their families and planning for the years after driving. When someone looks you up before answering, they find a real agent with real content. The people who watch your videos become a warm audience for the ads, your best posts become ad creative, and over time the profiles bring in inquiries of their own.",
        note: "We produce all of the content. You can appear when you want to, but nothing depends on you filming. Every post follows Family First Life's content guidance: education and serving families, never income talk.",
      },
      {
        number: "04",
        title: "Measured on conversations, not lead counts",
        body: "A weekly scoreboard follows each lead from inquiry to issued policy: leads, people reached, people who remembered asking, appointments, applications, issued policies, and cost per issued policy. You keep marking outcomes in Cassi the way you do now. We read them and use them to decide what runs next.",
      },
    ],
    monthly: [
      { value: "12+", label: "short videos and posts produced by STM each month" },
      { value: "4", label: "platforms where your profiles stay active" },
      { value: "3 to 4", label: "new ad variations tested each month" },
      { value: "Weekly", label: "scoreboard from first inquiry to issued policy" },
    ],
    growthLoop: {
      title: "The system does the routine work. We keep improving the results.",
      intro: "Your monthly fee pays for active marketing and content, not software access and a report. Every change is judged by conversations and issued policies, not clicks.",
      steps: [
        { title: "Test the message", body: "Compare ad angles and content to learn what brings in drivers who answer and qualify." },
        { title: "Follow the outcome", body: "Track each lead through reached, appointment, application and issued policy." },
        { title: "Refine the next cycle", body: "Use those results to improve the ads, the page questions and the content before spend goes up." },
      ],
    },
    whoDoesWhat: {
      title: "Who does what",
      headline: "We run the marketing. You run the calls.",
      us: [
        "Ad strategy, campaign management and all creative production, with no filming required from you",
        "Your lead page, phone verification, consent records, booking and the connection into Cassi",
        "Your social profiles, the weekly content campaign and the weekly scoreboard",
      ],
      them: [
        "Share your licensed states and send the ads through any approval your carriers or agency require",
        "Approve the advertising budget, paid directly to Meta",
        "Call, close, and mark outcomes in Cassi the way you already do",
      ],
    },
    markets: {
      title: "Your licensed states, starting with truckers",
      body: "You sell by phone, so the campaign follows your licenses, not a radius around San Diego. We open with truckers because they need coverage, they usually don't get it through work, and they're the leads that cost the most to buy from a vendor.",
      home: "Ads run only where you can write business.",
      travelNote: "Each state you add is a setting change, running from the same ads, page and content.",
      scopeNote: "Included scope: one niche campaign at a time. A second niche, such as contractors and tradesmen or the self-employed, is added once the first one's numbers are proven and we agree on it.",
      textPreview: {
        caption: "What a driver gets seconds after asking",
        messages: [
          { from: "agent", text: "Hi Mike, this is Keegan Sundberg, the licensed agent you asked to hear from about coverage for you and your family." },
          { from: "agent", text: "I'll call you from this number in the next few minutes. Tap the card below to save it so my call comes through." },
          { from: "lead", text: "Sounds good, I'm on a break now." },
        ],
        note: "Example only. The final wording is approved by you before launch.",
      },
    },
    pricing: {
      title: "Your investment",
      lines: [
        {
          label: "One-time foundation",
          amount: "$750",
          body: "Due to begin. Your lead page, phone verification and booking, the connection into Cassi, your business profiles on four platforms, and the launch ads and videos.",
        },
        {
          label: "Monthly management",
          amount: "$1,500 a month",
          body: "Begins the day the ads go live, not the day we sign. Ad management, weekly content on four platforms, new ad creative, upkeep of the page and the Cassi connection, and the weekly scoreboard.",
        },
        {
          label: "Advertising budget",
          amount: "$2,000 to $2,500 a month",
          body: "Suggested starting range, separate from our fees. You pay Meta directly, so every dollar is visible to you. Projected: about 45 to 80 exclusive leads a month at this range, based on 2026 Meta cost-per-lead data for IUL campaigns. Projected, not promised.",
        },
      ],
      plainRules: [
        "No per-lead charges.",
        "No cut of your commissions or overrides.",
        "Your ad account, page, profiles and lead records stay yours.",
      ],
      summary: "Completing both live pilot months comes to $7,750 to $8,750 in total, including the foundation and the suggested ad budget. You can stop at the day-30 review before a second management fee.",
    },
    pilot: {
      title: "How the pilot works",
      phases: [
        {
          when: "Before launch",
          title: "Build your foundation",
          body: "Confirm your licensed states and approved language. We build the page, booking, Cassi connection and social profiles, and produce the launch ads and first content for your approval. Target launch: within two weeks of receiving the inputs and approvals.",
        },
        {
          when: "Live days 1 to 30",
          title: "Launch and learn",
          body: "The ads go live and the monthly fee starts. Leads arrive in Cassi in real time, the content campaign runs every week, and you see the scoreboard every Monday.",
        },
        {
          when: "Day 30",
          title: "Continue, adjust or stop",
          body: "We review the first month's numbers together and you decide whether to continue before the second monthly management fee is charged.",
        },
        {
          when: "Live days 31 to 60",
          title: "Build on what works",
          body: "Keep the winning ads, cut the rest, and raise the budget or add a second niche only when the numbers support it and we agree on it.",
        },
      ],
      assurance: {
        title: "First-month assurance",
        body: "Fewer than 15 qualified leads delivered to Cassi in the first 30 live days? We refund that month's $1,500 management fee, provided at least $2,000 in ad budget was funded and the ads were approved to run.",
      },
      definition: {
        title: "What counts",
        body: "A qualified lead lives in a state where you're licensed, falls within the age range you write, asked to be contacted about coverage, passed phone verification, and gave consent naming you. Each person counts once. The qualifying questions are agreed with you before launch, so results are measured against a shared definition.",
      },
      after: "After the 60 days the program continues month to month with 30 days' notice. When you start bringing agents onto your team, the same system can send leads into each agent's Cassi account, quoted when you're ready.",
    },
    afterAccept: {
      title: "Your own lead source starts here.",
      intro: "Approve the plan and request the agreement with the form. Sean sends the one-page agreement and the $750 starting invoice the same business day, and the build starts the day it clears. To start, he will ask you for:",
      items: [
        "The states you're licensed in and the carriers you write with, plus any ad approval process your agency or carriers require.",
        "A professional photo of you, and any short clips you'd like to use (optional).",
        "Time for a short call to set up your Facebook business page and ad account in your name and connect the page to your Cassi account.",
        "Your name and address for the agreement, and the email for the invoice.",
      ],
    },
    accept: {
      buttonLabel: "Approve the plan and request the agreement",
      confirmationTitle: "Thank you, Keegan. The agreement is on its way.",
      confirmationBody: "Sean will send the one-page agreement and the $750 starting invoice to the email you entered the same business day, and will call the number you gave to set up the kickoff.",
    },
    internalLabel: "Exclusive Lead Engine, Keegan Sundberg",
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

/**
 * The HLS copy of a direct .mp4 (made with scripts/proposal-video-hls.sh), offered first so the
 * video plays in Safari and on iPhones: the site host answers byte-range requests with the whole
 * file, which Safari refuses for .mp4. Browsers without HLS skip it and play the .mp4; if the
 * playlist is missing, Safari falls through to the .mp4 as well.
 */
export function hlsFor(videoFile: string): string | null {
  return /\.mp4$/i.test(videoFile) ? videoFile.replace(/\.mp4$/i, "/index.m3u8") : null;
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
