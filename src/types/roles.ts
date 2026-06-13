export type UserRole = 'owner' | 'gm' | 'lead' | 'foh' | 'boh';

export type LayoutType = 'portfolio' | 'venue-leadership' | 'shift-execution';

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
};

export const roleToHomeRoute: Record<UserRole, string> = {
  owner: '/portfolio',
  gm: '/weekly-review',
  lead: '/staff/shift',
  foh: '/staff/my-shift',
  boh: '/staff/my-shift',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  gm: 'General Manager',
  lead: 'Lead',
  foh: 'Producer',
  boh: 'Contributor',
};

export const ROLE_PRIORITY: Record<UserRole, number> = {
  owner: 5,
  gm: 4,
  lead: 3,
  foh: 2,
  boh: 1,
};
