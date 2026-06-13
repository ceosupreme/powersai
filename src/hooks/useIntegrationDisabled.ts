import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const QUERY_KEY = ['app_config', 'integrations_disabled'] as const;

async function fetchDisabledList(): Promise<string[]> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'integrations_disabled')
    .maybeSingle();
  if (error) return [];
  const value = data?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}

export function useDisabledIntegrations() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDisabledList,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIntegrationDisabled(name: string): boolean {
  const { data } = useDisabledIntegrations();
  return !!data?.includes(name);
}