import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { foundationStatusKey } from '@/components/foundation-audit/useFoundationScores';
import type { FoundationStatus } from '@/components/foundation-audit/deriveFoundationScores';

export interface UpsertFoundationStatusInput {
  venue_id: string;
  item_key: string;
  status: FoundationStatus;
  evidence_url?: string | null;
  notes?: string | null;
}

export function useUpsertFoundationItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertFoundationStatusInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('venue_foundation_item_status')
        .upsert(
          {
            venue_id: input.venue_id,
            item_key: input.item_key,
            status: input.status,
            evidence_url: input.evidence_url ?? null,
            notes: input.notes ?? null,
            source: 'manual',
            updated_by: user?.id ?? null,
            detected_at: new Date().toISOString(),
          },
          { onConflict: 'venue_id,item_key' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: foundationStatusKey(vars.venue_id) });
    },
  });
}