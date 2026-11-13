import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MY_BRAND_TYPES } from '@/hooks/usePortfolioData';

export interface ManagedBrand {
  id: string;
  name: string;
  north_star: string | null;
  project_type: string;
}

/**
 * Brand-manager mode is available only to non-admin owners who actually have
 * a membership in one of the owner's brand types. Never infer brand access from a URL or a
 * fuzzy match on the business name. The backend RLS remains authoritative.
 */
export function useBrandManagerProjects() {
  const { user, role, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['brand-manager-projects', user?.id],
    enabled: !!user && role === 'owner' && !isAdmin,
    staleTime: 30_000,
    queryFn: async (): Promise<ManagedBrand[]> => {
      if (!user) return [];
      const { data: assignments, error: assignmentError } = await supabase
        .from('venue_assignments')
        .select('venue_id,role_at_venue')
        .eq('user_id', user.id);
      if (assignmentError) throw assignmentError;
      const ids = [...new Set((assignments ?? [])
        .filter((row) => row.role_at_venue === 'owner')
        .map((row) => row.venue_id))];
      if (!ids.length) return [];
      const { data: brands, error: brandError } = await supabase
        .from('venues')
        .select('id,name,north_star,project_type,is_prospect_shell')
        .in('id', ids)
        .in('project_type', [...MY_BRAND_TYPES])
        .order('name');
      if (brandError) throw brandError;
      return (brands ?? []).filter(brand => brand.is_prospect_shell !== true) as ManagedBrand[];
    },
  });
}
