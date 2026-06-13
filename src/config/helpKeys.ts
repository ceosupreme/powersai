// Stable string keys for dismissible help affordances.
// Adding a new tip = add a key here, reference it in <HelpTip helpKey="...">.
export const HELP_KEYS = {
  crmPipeline: "help:crm-pipeline",
  crmInbound: "help:crm-inbound",
  brandVault: "help:brand-vault",
  captureSuggest: "help:capture-suggest",
  pillarsByType: "help:pillars-by-type",
  backupBeforeChanges: "help:backup-before-changes",
} as const;

export type HelpKey = (typeof HELP_KEYS)[keyof typeof HELP_KEYS];