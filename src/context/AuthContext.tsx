import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { Profile, AppRole } from '@/types/auth';
import { resolvePageAccess } from '@/lib/pageAccess';
import { PageKey, PAGE_CONFIG, STAFF_PORTAL_ROLES } from '@/types/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  assignedBarIds: string[];
  accessiblePages: PageKey[];
  isLoading: boolean;
  permissionsError: string | null;
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
  const [accessiblePages, setAccessiblePages] = useState<PageKey[]>([]);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounterRef = useRef(0);
  const identityRef = useRef<string | null | undefined>(undefined);

  const resetPrivateState = useCallback(() => {
    // Clearing also cancels cached queries. Results from the previous session
    // must never populate a page whose query key is not scoped by user ID.
    queryClient.clear();
    fetchCounterRef.current += 1;
    setProfile(null);
    setRole(null);
    setAssignedBarIds([]);
    setAccessiblePages([]);
    setPermissionsError(null);
  }, []);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    if (identityRef.current !== userId) return;
    const thisCall = ++fetchCounterRef.current;
    const isCurrent = () => fetchCounterRef.current === thisCall && identityRef.current === userId;

    try {
      const [profileResult, roleResult, barResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('user_bar_assignments').select('bar_id').eq('user_id', userId),
      ]);
      if (!isCurrent()) return;
      if (roleResult.error) throw roleResult.error;

      const verifiedRoles: AppRole[] = ['admin', 'owner', 'gm', 'manager', 'shift_lead', 'staff', 'client'];
      const rawRole = roleResult.data?.role as AppRole | undefined;
      const userRole = rawRole && verifiedRoles.includes(rawRole) ? rawRole : null;
      let pages: PageKey[] = [];
      let accessError: string | null = null;
      if (userRole === 'admin') {
        pages = resolvePageAccess(userRole, [], PAGE_CONFIG.map(p => p.key));
      } else if (userRole) {
        const { data, error } = await supabase
          .from('role_page_defaults')
          .select('page_key, enabled')
          .eq('role', userRole);
        if (!isCurrent()) return;
        pages = resolvePageAccess(userRole, data, PAGE_CONFIG.map(p => p.key), !!error);
        if (error) {
          console.error('Error fetching role page defaults:', error);
          accessError = 'Could not verify your page permissions. Try again or contact your admin.';
        } else if (!pages.length) {
          accessError = 'No pages have been assigned to this account. Contact your admin for access.';
        }
      }
      if (!isCurrent()) return;
      if (profileResult.error) console.error('Error fetching profile:', profileResult.error);
      if (barResult.error) console.error('Error fetching bar assignments:', barResult.error);
      // Commit permissions together, only for the identity that requested them.
      setProfile(profileResult.data ?? makeFallbackProfile(userId, userEmail));
      setRole(userRole);
      setAssignedBarIds(barResult.error ? [] : (barResult.data ?? []).map(a => a.bar_id));
      setAccessiblePages(pages);
      setPermissionsError(accessError);
    } catch (err) {
      if (!isCurrent()) return;
      console.error('Error in fetchProfile:', err);
      setProfile(makeFallbackProfile(userId, userEmail));
      setRole(null);
      setAssignedBarIds([]);
      setAccessiblePages([]);
      setPermissionsError('Could not verify your account access. Try again or contact your admin.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const applySession = (newSession: Session | null, event?: string) => {
      if (!active) return;
      const nextId = newSession?.user.id ?? null;
      if (identityRef.current !== nextId) {
        // The initial anonymous session has no private identity to clear. Keep
        // its in-flight public-site queries attached to their observers.
        if (identityRef.current !== undefined || nextId !== null) resetPrivateState();
        identityRef.current = nextId;
        setIsLoading(!!nextId);
        try {
          const savedIdentity = localStorage.getItem('hq_session_identity');
          if (!nextId || savedIdentity !== nextId) localStorage.removeItem('barpulse_selectedBar');
          if (nextId) localStorage.setItem('hq_session_identity', nextId);
          else localStorage.removeItem('hq_session_identity');
        } catch { /* Storage can be disabled by the browser. */ }
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        if (event === 'TOKEN_REFRESHED') void queryClient.invalidateQueries();
        // Run Supabase queries outside the auth event callback.
        const { id, email } = newSession.user;
        setTimeout(() => { if (active && identityRef.current === id) void fetchProfile(id, email); }, 0);
      } else {
        setIsLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      authEventReceived = true;
      applySession(newSession, event);
    });
    void supabase.auth.getSession().then(({ data: { session: initial }, error }) => {
      // A late initial-session read may not replace a newer sign-in/sign-out.
      if (active && !authEventReceived) applySession(error ? null : initial);
    }).catch(() => {
      if (active && !authEventReceived) applySession(null);
    });
    return () => {
      active = false;
      fetchCounterRef.current += 1;
      subscription.unsubscribe();
    };
  }, [fetchProfile, resetPrivateState]);

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
    // Local state disappears immediately even if the network sign-out is slow.
    identityRef.current = null;
    resetPrivateState();
    setSession(null);
    setUser(null);
    setIsLoading(false);
    try {
      localStorage.removeItem('barpulse_selectedBar');
      localStorage.removeItem('hq_session_identity');
    } catch { /* Storage can be disabled by the browser. */ }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email ?? undefined);
    }
  };

  const isAdmin = !!user && !isLoading && role === 'admin';
  const isOwner = role === 'owner';
  const isGM = role === 'gm' || role === 'manager';
  const isShiftLead = role === 'shift_lead';
  const isStaffPortal = role !== null && STAFF_PORTAL_ROLES.includes(role);

  const canAccessPage = useCallback((pageKey: PageKey): boolean => {
    if (!user || isLoading || !role) return false;
    return isAdmin || accessiblePages.includes(pageKey);
  }, [accessiblePages, isAdmin, user, isLoading, role]);

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, role, assignedBarIds, accessiblePages,
        isLoading, permissionsError, isAdmin, isOwner, isGM, isShiftLead, isStaffPortal,
        canAccessPage, signIn, signUp, signOut, refreshProfile,
      }}
    >
      <React.Fragment key={user?.id ?? 'signed-out'}>{children}</React.Fragment>
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
