export interface LaunchChecklistItem {
  key: string;
  title: string;
  description: string;
  link?: { to: string; label: string };
}

export const LAUNCH_CHECKLIST: LaunchChecklistItem[] = [
  {
    key: "setup:create-project",
    title: "Create your first project",
    description: "Projects are the unit of work. From Portfolio, add a project — this becomes the active project everywhere else in the app.",
    link: { to: "/portfolio", label: "Open Portfolio" },
  },
  {
    key: "setup:pick-project-type",
    title: "Pick the project's type (vertical)",
    description: "The project type decides which pillars, leak vectors, and qualifier questions apply. Open the project in Admin and set its type — that's how you 'choose a vertical'.",
    link: { to: "/admin?tab=projects", label: "Open Projects admin" },
  },
  {
    key: "setup:review-pillars",
    title: "Review pillars for that type",
    description: "Settings → Pillars shows the pillar template per type. Edit or add pillars; per-project overrides REPLACE the template when set.",
    link: { to: "/admin?tab=settings&subtab=pillars", label: "Open Pillars editor" },
  },
  {
    key: "setup:review-qualifier-fields",
    title: "Review the qualifier questions for that type",
    description: "Settings → Qualifier Fields shows the questions the Lead Qualifier will ask for this vertical. Change them here and the live qualifier updates — no code change.",
    link: { to: "/admin?tab=settings&subtab=qualifier", label: "Open Qualifier Fields" },
  },
  {
    key: "setup:try-qualifier",
    title: "Try the Lead Qualifier end-to-end",
    description: "Open /qualify/<vertical> (e.g. /qualify/home-services). Talk or chat with the AI agent. A qualified lead should land in Inbound Leads with its transcript + answers.",
    link: { to: "/qualify/home-services", label: "Open qualifier" },
  },
  {
    key: "setup:connect-data",
    title: "Connect data sources (optional)",
    description: "Admin → Integrations is where you wire up external data (POS, scheduling, reviews, etc.). Skip if there's nothing to connect for this vertical yet — most features still work without it.",
    link: { to: "/admin?tab=integrations", label: "Open Integrations" },
  },
  {
    key: "setup:weekly-review",
    title: "Run your first Weekly Review",
    description: "Set this week's pillar scores. The Weekly Review produces the project's Pillar Score — 'how are we doing'.",
    link: { to: "/weekly-review", label: "Open Weekly Review" },
  },
  {
    key: "setup:promote-lead",
    title: "Promote a lead into the CRM",
    description: "From CRM → Inbound Leads, take one captured lead and graduate it to a company + deal. This is the flow your sales pipeline uses.",
    link: { to: "/crm", label: "Open CRM" },
  },
  {
    key: "setup:apply-automation-bundle",
    title: "Apply an Automation Bundle to the project",
    description: "Bundles are a packaged set of automations (follow-up, reactivation, review requests). Apply one in Admin → Automation Bundles so AI starts drafting messages for this project.",
    link: { to: "/admin?tab=automation-bundles", label: "Open Automation Bundles" },
  },
  {
    key: "setup:review-automation-inbox",
    title: "Review the Automation Inbox (the approval gate)",
    description: "Every AI-drafted customer message waits in the Automation Inbox until you approve, edit, or reject it. Nothing sends until you say so.",
    link: { to: "/automation-inbox", label: "Open Automation Inbox" },
  },
  {
    key: "setup:brand-vault",
    title: "Set up the Brand Kit for the project (optional)",
    description: "Drop colors, taglines, hashtags, links, and asset files into the project's brand kit. Optional — but it's where everything brand-related lives.",
    link: { to: "/brand-kit", label: "Open Brand Kit" },
  },
  {
    key: "setup:growth-audit",
    title: "Open the Growth Audit",
    description: "Growth Audit produces the Growth Score — 'where can we grow'. It's separate from the Pillar Score. 'No data yet' is normal until an audit runs.",
    link: { to: "/growth-audit", label: "Open Growth Audit" },
  },
  {
    key: "setup:channel-revenue",
    title: "Log one Channel Revenue entry",
    description: "Channel Revenue tracks income by source/month and feeds the Monetization pillar. Add one row so the data starts populating.",
    link: { to: "/channel-revenue", label: "Open Channel Revenue" },
  },
  {
    key: "setup:content-pipeline",
    title: "Add one item to the Content Pipeline",
    description: "Content Pipeline tracks items through 7 stages (idea → published). Use List or Kanban view. Add one item to see the flow.",
    link: { to: "/content", label: "Open Content Pipeline" },
  },
  {
    key: "setup:reactivation",
    title: "Try a Reactivation campaign (optional)",
    description: "Upload an old customer list, pick an offer, and let AI draft a win-back. Drafts land in the Automation Inbox for your approval.",
    link: { to: "/reactivation", label: "Open Reactivation" },
  },
  {
    key: "setup:recovery-reports",
    title: "Review your first Recovery Report",
    description: "The weekly Recovery Report shows what your automations recovered (leads captured, follow-ups re-engaged, reviews landed). Internal-first — you review and choose when to share with the client.",
    link: { to: "/recovery-reports", label: "Open Recovery Reports" },
  },
  {
    key: "launch:domain-dns",
    title: "Point the supremeteammedia domain at this project",
    description: "Configure DNS at your registrar so supremeteammedia.com resolves to this app. Then publish from Lovable so the custom domain is live.",
  },
  {
    key: "launch:capture-verify",
    title: "Run the Capture Inbox 5-step verification",
    description: "Capture an item, confirm the AI suggestion appears once (no re-fire), accept it, route a different item manually, and archive a third — all should persist on reload.",
    link: { to: "/inbox", label: "Open Capture Inbox" },
  },
  {
    key: "launch:rls-audit",
    title: "Verify RLS on every public table before adding any contractor/client login",
    description: "Open Admin → Sync Health and the security memory; confirm every user-facing table has policies scoped to auth.uid() (or admin via has_role). Without this, a new login can read other users' data.",
    link: { to: "/admin/sync-health", label: "Open Sync Health" },
  },
  {
    key: "launch:full-backup",
    title: "Download a full JSON backup",
    description: "Settings → Backup & Export → Full JSON Backup. Save the file somewhere outside this app (cloud drive, local disk). Repeat before any big change.",
    link: { to: "/admin?tab=settings&subtab=backup", label: "Open Backup & Export" },
  },
  {
    key: "launch:marketing-review",
    title: "Review the public marketing pages against final design",
    description: "Walk through /, the sections, copy, and the inbound-leads form on a signed-out browser. Fix any stale copy or broken links before pointing the domain.",
    link: { to: "/", label: "Open public site" },
  },
  {
    key: "launch:ai-routing-sanity",
    title: "Confirm AI routing has no runaway Gateway calls",
    description: "Open the Capture Inbox with multiple unclassified items. Each item should request exactly one AI suggestion. Re-mount the page and confirm no extra requests fire (the useRef + status guard in Inbox.tsx is what protects you).",
    link: { to: "/inbox", label: "Open Capture Inbox" },
  },
  {
    key: "launch:archive-protection",
    title: "Confirm Archive-vs-Delete protection on CRM + Brand Vault",
    description: "Try archiving and restoring one CRM company and one brand kit. Trigger a delete to see the cascade-honest counts in the dialog. Cancel — don't actually delete.",
    link: { to: "/crm", label: "Open CRM" },
  },
  {
    key: "launch:help-content-recheck",
    title: "Spot-check Help Center articles after any new build",
    description: "Open /help and skim each article. If you added or removed a feature, update src/config/helpArticles.ts so the content still matches reality.",
    link: { to: "/help", label: "Open Help Center" },
  },
];