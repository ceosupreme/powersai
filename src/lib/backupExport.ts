import { supabase } from "@/integrations/supabase/client";

// All exports run through the AUTHENTICATED supabase client.
// PostgREST applies RLS using the caller's JWT — never service_role.
// Empty tables return [] and produce a header-only (or empty) CSV.

export type BackupTable = {
  name: string;
  label: string;
  group:
    | "CRM"
    | "Brand Vault"
    | "Capture"
    | "Inbound Leads"
    | "Projects"
    | "Tasks"
    | "Authored Content"
    | "Marketing";
};

export const BACKUP_TABLES: BackupTable[] = [
  { name: "crm_companies",            label: "CRM Companies",            group: "CRM" },
  { name: "crm_contacts",             label: "CRM Contacts",             group: "CRM" },
  { name: "crm_deals",                label: "CRM Deals",                group: "CRM" },
  { name: "crm_interactions",         label: "CRM Interactions",         group: "CRM" },
  { name: "brand_kits",               label: "Brand Kits",               group: "Brand Vault" },
  { name: "brand_kit_colors",         label: "Brand Colors",             group: "Brand Vault" },
  { name: "brand_kit_taglines",       label: "Brand Taglines",           group: "Brand Vault" },
  { name: "brand_kit_hashtags",       label: "Brand Hashtags",           group: "Brand Vault" },
  { name: "brand_kit_links",          label: "Brand Links",              group: "Brand Vault" },
  { name: "brand_kit_assets",         label: "Brand Assets (metadata)",  group: "Brand Vault" },
  { name: "capture_items",            label: "Capture Items",            group: "Capture" },
  { name: "inbound_leads",            label: "Inbound Leads",            group: "Inbound Leads" },
  { name: "venues",                   label: "Projects (Venues)",        group: "Projects" },
  { name: "pillar_templates",         label: "Pillar Templates",         group: "Projects" },
  { name: "project_pillar_overrides", label: "Project Pillar Overrides", group: "Projects" },
  { name: "project_pillar_scores",    label: "Project Pillar Scores",    group: "Projects" },
  { name: "tasks",                    label: "Tasks",                    group: "Tasks" },
  { name: "task_comments",            label: "Task Comments",            group: "Tasks" },
  { name: "task_activity",            label: "Task Activity",            group: "Tasks" },
  { name: "knowledge_base",           label: "Knowledge Base",           group: "Authored Content" },
  { name: "voice_notes",              label: "Voice Notes",              group: "Authored Content" },
  { name: "user_preferences",         label: "User Preferences",         group: "Authored Content" },
  { name: "marketing_campaigns",      label: "Marketing Campaigns",      group: "Marketing" },
  { name: "marketing_events",         label: "Marketing Events",         group: "Marketing" },
  { name: "promotions",               label: "Promotions",               group: "Marketing" },
  { name: "production_jobs", label: "Production Jobs", group: "Authored Content" },
  { name: "action_items", label: "Action Items", group: "Authored Content" },
  { name: "content_items", label: "Content Items", group: "Authored Content" },
  { name: "content_families", label: "Content Families", group: "Authored Content" },
  { name: "content_placements", label: "Content Placements", group: "Authored Content" },
  { name: "content_sources", label: "Content Sources", group: "Authored Content" },
  { name: "audience_pains", label: "Audience Pains", group: "Authored Content" },
  { name: "playbook_sources", label: "Playbook Sources", group: "Authored Content" },
  { name: "brand_channels", label: "Brand Channels", group: "Authored Content" },
  { name: "channel_products", label: "Channel Products", group: "Authored Content" },
  { name: "channel_product_channels", label: "Channel Product Channels", group: "Authored Content" },
  { name: "product_listings", label: "Product Listings", group: "Authored Content" },
  { name: "channel_revenue", label: "Channel Revenue", group: "Authored Content" },
  { name: "service_offers", label: "Service Offers", group: "Authored Content" },
  { name: "service_packages", label: "Service Packages", group: "Authored Content" },
  { name: "service_package_items", label: "Service Package Items", group: "Authored Content" },
  { name: "affiliate_programs", label: "Affiliate Programs", group: "Authored Content" },
  { name: "project_kpis", label: "Project Kpis", group: "Authored Content" },
  { name: "project_kpi_values", label: "Project Kpi Values", group: "Authored Content" },
];

export async function fetchTable(name: string): Promise<Record<string, unknown>[]> {
  if (!BACKUP_TABLES.some(table => table.name === name)) throw new Error('Unknown backup table');
  const rows: Record<string, unknown>[] = [];
  const pageSize = 500;
  const keys = name === 'channel_product_channels' ? ['product_id', 'project_id'] : ['id'];
  for (let offset = 0; ; offset += pageSize) {
    let query = (supabase as any).from(name).select('*');
    for (const key of keys) query = query.order(key, { ascending: true });
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(`${name}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) return rows;
  }
}

export async function countTable(name: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from(name)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${name}: ${error.message}`);
  return count ?? 0;
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  const s = String(v);
  // RFC 4180: quote if contains comma, quote, CR, or LF
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function headerOrder(rows: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  const all = Array.from(keys);
  const pinFront = ["id"];
  const pinBack = ["created_at", "updated_at"];
  const middle = all
    .filter(k => !pinFront.includes(k) && !pinBack.includes(k))
    .sort((a, b) => a.localeCompare(b));
  return [
    ...pinFront.filter(k => all.includes(k)),
    ...middle,
    ...pinBack.filter(k => all.includes(k)),
  ];
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""; // header-less empty file for empty tables
  const headers = headerOrder(rows);
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(headers.map(h => csvCell(r[h])).join(","));
  return lines.join("\r\n");
}

export function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}