/**
 * Package proposals: unlisted /proposal/:slug pages that offer a choice of
 * packages instead of one program. Same privacy rules as src/content/proposals.ts
 * (never prerendered, noindex, robots.txt disallows /proposal/).
 *
 * The page shows the short version first (headline, package cards, prices) and
 * keeps every explanation one tap away in drop-downs, so a buyer can decide fast
 * or read everything. All copy lives here; the page only renders it.
 */

export type PlanId = "growth" | "expanded" | "complete";

export type PackagePlan = {
  id: PlanId;
  name: string;
  /** Short name for table headers and filter buttons. */
  shortName: string;
  tagline: string;
  recommended?: boolean;
  target: {
    /** The big number, e.g. "10–15". */
    range: string;
    label: string;
    /** Plain-English size of the increase, e.g. "About double today". */
    lift: string;
    note?: string;
  };
  signedClients: string;
  /** The time side of the result: inquiries we answer and screen so the team doesn't. */
  handled: string;
  monthly: string;
  foundation: string;
  /** Foundation balance due when the launch deliverables are ready. */
  balance: string;
  highlights: string[];
  /** What the package does for the buyer, shown in the card's drop-down. The itemized list lives in the compare table. */
  details: { lead: string; text: string }[];
  detailsNote?: string;
};

/** A compare-table cell: "yes", "no", or a short text value. */
export type CompareCell = "yes" | "no" | string;

export type CompareGroup = {
  title: string;
  rows: { label: string; values: [CompareCell, CompareCell, CompareCell] }[];
};

export type ExplainItem = {
  id: string;
  title: string;
  paragraphs: string[];
  /** Optional numbered steps shown after the paragraphs. */
  steps?: { title: string; body: string }[];
  /** Optional two-column lists (who does what). */
  columns?: { heading: string; items: string[] }[];
  /** Draws the market-window calendar figure. */
  calendar?: boolean;
};

export type PackageProposalRecord = {
  slug: string;
  programName: string;
  headline: string[];
  subtitle: string;
  /** One-line promise under the subtitle. */
  promise: string;
  /** A direct .mp4 file (with a matching -poster.jpg beside it) or a YouTube, Loom or Vimeo link. Empty string hides the video. */
  videoUrl: string;
  client: { company: string; contacts: string };
  preparedOn: string;
  preparedBy: { name: string; company: string; email: string; site: string };
  packagesIntro: { eyebrow: string; title: string; body: string; footnote: string };
  plans: [PackagePlan, PackagePlan, PackagePlan];
  journey: { title: string; body: string; steps: { title: string; body: string; detail: string }[] };
  compare: { title: string; body: string; groups: CompareGroup[]; footnote: string };
  explain: { title: string; body: string; items: ExplainItem[] };
  math: {
    title: string;
    summary: string;
    funnel: string;
    table: { columns: [string, string]; rows: { label: string; values: [string, string]; total?: boolean }[] };
    complete: string;
    definition: string;
    sales: string;
    example: string;
    exampleNote: string;
  };
  timeline: { title: string; steps: { when: string; title: string; body: string }[] };
  terms: { title: string; points: string[]; fineprint: { title: string; body: string }[] };
  national: { title: string; body: string; note: string };
  faq: { title: string; items: { q: string; a: string }[] };
  start: { title: string; intro: string; items: string[] };
  accept: {
    buttonLabel: string;
    confirmationTitle: string;
    /** "{package}" is replaced with the chosen package name. */
    confirmationBody: string;
  };
  /** Appears in the agreement-request record so the owner alert reads clearly. */
  internalLabel: string;
};

export const PACKAGE_PROPOSALS: Record<string, PackageProposalRecord> = {
  "cpn-growth": {
    slug: "cpn-growth",
    programName: "CPN Appointment Growth System",
    headline: ["More owners in your room every week.", "We handle the calls and booking."],
    subtitle:
      "We bring in new timeshare owners, answer around the clock, qualify and book the right households, and count everyone who walks in, so your team can focus on presentations and sales.",
    promise: "More sales opportunities. Less routine chasing. One clear view of the results.",
    videoUrl: "/proposal-media/cpn-growth.mp4",
    client: { company: "Consumer Protection Networks", contacts: "Erik Green and Michael Wixsom" },
    preparedOn: "November 4, 2026",
    preparedBy: {
      name: "Sean Mayo",
      company: "Supreme Team Media",
      email: "supremeteammedia@gmail.com",
      site: "supremeteammedia.com",
    },
    packagesIntro: {
      eyebrow: "Choose your package",
      title: "Pick how much growth we take on.",
      body: "Every package includes everything in the proposal you already have. Each step up adds more work that brings in owners, or takes more of the lead operation off your team.",
      footnote:
        "Every package starts with $1,500. The rest of the foundation is due when the launch deliverables are ready, and the monthly fee starts the day your campaigns go live.",
    },
    plans: [
      {
        id: "growth",
        name: "Appointment Growth Program",
        shortName: "Appointment Growth",
        tagline: "New owners in your room, with every inquiry answered and booked.",
        target: {
          range: "10–15",
          label: "more qualified households in your room every week",
          lift: "About 50% more than today",
          note: "All new owners we bring in",
        },
        signedClients: "10–20 more signed clients a month",
        handled: "165–245 new inquiries a month answered and screened for you",
        monthly: "$3,000",
        foundation: "$3,000",
        balance: "$1,500",
        highlights: [
          "Campaigns for Boston plus up to three travel markets at a time",
          "Every call, text and form we generate answered within a minute, day or night",
          "Screened and booked into your sessions, with reminders that get them there",
          "A Command Center that counts every new owner at your door",
        ],
        details: [
          {
            lead: "We bring new owners into the business.",
            text: "Campaigns combine original video and ads, free owner resources, social posting and paid advertising, run around Boston and your upcoming presentation markets instead of relying on one channel.",
          },
          {
            lead: "We answer and book them.",
            text: "An assistant answers the campaign numbers around the clock, and forms and texts get an immediate response. Suitable owners are screened and offered your available sessions. Personal questions go to your designated team with the household's details attached.",
          },
          {
            lead: "More of them make it to your presentation.",
            text: "Confirmations, directions, reminders and easy rescheduling keep the next step clear. No-shows are offered the next session, undecided attendees get follow-up while their rep gets a next-step task, and owners who aren't ready yet are invited back when your team returns to their area.",
          },
          {
            lead: "You see all of it.",
            text: "Your CPN Command Center shows campaign households, presenter prep, upcoming sessions, arrivals at the door and what each source produced. Every Monday you see what happened and what we're improving.",
          },
        ],
        detailsNote: "Covers Boston plus up to three travel markets at a time.",
      },
      {
        id: "expanded",
        name: "Growth + Expanded Marketing",
        shortName: "Expanded Marketing",
        tagline: "A bigger machine that brings in more owners every month, and costs less per tour as it grows.",
        recommended: true,
        target: {
          range: "20–25",
          label: "more qualified households in your room every week",
          lift: "About double today",
          note: "All new owners we bring in",
        },
        signedClients: "20–33 more signed clients a month",
        handled: "330–410 new inquiries a month answered and screened for you",
        monthly: "$5,000",
        foundation: "$3,000",
        balance: "$1,500",
        highlights: [
          "Everything in Appointment Growth",
          "Up to five markets running at once, on more platforms",
          "Your own owner audience that keeps sending people between mail drops",
          "New campaigns tested every week, with spend moved to what produces tours",
        ],
        details: [
          {
            lead: "More ways for owners to respond.",
            text: "Several campaign approaches run at once: direct presentation invitations, free owner guides, the ownership cost check and ongoing owner education. Owners ready to book and owners still researching each get a useful next step.",
          },
          {
            lead: "A bigger effort to bring them in.",
            text: "More campaigns running at once, more message testing and wider distribution, including YouTube and broader search, video and social. We review results every week, research what owners are asking every month, and keep refining around attended tours.",
          },
          {
            lead: "Owners keep coming between events.",
            text: "Your branded owner channels, guide library, five-video owner course and monthly newsletter build interest between mail drops and presentation dates.",
          },
          {
            lead: "More markets at once.",
            text: "Campaign windows, booking and follow-up across up to five active markets, including Boston, focused wherever your next sessions are.",
          },
        ],
        detailsNote:
          "The step up buys more work bringing owners in, more markets and more active management, not just more content. Everything in Appointment Growth stays included.",
      },
      {
        id: "complete",
        name: "Complete Growth & Lead System",
        shortName: "Complete System",
        tagline: "Every lead, every vendor and every rep in one system that follows up for you.",
        target: {
          range: "25–33",
          label: "more qualified households in your room every week",
          lift: "Double or better",
          note: "Including 5–8 a week from leads you already have",
        },
        signedClients: "25–44 more signed clients a month",
        handled: "330–410 new inquiries a month answered and screened for you",
        monthly: "$7,500",
        foundation: "$5,000",
        balance: "$3,500",
        highlights: [
          "Everything in Growth + Expanded Marketing",
          "A CRM built around how you sell, replacing yours or running alongside it",
          "Mail, phone rooms, vendors and campaigns followed up in one place",
          "Reps get prep sheets and follow-up lists on their phones",
        ],
        details: [
          {
            lead: "Every lead source in one operation.",
            text: "Mail responders, vendor leads, outside bookings and our campaign inquiries land in one household record with source history, assignments and clear next steps. It can replace your current CRM or run alongside it.",
          },
          {
            lead: "More follow-up off your team.",
            text: "Missed calls on your mailer lines get a text back in seconds. Reminders cover bookings from every source you choose. Unbooked owners, no-shows and undecided attendees get coordinated follow-up instead of sitting on separate lists.",
          },
          {
            lead: "Reps ready before and after the presentation.",
            text: "Prep sheets on their phones show who is coming and why. Assigned follow-up lists and recorded outcomes keep the next step visible.",
          },
          {
            lead: "The whole picture for leadership.",
            text: "Attendance and sales by source, market and session, with your source costs and vendor tour records next to door check-ins, so you can see what every source really costs per tour.",
          },
        ],
        detailsNote: "Includes the whole-team CRM setup and migration of the lead sources you choose.",
      },
    ],
    journey: {
      title: "How we get more owners into your room.",
      body: "Your team presents and closes. We handle the work that gets owners there: finding them, answering them, booking them and getting them to show up.",
      steps: [
        {
          title: "They find you",
          body: "Ads, videos, free guides and a QR code on your mailers reach owners where your team will be.",
          detail:
            "Each market gets its own campaign page, short qualifier and booking calendar. Facebook and Instagram lead, with Google added once eligible. Owners who aren't ready to call can scan the mailer, read the free guide or run the 60-second cost check, and still raise their hand.",
        },
        {
          title: "We answer in under a minute",
          body: "Every call, text and form we generate gets a response, day or night.",
          detail:
            "Calls to the campaign numbers are answered around the clock by an assistant that handles routine questions and books the right session. Texts and forms get an immediate response. Anything that needs a person goes to your designated team with the owner's details attached. Every inquiry is exclusive to CPN, never shared or resold.",
        },
        {
          title: "They book the right session",
          body: "Screened and booked into your real dates and venues.",
          detail:
            "The qualifier asks where they live, which resort or developer, years owned, paid off or financed, annual fees, and what they want. Booking is tied to your actual presentation dates and venues, with a phone or video option for owners who won't come to a group.",
        },
        {
          title: "More of them show up",
          body: "Confirmations, directions and reminders get them in the door.",
          detail:
            "Owners get a confirmation, directions, reminders before the session and an easy confirm or reschedule link. No-shows are offered the next session, and owners who attend but don't sign get follow-up based on the next step they gave your team.",
        },
        {
          title: "You see every one",
          body: "Each arrival is checked in and counted by source.",
          detail:
            "Door staff check owners in on a phone or tablet. The CPN Command Center shows households, sessions, arrivals and what each source produced, and every Monday you get a report on what worked and what we're improving.",
        },
      ],
    },
    compare: {
      title: "Compare everything, side by side.",
      body: "Tap a package to see only what it includes, or compare all three.",
      groups: [
        {
          title: "Bringing in new owners",
          rows: [
            { label: "Markets running at once", values: ["Boston + 3 travel markets", "Up to 5, including Boston", "Up to 5, including Boston"] },
            { label: "Campaign page, qualifier and booking for each market", values: ["yes", "yes", "yes"] },
            { label: "Ad platforms", values: ["Facebook and Instagram, Google once eligible", "Adds YouTube and wider search, video and social", "Same as Expanded Marketing"] },
            { label: "Campaign testing", values: ["Monthly improvement", "Every week, spend moved to what works", "Every week, spend moved to what works"] },
            { label: "Free owner's guide and 60-second cost check", values: ["Launch guide and cost check", "Plus a new guide every month", "Plus a new guide every month"] },
            { label: "QR codes on your existing mailers", values: ["yes", "yes", "yes"] },
            { label: "Owner channels, newsletter and five-video course", values: ["no", "yes", "yes"] },
            { label: "Retargeting owners who looked but didn't book", values: ["no", "yes", "yes"] },
          ],
        },
        {
          title: "Answering, booking and show-up",
          rows: [
            { label: "Calls, texts and forms answered within a minute, day or night", values: ["Every campaign lead", "Every campaign lead", "Every source you choose"] },
            { label: "Confirmations, directions and reminders", values: ["Campaign bookings", "Campaign bookings", "Every booking source you choose"] },
            { label: "No-show rebooking and follow-up for the undecided", values: ["Campaign leads", "Campaign leads", "Every source you choose"] },
            { label: "Missed-call text-back on your mailer lines", values: ["no", "no", "yes"] },
            { label: "Follow-up for past responders who never booked", values: ["no", "no", "yes"] },
          ],
        },
        {
          title: "Your team and your numbers",
          rows: [
            { label: "CPN Command Center with door check-in", values: ["yes", "yes", "yes"] },
            { label: "Monday report", values: ["Campaign results", "Results across every campaign", "Whole team, plus vendor review"] },
            { label: "Cost per tour by source", values: ["Our campaigns", "Our campaigns", "Every source and vendor"] },
            { label: "CRM for your leads", values: ["Our campaign leads", "Our campaign leads", "Your whole team, with migration"] },
            { label: "Vendor and phone-room leads in one place", values: ["no", "no", "yes"] },
            { label: "Rep phone app with prep sheets and follow-up lists", values: ["no", "no", "yes"] },
          ],
        },
        {
          title: "Creative we produce every month",
          rows: [
            { label: "Flagship videos", values: ["1", "2", "2"] },
            { label: "Short videos", values: ["6–8", "12–16", "12–16"] },
            { label: "New ad versions", values: ["2–3", "4–6", "4–6"] },
            { label: "Social publishing", values: ["Weekly", "3–5 posts a week", "3–5 posts a week"] },
            { label: "Email", values: ["Guide delivery and follow-up", "Plus a monthly newsletter", "Plus follow-up across every source"] },
          ],
        },
      ],
      footnote: "We produce all the video, ads and content. Your team can appear when it adds value, but nothing depends on filming.",
    },
    explain: {
      title: "How we do it.",
      body: "The full detail on every part of the program. Open whatever you want to read.",
      items: [
        {
          id: "new-owners",
          title: "How we bring in new owners",
          paragraphs: [
            "Campaign strategy, messaging and paid advertising built around your offer and your presentation calendar. Facebook and Instagram lead, aimed at timeshare owners where your team will be, with Google added once eligibility is confirmed. Growth + Expanded Marketing adds YouTube and wider search, video and social campaigns, and up to five markets at once.",
            "Not every owner is ready to call. A free owner's guide and a 60-second ownership cost check give those owners a way to raise their hand, and they stay in follow-up until the next session near them.",
            "Your mailers ask owners to pick up the phone. A QR code on the same mailer adds a second way to respond: scan, check what the timeshare is costing them, read the free guide and choose a session. Owners who aren't ready to call still have a route into your room.",
            "Expanded Marketing also builds an owner audience you keep: branded channels, a growing library of guides, a five-video owner course and a monthly newsletter that keep sending people between mail drops.",
          ],
        },
        {
          id: "answer-and-book",
          title: "How every inquiry gets answered and booked",
          paragraphs: [
            "Calls to the campaign numbers are answered around the clock. The assistant handles routine questions, screens the owner and books an available session. Texts and forms get an immediate response, so nobody waits until morning.",
            "The qualifier asks where they live, which resort or developer, years owned, paid off or financed, annual fees, and what they want. Booking is tied to your actual dates and venues, with a phone or video option for owners who won't come to a group. Contact details and screening answers travel with the appointment.",
            "Questions that need personal judgment go to your named contact with the owner's details attached. Every inquiry is exclusive to CPN, never shared or resold.",
          ],
        },
        {
          id: "show-up",
          title: "How more of them show up",
          paragraphs: [
            "Every booking gets a confirmation, directions and reminders before the session, with an easy confirm or reschedule link and a courtesy call with a human option.",
            "No-shows are offered the next session in their area. Owners who attend but don't sign get follow-up based on the next step they gave your team, so interest isn't lost between meetings.",
          ],
        },
        {
          id: "content",
          title: "How the videos and content are made",
          paragraphs: [
            "We write, produce and cut the flagship videos, the short videos, the ad versions and the social content, with professional voiceover, motion graphics and licensed footage. No monthly filming obligation: your team can appear when it adds value, but production does not depend on it.",
            "Nothing in the videos, ads or guides promises an exit, implies a government program or a connection to any resort, or pressures anyone with today-only language. Every message invites owners to understand their options and book a conversation with your team, and you approve it before it runs.",
          ],
        },
        {
          id: "markets",
          title: "Where it runs: Boston and your travel markets",
          paragraphs: [
            "The program follows your presentation calendar, not a radius. A mail drop for an event in another city has to be printed and mailed weeks ahead. A campaign for that same event is a change of location and a venue line on the calendar, running from the same videos and pages.",
            "Boston runs continuously as the home market. Each travel market gets its own campaign window that opens two to three weeks before your presentations there and closes the day after, aimed at owners who live where the team will be.",
            "Appointment Growth covers the home market plus up to three travel markets at once. Expanded Marketing and the Complete System cover up to five markets at once, including Boston.",
          ],
          calendar: true,
        },
        {
          id: "improve",
          title: "How the campaigns keep improving",
          paragraphs: [
            "Your monthly fee pays for active marketing management, not software access and a report. Every change is judged by attendance, not clicks, and you can open the Command Center any time between Monday reports.",
          ],
          steps: [
            { title: "Test the message", body: "Compare creative and campaign approaches to learn what attracts suitable owners in each market." },
            { title: "Follow the outcome", body: "Track inquiries, qualified bookings, attendance and, when you share them, the sales that came from them." },
            { title: "Refine the next cycle", body: "Use those results to improve the ads, the pages, the screening and the follow-up, and move spend to what produces tours." },
          ],
        },
        {
          id: "complete-system",
          title: "How the Complete System handles the leads you already have",
          paragraphs: [
            "Mail responders, phone-room bookings, vendor leads and our campaigns all land in one CRM built around how your team sells, so every owner gets the same organized follow-up instead of sitting on separate lists.",
            "Missed calls on your mailer lines get a text back in seconds. Past responders who never booked are invited to the next session near them. Reminders cover every booking source you choose, and owners who attended but didn't sign get follow-up.",
            "Reps see a prep sheet for every household before the presentation and their follow-up list on their phones. You see what every source and vendor really costs per tour. It can replace your current CRM or run alongside it, whichever corporate approves.",
          ],
        },
        {
          id: "who-does-what",
          title: "Who does what",
          paragraphs: ["We run the marketing and the follow-up. Your team runs the presentations and the sales conversations."],
          columns: [
            {
              heading: "Supreme Team Media",
              items: [
                "Strategy, advertising management and all creative production",
                "Campaign pages, screening, booking and the automated follow-up",
                "Social publishing, the Command Center, the Monday report and month-to-month improvement",
              ],
            },
            {
              heading: "Consumer Protection Networks",
              items: [
                "Share presentation dates, venues and screening priorities for each market",
                "Approve the message and the ad budget, paid directly to the platforms",
                "Handle personal questions, the presentations and the sales conversations",
              ],
            },
          ],
        },
      ],
    },
    math: {
      title: "See the math behind each target",
      summary:
        "Each target comes from one funnel: new inquiries × the share who qualify × the share who book × the share who attend. The table shows four weeks at the month-three pace, and counts each household once even when it comes through more than one source.",
      funnel: "65% qualify × 50% of those book × 75% of those attend = about 1 in 4 new inquiries in your room.",
      table: {
        columns: ["Appointment Growth", "Expanded Marketing and Complete System"],
        rows: [
          { label: "Ad budget, paid directly to the platforms", values: ["$5,000", "$8,000"] },
          { label: "Cost per inquiry from ads", values: ["$30–$40", "$30–$35"] },
          { label: "New inquiries from ads", values: ["125–166", "228–266"] },
          { label: "New inquiries from guides, mailer QR codes, channels and referrals", values: ["40–80", "100–145"] },
          { label: "All new inquiries, answered and screened for you", values: ["165–246", "328–411"], total: true },
          { label: "In your room, from ads", values: ["30–40", "56–65"] },
          { label: "In your room, from everything else", values: ["10–20", "24–35"] },
          { label: "New owners in your room, every four weeks", values: ["40–60", "80–100"], total: true },
          { label: "Per week", values: ["10–15", "20–25"], total: true },
        ],
      },
      complete:
        "The Complete System adds 20–32 more over four weeks from leads you already have: 8–18 past mail responders followed up into a tour, and 12–14 more arrivals from better attendance on bookings from your other sources. That's 100–132 in four weeks, or 25–33 a week.",
      definition: "One tour is one qualified household. A couple attending together counts once.",
      sales: "At your closing range of one in four to one in three, that's about 10–20, 20–33 and 25–44 more signed clients every four weeks.",
      example: "50 more tours × 30% closing × $20,000 average fee = $300,000 in gross signed fees over four weeks.",
      exampleNote: "That's 15 more clients from 50 more sales conversations.",
    },
    timeline: {
      title: "Build, launch, improve.",
      steps: [
        { when: "Weeks 1–2", title: "Build", body: "We set up the system, campaigns, first creative, owner's guide, cost check and Command Center." },
        { when: "Around week 3", title: "Launch Boston", body: "Campaigns go live once access and approvals are in place. The monthly fee starts at go-live." },
        { when: "Live day 30", title: "Your decision", body: "We review the numbers together. Continue, adjust or stop before the second monthly fee." },
        { when: "Live month 2", title: "Grow", body: "We improve the campaigns and open the travel-market windows on your calendar." },
        { when: "Live month 3", title: "Scale", body: "We expand whatever is producing tours and track the weekly numbers against the targets." },
      ],
    },
    terms: {
      title: "Included with every package.",
      points: [
        "$1,500 starts any package. The rest of the foundation is due when the launch deliverables are ready.",
        "A 60-day pilot with a real decision at day 30, before the second monthly fee. Then month to month with 30 days' notice.",
        "First-month assurance: if no qualified household attends in the first 30 live days, we refund that month's fee.",
        "No percentage of your sales and no per-lead fees.",
        "You control your ad budget and pay the platforms directly. We never mark it up or take a percentage.",
        "Texting, calling, email and AI usage are included.",
        "Your leads, accounts, pages and finished creative stay yours.",
        "Move up anytime, with setup you've already paid credited to the next package. A pay-per-tour option opens once real numbers are in.",
      ],
      fineprint: [
        {
          title: "First-month assurance",
          body: "If no qualified household booked or rebooked through our program attends in the first 30 live days, we refund that month's service fee and pause, provided the agreed ad budget was funded and your presentation dates were available.",
        },
        {
          title: "What counts as a qualified attending household",
          body: "A household that lives in a market where you have a presentation scheduled in the campaign window, owns a timeshare or decides for the household that does, meets the screening answers your team can work with, booked a presentation, and attended. Each household counts once. The screening answers are agreed with your team before launch, so results are measured against a shared definition.",
        },
        {
          title: "Usage",
          body: "Standard texting, calling, email and AI usage for your team's agreed operation is included. Any unusually high-volume campaign is agreed with you before it runs.",
        },
        {
          title: "Ownership",
          body: "Your business records, ad accounts, pages, channels and finished branded creative stay yours. Supreme Team Media keeps its reusable platform, templates and production methods.",
        },
        {
          title: "Upgrades",
          body: "Move up a package anytime. Setup you've already paid is credited toward the next package's foundation for the same team.",
        },
        {
          title: "After the pilot",
          body: "Month to month with 30 days' notice. A pay-per-tour arrangement is available once there are real numbers to base it on.",
        },
      ],
    },
    national: {
      title: "Built to extend across CPN.",
      body: "Any CPN team can start with any package at the same team pricing. Once three teams are live, a national dashboard and a shared content library are included: one view of every team, source, market and session, with every video and guide localized for each team's markets.",
      note: "Corporate case management, customer portals and document handling can be scoped separately later.",
    },
    faq: {
      title: "Common questions.",
      items: [
        {
          q: "Will you answer our phones?",
          a: "Yes. Calls to the campaign numbers are answered around the clock by an assistant that handles routine questions and books the right session. Texts and forms get a response within a minute. Anything that needs a person goes to your designated team with the details attached. In the Complete System, the same handling extends to your mailer lines and the other sources you choose.",
        },
        {
          q: "Do we have to replace our CRM?",
          a: "No. Appointment Growth and Expanded Marketing run alongside whatever you use now. The Complete System can replace your CRM or connect alongside it, whichever corporate approves.",
        },
        {
          q: "Does our team have to be on camera?",
          a: "No. We produce the videos, ads and content. Your team can appear when it adds value, but nothing depends on it.",
        },
        {
          q: "How does this fit with our mail and our current vendors?",
          a: "It runs alongside them. The QR code makes your existing mailers work harder, and the Command Center shows what every source produces per tour, so you can see where your money works best.",
        },
        {
          q: "What will the ads say?",
          a: "They invite owners to understand their options and book a conversation with your team. Nothing promises an exit, implies a government program or a resort connection, or pressures anyone with today-only language. You approve the message before anything runs.",
        },
        {
          q: "How fast can we start?",
          a: "Build starts the day the $1,500 clears, and we target the Boston launch around week three, once access and approvals are in place. The monthly fee starts at launch, not at signing.",
        },
        {
          q: "What if it doesn't work?",
          a: "You decide at day 30 whether to continue, adjust or stop, before the second monthly fee. And if no qualified household attends in the first 30 live days, we refund that month's fee.",
        },
        {
          q: "Who pays for advertising?",
          a: "You approve the budget and pay the platforms directly, so you see every dollar. We never mark it up or take a percentage.",
        },
      ],
    },
    start: {
      title: "Choose your starting package.",
      intro:
        "Every package starts with $1,500. Pick one and request the agreement. Sean sends the one-page agreement and the $1,500 starting invoice the same business day, and build starts the day it clears. To start, he'll ask for:",
      items: [
        "Your presentation calendar and venues for the next eight weeks, in Boston and in every market the team is traveling to.",
        "Logo and brand files, plus anything you already use: mailers, photos, and the questions your agents hear most.",
        "A copy of your current client agreement, so the videos and pages describe the process exactly as it works.",
        "Your business name and address for the agreement, and the email for the invoice.",
      ],
    },
    accept: {
      buttonLabel: "Choose this package & request the agreement",
      confirmationTitle: "Thank you. The agreement is on its way.",
      confirmationBody:
        "Sean will send the one-page agreement for the {package} and the $1,500 starting invoice to the email you entered the same business day, and will call the number you gave to set the kickoff and collect the calendar.",
    },
    internalLabel: "CPN Appointment Growth System (three packages), CPN Boston",
  },
};

export function getPackageProposal(slug: string | undefined): PackageProposalRecord | null {
  if (!slug) return null;
  return PACKAGE_PROPOSALS[slug] ?? null;
}
