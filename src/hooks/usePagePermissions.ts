import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageKey, PAGE_CONFIG } from '@/types/permissions';

interface PagePermissionRow {
  id: string;
  user_id: string;
  page_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all page permissions for a specific user (admin use)
export const useUserPagePermissions = (userId: string | null) => {
  return useQuery({
    queryKey: ['page-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_page_permissions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as PagePermissionRow[];
    },
    enabled: !!userId,
  });
};

// Fetch current user's accessible pages
export const useMyPagePermissions = () => {
  return useQuery({
    queryKey: ['my-page-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check if user is admin (admins have access to everything)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        // Admins can access all pages
        return PAGE_CONFIG.map(p => p.key);
      }

      // Get disabled pages for this user
      const { data: permissions, error } = await supabase
        .from('user_page_permissions')
        .select('page_key, enabled')
        .eq('user_id', user.id)
        .eq('enabled', false);

      if (error) throw error;

      const disabledPages = new Set(permissions?.map(p => p.page_key) || []);
      
      // Return all pages that are not explicitly disabled
      return PAGE_CONFIG
        .map(p => p.key)
        .filter(key => !disabledPages.has(key));
    },
  });
};

// Update page permissions for a user (admin use)
export const useUpdatePagePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      permissions 
    }: { 
      userId: string; 
      permissions: Record<PageKey, boolean>;
    }) => {
      // For each page that is disabled (false), upsert a row with enabled=false
      // For each page that is enabled (true), delete any existing disabled row
      const disabledPages = Object.entries(permissions)
        .filter(([_, enabled]) => !enabled)
        .map(([key]) => key);

      const enabledPages = Object.entries(permissions)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      // Delete rows for enabled pages (default behavior is enabled)
      if (enabledPages.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_page_permissions')
          .delete()
          .eq('user_id', userId)
          .in('page_key', enabledPages);
        
        if (deleteError) throw deleteError;
      }

      // Upsert rows for disabled pages
      if (disabledPages.length > 0) {
        const rows = disabledPages.map(page_key => ({
          user_id: userId,
          page_key,
          enabled: false,
        }));

        const { error: upsertError } = await supabase
          .from('user_page_permissions')
          .upsert(rows, { onConflict: 'user_id,page_key' });
        
        if (upsertError) throw upsertError;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['my-page-permissions'] });
    },
  });
};
