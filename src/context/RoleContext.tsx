import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { UserRole, LayoutType, Venue, UserVenueRole, roleToLayout } from '@/types/roles';

interface RoleContextType {
  currentRole: UserRole | null;
  currentVenue: Venue | null;
  allVenueRoles: UserVenueRole[];
  layout: LayoutType | null;
  setCurrentVenue: (venueId: string | null) => void;
  isLoading: boolean;
  refreshRoles: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, role: verifiedRole, isLoading: authLoading } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentVenue, setCurrentVenueState] = useState<Venue | null>(null);
  const [allVenueRoles, setAllVenueRoles] = useState<UserVenueRole[]>([]);
  const [layout, setLayout] = useState<LayoutType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;
  const requestRef = useRef(0);
  const identityRef = useRef(userId);
  identityRef.current = userId;

  const loadRoles = useCallback(async () => {
    const request = ++requestRef.current;
    const isCurrent = () => requestRef.current === request && identityRef.current === userId;
    setCurrentRole(null);
    setCurrentVenueState(null);
    setAllVenueRoles([]);
    setLayout(null);
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!userId || !verifiedRole) {
      setCurrentRole(null);
      setCurrentVenueState(null);
      setAllVenueRoles([]);
      setLayout(null);
      setIsLoading(false);
      return;
    }

    // Global client authority wins over legacy venue-role labels. A designated
    // client may have membership in either assignment table, but never receives
    // an operator layout or home route from an old venue role.
    if (verifiedRole === 'client') {
      setCurrentRole('client');
      setLayout('client');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch venue roles - cast to work around types not being regenerated yet
      const { data: roles, error } = await (supabase
        .from('user_venue_roles' as any)
        .select('*')
        .eq('user_id', userId)) as { data: UserVenueRole[] | null; error: any };

      if (!isCurrent()) return;
      if (error) {
        console.error('Error fetching venue roles:', error);
        setIsLoading(false);
        return;
      }

      if (!roles || roles.length === 0) {
        // No venue roles assigned - map legacy role to a valid UserRole
        const legacyMap: Partial<Record<typeof verifiedRole, { role: UserRole; layout: LayoutType }>> = {
          admin: { role: 'owner', layout: 'portfolio' },
          owner: { role: 'owner', layout: 'portfolio' },
          gm: { role: 'gm', layout: 'venue-leadership' },
          manager: { role: 'gm', layout: 'venue-leadership' },
          shift_lead: { role: 'lead', layout: 'shift-execution' },
          staff: { role: 'foh', layout: 'shift-execution' },
        };
        const mapped = legacyMap[verifiedRole];
        if (mapped) {
          setCurrentRole(mapped.role);
          setLayout(mapped.layout);
        }
        setIsLoading(false);
        return;
      }

      setAllVenueRoles(roles);

      // Check for portfolio-level owner (venue_id = null)
      const ownerRole = roles.find(r => r.role === 'owner' && !r.venue_id);
      if (ownerRole) {
        setCurrentRole('owner');
        setCurrentVenueState(null);
        setLayout('portfolio');
        setIsLoading(false);
        return;
      }

      // Use highest-priority role
      const sortedRoles = [...roles].sort((a, b) => {
        const priority: Record<string, number> = { owner: 5, gm: 4, lead: 3, foh: 2, boh: 1 };
        return (priority[b.role] || 0) - (priority[a.role] || 0);
      });

      const primaryRole = sortedRoles[0];
      setCurrentRole(primaryRole.role);
      setLayout(roleToLayout[primaryRole.role]);

      // Fetch venue details if venue_id exists
      if (primaryRole.venue_id) {
        const { data: venue } = await supabase
          .from('venues')
          .select('id, name, address')
          .eq('id', primaryRole.venue_id)
          .maybeSingle();

        if (isCurrent() && venue) {
          setCurrentVenueState(venue as Venue);
        }
      }
    } catch (err) {
      if (!isCurrent()) return;
      console.error('Error in loadRoles:', err);
      setCurrentRole(null);
      setAllVenueRoles([]);
      setCurrentVenueState(null);
      setLayout(null);
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [userId, verifiedRole, authLoading]);

  useEffect(() => {
    void loadRoles();
    return () => { requestRef.current += 1; };
  }, [loadRoles]);

  const setCurrentVenue = useCallback(async (venueId: string | null) => {
    if (!venueId) {
      // Return to portfolio view (owner only)
      if (currentRole === 'owner') {
        setCurrentVenueState(null);
        setLayout('portfolio');
      }
      return;
    }

    const userId = identityRef.current;
    if (!userId) return;
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name, address')
      .eq('id', venueId)
      .maybeSingle();

    if (identityRef.current === userId && venue) {
      setCurrentVenueState(venue as Venue);
      // Owner drilling into a venue gets venue-leadership layout
      if (currentRole === 'owner') {
        setLayout('venue-leadership');
      }
    }
  }, [currentRole]);

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentVenue,
        allVenueRoles,
        layout,
        setCurrentVenue,
        isLoading,
        refreshRoles: loadRoles,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    // During HMR or edge cases, return safe defaults instead of crashing
    console.warn('useRole called outside RoleProvider — returning defaults');
    return {
      currentRole: null,
      currentVenue: null,
      allVenueRoles: [],
      layout: null,
      setCurrentVenue: () => {},
      isLoading: true,
      refreshRoles: async () => {},
    } as RoleContextType;
  }
  return context;
};
