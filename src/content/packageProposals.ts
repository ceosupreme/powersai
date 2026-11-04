/**
 * Package proposals: unlisted /proposal/:slug pages that offer a choice of
 * packages instead of one program. Same privacy rules as src/content/proposals.ts
 * (never prerendered, noindex, robots.txt disallows /proposal/).
 *
 * The page runs as a sales presentation: the promise and video, the opportunity,
 * the plan, the results, then the investment, the risk terms and the next step.
 * Each section has one job, and the deeper detail stays one tap away in
 * drop-downs. All copy lives here; the page only renders it.
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
  /** One value per package, in the same order as plans. */
  rows: { label: string; values: CompareCell[] }[];
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
  /**
   * Copy for the sections that frame the offer before the prices. The calendar, team and
   * monthly-improvement sections also show the matching explain items ("markets", "who-does-what",
   * "improve"), so their detail copy lives in one place.
   */
  story: {
    opportunity: { title: string; body: string; keep: { title: string; items: string[] }; add: { title: string; items: string[] } };
    calendar: { title: string };
    team: { title: string };
    results: { title: string; body: string; funnelTitle: string; funnel: { value: string; label: string }[] };
    risk: { title: string; body: string; tiles: { big: string; label: string }[] };
    improve: { title: string };
  };
  /** Two or three packages; the cards, targets and compare table size themselves to the count. */
  plans: PackagePlan[];
  journey: { title: string; body: string; steps: { title: string; body: string; detail: string }[] };
  /**
   * Sample campaign creative shown in phone frames. A sample with an empty src is skipped, and the
   * section hides until at least one has a file (a direct .mp4; a -poster.jpg and the HLS copy sit beside it).
   */
  samples: { eyebrow: string; title: string; body: string; items: { title: string; job: string; src: string }[] };
  compare: { title: string; body: string; groups: CompareGroup[]; footnote: string };
  explain: { title: string; body: string; items: ExplainItem[] };
  math: {
    title: string;
    summary: string;
    funnel: string;
    table: { columns: string[]; rows: { label: string; values: string[]; total?: boolean }[] };
    complete: string;
    definition: string;
    sales: string;
    /** Optional worked example under the funnel; omit to leave it out. */
    example?: string;
    exampleNote?: string;
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
    programName: "CPN Growth Proposal",
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
      body: "Both packages include everything in the proposal you already have. The Partnership adds answering on the mailer lines you connect, one CRM for the lead sources you choose, more campaigns and markets, and follow-up that turns more owners into clients.",
      footnote:
        "Both packages start with $1,500. The rest of the setup is due when the launch deliverables are ready, and the monthly fee starts the day your campaigns go live.",
    },
    story: {
      opportunity: {
        title: "Your team already sells. We bring more owners to the room.",
        body: "Your mail, phone rooms and vendors keep doing what they do. We add a new-owner engine built around your presentation calendar, and we take the answering, booking and follow-up off your team.",
        keep: {
          title: "What stays the same",
          items: [
            "Your mail drops and phone rooms",
            "Your current lead vendors, including your Facebook provider. We coordinate so we don't compete for the same owners.",
            "Your presentations and your sales process",
            "Your CRM, unless you choose to replace it",
          ],
        },
        add: {
          title: "What we add",
          items: [
            "New owners from campaigns in every market you visit",
            "Every inquiry we generate answered within a minute, day or night",
            "Owners screened and booked into your real sessions",
            "Reminders and rebooking that get more of them in the door",
            "A Command Center that counts every arrival by source",
          ],
        },
      },
      calendar: { title: "Campaigns that follow your calendar." },
      team: { title: "You present and close. We handle everything that gets owners there." },
      results: {
        title: "What this can mean for your room.",
        body: "Targets for the third live month, in more qualified households in your room every week.",
        funnelTitle: "Every 100 new inquiries, at the rates in our model",
        funnel: [
          { value: "100", label: "new inquiries" },
          { value: "65", label: "qualify" },
          { value: "33", label: "book a session" },
          { value: "24", label: "are in your room" },
        ],
      },
      risk: {
        title: "Start with $1,500. Decide at day 30.",
        body: "You see real results before the second monthly fee, and you see every dollar of ad spend.",
        tiles: [
          { big: "$1,500", label: "starts any package. The rest of the setup is due when launch is ready." },
          { big: "Day 30", label: "Continue, adjust or stop, before the second monthly fee." },
          { big: "Month 1", label: "That month's fee refunded if no qualified household attends in the first 30 live days." },
          { big: "0%", label: "of your sales, and no per-lead fees." },
          { big: "$0", label: "markup on your ad budget. You pay the platforms directly." },
          { big: "Yours", label: "Your leads, accounts, pages and finished creative stay with CPN." },
        ],
      },
      improve: { title: "Every month, we make it better." },
    },
    plans: [
      {
        id: "growth",
        name: "Appointment Growth Program",
        shortName: "Appointment Growth",
        tagline: "New owners in your room, with every inquiry answered, booked and tracked.",
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
          "A simple CRM for every household we bring in, shared with your team",
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
            lead: "A simple CRM for your team.",
            text: "Every household we bring in has a record your team can open, with its source, screening answers, booking, attendance and next step. It runs alongside whatever you use now.",
          },
          {
            lead: "You see all of it.",
            text: "Your CPN Command Center shows campaign households, presenter prep, upcoming sessions, arrivals at the door and what each source produced. Every Monday you see what happened and what we're improving.",
          },
        ],
        detailsNote: "Covers Boston plus up to three travel markets at a time.",
      },
      {
        id: "complete",
        name: "Growth & Conversion Partnership",
        shortName: "Partnership",
        tagline: "Your mailer lines answered, the lead sources you choose in one CRM, more campaigns, and follow-up that closes more.",
        recommended: true,
        target: {
          range: "25–33",
          label: "more qualified households in your room every week",
          lift: "Double or better",
          note: "Including 5–8 a week from leads you already have",
        },
        signedClients: "25–44 more signed clients a month",
        handled: "330–410 new inquiries a month answered and screened for you",
        monthly: "$5,000",
        foundation: "$3,000",
        balance: "$1,500",
        highlights: [
          "Everything in Appointment Growth",
          "Your mailer and campaign lines answered around the clock",
          "The lead sources you choose in one CRM, built around how you sell",
          "Up to five markets at once, with new campaigns tested every week",
          "Follow-up that turns more no-shows and undecided owners into signed clients",
        ],
        details: [
          {
            lead: "Your phones, answered.",
            text: "Calls to your mailer lines and our campaign numbers are answered around the clock by an assistant that handles routine questions, screens the owner and books the right session. Missed calls get a text back in seconds, and anything that needs a person goes to your team with the household's details attached.",
          },
          {
            lead: "Your lead sources in one operation.",
            text: "Mail responders, vendor leads, outside bookings and our campaign inquiries land in one household record with source history, assignments and clear next steps. It can replace your current CRM or run alongside it.",
          },
          {
            lead: "More owners coming in.",
            text: "Several campaign approaches run at once across up to five markets, including Boston: direct invitations, free owner guides, the ownership cost check and ongoing owner education. New campaigns are tested every week, spend moves to what produces tours, and your owner channels, guide library and monthly newsletter keep interest building between mail drops.",
          },
          {
            lead: "Follow-up that closes more.",
            text: "Unbooked owners, no-shows and undecided attendees get coordinated follow-up instead of sitting on separate lists. Reps get prep sheets on their phones before the presentation and a follow-up list after, and leadership sees attendance and sales by source, market and session.",
          },
        ],
        detailsNote: "Includes the whole-team CRM setup and migration of the lead sources you choose. Everything in Appointment Growth stays included.",
      },
    ],
    samples: {
      eyebrow: "Sample campaign creative",
      title: "What your owners would see.",
      body: "Three styles aimed at the same people: timeshare owners near your presentations. These are samples for your review. Nothing runs until you approve the message.",
      items: [
        { title: "Whiteboard explainer", job: "For owners who are still researching", src: "" },
        { title: "Cinematic", job: "The direct invitation to a presentation", src: "" },
        { title: "Animated", job: "Stops the scroll on social", src: "" },
      ],
    },
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
            "Owners get a confirmation, directions, a short guide to what they'll learn, reminders before the session and an easy confirm or reschedule link. No-shows are offered the next session, and owners who attend but don't sign get follow-up based on the next step they gave your team.",
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
      body: "Tap a package to see only what it includes, or compare both.",
      groups: [
        {
          title: "Bringing in new owners",
          rows: [
            { label: "Markets running at once", values: ["Boston + 3 travel markets", "Up to 5, including Boston"] },
            { label: "Campaign page, qualifier and booking for each market", values: ["yes", "yes"] },
            { label: "Ad platforms", values: ["Facebook and Instagram, Google once eligible", "Adds YouTube and wider search, video and social"] },
            { label: "Campaign testing", values: ["Monthly improvement", "Every week, spend moved to what works"] },
            { label: "Free owner's guide and 60-second cost check", values: ["Launch guide and cost check", "Plus a new guide every month"] },
            { label: "QR codes on your existing mailers", values: ["yes", "yes"] },
            { label: "Owner channels, newsletter and five-video course", values: ["no", "yes"] },
            { label: "Retargeting owners who looked but didn't book", values: ["no", "yes"] },
          ],
        },
        {
          title: "Answering, booking and show-up",
          rows: [
            { label: "Calls, texts and forms answered within a minute, day or night", values: ["Every campaign lead", "Your mailer lines and every source you choose"] },
            { label: "Confirmations, directions and reminders", values: ["Campaign bookings", "Every booking source you choose"] },
            { label: "No-show rebooking and follow-up for the undecided", values: ["Campaign leads", "Every source you choose"] },
            { label: "Missed-call text-back on your mailer lines", values: ["no", "yes"] },
            { label: "Follow-up for past responders who never booked", values: ["no", "yes"] },
          ],
        },
        {
          title: "Your team and your numbers",
          rows: [
            { label: "CPN Command Center with door check-in", values: ["yes", "yes"] },
            { label: "Monday report", values: ["Campaign results", "Whole team, plus vendor review"] },
            { label: "Cost per tour by source", values: ["Our campaigns", "Every source and vendor"] },
            { label: "CRM for your leads", values: ["Simple CRM for the households we bring in", "Your whole team, with migration"] },
            { label: "Vendor and phone-room leads in one place", values: ["no", "yes"] },
            { label: "Rep phone app with prep sheets and follow-up lists", values: ["no", "yes"] },
          ],
        },
        {
          title: "Creative we produce every month",
          rows: [
            { label: "Flagship videos", values: ["1", "2"] },
            { label: "Short videos", values: ["6–8", "12–16"] },
            { label: "New ad versions", values: ["2–3", "4–6"] },
            { label: "Social publishing", values: ["Weekly", "3–5 posts a week"] },
            { label: "Email", values: ["Guide delivery and follow-up", "Plus a monthly newsletter and follow-up across every source"] },
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
            "Campaign strategy, messaging and paid advertising built around your offer and your presentation calendar. Facebook and Instagram lead, aimed at timeshare owners where your team will be, with Google added once eligibility is confirmed. The Partnership adds YouTube and wider search, video and social campaigns, and up to five markets at once.",
            "Not every owner is ready to call. A free owner's guide and a 60-second ownership cost check give those owners a way to raise their hand, and they stay in follow-up until the next session near them.",
            "Your mailers ask owners to pick up the phone. A QR code on the same mailer adds a second way to respond: scan, check what the timeshare is costing them, read the free guide and choose a session. Owners who aren't ready to call still have a route into your room.",
            "The Partnership also builds an owner audience you keep: branded channels, a growing library of guides, a five-video owner course and a monthly newsletter that keep sending people between mail drops.",
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
            "Every booking gets a confirmation, directions, a short guide to what they'll learn and reminders before the session, with an easy confirm or reschedule link and a courtesy call with a human option.",
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
            "Appointment Growth covers the home market plus up to three travel markets at once. The Partnership covers up to five markets at once, including Boston.",
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
          title: "How the Partnership handles your phones and the leads you already have",
          paragraphs: [
            "Mail responders, phone-room bookings, vendor leads and our campaigns all land in one CRM built around how your team sells, so every owner gets the same organized follow-up instead of sitting on separate lists.",
            "Calls to your mailer lines are answered around the clock, the same way as the campaign numbers, and missed calls get a text back in seconds. Past responders who never booked are invited to the next session near them. Reminders cover every booking source you choose, and owners who attended but didn't sign get follow-up.",
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
        columns: ["Appointment Growth", "Partnership, new owners"],
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
        "The Partnership adds 20–32 more over four weeks from leads you already have: 8–18 past mail responders followed up into a tour, and 12–14 more arrivals from better attendance on bookings from your other sources. That's 100–132 in four weeks, or 25–33 a week.",
      definition: "One tour is one qualified household. A couple attending together counts once.",
      sales: "At your closing range of one in four to one in three, that's about 10–20 more signed clients every four weeks with Appointment Growth, and 25–44 with the Partnership.",
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
        "$1,500 starts any package. The rest of the setup is due when the launch deliverables are ready.",
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
          body: "Move up a package anytime. Setup you've already paid is credited toward the next package's setup for the same team.",
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
          a: "Yes. Calls to the campaign numbers are answered around the clock by an assistant that handles routine questions and books the right session. Texts and forms get a response within a minute. Anything that needs a person goes to your designated team with the details attached. In the Partnership, the same handling extends to your mailer lines and the other sources you choose.",
        },
        {
          q: "Do we have to replace our CRM?",
          a: "No. Appointment Growth gives your team a simple CRM for the households we bring in and runs alongside whatever you use now. The Partnership can replace your CRM or connect alongside it, whichever corporate approves.",
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
        "Both packages start with $1,500. Pick one and request the agreement. Sean sends the one-page agreement and the $1,500 starting invoice the same business day, and build starts the day it clears. To start, he'll ask for:",
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
    internalLabel: "CPN Appointment Growth System (two packages), CPN Boston",
  },
};

export function getPackageProposal(slug: string | undefined): PackageProposalRecord | null {
  if (!slug) return null;
  return PACKAGE_PROPOSALS[slug] ?? null;
}
