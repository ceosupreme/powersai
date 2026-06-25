export interface HelpArticle {
  slug: string;
  title: string;
  tags: string[];
  summary: string;
  sections: { heading: string; body: string }[];
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "concepts-overview",
    title: "How this OS fits together",
    tags: ["overview", "concepts", "scores", "project", "vertical", "fulfillment", "approval"],
    summary: "The big-picture map: projects, the two scores, the fulfillment factory, the approval gate.",
    sections: [
      {
        heading: "Projects are the unit of work",
        body: "Almost every page is scoped to the project you've selected in Portfolio. Switch projects and the whole app re-points at that project's CRM, brand, content, revenue, insights, automations, and scores. A few things are account-wide (Affiliate Programs, Products, Permissions, Backup) — those don't change when you switch projects. See 'Account-wide vs project-scoped'.",
      },
      {
        heading: "Project type = vertical",
        body: "Each project has a type (e.g. home services, content channel, client venue). The type carries a CONFIG TEMPLATE: which pillars apply, which leak vectors to watch, and which questions the Lead Qualifier asks. Adding a new vertical means configuring a new type — no code change required.",
      },
      {
        heading: "The two scores",
        body: "Pillar Score comes from the Weekly Review (you grade each pillar; it rolls up). It answers 'how are we doing right now?'. Growth Score comes from the Growth Audit (scheduled findings + opportunities). It answers 'where can we grow?'. They're separate on purpose — operations vs growth.",
      },
      {
        heading: "The fulfillment factory (end to end)",
        body: "A lead hits the Lead Qualifier → it lands in Inbound Leads → you promote it into a CRM company + deal → on close-won you graduate it to a project → you apply an Automation Bundle → AI drafts customer messages into the Automation Inbox → you approve them → the weekly Recovery Report shows what was recovered. The 'Fulfillment flow' article walks each step.",
      },
      {
        heading: "The approval gate",
        body: "Nothing sends to a real customer without operator approval. Every AI-drafted message — follow-ups, reactivation, review requests — pauses in the Automation Inbox. You approve, edit, or reject. That's the QA surface for the whole automation system.",
      },
    ],
  },
  {
    slug: "project-types-verticals",
    title: "Project types & verticals",
    tags: ["projects", "types", "verticals", "config", "template"],
    summary: "A project's type drives its pillars, leak vectors, and qualifier questions — config, not code.",
    sections: [
      {
        heading: "What a project type is",
        body: "A row in project_types. Each one has a template: a set of pillars, leak vectors, and qualifier fields. Pick a type when you create or edit a project.",
      },
      {
        heading: "Pillars, leak vectors, qualifier fields",
        body: "Pillars: what the Weekly Review grades. Leak vectors: where revenue/opportunities leak (missed calls, unsold estimates, etc.) — surfaced in Growth Audit. Qualifier fields: the questions the Lead Qualifier asks inbound leads.",
      },
      {
        heading: "Templates and per-project overrides",
        body: "By default a project inherits its type's template. If you set per-project overrides (Edit Project → Pillars / Leak Vectors / Qualifier overrides), those REPLACE the template for that project. No overrides = use the template.",
      },
      {
        heading: "Adding a new vertical",
        body: "Add a row to project_types, then seed its pillars/leak vectors/qualifier fields in Settings. Any project assigned to that type instantly uses the new config — including the public qualifier page.",
      },
    ],
  },
  {
    slug: "config-editor",
    title: "Config editor: pillars, leak vectors, qualifier fields",
    tags: ["config", "settings", "admin", "pillars", "leak vectors", "qualifier"],
    summary: "Settings is where you edit a vertical's template. Three tabs, same pattern.",
    sections: [
      {
        heading: "Where it lives",
        body: "Admin → Settings → Pillars / Leak Vectors / Qualifier Fields. Each tab edits the template for a chosen project type.",
      },
      {
        heading: "Pillars tab",
        body: "The graded categories that show in the Weekly Review for projects of that type. Add, rename, reorder, or remove. Per-project overrides happen in Edit Project.",
      },
      {
        heading: "Leak Vectors tab",
        body: "The known places revenue/opportunity leaks for this vertical (e.g. 'missed calls', 'unsold estimates'). Surfaced in Growth Audit. Override per project if a specific client doesn't have a vector.",
      },
      {
        heading: "Qualifier Fields tab",
        body: "The questions the Lead Qualifier asks visitors at /qualify/<vertical>. Change a label, add an option, mark a field required — the live qualifier picks it up next session. No deploy needed.",
      },
      {
        heading: "Per-project overrides",
        body: "Edit Project → Pillars / Leak Vector / Qualifier override panels. When ANY override exists for that project, the whole list is taken from the override (REPLACE, not merge). Clear the override to fall back to the template.",
      },
    ],
  },
  {
    slug: "portfolio",
    title: "Portfolio (the home view)",
    tags: ["portfolio", "projects", "navigation"],
    summary: "Portfolio lists every project and is where you switch the active one.",
    sections: [
      {
        heading: "Selecting a project",
        body: "Clicking a project on Portfolio sets it as the active project. Every other page (Weekly Review, CRM, Brand Vault, Insights, etc.) then shows that project's data. Your selection persists per browser.",
      },
      {
        heading: "What the cards show",
        body: "Each card surfaces the project's current Pillar Score and a few headline metrics so you can scan health across the portfolio at a glance.",
      },
    ],
  },
  {
    slug: "weekly-review",
    title: "Weekly Review",
    tags: ["weekly", "review", "pillars", "scores"],
    summary: "Grade each pillar each week. The result is the project's Pillar Score.",
    sections: [
      {
        heading: "What you do here",
        body: "Each week, set or update a score for every pillar that applies to this project. The Weekly Review rolls those up into one Pillar Score — your 'how are we doing right now' number.",
      },
      {
        heading: "Which pillars appear",
        body: "Pillars come from the project type's template, or from per-project pillar overrides if any are set. If you don't see a pillar you expect, check Settings → Pillars or the per-project overrides.",
      },
      {
        heading: "Pillar Score vs Growth Score",
        body: "Pillar Score = Weekly Review output. Growth Score = Growth Audit output. Two different questions, two different scores. Don't expect them to match.",
      },
    ],
  },
  {
    slug: "insights",
    title: "Insights",
    tags: ["insights", "ai", "observations"],
    summary: "AI observations about the active project — patterns, risks, wins, opportunities.",
    sections: [
      {
        heading: "What you're seeing",
        body: "Insights are AI-generated observations grounded in the project's data (CRM activity, content, revenue, weekly scores, etc.). They're suggestions, not actions — you decide what to do.",
      },
      {
        heading: "Filters",
        body: "Filter by pillar, severity, or time window. Use the search to find a specific topic. Approve insights you want to keep; archive what's noise.",
      },
      {
        heading: "Empty is normal at first",
        body: "New projects won't have insights until there's enough data. Run a Weekly Review, log some CRM activity, and add a few content items — insights show up after that.",
      },
    ],
  },
  {
    slug: "lead-qualifier",
    title: "Lead Qualifier",
    tags: ["qualifier", "leads", "voice", "chat", "vertical", "inbound"],
    summary: "Voice/chat/form agent at /qualify/<vertical> that captures and qualifies inbound leads.",
    sections: [
      {
        heading: "Where it lives",
        body: "Public URL: /qualify/<vertical>, e.g. /qualify/home-services. The page offers voice (default), chat, and a plain form tab — visitors pick whichever they want.",
      },
      {
        heading: "What the AI asks",
        body: "The qualifier reads its questions from the project type's qualifier fields. Change those fields in Settings → Qualifier Fields and the live agent updates. That's how a new vertical gets its own intake flow without code.",
      },
      {
        heading: "Where leads land",
        body: "Every conversation creates a row in Inbound Leads with the structured answers, the transcript, the channel (voice/chat/form), and a 'ready' flag. From there you promote it into a CRM company + deal — see the 'Fulfillment flow' article for the full path.",
      },
      {
        heading: "Testing the flow",
        body: "Open /qualify/<vertical> in another tab, run through a conversation, then check Inbound Leads in the CRM. The lead should appear within a few seconds with everything you said captured.",
      },
    ],
  },
  {
    slug: "inbound-leads",
    title: "Inbound Leads",
    tags: ["leads", "inbound", "crm", "qualifier", "promote"],
    summary: "Where qualifier + website leads collect before you decide what to do with them.",
    sections: [
      {
        heading: "Sources",
        body: "Marketing site form, the Lead Qualifier (voice/chat/form), and direct inserts (e.g. from another system). Every source lands here.",
      },
      {
        heading: "Triaging",
        body: "Archive junk (status='archived'). Promote a real lead into the CRM — that creates a company + contact + deal and copies the qualifier summary into the deal notes. Once the deal hits Won, graduate it to a project and apply an Automation Bundle so AI starts working it.",
      },
      {
        heading: "Why 'ready' matters",
        body: "The qualifier marks each lead is_ready true/false using the vertical's definition of a qualified lead. Sort by ready=true first when prioritising outreach.",
      },
    ],
  },
  {
    slug: "content-pipeline",
    title: "Content Pipeline",
    tags: ["content", "pipeline", "kanban", "stages"],
    summary: "Plan, draft, and ship content items through 7 stages.",
    sections: [
      {
        heading: "Items and stages",
        body: "Each row is a content item with a stage (idea → planned → drafting → review → scheduled → published → archived). List view for spreadsheet-style editing, Kanban for drag-and-drop.",
      },
      {
        heading: "Scope",
        body: "Content Pipeline is per-project. Switch project from Portfolio to see a different pipeline.",
      },
    ],
  },
  {
    slug: "channel-revenue",
    title: "Channel Revenue",
    tags: ["revenue", "channels", "monetization", "pillar"],
    summary: "Log income by channel and month — feeds the Monetization pillar.",
    sections: [
      {
        heading: "What to log",
        body: "One row per channel per month: the channel type, the month, and the amount. Use it for ad revenue, sponsorships, services, subscriptions — whatever revenue streams the project has.",
      },
      {
        heading: "Why it matters",
        body: "Channel Revenue is what the Monetization pillar reads. Without entries here, the pillar can't grade and Insights have less to work with.",
      },
    ],
  },
  {
    slug: "marketing-hub",
    title: "Marketing Hub",
    tags: ["marketing", "campaigns", "hub"],
    summary: "Plan and track marketing campaigns for the active project.",
    sections: [
      {
        heading: "What it covers",
        body: "Campaigns, channels, and the assets attached to each. Use it to keep the rolling marketing plan visible alongside the Content Pipeline and Brand Vault.",
      },
    ],
  },
  {
    slug: "affiliate-products-libraries",
    title: "Affiliate Programs & Products (account-wide)",
    tags: ["affiliate", "products", "library", "account"],
    summary: "Two libraries that span all projects — not project-scoped.",
    sections: [
      {
        heading: "Account-wide vs project-scoped",
        body: "Most data in the app is per-project (changes when you switch projects). Affiliate Programs and Products are libraries you build once and reference from any project. Switching projects does NOT change what's in these libraries.",
      },
      {
        heading: "Affiliate Programs",
        body: "Catalog of affiliate offers you promote (program name, payout, link). Reference them from content items, campaigns, or revenue entries.",
      },
      {
        heading: "Products",
        body: "Catalog of products you sell or recommend. Same idea: build once, use everywhere.",
      },
    ],
  },
  {
    slug: "tasks-logs-chat",
    title: "Tasks, Logs, Chat",
    tags: ["tasks", "logs", "chat", "tools"],
    summary: "Three day-to-day tools that sit alongside the analytics.",
    sections: [
      {
        heading: "Tasks",
        body: "Per-project task list with batch actions, filters, comments, and assignees. Capture Inbox items that you accept usually end up as tasks.",
      },
      {
        heading: "Logs",
        body: "Time-stamped notes and structured fields per project — the operating log. Good for shift-end recaps and audit trail.",
      },
      {
        heading: "Chat",
        body: "Channel-based team chat with DMs. Channels can be project-scoped or general.",
      },
    ],
  },
  {
    slug: "permissions",
    title: "Permissions",
    tags: ["permissions", "roles", "admin"],
    summary: "Roles control what each user can see and do. Roles live in user_roles, not on profiles.",
    sections: [
      {
        heading: "Where roles live",
        body: "Every user has zero or more rows in user_roles. Admin checks use a security-definer function so a logged-in user can't escalate themselves.",
      },
      {
        heading: "Project-scoped access",
        body: "Some roles are global (admin). Others are scoped to specific projects via user_venue_roles — a user might be 'gm' for one project and 'foh' for another.",
      },
    ],
  },
  {
    slug: "getting-started",
    title: "Getting Started",
    tags: ["intro", "navigation", "basics"],
    summary: "Sign in, pick a project, and find your way around.",
    sections: [
      {
        heading: "Sign in",
        body: "Use the email and password you set up. Sessions persist across reloads; if you get bounced to the login page, your token expired — sign in again.",
      },
      {
        heading: "The main navigation",
        body: "The sidebar is grouped: WORKSPACE (Portfolio, Weekly Review, Insights, Team), CLIENTS & LEADS (CRM, Inbound Leads, Capture Inbox, Automation Inbox, Reactivation, Recovery Reports), GROWTH & MARKETING (Growth Audit, Marketing Hub, Content, Channel Revenue), BRAND & ASSETS (Brand Kit, Offers, Products, Affiliate Programs), TOOLS (Tasks, Logs, Chat), SYSTEM (Help, Launch Checklist, Admin). What you see depends on your role.",
      },
      {
        heading: "Pick a project",
        body: "Most analytical pages are project-scoped. Use the project switcher to change what you're looking at. Your selection is remembered per browser.",
      },
      {
        heading: "Where to get unstuck",
        body: "Help Center (sidebar → SYSTEM → Help) has one article per feature. The Launch Checklist tracks your real setup tasks. The Setup Wizard can be re-launched any time from Admin → Settings → Help & Guidance.",
      },
    ],
  },
  {
    slug: "projects",
    title: "Projects & project types",
    tags: ["projects", "pillars", "venues"],
    summary: "Projects are the unit of work — clients, content channels, or internal initiatives.",
    sections: [
      {
        heading: "What a project is",
        body: "Each project is a row in the venues table. It has a type (e.g. client venue, content channel, internal) that controls which pillars and metrics apply.",
      },
      {
        heading: "Why pillars differ by type",
        body: "Pillars come from pillar_templates, then per-project overrides (project_pillar_overrides) can hide or replace them. A content channel will show different pillars than a client venue because the template differs — that's intentional.",
      },
      {
        heading: "Scores",
        body: "Pillar scores live in project_pillar_scores. They roll up into the project's overall score on the dashboard.",
      },
    ],
  },
  {
    slug: "brand-vault",
    title: "Brand Vault",
    tags: ["brand", "logos", "colors", "taglines", "assets"],
    summary: "One brand kit per project — colors, taglines, hashtags, links, and asset files.",
    sections: [
      {
        heading: "One kit per project",
        body: "Every project gets a single brand kit. Inside it you store colors (hex codes), taglines, hashtags, useful links, and uploaded asset files (logos, photos, etc.).",
      },
      {
        heading: "Assets vs metadata",
        body: "Asset binaries live in the brand-assets storage bucket. The Brand Vault tracks the file metadata; deleting an asset row does NOT delete the binary file from storage.",
      },
      {
        heading: "Archive vs delete",
        body: "Archiving a kit hides it from the default view but keeps everything intact and restorable. Deleting is permanent. See the Archive vs Delete article.",
      },
    ],
  },
  {
    slug: "crm",
    title: "CRM",
    tags: ["crm", "companies", "contacts", "deals", "pipeline", "interactions"],
    summary: "Companies → contacts → deals, with interactions logged along the way.",
    sections: [
      {
        heading: "The model",
        body: "A company has many contacts. A deal belongs to a company and (optionally) a contact and sits in a stage. Interactions (calls, emails, meetings) are logged against a company.",
      },
      {
        heading: "The pipeline",
        body: "The Pipeline board groups deals by stage. Move a deal forward as it progresses. The 'won' stage is the trigger for graduation.",
      },
      {
        heading: "Graduating a won deal",
        body: "When a deal closes, you turn the company into an active project — that becomes a row in venues that you'll operate against from then on.",
      },
      {
        heading: "Archive vs delete",
        body: "Archiving a company keeps the history. Deleting cascades into deals and interactions (gone) but orphans contacts (kept, unlinked). The delete dialog shows exact counts before you confirm.",
      },
    ],
  },
  {
    slug: "capture-inbox",
    title: "Capture Inbox",
    tags: ["capture", "inbox", "ai", "routing"],
    summary: "Capture anything fast — review and route it later.",
    sections: [
      {
        heading: "How capture works",
        body: "Use the quick-capture button to drop a thought, task, idea, asset link, lead, or content idea into the inbox. Capture first, classify later.",
      },
      {
        heading: "AI suggests, you accept",
        body: "When an item lands in the inbox, the AI proposes a type and a project for it. NOTHING is filed automatically. You see the suggestion as 'Suggest: <type> · <project>' with an Accept button.",
      },
      {
        heading: "Routing manually",
        body: "You can ignore the suggestion and pick your own type + project, then click Route. Tasks require a project; other types don't.",
      },
      {
        heading: "Archive",
        body: "Not worth routing? Archive the item. It stays in the Archived tab.",
      },
    ],
  },
  {
    slug: "growth-audit",
    title: "Growth Audit",
    tags: ["growth", "audit", "findings", "score"],
    summary: "Scheduled audit findings for a project, with action packs and a rolling score.",
    sections: [
      {
        heading: "Findings",
        body: "growth_findings are produced by audit runs. Each finding has a type, severity, and status (open / in-progress / resolved / dismissed) with an audit trail for status changes.",
      },
      {
        heading: "Action packs",
        body: "Findings can be bundled into growth_action_packs — packaged remediation work with assets attached.",
      },
      {
        heading: "Score snapshots",
        body: "growth_score_snapshots track the project's growth score over time, so you can see whether it's trending up.",
      },
      {
        heading: "Context calendar (currently disabled)",
        body: "The Growth Audit can incorporate a local-context calendar (events, holidays). That integration (local_context) is currently OFF in this app — until it's enabled in Integrations, the context calendar panel will look empty. That's expected, not a bug.",
      },
    ],
  },
  {
    slug: "foundation-audit",
    title: "Foundation Audit",
    tags: ["foundation", "readiness", "audit", "score"],
    summary: "Per-project readiness audit across legal, brand, web, Google, reviews, social, offers, and collateral. Vertical-specific items via templates + per-project overrides.",
    sections: [
      {
        heading: "What it scores",
        body: "A separate score from the Weekly Review or Growth Audit. It answers: 'Is this business actually set up properly?' — entity formed, insurance bound, GBP verified, website live, reviews flowing, social linked, a primary contact on file, and so on.",
      },
      {
        heading: "Auto vs manual items",
        body: "Items with a detection signal (GBP, website, brand kit, reviews, social, offers, contacts) auto-populate when you click Refresh audit. Legal/admin items (LLC, EIN, insurance, licenses, payment processor, etc.) are manual checkboxes with an optional evidence URL.",
      },
      {
        heading: "Per-vertical config",
        body: "Categories and items live in foundation_category_templates + foundation_item_templates, keyed by project_type, with per-project overrides. Adding a vertical = data seed, not code.",
      },
      {
        heading: "Honest unscored",
        body: "Categories with no answers stay unscored and are excluded from the overall readiness score — no fake 100s.",
      },
    ],
  },
  {
    slug: "backup-export",
    title: "Backup & Export",
    tags: ["backup", "export", "csv", "json"],
    summary: "Pull all your data out — per-entity CSVs or one full JSON backup.",
    sections: [
      {
        heading: "Where it lives",
        body: "Settings → Backup & Export. Per-entity CSV buttons (CRM, Brand Vault, Capture, Inbound Leads, Projects, Tasks, Authored content, Marketing) plus a one-click Full JSON Backup.",
      },
      {
        heading: "What's in a backup",
        body: "The JSON file includes exported_at, exported_by (your user id), a version, and every covered table's rows as you can see them. Asset binaries are NOT included — only their metadata.",
      },
      {
        heading: "It's scoped to you",
        body: "Exports run through the authenticated client, so RLS applies. You'll never see another user's data in your export.",
      },
      {
        heading: "When to back up",
        body: "Back up before major changes — bulk edits, schema changes, integration cutovers, or anything you can't easily undo.",
      },
    ],
  },
  {
    slug: "archive-vs-delete",
    title: "Archive vs Delete",
    tags: ["archive", "delete", "crm", "brand", "safety"],
    summary: "Archive is reversible. Delete cascades — and the dialog tells you exactly what happens.",
    sections: [
      {
        heading: "Archive is the safer default",
        body: "Archiving sets a flag on the record. It vanishes from default views but is fully restorable, with all related data intact.",
      },
      {
        heading: "Delete is honest about what cascades",
        body: "When you delete a CRM company, the dialog names the company and shows: deals + interactions will be permanently deleted (CASCADE), contacts will be unlinked but kept (SET NULL). Brand kits show their child-record counts the same way.",
      },
      {
        heading: "Inbound leads",
        body: "Inbound leads use a status field instead of an archived column — archiving sets status='archived'.",
      },
      {
        heading: "Showing archived items",
        body: "Toggle 'Show archived' on the relevant page to surface and restore archived records.",
      },
    ],
  },
  {
    slug: "fulfillment-flow",
    title: "The fulfillment flow (end to end)",
    tags: ["fulfillment", "flow", "factory", "qualifier", "automation", "recovery", "overview"],
    summary: "How a lead becomes a recovered customer — Qualifier → Inbound → CRM → Project → Bundle → Inbox → Report.",
    sections: [
      {
        heading: "1. Capture",
        body: "A visitor hits /qualify/<vertical>. The AI agent (voice, chat, or form) asks the qualifier questions configured for that vertical and produces a structured lead.",
      },
      {
        heading: "2. Inbound Leads",
        body: "The lead lands in CRM → Inbound. You see the transcript, the structured answers, the channel, and the 'ready' flag. Archive junk, promote the rest.",
      },
      {
        heading: "3. Promote into the CRM",
        body: "Promoting a lead creates a company, a contact, and a deal in the Pipeline. Work the deal stages the same way you'd work any sales pipeline.",
      },
      {
        heading: "4. Win → graduate to a project",
        body: "When a deal hits Won, graduate the company into an active project. That project becomes the unit of work for everything downstream — brand, content, revenue, automations.",
      },
      {
        heading: "5. Apply an Automation Bundle",
        body: "In Admin → Automation Bundles, apply a bundle to the project. A bundle is a packaged set of automations (follow-up, reactivation, review requests). One click enrolls the project.",
      },
      {
        heading: "6. The Automation Inbox (approval gate)",
        body: "AI drafts customer messages for every enrolled automation. They pause in the Automation Inbox waiting for your approval. Approve, edit, or reject. Nothing sends until you say so.",
      },
      {
        heading: "7. Recovery Report",
        body: "Each week the Recovery Report rolls up what was recovered for the project — leads captured, follow-ups re-engaged, customers reactivated, reviews landed, with an estimated dollar value. Internal-first: you review and choose when to share with the client.",
      },
    ],
  },
  {
    slug: "approval-gate",
    title: "The approval gate (Automation Inbox)",
    tags: ["approval", "automation", "inbox", "qa", "safety"],
    summary: "Nothing sends to a customer without your approval. The Automation Inbox is where that QA happens.",
    sections: [
      {
        heading: "What pauses for approval",
        body: "Every AI-drafted customer message — follow-up sequences, reactivation campaigns, review requests — lands in the Automation Inbox as 'pending_review' instead of sending.",
      },
      {
        heading: "What you can do",
        body: "Approve as-is (the message sends), edit then approve (your edit replaces the draft), or reject (it never goes out). 'Send now' triggers immediate delivery once approved.",
      },
      {
        heading: "Why this matters",
        body: "It's the safety layer that lets you trust AI with customer-facing content. If a draft is off-brand or factually wrong, it never reaches the customer — you catch it in the inbox first.",
      },
    ],
  },
  {
    slug: "automation-inbox",
    title: "Automation Inbox",
    tags: ["automation", "inbox", "approval", "messages", "drafts"],
    summary: "Approve, edit, or reject every AI-drafted customer message before it sends.",
    sections: [
      {
        heading: "Where it lives",
        body: "CLIENTS & LEADS → Automation Inbox. Scoped to the active project.",
      },
      {
        heading: "Filters",
        body: "Filter by automation (follow-up / reactivation / review request) and by status (pending review / approved / sent / failed / rejected / canceled). Default view is 'pending review' for the active project.",
      },
      {
        heading: "Editing before approval",
        body: "Each draft is editable. Your edits replace the original body. Approve when you're happy; the message either sends immediately or at its scheduled time.",
      },
      {
        heading: "After it sends",
        body: "Sent rows stay in the inbox for audit. 'Failed' rows surface why the send didn't go through (e.g. invalid contact, channel error).",
      },
    ],
  },
  {
    slug: "automation-bundles",
    title: "Automation Bundles",
    tags: ["automation", "bundles", "enrollment", "config"],
    summary: "Apply a packaged set of automations to a project in one action.",
    sections: [
      {
        heading: "What a bundle is",
        body: "A bundle = a pre-configured set of automations (e.g. follow-up sequence + reactivation + review requests). Apply one to a project and that project is enrolled in every automation the bundle includes.",
      },
      {
        heading: "Where to apply",
        body: "Admin → Automation Bundles. Pick a project, pick a bundle, click apply. Enrollments show up immediately; AI starts drafting messages into the Automation Inbox on the next run.",
      },
      {
        heading: "Per-automation control",
        body: "After applying, you can toggle individual automations on/off per project from the project's automations panel — the bundle is just a fast on-ramp.",
      },
    ],
  },
  {
    slug: "reactivation",
    title: "Reactivation campaigns",
    tags: ["reactivation", "win-back", "campaign", "customer list"],
    summary: "Upload a customer list, pick an offer, AI drafts a win-back — you approve before anything sends.",
    sections: [
      {
        heading: "What it does",
        body: "Take a list of past customers, send them a tailored win-back offer. Useful for slow weeks, new menu drops, or seasonal pushes.",
      },
      {
        heading: "The flow",
        body: "1) Make sure the 'reactivation' automation is enabled for the project. 2) Create a list and import members (CSV: name, email, phone, last_visit_at). 3) Start a campaign with a name + offer. 4) AI drafts one message per member into the Automation Inbox. 5) You approve, edit, or reject each one.",
      },
      {
        heading: "Where to find it",
        body: "CLIENTS & LEADS → Reactivation. Scoped to the active project.",
      },
    ],
  },
  {
    slug: "recovery-reports",
    title: "Recovery Reports",
    tags: ["recovery", "report", "weekly", "dollars", "client"],
    summary: "Weekly internal-first report of what the automations recovered — you review and choose when to share.",
    sections: [
      {
        heading: "What it shows",
        body: "Per project, per week: leads captured, follow-ups re-engaged, customers reactivated, reviews landed, plus an estimated dollar value at work (avg ticket × close rate).",
      },
      {
        heading: "Internal-first",
        body: "Nothing here auto-delivers to clients. You review the numbers, edit the narrative, then copy or mark sent when you share. Draft → Reviewed → Sent are the three statuses.",
      },
      {
        heading: "Where it lives",
        body: "CLIENTS & LEADS → Recovery Reports. The weekly generator runs Monday mornings.",
      },
    ],
  },
  {
    slug: "team",
    title: "Team",
    tags: ["team", "people", "members"],
    summary: "Who's on the active project. Permissions controls what each person can do.",
    sections: [
      {
        heading: "What you see",
        body: "Members assigned to the active project — name, role, and contact info. Scoped to the project you've selected in Portfolio.",
      },
      {
        heading: "Team vs Permissions",
        body: "Team shows who's involved at a glance. Permissions (Admin) is where you grant/revoke roles. A user can be on multiple project teams with different roles in each.",
      },
    ],
  },
  {
    slug: "account-wide-vs-project",
    title: "Account-wide vs project-scoped",
    tags: ["scope", "account", "project", "library"],
    summary: "Most data follows the active project. A handful of things span every project.",
    sections: [
      {
        heading: "Account-wide (don't change when you switch projects)",
        body: "Affiliate Programs, Products, Permissions, Backup & Export, Project Types + config templates. Think of these as shared libraries and settings.",
      },
      {
        heading: "Project-scoped (change with the active project)",
        body: "Everything else — CRM, Brand Kit, Content, Channel Revenue, Weekly Review, Insights, Growth Audit, Automation Inbox, Reactivation, Recovery Reports, Marketing Hub, Tasks, Logs, Chat channels.",
      },
      {
        heading: "Why this split",
        body: "Libraries you build once and reuse everywhere shouldn't be duplicated per project. Operational data is project-specific so you can run multiple clients side-by-side without leaks.",
      },
    ],
  },
  {
    slug: "two-scores",
    title: "The two scores: Pillar Score vs Growth Score",
    tags: ["scores", "pillar", "growth", "weekly", "audit"],
    summary: "Two different questions, two different scores. Don't expect them to match.",
    sections: [
      {
        heading: "Pillar Score — 'how are we doing'",
        body: "Comes out of the Weekly Review. You grade each pillar that applies to the project, and the result rolls up into one number. Operational health, week by week.",
      },
      {
        heading: "Growth Score — 'where can we grow'",
        body: "Comes out of the Growth Audit. Scheduled audit findings (leak vectors, opportunities) produce a rolling score. 'No data yet' is normal until an audit has run.",
      },
      {
        heading: "Why they're separate",
        body: "Mixing 'how is the operation today' with 'where could we grow tomorrow' produces a number nobody can act on. Keeping them apart lets you see both pictures clearly.",
      },
    ],
  },
  {
    slug: "marketing-site-inbound",
    title: "Marketing site & inbound leads",
    tags: ["marketing", "site", "leads", "inbound", "public"],
    summary: "The public landing page captures interest; submissions land in the CRM.",
    sections: [
      {
        heading: "The public site",
        body: "Signed-out visitors to / see the marketing site. Signed-in users get redirected into the app. The site is implemented in src/pages/MarketingSite.tsx.",
      },
      {
        heading: "Inbound leads",
        body: "Form submissions write to the inbound_leads table. Only admins can read it (RLS), and they surface in the CRM under Inbound Leads.",
      },
      {
        heading: "Triaging a lead",
        body: "From Inbound Leads you can archive (status='archived') or hard-delete via the protection dialog. Convert a real opportunity into a company + deal in the regular CRM flow.",
      },
    ],
  },
];