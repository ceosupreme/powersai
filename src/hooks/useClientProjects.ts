import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface ClientProject {
  id: string;
  name: string;
}

export function useClientProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['client-projects', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ClientProject[]> => {
      const { data, error } = await (supabase as any)
        .from('venue_assignments')
        .select('venue_id, venues:venue_id(id, name, venue_name)')
        .eq('user_id', user!.id);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        venue_id: string;
        venues: { id: string; name: string | null; venue_name: string | null } | null;
      }>;
      return rows
        .map((r) => ({
          id: r.venue_id,
          name: r.venues?.name || r.venues?.venue_name || 'Your project',
        }))
        .filter((p) => !!p.id);
    },
  });
}