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
  | 'chat';

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
  { key: 'sales', label: 'Sales', canDisable: true },
  { key: 'labor', label: 'Labor', canDisable: true },
  { key: 'operations', label: 'Operations', canDisable: true },
  { key: 'guest_experience', label: 'Guest Experience', canDisable: true },
  { key: 'marketing', label: 'Marketing', canDisable: true },
  { key: 'social_media', label: 'Social Media', canDisable: true },
  { key: 'employees', label: 'Employees', canDisable: true },
  { key: 'tasks', label: 'Tasks', canDisable: true },
  { key: 'logs', label: 'Daily Logs', canDisable: true },
  { key: 'chat', label: 'Chat', canDisable: true },
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
};
