// Live per-venue connector state for the operator's legacy in-use sources.
// Everything here is READ-ONLY: latest-row/latest-run recency, nothing else.
// A source with zero rows renders "Never synced" — never "Connected".

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ConnectorRecency = {
  lastAt: string | null;
  ageDays: number | null;
};

export type ConnectorStatuses = {
  toast: ConnectorRecency;
  sevenshifts: ConnectorRecency;
  asana: ConnectorRecency;
  googleReviews: ConnectorRecency;
  managerLogs: ConnectorRecency;
  sculpture: ConnectorRecency;
};

const DAY = 86_400_000;

const recency = (iso: string | null | undefined): ConnectorRecency => {
  if (!iso) return { lastAt: null, ageDays: null };
  return { lastAt: iso, ageDays: (Date.now() - Date.parse(iso)) / DAY };
};

const latestOf = async (
  table: 'sync_runs',
  syncType: string,
  venueId: string,
): Promise<string | null> => {
  const { data } = await supabase
    .from(table)
    .select('completed_at')
    .eq('bar_id', venueId)
    .eq('sync_type', syncType)
    .eq('status', 'success')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.completed_at as string | null | undefined) ?? null;
};

const pickLatest = (r: any): string | null =>
  (r?.data?.created_at as string | null | undefined) ?? null;

export const connectorStatusesKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'connector-statuses', venueId ?? 'none'] as const;

export function useConnectorStatuses(venueId: string | null | undefined) {
  return useQuery({
    queryKey: connectorStatusesKey(venueId),
    enabled: !!venueId,
    staleTime: 60_000,
    queryFn: async (): Promise<ConnectorStatuses> => {
      const v = venueId!;
      const promises: Array<Promise<string | null>> = [
        latestOf('sync_runs', 'toast', v),
        latestOf('sync_runs', '7shifts', v),
        (supabase.from('venue_asana_sync_health').select('last_success_at').eq('venue_id', v).maybeSingle() as any)
          .then((r: any) => (r?.data?.last_success_at as string | null | undefined) ?? null),
        (supabase.from('google_reviews').select('created_at').eq('bar_id', v).order('created_at', { ascending: false }).limit(1).maybeSingle() as any)
          .then(pickLatest),
        (supabase.from('gm_logs').select('created_at').eq('bar_id', v).order('created_at', { ascending: false }).limit(1).maybeSingle() as any)
          .then(pickLatest),
        (supabase.from('lead_logs').select('created_at').eq('venue_id', v).order('created_at', { ascending: false }).limit(1).maybeSingle() as any)
          .then(pickLatest),
        (supabase.from('manager_logs').select('created_at').eq('venue_id', v).order('created_at', { ascending: false }).limit(1).maybeSingle() as any)
          .then(pickLatest),
        (supabase.from('inventory_reports').select('created_at').eq('venue_id', v).order('created_at', { ascending: false }).limit(1).maybeSingle() as any)
          .then(pickLatest),
      ];
      const [toast, seven, asanaHealth, gr, gm, lead, mgr, inv] = await Promise.all(promises);
      const managerLogsLatest = [gm, lead, mgr]
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;
      return {
        toast: recency(toast),
        sevenshifts: recency(seven),
        asana: recency(asanaHealth),
        googleReviews: recency(gr),
        managerLogs: recency(managerLogsLatest),
        sculpture: recency(inv),
      };
    },
  });
}