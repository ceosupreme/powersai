import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PAGE_CONFIG } from '@/types/permissions';
import { overridePlan, resolvePageAccess } from '@/lib/pageAccess';

const KNOWN = PAGE_CONFIG.map(p => p.key);

/** Pages a role starts with (same rule AuthContext uses: missing rows are off). */
export const useRoleDefaultPages = (role: string | null) => useQuery({
  queryKey: ['role-page-defaults', role],
  enabled: !!role && role !== 'admin',
  queryFn: async () => {
    const { data, error } = await supabase.from('role_page_defaults').select('page_key, enabled').eq('role', role as any);
    if (error) throw error;
    return new Set<string>(resolvePageAccess(role, data, KNOWN));
  },
});

/** One person's saved overrides (admin use). */
export const useUserPagePermissions = (userId: string | null) => useQuery({
  queryKey: ['page-permissions', userId],
  enabled: !!userId,
  queryFn: async () => {
    const { data, error } = await supabase.from('user_page_permissions').select('page_key, enabled').eq('user_id', userId!);
    if (error) throw error;
    return data ?? [];
  },
});

/** Writes rows only where a switch differs from the role default, removes the rest, then reads back to confirm. */
export const useSaveUserPagePermissions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, desired, roleDefaults }: { userId: string; desired: Record<string, boolean>; roleDefaults: Set<string> }) => {
      const plan = overridePlan(desired, roleDefaults);
      if (plan.remove.length) {
        const { error } = await supabase.from('user_page_permissions').delete().eq('user_id', userId).in('page_key', plan.remove);
        if (error) throw error;
      }
      if (plan.upsert.length) {
        const { error } = await supabase.from('user_page_permissions')
          .upsert(plan.upsert.map(r => ({ user_id: userId, ...r })), { onConflict: 'user_id,page_key' });
        if (error) throw error;
      }
      const { data, error } = await supabase.from('user_page_permissions').select('page_key, enabled').eq('user_id', userId);
      if (error) throw error;
      const saved = new Map((data ?? []).map(r => [r.page_key, r.enabled]));
      const confirmed = plan.upsert.every(r => saved.get(r.page_key) === r.enabled) && plan.remove.every(k => !saved.has(k));
      if (!confirmed) throw new Error('The saved menu items could not be confirmed.');
      return data ?? [];
    },
    onSuccess: async (_d, { userId }) => {
      await qc.invalidateQueries({ queryKey: ['page-permissions', userId] });
    },
  });
};

/** Clears every override for one person, then confirms none remain. */
export const useResetUserPagePermissions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('user_page_permissions').delete().eq('user_id', userId);
      if (error) throw error;
      const { data, error: readError } = await supabase.from('user_page_permissions').select('page_key').eq('user_id', userId);
      if (readError) throw readError;
      if ((data ?? []).length) throw new Error('Some overrides could not be cleared.');
    },
    onSuccess: async (_d, userId) => { await qc.invalidateQueries({ queryKey: ['page-permissions', userId] }); },
  });
};
