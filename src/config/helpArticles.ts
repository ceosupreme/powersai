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
    tags: ["overview", "concepts", "scores", "project", "vertical"],
    summary: "The big-picture map: projects, the two scores, account-wide vs project-scoped data.",
    sections: [
      {
        heading: "Projects are the unit of work",
        body: "Almost every page is scoped to the project you've selected in Portfolio. Switch projects and the whole app re-points at that project's CRM, brand, content, revenue, insights, and scores. A few things are account-wide (Affiliate Programs, Products, Permissions, Backup) — those don't change when you switch projects.",
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
        heading: "Where leads come from",
        body: "Three places: the marketing site form, the Lead Qualifier (voice/chat/form at /qualify/<vertical>), and manual entries. All land in Inbound Leads, which you promote into CRM companies + deals.",
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
        body: "Every conversation creates a row in Inbound Leads with the structured answers, the transcript, the channel (voice/chat/form), and a 'ready' flag. From there you promote it into a CRM company + deal.",
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
        body: "Archive junk (status='archived'). Promote a real lead into the CRM — that creates a company + contact + deal and copies the qualifier summary into the deal notes.",
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
        body: "The sidebar surfaces the workspaces you have access to: Dashboard, Workspace, Weekly Review, CRM, Brand Vault, Capture Inbox, Tasks, Logs, Growth Audit, Marketing Hub, and Admin/Settings. What you see depends on your role.",
      },
      {
        heading: "Pick a project",
        body: "Most analytical pages are project-scoped. Use the project switcher to change what you're looking at. Your selection is remembered per browser.",
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