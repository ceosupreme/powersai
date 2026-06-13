// Canonical custom field definitions for Marketing Hub → Asana sync.
// Used by marketing-asana-setup (create-if-missing) and marketing-asana-push
// (read field GIDs out of venue_execution_adapters.asana_custom_field_map).

export const MARKETING_SECTION_NAME = "Marketing Efforts";

export type MarketingFieldKey =
  | "effort_type"
  | "marketing_status"
  | "recurrence"
  | "brand_partner"
  | "budget"
  | "expected_guest_count"
  | "expected_revenue_impact"
  | "toast_promo_code"
  | "linked_menu_items"
  | "barpulse_sync_id";

export type MarketingFieldDef = {
  key: MarketingFieldKey;
  asanaName: string;            // exact name shown in Asana
  resourceSubtype: "enum" | "text" | "number";
  enumOptions?: string[];
  currencyCode?: string;        // for number/currency
};

export const MARKETING_FIELD_DEFS: MarketingFieldDef[] = [
  {
    key: "effort_type",
    asanaName: "Effort Type",
    resourceSubtype: "enum",
    enumOptions: [
      "Daily Special", "Weekly Special", "Limited-Time Promotion", "Event",
      "Happy Hour Variation", "Brand Partnership", "Content Push",
      "Seasonal/Holiday", "Other",
    ],
  },
  {
    // Named "Marketing Status" intentionally to avoid colliding with any
    // existing "Status" field on the quarterly project.
    key: "marketing_status",
    asanaName: "Marketing Status",
    resourceSubtype: "enum",
    enumOptions: ["Draft", "Approved", "Scheduled", "Live", "Ended", "Archived"],
  },
  {
    key: "recurrence",
    asanaName: "Recurrence",
    resourceSubtype: "enum",
    enumOptions: ["One-Time", "Weekly", "Biweekly", "Monthly", "Custom"],
  },
  { key: "brand_partner", asanaName: "Brand Partner", resourceSubtype: "text" },
  { key: "budget", asanaName: "Budget / Cost", resourceSubtype: "number", currencyCode: "USD" },
  { key: "expected_guest_count", asanaName: "Expected Guest Count", resourceSubtype: "number" },
  { key: "expected_revenue_impact", asanaName: "Expected Revenue Impact", resourceSubtype: "number", currencyCode: "USD" },
  { key: "toast_promo_code", asanaName: "Linked Toast Discount or Promo Code", resourceSubtype: "text" },
  { key: "linked_menu_items", asanaName: "Linked Menu Items", resourceSubtype: "text" },
  { key: "barpulse_sync_id", asanaName: "BarPulse Sync ID", resourceSubtype: "text" },
];

export const MARKETING_SUBTASK_TEMPLATE = [
  "Promotion Prep",
  "Channel Execution",
  "Operational Prep",
  "Post-Event",
];
