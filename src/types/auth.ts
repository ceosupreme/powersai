export type AppRole = 'admin' | 'owner' | 'gm' | 'shift_lead' | 'staff';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  assigned_bar_id: string | null;
  assigned_bar_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface UserBarAssignment {
  id: string;
  user_id: string;
  bar_id: string;
  created_at: string;
}
