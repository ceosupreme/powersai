import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentVenue, setCurrentVenueState] = useState<Venue | null>(null);
  const [allVenueRoles, setAllVenueRoles] = useState<UserVenueRole[]>([]);
  const [layout, setLayout] = useState<LayoutType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoles = useCallback(async () => {
    if (!user) {
      setCurrentRole(null);
      setCurrentVenueState(null);
      setAllVenueRoles([]);
      setLayout(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch venue roles - cast to work around types not being regenerated yet
      const { data: roles, error } = await (supabase
        .from('user_venue_roles' as any)
        .select('*')
        .eq('user_id', user.id)) as { data: UserVenueRole[] | null; error: any };

      if (error) {
        console.error('Error fetching venue roles:', error);
        setIsLoading(false);
        return;
      }

      if (!roles || roles.length === 0) {
        // No venue roles assigned - map legacy role to a valid UserRole
        const { data: legacyRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (legacyRole?.role) {
          const legacyMap: Record<string, { role: UserRole; layout: LayoutType }> = {
            admin: { role: 'owner', layout: 'portfolio' },
            owner: { role: 'owner', layout: 'portfolio' },
            gm: { role: 'gm', layout: 'venue-leadership' },
            manager: { role: 'gm', layout: 'venue-leadership' },
            shift_lead: { role: 'lead', layout: 'shift-execution' },
            lead: { role: 'lead', layout: 'shift-execution' },
            client: { role: 'client', layout: 'client' },
          };
          const mapped = legacyMap[legacyRole.role] || { role: 'foh' as UserRole, layout: 'shift-execution' as LayoutType };
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

        if (venue) {
          setCurrentVenueState(venue as Venue);
        }
      }
    } catch (err) {
      console.error('Error in loadRoles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRoles();
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

    const { data: venue } = await supabase
      .from('venues')
      .select('id, name, address')
      .eq('id', venueId)
      .maybeSingle();

    if (venue) {
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
