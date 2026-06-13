export interface HelpArticle {
  slug: string;
  title: string;
  tags: string[];
  summary: string;
  sections: { heading: string; body: string }[];
}

export const HELP_ARTICLES: HelpArticle[] = [
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