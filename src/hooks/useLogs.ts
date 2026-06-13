import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { LogEntry, LogEntryValue, LogType, LogFormValues } from '@/types/logs';
import type { Json } from '@/integrations/supabase/types';

export function useLogs(barId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['logs', barId],
    queryFn: async (): Promise<LogEntry[]> => {
      let query = supabase
        .from('log_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (barId) {
        query = query.eq('bar_id', barId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles separately if needed
      const entries = data || [];
      if (entries.length === 0) return [];

      // Get unique creator IDs
      const creatorIds = [...new Set(entries.map(e => e.created_by))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return entries.map(entry => ({
        ...entry,
        profiles: profileMap.get(entry.created_by) || undefined,
      })) as LogEntry[];
    },
    enabled: !!user,
  });
}

export function useLogEntry(logId: string | null) {
  return useQuery({
    queryKey: ['log-entry', logId],
    queryFn: async (): Promise<LogEntry | null> => {
      if (!logId) return null;

      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .eq('id', logId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', data.created_by)
        .maybeSingle();

      return {
        ...data,
        profiles: profile || undefined,
      } as LogEntry;
    },
    enabled: !!logId,
  });
}

export function useLogEntryValues(logEntryId: string | null) {
  return useQuery({
    queryKey: ['log-entry-values', logEntryId],
    queryFn: async (): Promise<Record<string, unknown>> => {
      if (!logEntryId) return {};

      const { data, error } = await supabase
        .from('log_entry_values')
        .select('*')
        .eq('log_entry_id', logEntryId);

      if (error) throw error;

      // Convert to a map of field_id -> value
      const valuesMap: Record<string, unknown> = {};
      (data || []).forEach((val: LogEntryValue) => {
        valuesMap[val.field_id] = val.value_json;
      });

      return valuesMap;
    },
    enabled: !!logEntryId,
  });
}

export function useCreateLogEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ logType, barId }: { logType: LogType; barId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('log_entries')
        .insert({
          log_type: logType,
          bar_id: barId,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as LogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}

export function useUpdateLogEntryValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logEntryId,
      fieldId,
      value,
    }: {
      logEntryId: string;
      fieldId: string;
      value: Json;
    }) => {
      const { data, error } = await supabase
        .from('log_entry_values')
        .upsert(
          {
            log_entry_id: logEntryId,
            field_id: fieldId,
            value_json: value,
          },
          {
            onConflict: 'log_entry_id,field_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['log-entry-values', variables.logEntryId] });
    },
  });
}

export function useSaveLogValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logEntryId,
      values,
    }: {
      logEntryId: string;
      values: LogFormValues;
    }) => {
      // Convert values object to array of upsert rows
      const rows = Object.entries(values)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([fieldId, value]) => ({
          log_entry_id: logEntryId,
          field_id: fieldId,
          value_json: value as Json,
        }));

      if (rows.length === 0) return [];

      const { data, error } = await supabase
        .from('log_entry_values')
        .upsert(rows, { onConflict: 'log_entry_id,field_id' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['log-entry-values', variables.logEntryId] });
    },
  });
}

export function useSubmitLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logEntryId: string) => {
      const { data, error } = await supabase
        .from('log_entries')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', logEntryId)
        .select()
        .single();

      if (error) throw error;
      return data as LogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['log-entry'] });
    },
  });
}

export function useDeleteLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logEntryId: string) => {
      const { error } = await supabase
        .from('log_entries')
        .delete()
        .eq('id', logEntryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}
