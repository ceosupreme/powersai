import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Bar, Week } from '@/types/venue';
import { venueToBar, venueWeekToWeek } from '@/types/venue';
import { useBars, useWeeks } from '@/hooks/useVenueData';
import { todayPacific } from '@/lib/utils';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AppContextType {
  bars: Bar[];
  accessibleBars: Bar[];
  weeks: Week[];
  selectedBar: Bar | null;
  selectedWeek: Week | null;
  setSelectedBar: (bar: Bar) => void;
  setSelectedWeek: (week: Week) => void;
  isLoading: boolean;
  error: string | null;
  supabaseBarId: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'barpulse_selectedBar';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const { isAdmin, assignedBarIds, user, isLoading: authLoading, profile } = auth;
  const [selectedBar, setSelectedBarState] = useState<Bar | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);

  // Wrapper that persists to localStorage
  const setSelectedBar = (bar: Bar) => {
    setSelectedBarState(bar);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bar));
    } catch {}
  };

  // Use React Query for bars and weeks - only fetch when user is authenticated
  const isAuthenticated = !authLoading && !!user;
  const barsQuery = useBars(isAuthenticated);
  const weeksQuery = useWeeks(isAuthenticated);
  
  const bars = barsQuery.data ?? [];
  const weeks = weeksQuery.data ?? [];

  const isLoading = authLoading || barsQuery.isLoading || weeksQuery.isLoading;
  const error = barsQuery.error?.message || weeksQuery.error?.message || null;

  const supabaseBarId = selectedBar?.id || profile?.assigned_bar_id || null;

  // Fetch venue names from venue_assignments for the current user
  const venueNamesQuery = useQuery({
    queryKey: ['venue-assignment-names', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('venue_assignments')
        .select('venue_id, venues!inner(name)')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []).map((row: any) => (row.venues?.name as string) ?? '').filter(Boolean);
    },
    enabled: isAuthenticated && !!user?.id,
  });

  const assignedVenueNames = venueNamesQuery.data ?? [];

  // Filter bars based on user role and assignments
  const accessibleBars = useMemo(() => {
    if (isAdmin) return bars;
    
    // Try matching by bar_id in user_bar_assignments (legacy Airtable IDs)
    const byAssignment = bars.filter(bar => assignedBarIds.includes(bar.id));
    if (byAssignment.length > 0) return byAssignment;

    // Try matching by venue names from venue_assignments against bar_name
    if (assignedVenueNames.length > 0) {
      const lowerNames = assignedVenueNames.map(n => n.toLowerCase());
      const byVenueName = bars.filter(bar => 
        lowerNames.some(name => 
          bar.bar_name.toLowerCase() === name ||
          bar.bar_name.toLowerCase().includes(name) ||
          name.includes(bar.bar_name.toLowerCase())
        )
      );
      if (byVenueName.length > 0) return byVenueName;
    }
    
    // Fallback: match by profile's assigned_bar_name
    if (profile?.assigned_bar_name) {
      const profileName = profile.assigned_bar_name.toLowerCase();
      const byName = bars.filter(bar => 
        bar.bar_name.toLowerCase() === profileName ||
        bar.bar_name.toLowerCase().includes(profileName) ||
        profileName.includes(bar.bar_name.toLowerCase())
      );
      if (byName.length > 0) return byName;
    }
    
    // Last resort: create synthetic bar from profile data so selectedBar is never null
    if (profile?.assigned_bar_name && profile?.assigned_bar_id) {
      return [{
        id: profile.assigned_bar_id,
        bar_id: profile.assigned_bar_id,
        bar_name: profile.assigned_bar_name,
        city: '',
        owner_name: '',
        gm_name: '',
      } as Bar];
    }
    
    return [];
  }, [bars, assignedBarIds, isAdmin, profile, assignedVenueNames]);

  // Set default week when weeks load — prefer last completed week
  useEffect(() => {
    if (weeks.length > 0 && !selectedWeek) {
      const todayStr = todayPacific();
      const completed = weeks.filter(w => w.week_end < todayStr);
      setSelectedWeek(completed[0] || weeks[0]);
    }
  }, [weeks, selectedWeek]);

  // Clear persisted bar selection when user identity changes
  const prevUserIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (user?.id && prevUserIdRef.current && prevUserIdRef.current !== user.id) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setSelectedBarState(null);
      setSelectedWeek(null);
    }
    prevUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Restore from localStorage or set default bar when accessible bars change
  useEffect(() => {
    if (accessibleBars.length === 0) return;
    
    if (!selectedBar) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Bar;
          if (accessibleBars.find(b => b.id === parsed.id)) {
            setSelectedBarState(parsed);
            return;
          }
        }
      } catch {}
      setSelectedBar(accessibleBars[0]);
    } else if (!accessibleBars.find(b => b.id === selectedBar.id)) {
      setSelectedBar(accessibleBars[0]);
    }
  }, [accessibleBars, selectedBar]);

  // Filter weeks when bar changes — prefer last completed week
  useEffect(() => {
    if (selectedBar && weeks.length > 0) {
      const todayStr = todayPacific();
      const barWeeks = weeks.filter(w => w.bar?.includes(selectedBar.id));
      const completedBarWeeks = barWeeks.filter(w => w.week_end < todayStr);
      const pool = completedBarWeeks.length > 0 ? completedBarWeeks : barWeeks;
      if (pool.length > 0) {
        if (!selectedWeek || !pool.find(w => w.id === selectedWeek.id)) {
          setSelectedWeek(pool[0]);
        }
      } else {
        setSelectedWeek(null);
      }
    } else if (selectedBar && weeks.length === 0) {
      setSelectedWeek(null);
    }
  }, [selectedBar, weeks, selectedWeek]);

  return (
    <AppContext.Provider
      value={{
        bars,
        accessibleBars,
        weeks,
        selectedBar,
        selectedWeek,
        setSelectedBar,
        setSelectedWeek,
        isLoading,
        error,
        supabaseBarId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
