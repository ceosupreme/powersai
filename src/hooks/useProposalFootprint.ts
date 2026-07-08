import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FootprintKey } from '@/components/proposals/types';

const CANONICAL: FootprintKey[] = ['solo_owner', 'small_crew_2_5', 'crew_6_plus', 'multi_location'];

function coerce(v: unknown): FootprintKey | null {
  if (typeof v !== 'string') return null;
  return (CANONICAL as string[]).includes(v) ? (v as FootprintKey) : null;
}

export interface ResolvedFootprint {
  value: FootprintKey | null;
  source: 'explicit' | 'source_lead' | 'recent_lead' | 'none';
}

/**
 * Best-effort footprint resolution (in order):
 *   1. explicit passed in
 *   2. venues.source_lead_id → that inbound_lead's qualifier_data.operation_footprint
 *   3. most recent inbound_lead tied to company/venue whose qualifier_data has it
 *   4. null → builder shows a manual picker
 */
export function useProposalFootprint(
  companyId: string | null | undefined,
  venueId: string | null | undefined,
  explicit?: FootprintKey | null,
) {
  return useQuery({
    queryKey: ['proposal-footprint', companyId ?? null, venueId ?? null, explicit ?? null],
    enabled: true,
    staleTime: 60_000,
    queryFn: async (): Promise<ResolvedFootprint> => {
      if (explicit) return { value: explicit, source: 'explicit' };

      // (2) venues.source_lead_id
      if (venueId) {
        const { data: venue } = await (supabase as any)
          .from('venues')
          .select('source_lead_id')
          .eq('id', venueId)
          .maybeSingle();
        const leadId = venue?.source_lead_id ?? null;
        if (leadId) {
          const { data: lead } = await (supabase as any)
            .from('inbound_leads')
            .select('qualifier_data')
            .eq('id', leadId)
            .maybeSingle();
          const raw = (lead?.qualifier_data as any)?.operation_footprint;
          const v = coerce(raw);
          if (v) return { value: v, source: 'source_lead' };
        }
      }

      // (3) recent inbound_lead for company/venue
      let q: any = (supabase as any)
        .from('inbound_leads')
        .select('qualifier_data,created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (companyId) q = q.eq('company_id', companyId);
      else if (venueId) q = q.eq('venue_id', venueId);
      else return { value: null, source: 'none' };
      const { data: leads } = await q;
      for (const lead of leads ?? []) {
        const v = coerce((lead.qualifier_data as any)?.operation_footprint);
        if (v) return { value: v, source: 'recent_lead' };
      }
      return { value: null, source: 'none' };
    },
  });
}

export const FOOTPRINT_SOURCE_LABEL: Record<ResolvedFootprint['source'], string> = {
  explicit: 'Provided',
  source_lead: 'From the audit lead',
  recent_lead: 'From a prior lead',
  none: 'Not resolved — set manually',
};