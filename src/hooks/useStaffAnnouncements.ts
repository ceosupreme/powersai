import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import type { Department } from '@/hooks/useStaffDepartment';

export interface StaffAnnouncement {
  id: string;
  bar_id: string;
  title: string;
  message: string;
  urgent: boolean;
  departments: string[];
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

export function useStaffAnnouncements(department: Department) {
  const { user } = useAuth();
  const { selectedBar } = useApp();

  return useQuery({
    queryKey: ['staff-announcements', selectedBar?.id, department],
    queryFn: async (): Promise<StaffAnnouncement[]> => {
      if (!selectedBar?.id) return [];

      const { data, error } = await supabase
        .from('staff_announcements')
        .select('*')
        .eq('bar_id', selectedBar.id)
        .contains('departments', [department])
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as StaffAnnouncement[];
    },
    enabled: !!user && !!selectedBar?.id,
  });
}
