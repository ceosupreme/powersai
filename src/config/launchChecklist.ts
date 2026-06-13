export interface LaunchChecklistItem {
  key: string;
  title: string;
  description: string;
  link?: { to: string; label: string };
}

export const LAUNCH_CHECKLIST: LaunchChecklistItem[] = [
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