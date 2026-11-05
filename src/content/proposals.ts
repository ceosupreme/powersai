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
    videoUrl: "",
    pdfUrl: "",
    headlineFacts: [
      { label: "More leads", value: "Lead sources you own: ads, a website and free tools under your name" },
      { label: "Warmer leads", value: "People who asked for you by name and expect your call" },
      { label: "More closed business", value: "Follow-up, booking and retention running inside Cassi" },
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
      title: "Four jobs, one system, inside the CRM you already use.",
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
        body: "Advertising under your name, a website on your own domain, free tools and guides people actually want, and new content published every day. Each one is a lead source that belongs to you and keeps working month after month, reaching working adults 30 to 70 with the income to fund a policy. For you that starts with truckers, then contractors and other 1099 earners.",
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
      intro: "These are the services you'd normally buy from four or five different vendors. Here they're one program, one team and one number.",
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
        { title: "Monthly reporting and review", body: "One scoreboard from lead to paid policy, by source, including the leads you still buy, reviewed together every month." },
      ],
    },
    monthly: [
      { value: "Daily", label: "new content published on your platforms" },
      { value: "2", label: "new guides every month" },
      { value: "1", label: "new free lead tool every month" },
      { value: "Monthly", label: "scoreboard review, the first at day 30" },
    ],
    growthLoop: {
      title: "After the build: produce, publish, run the ads, and tune it every month.",
      intro: "The first month builds your system. Every month after, we operate it. You're not paying for a folder of files; you're paying for a team running your marketing while you sell.",
      steps: [
        { title: "Produce and publish", body: "New content goes out every day across your platforms, plus two new guides and a new free tool each month, so your audience and your lead sources keep growing." },
        { title: "Run the ads", body: "Fresh ad creative every month, campaigns managed weekly, and creative on request when you need something for a group, an event or a referral partner." },
        { title: "Review the scoreboard", body: "Leads, pickups, appointments, applications and paid policies by source. We look at it together every month and decide what to push next." },
      ],
    },
    scoreboard: {
      title: "What we measure",
      stages: ["Leads", "Pickups", "Appointments", "Applications", "Paid policies"],
      note: "Tracked by source, including the leads you still buy, so you can see what each source actually produces.",
    },
    whoDoesWhat: {
      title: "Who does what",
      headline: "We run the marketing. You run the calls.",
      us: [
        "Strategy, advertising, content, video and creative, with no filming or writing required from you",
        "Your website, lead tools, guides, profiles and the follow-up sequences inside Cassi",
        "Compliance submissions, the scoreboard and the monthly review",
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
      scopeNote: "Included scope: one niche campaign at a time, with a second niche added when the first one's numbers say so. Vendor leads you keep buying are tracked on your scoreboard, but managing those orders and their replacement claims stays with you.",
      textPreview: {
        caption: "What a lead gets seconds after asking",
        messages: [
          { from: "agent", text: "Hi Mike, this is Keegan Sundberg, the licensed agent behind the Driver Protection Checkup you just finished." },
          { from: "agent", text: "Your results are in the link below. I'll call you from this number in the next few minutes, or grab a time that works for you: [booking link]" },
          { from: "lead", text: "Sounds good, I'm on a break now." },
        ],
        note: "Example only. Final wording is approved by you and your agency before launch.",
      },
    },
    pricing: {
      title: "Your investment",
      headline: "One program. One number. Advertising included.",
      lines: [
        {
          label: "The program",
          amount: "$5,000 a month",
          body: "Everything on this page: the build, the daily content, the ads and the ad spend, the tools, the follow-up and the monthly review. One number, no separate ad bill.",
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
      summary: "Month one is $5,000 in two payments. Every month after is $5,000, advertising included, for as long as the scoreboard earns it.",
    },
    pilot: {
      title: "The first 30 days",
      headline: "Built in month one. Running from month two.",
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
          title: "Scoreboard review",
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
        { q: "How much of my time does this take?", a: "About an hour at kickoff, one recorded call for your intro video, and a few approvals by text or email as the creative comes through. The monthly review is 30 minutes. Everything else is on us." },
        { q: "What about compliance?", a: "Everything we publish is educational: no illustrations, no projections, no income claims. We write to the insurance advertising rules, prepare each submission and coordinate the approvals through your agency. Final say stays with your agency and the carriers, which is how it should be." },
        { q: "Do I keep buying leads?", a: "Your call. Most agents keep buying while their own sources come up, then cut back as the scoreboard tells them to. Vendor leads go on the same scoreboard so you can compare source by source. Managing those vendor orders stays with you." },
        { q: "When do leads start?", a: "The first campaign goes live in weeks two to three, the day your agency approves it. Your website, tools and content are live by the end of month one, and the sources keep building from there. At day 30 we review the scoreboard together." },
        { q: "What if it doesn't work?", a: "You'll see it on the scoreboard before anyone has to guess. The program is month to month with 30 days' notice, and the website, content, tools, ad accounts and lead data are yours either way. Nothing we build leaves with us." },
        { q: "What happens when I add agents?", a: "The same system can feed each agent you bring on: their own page, their own leads landing in their Cassi account, and the same content and campaigns pointed at their territory. That gets scoped as an upgrade when you're ready, on the foundation you already own." },
      ],
    },
    afterAccept: {
      title: "Your own lead sources start here.",
      intro: "Approve the plan and request the agreement with the form. Sean sends the one-page agreement and the $2,500 kickoff invoice the same business day, and the build starts the day it clears. To start, he'll ask you for:",
      items: [
        "The states you're licensed in, and who approves advertising at your agency.",
        "Access to your Cassi account, so leads and follow-up run there (your upline can open it up if your account is restricted).",
        "A professional photo, and a short recorded call with us for your intro video.",
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
