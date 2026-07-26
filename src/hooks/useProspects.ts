import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProspectStatus = 'new' | 'checked' | 'queued' | 'contacted' | 'dead' | 'promoted';

export interface Prospect {
  id: string;
  source: string;
  niche: string | null;
  city: string | null;
  business_name: string;
  place_id: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  status: ProspectStatus;
  leak_run_id: string | null;
  leak_total: number | null;
  risk_total: number | null;
  shell_venue_id: string | null;
  last_error: string | null;
  promoted_lead_id: string | null;
  promoted_company_id: string | null;
  miner_run_id: string | null;
  checked_at: string | null;
  created_at: string;
}

export interface MinerRun {
  id: string;
  niche: string | null;
  city: string | null;
  requested: number;
  found: number;
  kept: number;
  checked: number;
  status: string;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

const db = supabase as any;

export function useProspects() {
  return useQuery({
    queryKey: ['prospects'],
    queryFn: async (): Promise<Prospect[]> => {
      const { data, error } = await db
        .from('prospects')
        .select('*')
        .order('leak_total', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Prospect[];
    },
  });
}

export function useMinerRuns(limit = 5) {
  return useQuery({
    queryKey: ['miner_runs', limit],
    queryFn: async (): Promise<MinerRun[]> => {
      const { data, error } = await db
        .from('miner_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as MinerRun[];
    },
  });
}

function fnError(e: any): string {
  return e?.message ?? 'Request failed';
}

export interface MineResult {
  miner_run_id: string;
  found: number;
  kept: number;
  checked: number;
  errors: string[];
}

export function useProspectMutations() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['prospects'] });
    qc.invalidateQueries({ queryKey: ['miner_runs'] });
  };

  return {
    /**
     * Mine, then run the cold checkup for each new prospect SEQUENTIALLY with a
     * small delay. One prospect per checkup-prospect invocation, so a single
     * failure marks that row and the batch continues.
     */
    mine: useMutation({
      mutationFn: async (input: {
        niche: string;
        city: string;
        max_results: number;
        onProgress?: (msg: string) => void;
      }): Promise<MineResult> => {
        const { onProgress } = input;
        onProgress?.('Querying Google Places…');
        const { data, error } = await supabase.functions.invoke('mine-prospects', {
          body: { niche: input.niche, city: input.city, max_results: input.max_results },
        });
        if (error) throw new Error(fnError(error));
        if ((data as any)?.error) throw new Error(String((data as any).error));

        const runId = (data as any).miner_run_id as string;
        const ids = ((data as any).prospect_ids ?? []) as string[];
        const found = (data as any).found ?? 0;
        const kept = (data as any).kept ?? 0;

        let checked = 0;
        const errors: string[] = [];

        for (let i = 0; i < ids.length; i++) {
          onProgress?.(`Checking prospect ${i + 1} of ${ids.length}…`);
          try {
            const { data: r, error: e } = await supabase.functions.invoke('checkup-prospect', {
              body: { prospect_id: ids[i] },
            });
            if (e) errors.push(fnError(e));
            else if ((r as any)?.ok) checked += 1;
            else if ((r as any)?.error) errors.push(String((r as any).error));
          } catch (err: any) {
            errors.push(err?.message ?? 'checkup failed');
          }
          qc.invalidateQueries({ queryKey: ['prospects'] });
          if (i < ids.length - 1) await new Promise((res) => setTimeout(res, 1200));
        }

        await db.from('miner_runs').update({ checked }).eq('id', runId);
        return { miner_run_id: runId, found, kept, checked, errors };
      },
      onSuccess: inv,
    }),

    recheck: useMutation({
      mutationFn: async (prospectId: string) => {
        const { data, error } = await supabase.functions.invoke('checkup-prospect', {
          body: { prospect_id: prospectId },
        });
        if (error) throw new Error(fnError(error));
        if ((data as any)?.error) throw new Error(String((data as any).error));
        return data;
      },
      onSuccess: inv,
    }),

    setStatus: useMutation({
      mutationFn: async ({ id, status }: { id: string; status: ProspectStatus }) => {
        const { error } = await db.from('prospects').update({ status }).eq('id', id);
        if (error) throw error;
      },
      onSuccess: inv,
    }),

    /**
     * PROMOTE — reuses the EXISTING inbound-lead intake machinery:
     *   1. submit-inbound-lead (the same edge function the public qualifier and
     *      marketing-site form post to) creates the inbound_leads row carrying
     *      name, phone, website and the prospect's niche as project_type.
     *   2. the same crm_companies + primary crm_contacts insert the existing
     *      inbound-lead promote mutation performs.
     * No parallel intake path.
     */
    promote: useMutation({
      mutationFn: async (p: Prospect) => {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) throw new Error('Sign in required');

        const message = [
          `Sourced by the prospect miner (${p.source}) in ${p.city ?? 'unknown city'}.`,
          p.website ? `Website: ${p.website}` : null,
          p.rating != null ? `Google ${p.rating} (${p.review_count ?? 0} reviews)` : null,
          p.leak_total != null
            ? `Estimated recoverable: $${Math.round(p.leak_total).toLocaleString()}/mo (estimate from public data)`
            : null,
          p.risk_total != null
            ? `Estimated risk exposure: $${Math.round(p.risk_total).toLocaleString()}/mo (estimate from public data)`
            : null,
        ].filter(Boolean).join('\n');

        const { data: leadRes, error: leadErr } = await supabase.functions.invoke('submit-inbound-lead', {
          body: {
            name: p.business_name,
            business_name: p.business_name,
            phone: p.phone,
            message,
            project_type: p.niche,
            source: 'prospect_miner',
            route_to: 'operator',
            qualifier_data: {
              prospect_id: p.id,
              place_id: p.place_id,
              website: p.website,
              rating: p.rating,
              review_count: p.review_count,
              leak_total: p.leak_total,
              risk_total: p.risk_total,
              leak_run_id: p.leak_run_id,
            },
          },
        });
        if (leadErr) throw new Error(fnError(leadErr));
        const leadId = (leadRes as any)?.id ?? (leadRes as any)?.lead?.id ?? null;

        // submit-inbound-lead derives `source` itself from project_type, so we
        // stamp the miner provenance on the row afterwards. Verified: there is
        // NO check constraint on inbound_leads.source (only conversation_channel,
        // route_to and urgency_class are constrained), so 'prospect_miner' needs
        // no migration.
        if (leadId) {
          await db.from('inbound_leads').update({ source: 'prospect_miner' }).eq('id', leadId);
        }

        const { data: company, error: cErr } = await db
          .from('crm_companies')
          .insert({ name: p.business_name, status: 'prospect', created_by: userId })
          .select('id')
          .single();
        if (cErr) throw cErr;

        const { error: ctErr } = await db.from('crm_contacts').insert({
          company_id: company.id,
          first_name: p.business_name,
          phone: p.phone,
          is_primary: true,
          created_by: userId,
        });
        if (ctErr) throw ctErr;

        if (leadId) {
          await db
            .from('inbound_leads')
            .update({ status: 'promoted', promoted_company_id: company.id })
            .eq('id', leadId);
        }

        const { error: uErr } = await db
          .from('prospects')
          .update({
            status: 'promoted',
            promoted_lead_id: leadId,
            promoted_company_id: company.id,
          })
          .eq('id', p.id);
        if (uErr) throw uErr;

        return { company_id: company.id as string, lead_id: leadId as string | null };
      },
      onSuccess: () => {
        inv();
        qc.invalidateQueries({ queryKey: ['crm'] });
        qc.invalidateQueries({ queryKey: ['inbound_leads'] });
      },
    }),
  };
}

export interface FirstTouchDrafts {
  sms: string;
  loom_script: string;
}

export function useFirstTouchDraft() {
  return useMutation({
    mutationFn: async (prospectId: string): Promise<FirstTouchDrafts> => {
      const { data, error } = await supabase.functions.invoke('prospect-first-touch', {
        body: { prospect_id: prospectId },
      });
      if (error) throw new Error(fnError(error));
      if ((data as any)?.error) throw new Error(String((data as any).error));
      const d = (data as any).drafts ?? {};
      return { sms: d.sms ?? '', loom_script: d.loom_script ?? '' };
    },
  });
}