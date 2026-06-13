import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { UserPosition, LogPosition } from '@/types/logs';

export function useUserPositions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-positions', user?.id],
    queryFn: async (): Promise<UserPosition[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_positions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []) as UserPosition[];
    },
    enabled: !!user?.id,
  });
}

export function useAllUserPositions() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['all-user-positions'],
    queryFn: async (): Promise<UserPosition[]> => {
      const { data, error } = await supabase
        .from('user_positions')
        .select('*');

      if (error) throw error;
      return (data || []) as UserPosition[];
    },
    enabled: isAdmin,
  });
}

export function useAssignPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, position }: { userId: string; position: LogPosition }) => {
      const { data, error } = await supabase
        .from('user_positions')
        .insert({ user_id: userId, position })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-positions'] });
    },
  });
}

export function useRemovePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, position }: { userId: string; position: LogPosition }) => {
      const { error } = await supabase
        .from('user_positions')
        .delete()
        .eq('user_id', userId)
        .eq('position', position);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-positions'] });
    },
  });
}
