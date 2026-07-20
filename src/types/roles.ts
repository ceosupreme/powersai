export type UserRole = 'owner' | 'gm' | 'lead' | 'foh' | 'boh' | 'client';

export type LayoutType = 'portfolio' | 'venue-leadership' | 'shift-execution' | 'client';

export interface UserVenueRole {
  id: string;
  user_id: string;
  venue_id: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
}

export const roleToLayout: Record<UserRole, LayoutType> = {
  owner: 'portfolio',
  gm: 'venue-leadership',
  lead: 'shift-execution',
  foh: 'shift-execution',
  boh: 'shift-execution',
  client: 'client',
};

export const roleToHomeRoute: Record<UserRole, string> = {
  owner: '/portfolio',
  gm: '/weekly-review',
  lead: '/staff/shift',
  foh: '/staff/my-shift',
  boh: '/staff/my-shift',
  client: '/approvals',
};

/**
 * Single source of truth for role → home route.
 * Used by post-auth redirects, ProtectedRoute denial bounces, and the 404 fallback.
 * Changing a role's home is a one-line edit here.
 *
 * Null/unknown role → '/auth' (never a role-gated app page; avoids silent dead-ends).
 */
export function getRoleHome(role: UserRole | null | undefined): string {
  if (!role) return '/auth';
  return roleToHomeRoute[role] ?? '/auth';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  gm: 'General Manager',
  lead: 'Lead',
  foh: 'Producer',
  boh: 'Contributor',
  client: 'Client',
};

export const ROLE_PRIORITY: Record<UserRole, number> = {
  owner: 5,
  gm: 4,
  lead: 3,
  foh: 2,
  boh: 1,
  client: 0,
};
