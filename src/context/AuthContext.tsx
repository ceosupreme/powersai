import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { Profile, AppRole } from '@/types/auth';
import { PageKey, PAGE_CONFIG, STAFF_PORTAL_ROLES, ROLE_HIERARCHY } from '@/types/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  assignedBarIds: string[];
  accessiblePages: PageKey[];
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isGM: boolean;
  isShiftLead: boolean;
  isStaffPortal: boolean;
  canAccessPage: (pageKey: PageKey) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const makeFallbackProfile = (userId: string, email?: string | null): Profile => ({
  id: userId,
  email: email ?? null,
  full_name: null,
  avatar_url: null,
  assigned_bar_id: null,
  assigned_bar_name: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [assignedBarIds, setAssignedBarIds] = useState<string[]>([]);
  const [accessiblePages, setAccessiblePages] = useState<PageKey[]>(PAGE_CONFIG.map(p => p.key));
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounterRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    const thisCall = ++fetchCounterRef.current;

    try {
      const [profileResult, roleResult, barResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('user_bar_assignments').select('bar_id').eq('user_id', userId),
      ]);

      // Stale call — a newer one superseded us
      if (fetchCounterRef.current !== thisCall) return;

      // Profile
      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
      }
      setProfile(profileResult.data ?? makeFallbackProfile(userId, userEmail));

      // Role
      const userRole = (roleResult.data?.role as AppRole) || 'staff';
      if (roleResult.error) {
        console.error('Error fetching role:', roleResult.error);
      }
      setRole(userRole);

      // Bar assignments
      if (barResult.error) {
        console.error('Error fetching bar assignments:', barResult.error);
        setAssignedBarIds([]);
      } else {
        setAssignedBarIds(barResult.data?.map(a => a.bar_id) || []);
      }

      // Page access
      if (userRole === 'admin') {
        setAccessiblePages(PAGE_CONFIG.map(p => p.key));
      } else {
        const { data: roleDefaults, error: defaultsError } = await supabase
          .from('role_page_defaults')
          .select('page_key, enabled')
          .eq('role', userRole);

        if (fetchCounterRef.current !== thisCall) return;

        if (defaultsError) {
          console.error('Error fetching role page defaults:', defaultsError);
          setAccessiblePages(PAGE_CONFIG.map(p => p.key));
        } else if (roleDefaults && roleDefaults.length > 0) {
          setAccessiblePages(roleDefaults.filter(d => d.enabled).map(d => d.page_key as PageKey));
        } else {
          setAccessiblePages(PAGE_CONFIG.map(p => p.key));
        }
      }
    } catch (err) {
      if (fetchCounterRef.current !== thisCall) return;
      console.error('Error in fetchProfile:', err);
      setProfile(makeFallbackProfile(userId, userEmail));
      setRole('staff');
      setAssignedBarIds([]);
      setAccessiblePages(PAGE_CONFIG.map(p => p.key));
    } finally {
      if (fetchCounterRef.current === thisCall) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setAssignedBarIds([]);
          setAccessiblePages(PAGE_CONFIG.map(p => p.key));
          setIsLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !newSession) {
          console.warn('Token refresh returned null session, keeping existing state');
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          if (event === 'TOKEN_REFRESHED') {
            queryClient.invalidateQueries();
          }
          // Defer async work outside the callback per Supabase best practices
          const userId = newSession.user.id;
          const userEmail = newSession.user.email;
          setTimeout(() => fetchProfile(userId, userEmail), 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        fetchProfile(s.user.id, s.user.email);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName.trim() },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
    setAssignedBarIds([]);
    setAccessiblePages(PAGE_CONFIG.map(p => p.key));
    try { localStorage.removeItem('barpulse_selectedBar'); } catch {}
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email ?? undefined);
    }
  };

  const isAdmin = role === 'admin';
  const isOwner = role === 'owner';
  const isGM = role === 'gm';
  const isShiftLead = role === 'shift_lead';
  const isStaffPortal = role !== null && STAFF_PORTAL_ROLES.includes(role);

  const canAccessPage = useCallback((pageKey: PageKey): boolean => {
    if (isAdmin) return true;
    return accessiblePages.includes(pageKey);
  }, [accessiblePages, isAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, role, assignedBarIds, accessiblePages,
        isLoading, isAdmin, isOwner, isGM, isShiftLead, isStaffPortal,
        canAccessPage, signIn, signUp, signOut, refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
