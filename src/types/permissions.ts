import { AppRole } from '@/types/auth';

export type PageKey =
  | 'dashboard'
  | 'weekly_review'
  | 'insights'
  | 'sales'
  | 'labor'
  | 'operations'
  | 'guest_experience'
  | 'marketing'
  | 'social_media'
  | 'employees'
  | 'tasks'
  | 'logs'
  | 'chat'
  | 'crm'
  | 'brand_kit'
  | 'marketing_hub'
  | 'growth_audit'
  | 'capture_inbox'
  | 'content_pipeline'
  | 'revenue'
  | 'affiliate_programs'
  | 'products'
  | 'offers'
  | 'automation_inbox'
  | 'reactivation'
  | 'recovery_reports'
  | 'foundation_audit';

// Roles that use the simplified staff portal layout
export const STAFF_PORTAL_ROLES: AppRole[] = ['staff', 'shift_lead'];

// Roles that use the full sidebar layout
export const FULL_PORTAL_ROLES: AppRole[] = ['admin', 'owner', 'gm'];

// Role display names
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  owner: 'Owner',
  gm: 'GM',
  shift_lead: 'Shift Lead',
  staff: 'Staff',
};

// Role hierarchy levels
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 5,
  owner: 4,
  gm: 3,
  shift_lead: 2,
  staff: 1,
};

export interface PagePermission {
  id: string;
  user_id: string;
  page_key: PageKey;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const PAGE_CONFIG: { key: PageKey; label: string; canDisable: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard', canDisable: false },
  { key: 'weekly_review', label: 'Weekly Review', canDisable: true },
  { key: 'insights', label: 'Insights', canDisable: true },
  { key: 'sales', label: 'Revenue', canDisable: true },
  { key: 'labor', label: 'Labor', canDisable: true },
  { key: 'operations', label: 'Delivery', canDisable: true },
  { key: 'guest_experience', label: 'Client Experience', canDisable: true },
  { key: 'marketing', label: 'Marketing', canDisable: true },
  { key: 'social_media', label: 'Social Media', canDisable: true },
  { key: 'employees', label: 'Team', canDisable: true },
  { key: 'tasks', label: 'Tasks', canDisable: true },
  { key: 'logs', label: 'Daily Logs', canDisable: true },
  { key: 'chat', label: 'Chat', canDisable: true },
  { key: 'crm', label: 'CRM', canDisable: true },
  { key: 'brand_kit', label: 'Brand Vault', canDisable: true },
  { key: 'marketing_hub', label: 'Marketing Hub', canDisable: true },
  { key: 'growth_audit', label: 'Growth Audit', canDisable: true },
  { key: 'capture_inbox', label: 'Capture Inbox', canDisable: true },
  { key: 'content_pipeline', label: 'Content Pipeline', canDisable: true },
  { key: 'revenue', label: 'Channel Revenue', canDisable: true },
  { key: 'affiliate_programs', label: 'Affiliate Programs', canDisable: true },
  { key: 'products', label: 'Products', canDisable: true },
  { key: 'offers', label: 'Offers', canDisable: true },
  { key: 'automation_inbox', label: 'Automation Inbox', canDisable: true },
  { key: 'reactivation', label: 'Reactivation', canDisable: true },
  { key: 'recovery_reports', label: 'Recovery Reports', canDisable: true },
  { key: 'foundation_audit', label: 'Foundation Audit', canDisable: true },
];

// Map route paths to page keys
export const ROUTE_TO_PAGE_KEY: Record<string, PageKey> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/weekly-review': 'weekly_review',
  '/insights': 'insights',
  '/sales': 'sales',
  '/labor': 'labor',
  '/operations': 'operations',
  '/guest-experience': 'guest_experience',
  '/marketing': 'marketing',
  '/social-media': 'social_media',
  '/employees': 'employees',
  '/tasks': 'tasks',
  '/logs': 'logs',
  '/logs/new': 'logs',
  '/chat': 'chat',
  '/crm': 'crm',
  '/brand-kit': 'brand_kit',
  '/marketing-hub': 'marketing_hub',
  '/growth-audit': 'growth_audit',
  '/inbox': 'capture_inbox',
  '/content': 'content_pipeline',
  '/revenue': 'revenue',
  '/affiliate-programs': 'affiliate_programs',
  '/products': 'products',
  '/offers': 'offers',
  '/automations/inbox': 'automation_inbox',
  '/automations/reactivation': 'reactivation',
  '/automations/recovery-reports': 'recovery_reports',
  '/foundation-audit': 'foundation_audit',
};
