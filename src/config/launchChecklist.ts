export interface LaunchChecklistItem {
  key: string;
  title: string;
  description: string;
  link?: { to: string; label: string };
  /** Optional inline widget key mounted next to the description. */
  inline?: "apply_bundle";
}

export const LAUNCH_CHECKLIST: LaunchChecklistItem[] = [
  {
    key: "setup:tour",
    title: "Take the getting-started tour",
    description: "Nine short steps through Dashboard, Portfolio, a brand's workspace, pipelines, playbooks and scores. Re-run it any time from Admin Panel, Settings, Help & Guidance.",
    link: { to: "/portfolio", label: "Open Portfolio" },
  },
  {
    key: "setup:clear-waiting",
    title: "Clear \"Waiting on me\" and finish one Next 10 step",
    description: "On Dashboard with \"All brands & clients\" selected, approve, reject or snooze each item in Waiting on me, then tick one step in Next 10. This is the daily routine in miniature.",
    link: { to: "/workspace", label: "Open Dashboard" },
  },
  {
    key: "setup:portfolio-gaps",
    title: "Find the brand furthest from set up",
    description: "On Portfolio, sort the cards by \"Setup gaps\". Each card's setup line reads like \"Setup: 7 of 10 in place, Ready to grow\". Note the brand marked \"Set up first\".",
    link: { to: "/portfolio", label: "Open Portfolio" },
  },
  {
    key: "setup:brand-kits",
    title: "Check every active brand's Brand Kit",
    description: "Voice, look, offers, content mode and the rules the crew follows. A thin kit produces thin work, so this is the first thing to fill in for a brand.",
    link: { to: "/brand-kit", label: "Open Brand Kit" },
  },
  {
    key: "setup:channels",
    title: "Confirm each brand's channels and follower counts",
    description: "On a brand's Channels tab, make sure every account the brand has is listed with its status. Tap \"Update from screenshots\" for anything Metricool does not cover.",
    link: { to: "/portfolio", label: "Open Portfolio" },
  },
  {
    key: "setup:top-3",
    title: "Start the top three setup items on one brand",
    description: "Open the brand marked \"Set up first\", go to its Setup tab and tap \"Set up the top 3\". The crew does the Claude parts overnight; your parts show up in Next 10.",
    link: { to: "/portfolio", label: "Open Portfolio" },
  },
  {
    key: "setup:playbook-material",
    title: "Add your own material to the Playbooks",
    description: "Courses, notes, saved threads and videos go in through \"Add your material\". The crew merges them that night. Playbooks marked \"Thin\" need this most.",
    link: { to: "/playbooks", label: "Open Playbooks" },
  },
  {
    key: "setup:radar-make",
    title: "Turn one Radar brief into a pipeline",
    description: "Open Radar and tap \"Make this\" on a brief worth making. HQ creates the pipeline and the crew starts its first steps that night.",
    link: { to: "/radar", label: "Open Radar" },
  },
  {
    key: "setup:production-board",
    title: "Follow a piece on the Production Board",
    description: "Open the Production Board and find the pipeline you just made. Each step shows who owns it and its files, and the board is where approval happens.",
    link: { to: "/production-board", label: "Open Production Board" },
  },
  {
    key: "setup:weekly-numbers",
    title: "Enter last week's numbers",
    description: "KPI rows in Next 10 ask for numbers, and every brand's pillar cards sit on its Overview tab. A number typed on a pillar card scores the pillar and fills the overall.",
    link: { to: "/weekly-review", label: "Open Weekly Review" },
  },
  {
    key: "setup:channel-revenue",
    title: "Log one Channel Revenue entry",
    description: "Channel Revenue tracks money by brand, source and month and feeds the money pillar. Add one row so the Portfolio's money line starts filling in.",
    link: { to: "/revenue", label: "Open Channel Revenue" },
  },
  {
    key: "setup:client-types",
    title: "Client businesses only: review a business type's settings",
    description: "Admin Panel, Pillars holds the starting settings for each type of client business: its pillars, the money-leak checks the Growth Audit runs, and the questions the public lead quiz asks. Your own brands already have their own scorecards and need nothing here.",
    link: { to: "/admin?tab=pillars", label: "Open client settings" },
  },
  {
    key: "setup:try-qualifier",
    title: "Client businesses only: try the public lead quiz",
    description: "Open /qualify/home-services in a private window and answer it. The lead should land in CRM, Inbound Leads, with its answers.",
    link: { to: "/qualify/home-services", label: "Open the lead quiz" },
  },
  {
    key: "setup:apply-automation-bundle",
    title: "Client businesses only: apply an Automation Bundle",
    description: "A bundle is a ready-made set of automations (follow-up, reactivation, review requests) for a client project. Choose a client in the project picker, then apply one here.",
    link: { to: "/admin?tab=settings&subtab=bundles", label: "Open Automation Bundles" },
    inline: "apply_bundle",
  },
  {
    key: "setup:review-automation-inbox",
    title: "Client businesses only: review the Automation Inbox",
    description: "Every AI-drafted customer message waits here until you approve, edit or reject it. Nothing sends until you say so.",
    link: { to: "/automations/inbox", label: "Open Automation Inbox" },
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
    title: "Spot-check the Guide after any new build",
    description: "Open the Guide and skim the articles for any screen that changed. If you added or removed a feature, update the matching file in src/content/guide so the Guide and its PDF still match reality.",
    link: { to: "/guide", label: "Open the Guide" },
  },
];