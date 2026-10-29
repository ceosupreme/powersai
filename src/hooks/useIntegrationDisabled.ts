import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const QUERY_KEY = ['app_config', 'integrations_disabled'] as const;

async function fetchDisabledList(): Promise<string[]> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'integrations_disabled')
    .maybeSingle();
  if (error) throw error;
  const value = data?.value;
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error('Integration configuration unavailable');
  }
  return value as string[];
}

export function useDisabledIntegrations() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDisabledList,
    staleTime: 5 * 60 * 1000,
  });
}

/** Unknown availability must not briefly start a disabled provider while the
 * configuration query loads or recovers. This is also the safe deployment pause
 * for private voice until its matching authenticated proxy is available. */
export function integrationIsDisabled(name: string, list: readonly string[] | undefined, unavailable = false): boolean {
  return unavailable || !list || list.includes(name);
}

export function useIntegrationDisabled(name: string): boolean {
  const { data, isError } = useDisabledIntegrations();
  return integrationIsDisabled(name, data, isError);
}