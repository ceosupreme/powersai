// Stable string keys for dismissible help affordances.
// Adding a new tip = add a key here, reference it in <HelpTip helpKey="...">.
export const HELP_KEYS = {
  crmPipeline: "help:crm-pipeline",
  crmInbound: "help:crm-inbound",
  brandVault: "help:brand-vault",
  captureSuggest: "help:capture-suggest",
  pillarsByType: "help:pillars-by-type",
  backupBeforeChanges: "help:backup-before-changes",
  portfolio: "help:portfolio",
  weeklyReview: "help:weekly-review",
  insights: "help:insights",
  qualifierPublic: "help:qualifier-public",
  inboundLeads: "help:inbound-leads",
  contentPipeline: "help:content-pipeline",
  channelRevenue: "help:channel-revenue",
  marketingHub: "help:marketing-hub",
  affiliatePrograms: "help:affiliate-programs",
  products: "help:products",
  tasks: "help:tasks",
  logs: "help:logs",
  chat: "help:chat",
  configEditor: "help:config-editor",
  projectOverrides: "help:project-overrides",
  growthAudit: "help:growth-audit",
} as const;

export type HelpKey = (typeof HELP_KEYS)[keyof typeof HELP_KEYS];