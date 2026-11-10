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
  /** Browser tab title. Defaults to "<title> for <client>". */
  pageTitle?: string;
  /** Jump links under the hero facts. Defaults to the CPN set. */
  nav?: { href: string; label: string }[];
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
  /** Numbered program blocks. Leave empty to skip the section. */
  blocks: ProposalBlock[];
  /** What's included, as the service categories the client already prices in their head. Optional section after "How it works". */
  included?: { title: string; headline: string; intro: string; items: { title: string; body: string }[] };
  /** What the program produces each month, shown as four big figures. */
  monthly: { value: string; label: string }[];
  /** What the monthly fee pays for: the improvement loop. */
  growthLoop: { title: string; intro: string; steps: { title: string; body: string }[] };
  /** The stages the monthly scoreboard follows, shown as a strip inside the growth-loop section. Optional. */
  scoreboard?: { title: string; stages: string[]; note: string };
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
    /** Section headline. Defaults to the CPN wording when omitted. */
    headline?: string;
    lines: { label: string; amount: string; body: string }[];
    plainRules: string[];
    /** One line that adds the pieces up for the pilot. */
    summary: string;
  };
  pilot: {
    title: string;
    /** Section headline. Defaults to the CPN sixty-day wording when omitted. */
    headline?: string;
    /** Shows this section above the investment band instead of below it. */
    beforePricing?: boolean;
    phases: ProposalPhase[];
    /** A refund or similar promise. Omit when the offer makes none. */
    assurance?: { title: string; body: string };
    /** A checklist of what the first month builds, shown where the assurance box would be. */
    build?: { title: string; items: string[] };
    definition: { title: string; body: string };
    after: string;
  };
  /** Why the company, kept short: a headline, a paragraph or two, three proof tiles and a link. Optional section before the questions. */
  why?: { title: string; headline: string; body: string[]; proof: { value: string; label: string }[]; link?: { label: string; to: string } };
  /** The buying questions, answered in full on the page. Optional section before the close. */
  faq?: { title: string; headline: string; items: { q: string; a: string }[] };
  afterAccept: {
    title: string;
    intro: string;
    items: string[];
  };
  accept: {
    buttonLabel: string;
    confirmationTitle: string;
    confirmationBody: string;
    /** Label on the phone sticky bar. Defaults to "Request the agreement". */
    mobileLabel?: string;
    /**
     * Ways to start, such as the full program or a pilot. When set, the request form asks the
     * prospect to pick one (the first is selected by default) and the choice travels in the
     * agreement request. Leave it out when there is only one way to start.
     */
    options?: { label: string; detail: string }[];
    /** Question above the start choices. Defaults to "How do you want to start?". */
    optionsLabel?: string;
  };
  /** Appears in the agreement-request record so the owner alert reads clearly. */
  internalLabel: string;
};

/**
 * Retired proposal links that forward to the proposal that replaced them, so a
 * prospect who opens an older link always lands on the current proposal.
 */
export const PROPOSAL_REDIRECTS: Record<string, string> = {
  "cpn-boston": "cpn-growth",
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
    title: "Growth Program for Life Insurance Agents",
    pageTitle: "Keegan's Growth Program | Supreme Team Media",
    headline: ["More leads.", "Warmer leads.", "More closed business."],
    subtitle: "A done-for-you marketing operation that builds you lead sources you own and makes every lead easier to close. Built around you, the niches you already sell to, and the Cassi account you already run on.",
    client: {
      company: "Keegan Sundberg",
      contact: "Keegan Sundberg",
      location: "San Diego, selling in the states you're licensed in",
    },
    preparedOn: "November 5, 2026",
    preparedBy: {
      name: "Sean Mayo",
      company: "Supreme Team Media",
      email: "supremeteammedia@gmail.com",
      site: "supremeteammedia.com",
    },
    videoUrl: "/proposal-media/keegan.mp4",
    pdfUrl: "",
    headlineFacts: [
      { label: "More leads", value: "Lead sources you own: ads, a website and free tools under your name" },
      { label: "Warmer leads", value: "People who asked for you by name and expect your call" },
      { label: "More closed business", value: "Follow-up, booking and retention that run automatically" },
    ],
    factsNote: "Built, run and improved for you by Supreme Team Media for one flat monthly fee, advertising included. No per-lead charges and no cut of your commissions.",
    nav: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#whats-included", label: "What's included" },
      { href: "#the-pilot", label: "The first 30 days" },
      { href: "#what-it-costs", label: "Your investment" },
      { href: "#questions", label: "Questions" },
      { href: "#accept", label: "Approve the plan" },
    ],
    journey: {
      title: "Four jobs, one system, from first impression to paid policy.",
      steps: [
        { label: "Attract", body: "Ads and daily content under your name, where your buyers already spend their time. The campaigns say plainly what this is. One example: life insurance for people who work for themselves, from a licensed agent named Keegan." },
        { label: "Capture", body: "Your own website, with a Driver Protection Checkup and a 1099 Benefits Gap Checker, plus guides worth downloading. People trade their contact info for something useful, and they know it's you they're hearing from." },
        { label: "Warm up", body: "A text and an email from you go out right away, with your intro video, your photo and your booking link. By the time you call, they've seen your face and can pick a time." },
        { label: "Close and keep", body: "Appointment reminders, no-show rebooking, application follow-up, policy delivery and client check-ins run automatically in Cassi, so your phone time goes to people who are ready." },
      ],
    },
    opening: [
      "Keegan, thanks for Tuesday. You said the problem in one sentence: the leads don't pick up, or they don't remember asking. That isn't a dialing problem. A stranger's quiz ad brought them in, and nobody told them an agent named Keegan would call. This program fixes the source.",
      "Everything here runs under your name, on your own website and your own ad accounts, and lands in Cassi, which stays exactly as it is. Keep buying whatever vendor leads you want while your own sources come up. Nothing on this page needs your time beyond a few approvals. The whole program, the first 30 days and the price are below. Approve it at the bottom and we get started.",
    ],
    outcomes: [
      {
        label: "Result one",
        title: "More leads, from sources you own",
        body: "Advertising under your name, a website on your own domain, free tools and guides people actually want, and new content published every day. Each one is a lead source that belongs to you and keeps working month after month, reaching working adults 30 to 70 with the income to fund a policy. Every lead your campaigns produce comes straight to you and is never sold to another agent. For you that starts with truckers, then contractors and other 1099 earners.",
      },
      {
        label: "Result two",
        title: "Warmer leads, who know who's calling",
        body: "A vendor lead filled out somebody else's quiz. Your lead saw your name on the ad, used your tool on your site, got a text from you before your call, and expects to hear from you. That's the difference between “I never filled anything out” and “yeah, I was waiting for you.”",
      },
      {
        label: "Result three",
        title: "More closed business, from the leads you already have",
        body: "Booking, reminders and no-show recovery before the appointment. Short explainers that answer the common questions before you get on the phone, so the conversation starts further along. Application follow-up, policy delivery and check-in sequences after the sale, so clients stay on the books and send referrals. Plus a reactivation sequence for the leads already sitting in Cassi, so the money you already spent gets another shot.",
      },
    ],
    blocks: [],
    included: {
      title: "What's included",
      headline: "Every piece of the operation, handled by us.",
      intro: "These are the services you'd normally buy from four or five different vendors. Here they're one program and one team, with the advertising included.",
      items: [
        { title: "Social media setup and management", body: "Your profiles set up for business on the platforms your buyers use, and kept active with new content every day." },
        { title: "Content production", body: "Posts, short explainers and guides on protection, coverage and the questions your prospects ask, all written to the insurance advertising rules." },
        { title: "Video production", body: "Your intro video, educational clips and ad spots, produced by us. You appear when you want to; nothing waits on you filming." },
        { title: "Paid advertising", body: "Campaigns under your name aimed at your niches, written for approval, managed and tuned every week, with the ad spend included in your fee." },
        { title: "Website and lead tools", body: "Your own site on your own domain, with free tools like the Driver Protection Checkup and the 1099 Benefits Gap Checker, plus a new tool every month." },
        { title: "CRM automation and follow-up", body: "Leads land in Cassi the moment they come in, and the warm-up, booking, reminder, reactivation and retention sequences run from there." },
        { title: "Sales support", body: "Pre-call explainers, objection answers and application follow-up, so every conversation starts further along and fewer deals stall." },
        { title: "Brand and creative", body: "Your name, look and message done right once, then carried through every ad, page, post and video." },
        { title: "Compliance coordination", body: "Everything educational, with no projections, no illustrations and no income claims. We prepare each submission and coordinate approvals through your agency." },
        { title: "Monthly reporting and review", body: "One dashboard that follows every lead from the ad to the paid policy, by source, including the leads you still buy, reviewed together every month." },
      ],
    },
    monthly: [
      { value: "Daily", label: "new content published on your platforms" },
      { value: "2", label: "new guides every month" },
      { value: "1", label: "new free lead tool every month" },
      { value: "Monthly", label: "dashboard review, the first at day 30" },
    ],
    growthLoop: {
      title: "Produce, publish, run the ads, and tune it. Every month.",
      intro: "Month one builds your system and gets the first campaign live. From there, we operate it. You're not paying for a folder of files; you're paying for a team running your marketing while you sell.",
      steps: [
        { title: "Produce and publish", body: "New content goes out every day across your platforms, plus two new guides and a new free tool each month, so your audience and your lead sources keep growing." },
        { title: "Run the ads", body: "Fresh ad creative every month, campaigns managed weekly, and creative on request when you need something for a group, an event or a referral partner." },
        { title: "Review the dashboard", body: "Leads, pickups, appointments, applications and paid policies by source. We look at it together every month and decide what to push next." },
      ],
    },
    scoreboard: {
      title: "What your dashboard shows",
      stages: ["Leads", "Pickups", "Appointments", "Applications", "Paid policies"],
      note: "Tracked by source, including the leads you still buy, so you can see what each source actually produces.",
    },
    whoDoesWhat: {
      title: "Who does what",
      headline: "We run the marketing. You run the calls.",
      us: [
        "Strategy, advertising, content, video and creative, with no filming or writing required from you",
        "Your website, lead tools, guides, profiles and every follow-up sequence",
        "Compliance submissions, your dashboard and the monthly review",
      ],
      them: [
        "Tell us your licensed states, your niches and who approves ads at your agency",
        "Approve the creative and the campaigns before they run",
        "Call, close and mark outcomes in Cassi the way you already do",
      ],
    },
    markets: {
      title: "Your licensed states, starting with truckers.",
      body: "You sell by phone, so the campaigns follow your licenses, not a radius around San Diego. We open with truckers because you know that market and they're the leads that cost the most to buy. Contractors and other 1099 earners come next, on the same system.",
      home: "Ads run only where you can write business.",
      travelNote: "Each new state or niche is a settings change, running from the same website, tools and content.",
      scopeNote: "Included scope: one niche campaign at a time, with a second niche added when the first one's numbers say so. Vendor leads you keep buying are tracked on your dashboard, but managing those orders and their replacement claims stays with you.",
      textPreview: {
        caption: "What a lead gets seconds after asking",
        messages: [
          { from: "agent", text: "Hi Mike, this is Keegan Sundberg, the licensed agent behind the Driver Protection Checkup you just finished." },
          { from: "agent", text: "Your results are in the link below. I'll call you from this number in the next few minutes, or tap the link to grab a time that works for you." },
          { from: "lead", text: "Sounds good, I'm on a break now." },
        ],
        note: "Example only. Final wording is approved by you and your agency before launch.",
      },
    },
    pricing: {
      title: "Your investment",
      headline: "One monthly fee. Advertising included.",
      lines: [
        {
          label: "The program",
          amount: "$5,000 a month",
          body: "Everything on this page: the build, the daily content, the ads and the ad spend, the tools, the follow-up and the monthly review. No separate ad bill.",
        },
        {
          label: "Your first month",
          amount: "$2,500 + $2,500",
          body: "$2,500 at kickoff starts the build. $2,500 when your system is live: your landing page and first tool on your domain, leads reaching you in Cassi, tracking working.",
        },
        {
          label: "Every month after",
          amount: "Month to month",
          body: "After the day-30 review, the program continues month to month with 30 days' notice. No contract term and no setup fee hiding anywhere.",
        },
      ],
      plainRules: [
        "No per-lead charges and no cut of your commissions.",
        "No separate advertising bill.",
        "Hosting and the software behind your website and tools are included.",
        "Your website, content, tools, ad accounts and lead data are yours to keep.",
      ],
      summary: "Month one is $5,000 in two payments. Every month after is $5,000, advertising included, for as long as the results earn it.",
    },
    pilot: {
      title: "The first 30 days",
      headline: "Build and launch in month one. Improve every month after.",
      beforePricing: true,
      phases: [
        {
          when: "Week one",
          title: "Kickoff",
          body: "We collect your states, niches, photo and brand pieces, get into Cassi, and write the first campaign for your agency's approval.",
        },
        {
          when: "Weeks two to three",
          title: "First campaign live",
          body: "Your landing page and first free tool go live on your domain, your profiles go live for business, and the first campaign starts the day your agency approves it.",
        },
        {
          when: "By day 30",
          title: "Your system is live",
          body: "Website, both tools, both guides, your intro video and the starter creative kit are live, and new content is publishing every day.",
        },
        {
          when: "Day 30",
          title: "Dashboard review",
          body: "Leads, pickups, appointments, applications and paid policies, by source, including the leads you still buy. Then we continue month to month.",
        },
      ],
      build: {
        title: "Built in month one",
        items: [
          "Your brand: name, look and message, done right once",
          "Your website, on your own domain",
          "Two free lead tools: the Driver Protection Checkup and the 1099 Benefits Gap Checker",
          "Two guides worth downloading",
          "Your intro video",
          "A starter creative kit for ads, posts and profiles",
          "Your social profiles, set up for business",
          "Your first ad campaign, written to the insurance advertising rules and submitted through your agency for approval",
        ],
      },
      definition: {
        title: "What “live” means",
        body: "Your system is live when your landing page and first free tool are on your domain, leads are reaching you in Cassi, and tracking is working. That's when the second $2,500 is due. The first ad campaign launches as soon as your agency approves it, and that approval doesn't hold up the milestone.",
      },
      after: "From day 30 on, the program runs month to month with 30 days' notice, and everything we build stays yours.",
    },
    why: {
      title: "Why Supreme Team Media",
      headline: "Thirty years of marketing and lead systems, now pointed at your business.",
      body: [
        "We've spent 30 years building marketing and lead systems, and the systems we run today sit inside multi-million-dollar businesses, working every day without the owner touching them. That's the standard this program is built to: your marketing runs whether or not you're thinking about it.",
      ],
      proof: [
        { value: "30 years", label: "building marketing and lead systems" },
        { value: "Multi-million-dollar", label: "businesses running on our systems today" },
        { value: "One team", label: "for strategy, creative, ads, web, automation and reporting" },
      ],
      link: { label: "See the work", to: "/work" },
    },
    faq: {
      title: "Questions agents ask",
      headline: "Straight answers.",
      items: [
        { q: "Does this work with Cassi?", a: "Yes. Cassi stays your CRM, in your name and on your plan, exactly as it is. Leads from your ads, site and tools land in Cassi the moment they come in, the follow-up runs there, and your pipeline stays where you already work. If your account needs a setting opened up, your upline can grant it." },
        { q: "Do I have to be on camera?", a: "No. We produce everything. One short intro video with you in it helps leads recognize you before you call, and we make that easy: one recorded call with us, and we handle the rest. If you'd rather stay off camera, we build around your name and voice." },
        { q: "How much of my time does this take?", a: "About an hour at kickoff, a few approvals by text or email as the creative comes through, and a 30-minute review each month. One recorded call for your intro video if you want to be in it; if not, we build around your name and voice. Everything else is on us." },
        { q: "What about compliance?", a: "Everything we publish is educational: no illustrations, no projections, no income claims. We write to the insurance advertising rules, prepare each submission and coordinate the approvals through your agency. Final say stays with your agency and the carriers, which is how it should be." },
        { q: "Do I keep buying leads?", a: "Your call. Most agents keep buying while their own sources come up, then cut back as the dashboard tells them to. Vendor leads go on the same dashboard so you can compare source by source. Managing those vendor orders stays with you." },
        { q: "When do leads start?", a: "The first campaign goes live in weeks two to three, the day your agency approves it. Your website, tools and content are live by the end of month one, and the sources keep building from there. At day 30 we review the dashboard together." },
        { q: "What if it doesn't work?", a: "You'll see it on the dashboard before anyone has to guess. The program is month to month with 30 days' notice, and the website, content, tools, ad accounts and lead data are yours either way. Nothing we build leaves with us." },
        { q: "What happens when I add agents?", a: "The same system can feed each agent you bring on: their own page, their own leads landing in their Cassi account, and the same content and campaigns pointed at their territory. That gets scoped as an upgrade when you're ready, on the foundation you already own." },
      ],
    },
    afterAccept: {
      title: "Your own lead sources start here.",
      intro: "Approve the plan and request the agreement with the form. Sean sends the one-page agreement and the $2,500 kickoff invoice the same business day, and the build starts the day it clears. To start, he'll ask you for:",
      items: [
        "The states you're licensed in, and who approves advertising at your agency.",
        "Access to your Cassi account, so leads and follow-up run there (your upline can open it up if your account is restricted).",
        "A professional photo and any brand pieces you already have. A short recorded call for your intro video is optional.",
        "Your name and address for the agreement, and the email for the invoice.",
      ],
    },
    accept: {
      buttonLabel: "Approve the plan and request the agreement",
      confirmationTitle: "Thank you, Keegan. The agreement is on its way.",
      confirmationBody: "Sean will send the one-page agreement and the $2,500 kickoff invoice to the email you entered the same business day, and will call the number you gave to set the kickoff.",
      mobileLabel: "Approve the plan",
    },
    internalLabel: "Growth Program for Life Insurance Agents, Keegan Sundberg",
  },
  finca: {
    slug: "finca",
    title: "Finca Growth Program",
    pageTitle: "Finca Growth Program | Supreme Team Media",
    headline: ["More people find Finca.", "More of them come back.", "More per head."],
    subtitle: "A managed system that gets Finca found by the people nearby who still don't know it's there, brings guests back on purpose instead of by luck, and puts a method behind the check. Nothing trendy in it. Run by us, so it never lands on the GM's plate.",
    client: {
      company: "Finca",
      contact: "Keenan, General Manager",
      location: "North Park, San Diego",
    },
    preparedOn: "November 9, 2026",
    preparedBy: {
      name: "Sean Mayo",
      company: "Supreme Team Media",
      email: "supremeteammedia@gmail.com",
      site: "supremeteammedia.com",
    },
    videoUrl: "/proposal-media/finca.mp4",
    pdfUrl: "",
    headlineFacts: [
      { label: "Found", value: "Finca shows up wherever people decide where to go tonight: Google, Maps, AI assistants, Yelp, OpenTable, the block itself" },
      { label: "Back", value: "A guest list Finca owns, with follow-up that runs itself in Finca's voice" },
      { label: "Per head", value: "A system behind the $55 target: the right sell at the right moment, measured weekly" },
    ],
    factsNote: "Built, run and improved for Finca by Supreme Team Media for a flat monthly fee. No percentage of sales, no per-cover charges, and it works alongside what Finca already runs.",
    nav: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#whats-included", label: "What's included" },
      { href: "#the-pilot", label: "The first 30 days" },
      { href: "#what-it-costs", label: "Your investment" },
      { href: "#questions", label: "Questions" },
      { href: "#accept", label: "Approve the plan" },
    ],
    journey: {
      title: "One system, from the first search to the next visit.",
      steps: [
        { label: "Found", body: "Google, Maps, AI assistants, Yelp and OpenTable all show Finca the way it deserves to be seen: the Wine Spectator cover, Spanish wine, a menu search can read, the hours right, the reviews climbing." },
        { label: "Chosen", body: "Content that looks like the room: the bar, the bottle wall, the plates, the people. Produced by us, published where Finca's guests actually look." },
        { label: "Captured", body: "Every guest has a chance to join the list: at the reservation, at the bar, in the bottle shop, in the club. Simple, optional, and worth it to them." },
        { label: "Back", body: "A thank-you, a review request, a nudge when it's been a while, a birthday, Thursday happy hour, Oyster Sunday, a bottle they liked back in the shop. In Finca's voice, a few times a year, never a robot." },
        { label: "Measured", body: "One weekly scorecard: sales, guests, labor, operations. What's off gets flagged every morning and assigned. Owners see it monthly." },
      ],
    },
    opening: [
      "Keenan, good meeting you Thursday. This is the plan. It's written so you can forward it as it is.",
      "Finca has the hard part done. The food, the wine, the room and the service are there, and a Wine Spectator cover says so. What's missing is reach: too many people within a mile of Grim and North Park Way still don't know Finca exists. From the outside, here's what we saw. Finca sits at 178 Google reviews at a 4.3, while The Rose in South Park sits at 538 at a 4.6, and Google weighs exactly that when it decides who to show. The menu on the site is a PDF search can't read, and the wine club and the party booking live on two other web addresses, so searches that should land on Finca don't.",
      "This program fixes reach without touching the identity. Nothing trendy, no gimmicks, no stunts. It makes Finca easy to find, easy to come back to and easy to spend a little more at, and we run it so it never depends on anyone at Finca having spare hours. The whole plan, the first 30 days and the price are below.",
    ],
    outcomes: [
      {
        label: "Result one",
        title: "Found, by the people who are already looking",
        body: "When someone in North Park asks Google, Maps, Yelp or ChatGPT where to get a glass of wine tonight, the answer should be Finca. We rebuild the Google Business Profile, make the menu, the wine list, the club and the party page readable by search, put the Wine Spectator story and Spanish wine where those searches land, and run a review engine that moves the count toward where the reputation already is. This is the part of marketing that is never trendy and never stops working.",
      },
      {
        label: "Result two",
        title: "Back, on purpose instead of by luck",
        body: "A Friday shouldn't depend on who happens to walk by. Every guest gets an easy, optional way onto Finca's own list: at the reservation, at the bar, in the shop, in the club. Then the follow-up runs by itself: a thank-you after a visit with a review request, a note when it's been a while, a birthday or anniversary, Thursday all-day happy hour, Oyster Sunday, a bottle they liked back in the shop, the club. Finca's voice, a few times a year, with a real person one reply away. Weeknights fill from a list Finca owns, not from a platform Finca rents.",
      },
      {
        label: "Result three",
        title: "More per head, with a method behind it",
        body: "Finca has already moved the check into the fifties. Getting to $55 is a system, not a speech: the two lines that matter on a pre-shift card, the bottle-to-go close at the shelf while the table is still happy, the club offered at the right moment, and the menu engineered from Toast's own numbers so the dishes that should attach to every order do. At the $55 target, a 200-cover night is $1,000 more than a $50 night, and this program costs less than three of those nights a month. Projected, and measured on the scorecard from week one.",
      },
    ],
    blocks: [],
    included: {
      title: "What's included",
      headline: "Every piece, handled by us.",
      intro: "The parts of marketing that keep working whether or not anyone posted that day, run as one program by one team, alongside what Finca already does.",
      items: [
        { title: "Local search and maps", body: "Google Business Profile rebuilt and managed, menu, wine list, club and party pages readable by search, Yelp and OpenTable aligned, and Finca pitched to the best-of lists and set up for the AI answers people now use to pick a spot." },
        { title: "Review engine", body: "A review request after each captured visit, every review answered in Finca's voice within a day, and the count climbing toward the reputation Finca already has." },
        { title: "Guest list and follow-up", body: "Capture at the reservation, the bar, the shop and the club. Follow-up, lapsed-guest nudges, birthdays, happy hour, Oyster Sunday, club and retail offers, all automatic, all approved by Finca first." },
        { title: "Content and video", body: "Weekly photo and short video content that looks like the room, produced by us, fed to the social posting Finca already does and to Google, Yelp and OpenTable. No one on the team has to film anything." },
        { title: "Private events and holidays", body: "A party page people can find, every inquiry answered within minutes with a human following, and the holiday calendar worked from now through December." },
        { title: "Per-head program", body: "Pre-shift sell cards, the bottle-to-go close, the club offer, and menu engineering from Toast data. Short, practical, and run with the GM, not around him." },
        { title: "Bottle shop and wine club", body: "Treated as their own businesses: findable online, offered at the table, and worked through the list." },
        { title: "Scorecard and morning flags", body: "Sales, guests, labor and operations scored weekly, what's off flagged each morning and assigned, and a monthly owner report. Toast and OpenTable stay as they are; we read from them." },
        { title: "Monthly review", body: "One 30-minute owner review a month: what moved, what's next." },
      ],
    },
    monthly: [
      { value: "Daily", label: "what's off, flagged each morning and assigned" },
      { value: "Weekly", label: "the scorecard across sales, guests, labor and operations" },
      { value: "Weekly", label: "new photo and video content produced by us" },
      { value: "Monthly", label: "the 30-minute owner review" },
    ],
    growthLoop: {
      title: "The system does the routine work. We keep improving the results.",
      intro: "Your monthly fee pays for a team running Finca's reach and its guest list every week, not for software and a report. Every change is judged on covers, the list and the check, not on likes.",
      steps: [
        { title: "Measure", body: "The scorecard reads from Toast and OpenTable every week." },
        { title: "Fix what's off", body: "Every flag becomes a task with a name on it." },
        { title: "Push what works", body: "The content, the offers and the search placement that moved the numbers get more of the effort." },
      ],
    },
    scoreboard: {
      title: "What we measure",
      stages: ["Found", "Visited", "On the list", "Came back", "Per head"],
      note: "Tracked from Google, OpenTable and Toast, so the owners see one set of numbers.",
    },
    whoDoesWhat: {
      title: "Who does what",
      headline: "We run the reach. Finca runs the room.",
      us: [
        "Strategy, local search, content and video, with no filming or posting required from the team",
        "The guest list, the follow-up, the review engine and the party inquiries",
        "The scorecard, the morning flags and the monthly owner review",
      ],
      them: [
        "Approve the message and the creative before anything goes out",
        "Let the floor use the guest capture and the two sell lines at pre-shift",
        "Fifteen minutes a week with Keenan",
      ],
    },
    markets: {
      title: "North Park first. Then the rest of San Diego.",
      body: "Finca's guests live, work and drink within a few miles of Grim and North Park Way, so everything starts there: the people walking University who've never turned the corner, the buildings on the block, the regulars' friends. Once the neighborhood knows, the same system reaches the rest of the city, because the Wine Spectator story, Spanish wine, date night and the bottle shop are things people search for from La Jolla to Chula Vista.",
      home: "North Park runs continuously.",
      travelNote: "Citywide reach comes through search, AI answers, press and the guest list, never through stunts.",
      scopeNote: "Included scope: one venue, built to add a second location if Finca ever opens one.",
      textPreview: {
        caption: "What a guest gets the day after a visit",
        messages: [
          { from: "agent", text: "Hi Jen, it's Finca. Thanks for coming in last night. If you've got 30 seconds, a Google review helps a small place more than you'd think." },
          { from: "lead", text: "Done. The lamb was unreal." },
          { from: "agent", text: "That's Joe's. Thursday is all-day happy hour if you want a lighter night." },
        ],
        note: "Example only. Every message is approved by Finca before it goes out, and nothing a guest sees sounds like a robot.",
      },
    },
    pricing: {
      title: "Your investment",
      headline: "One program. Flat fees. Nothing trendy in it.",
      lines: [
        {
          label: "One-time foundation",
          amount: "$1,500",
          body: "$750 to begin and $750 when the system is live. The Missed Money Checkup, the Google rebuild, the guest capture, the review engine, the first content set and the scorecard setup.",
        },
        {
          label: "Monthly program",
          amount: "$2,500 a month",
          body: "Begins the day the system is live, not the day we sign. Search, content, the list and follow-up, the per-head program, the scorecard and the monthly review.",
        },
        {
          label: "Or start with a 30-day pilot",
          amount: "$500",
          body: "Guest capture at the host stand, the bar and the shop, a review request after every captured visit, and a day-30 count of guests added and reviews in. Move to the full program and the $500 comes off the foundation.",
        },
      ],
      plainRules: [
        "No percentage of sales and no per-cover charges.",
        "No ad spend required. If we ever add ads, Finca pays the platform directly.",
        "Works alongside the social posting Finca already does.",
        "Toast and OpenTable stay exactly as they are.",
        "Finca's guest list, content, profiles and data stay Finca's.",
      ],
      summary: "Month one is $1,500 in two payments. Every month after is $2,500 from the day the system is live, month to month with 30 days' notice. Or prove it first with the $500 pilot, credited to the foundation when Finca moves ahead.",
    },
    pilot: {
      title: "The first 30 days",
      headline: "Build and launch in month one. Improve every month after.",
      beforePricing: true,
      phases: [
        {
          when: "Week one",
          title: "Kickoff and checkup",
          body: "We deliver the Missed Money Checkup on Finca, rebuild the Google Business Profile, turn on guest capture at the host stand, the bar and the shop, and switch on the review engine.",
        },
        {
          when: "Weeks two to three",
          title: "The list starts working",
          body: "The first content set goes live. Follow-up, review requests, lapsed-guest nudges and the Thursday and Sunday reminders run from the list. Menu, wine list, club and party pages become readable by search. Pre-shift cards go to the floor.",
        },
        {
          when: "By day 30",
          title: "The system is live",
          body: "Scorecard running from Toast and OpenTable, morning flags going to the GM, the party page live, and the first owner report delivered.",
        },
        {
          when: "Day 30",
          title: "Owner review",
          body: "Found, visited, on the list, came back, per head. Then month to month.",
        },
      ],
      build: {
        title: "Built in month one",
        items: [
          "The Missed Money Checkup",
          "Google Business Profile rebuilt, Yelp and OpenTable aligned",
          "Menu, wine list, club and party pages search can read",
          "Guest capture at the host stand, the bar, the shop and the club",
          "The guest journey: thank-you, review request, lapse nudge, birthdays, happy hour, Oyster Sunday, club and retail offers",
          "The review engine",
          "The first photo and video content set",
          "Pre-shift sell cards and the bottle-to-go close",
          "The weekly scorecard and morning flags",
        ],
      },
      definition: {
        title: "What “live” means",
        body: "The system is live when the guest list is capturing, the review engine and the follow-up are running, the Google profile is rebuilt, and the scorecard is reading from Toast and OpenTable. That's when the second $750 is due.",
      },
      after: "From day 30 on, the program runs month to month with 30 days' notice. Everything we build stays Finca's.",
    },
    why: {
      title: "Why Supreme Team Media",
      headline: "We built and ran the operating system behind an eight-venue San Diego group.",
      body: [
        "BarPulse, our bar and restaurant operating system, scores every venue every week on revenue, guest experience, labor and operations, flags what's off each morning and turns each flag into a task someone owns. It plugs into Toast and scheduling and was built for and ran inside an eight-venue San Diego hospitality group. The scorecard in this program is the same one. On top of that sits thirty years of marketing and design, which is the part that keeps Finca looking like Finca.",
      ],
      proof: [
        { value: "8 venues", label: "one San Diego hospitality group, run on our operating system" },
        { value: "Toast", label: "connected read-only, nothing replaced" },
        { value: "30 years", label: "marketing and design" },
      ],
      link: { label: "See the work", to: "/work" },
    },
    faq: {
      title: "Questions owners ask",
      headline: "Straight answers.",
      items: [
        { q: "We already have someone posting and a company doing marketing. Does this replace them?", a: "No. This runs alongside. The posting keeps going; we feed it better material and coordinate so nothing doubles up. What this adds is the part nobody is doing: being found locally, the guest list, the review engine, the per-head program and the scorecard. If you ever decide to consolidate, the scorecard will tell you what's earning its keep." },
        { q: "Is this going to make Finca look trendy?", a: "No. Nothing here is a stunt or a promotion built around what's trending. The system works behind the scenes: search, maps, the list, the reviews, the scorecard. The content looks like the room. The only thing guests notice is that Finca is easier to find and remembers them." },
        { q: "Will guests get spammed by a robot?", a: "No. A guest hears from Finca a few times a year, in Finca's voice, with a real person one reply away, and every message is approved by Finca before it runs." },
        { q: "What does Keenan have to do?", a: "About fifteen minutes a week, mostly approvals by text, plus the morning flags that make his day shorter, not longer. Everything else is on us." },
        { q: "What about private parties and holidays?", a: "Part of the program. A party page people can find, every inquiry answered within minutes with a human following, and the holiday calendar worked from now through December." },
        { q: "Do we have to change Toast or OpenTable?", a: "No. Both stay exactly as they are. We read from them; we don't replace them." },
        { q: "What if it doesn't work?", a: "You'll see it on the scorecard before anyone has to guess. Month to month with 30 days' notice, and the guest list, content, profiles and data are Finca's either way." },
        { q: "Can we start smaller?", a: "Yes. The 30-day pilot is $500, credited to the foundation if Finca moves ahead. Details are under Your investment." },
        { q: "Can you prove it?", a: "The scorecard in this program ran across an eight-venue San Diego group, and Finca's own numbers are on it from week one. You'll be judging real covers, a real list and a real check, not a slideshow." },
      ],
    },
    afterAccept: {
      title: "Finca's reach starts here.",
      intro: "Pick the full program or the pilot and request the agreement with the form. Sean sends the one-page agreement and the first invoice ($750 for the program, $500 for the pilot) the same business day, and the build starts the day it clears. To start, he'll ask for:",
      items: [
        "Logo, brand files, and the current menu and wine list as files.",
        "Access to the Google Business Profile, and read-only reporting access to Toast and OpenTable.",
        "Who posts to social today, so we coordinate and nothing doubles up.",
        "The business name and address for the agreement, and the email for the invoice.",
      ],
    },
    accept: {
      buttonLabel: "Approve the plan and request the agreement",
      confirmationTitle: "Thank you. The agreement is on its way.",
      confirmationBody: "Sean will send the one-page agreement and the first invoice to the email you entered the same business day, and will call the number you gave to set the kickoff.",
      mobileLabel: "Approve the plan",
      options: [
        { label: "The full program", detail: "$1,500 foundation in two payments, then $2,500 a month from the day it's live" },
        { label: "The 30-day pilot", detail: "$500, credited to the foundation if Finca moves ahead" },
      ],
    },
    internalLabel: "Finca Growth Program, Finca North Park",
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
