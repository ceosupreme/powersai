import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeProfile {
  id: string;
  venue_id: string;
  employee_name: string;
  preferred_name: string | null;
  display_name: string;
  role_primary: string | null;
  role_secondary: string | null;
  is_active: boolean;
  employment_status: string | null;
  hire_date: string | null;
  termination_date: string | null;
  last_shift_date: string | null;
  hourly_wage: number | null;
  additional_venues: string[] | null;
  updated_at: string | null;
  created_at: string | null;
}

export const useEmployeeDetail = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee-detail', employeeId],
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<EmployeeProfile | null> => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('id', employeeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        display_name: ((data as any).preferred_name || (data as any).employee_name || '').trim(),
      } as EmployeeProfile;
    },
  });
};

export const useVenuesByIds = (ids: string[] | null | undefined) => {
  return useQuery({
    queryKey: ['venues-by-ids', (ids || []).slice().sort().join(',')],
    enabled: !!ids && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!ids || ids.length === 0) return [];
      const { data, error } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', ids);
      if (error) throw error;
      return data || [];
    },
  });
};
