import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProspectStatus =
  | 'new' | 'checked' | 'queued' | 'contacted' | 'replied' | 'meeting' | 'won' | 'dead' | 'promoted';

export type ProspectActivityKind = 'call' | 'text' | 'email' | 'dm' | 'meeting' | 'note' | 'status' | 'auto';

export interface ProspectActivity {
  id: string;
  prospect_id: string;
  kind: ProspectActivityKind;
  summary: string | null;
  created_by: string | null;
  created_at: string;
}

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
  contact_name: string | null;
  email: string | null;
  instagram: string | null;
  platform: string | null;
  source_url: string | null;
  lead_type: string | null;
  offer: string | null;
  fit_score: number | null;
  their_words: string | null;
  sell_notes: string | null;
  drafted_message: string | null;
  notes: string | null;
  assigned_to: string | null;
  outreach_mode: 'manual' | 'auto';
  next_follow_up: string | null;
  last_contacted_at: string | null;
  last_contact_channel: string | null;
  found_by: string | null;
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
      const [{ data, error }, offRes] = await Promise.all([
        db
          .from('prospects')
          .select('*')
          .order('leak_total', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
        db.from('venues').select('id').eq('is_active', false),
      ]);
      if (error) throw error;
      // Prospects attached to a switched-off project stay out of every list.
      const off = new Set(((offRes.data ?? []) as { id: string }[]).map((v) => v.id));
      return ((data ?? []) as Prospect[]).filter(
        (p) => !p.shell_venue_id || !off.has(p.shell_venue_id),
      );
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

async function addActivity(prospectId: string, kind: ProspectActivityKind, summary: string | null) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await db.from('prospect_activity').insert({
    prospect_id: prospectId, kind, summary, created_by: u?.user?.id ?? null,
  });
  if (error) throw error;
}

export function useProspectActivity(prospectId: string | null) {
  return useQuery({
    queryKey: ['prospect_activity', prospectId],
    enabled: !!prospectId,
    queryFn: async (): Promise<ProspectActivity[]> => {
      const { data, error } = await db
        .from('prospect_activity')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProspectActivity[];
    },
  });
}

export interface LeadPerson { id: string; name: string }

/**
 * People a lead can be assigned to: non-client users. Profiles are readable only
 * by admins (and each person's own row), so a non-admin sees just themselves.
 */
export function useLeadPeople() {
  return useQuery({
    queryKey: ['lead_people'],
    queryFn: async (): Promise<LeadPerson[]> => {
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        db.from('user_roles').select('user_id, role'),
        db.from('profiles').select('id, full_name, email, is_active'),
      ]);
      const client = new Set(((roles ?? []) as any[]).filter((r) => r.role === 'client').map((r) => r.user_id));
      const hasRole = new Set(((roles ?? []) as any[]).map((r) => r.user_id));
      return ((profiles ?? []) as any[])
        .filter((p) => hasRole.has(p.id) && !client.has(p.id) && p.is_active !== false)
        .map((p) => ({ id: p.id, name: p.full_name || p.email || 'Unnamed' }))
        .sort((a, b) => a.name.localeCompare(b.name));
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

    /** Stage move from the board, menu or detail: status plus a 'status' activity row. */
    moveStage: useMutation({
      mutationFn: async ({ id, status, label }: { id: string; status: ProspectStatus; label: string }) => {
        const { error } = await db.from('prospects').update({ status }).eq('id', id);
        if (error) throw error;
        await addActivity(id, 'status', `Moved to ${label}`);
      },
      onMutate: async ({ id, status }) => {
        await qc.cancelQueries({ queryKey: ['prospects'] });
        const prev = qc.getQueryData<Prospect[]>(['prospects']);
        qc.setQueryData<Prospect[]>(['prospects'], (rows) => rows?.map((r) => (r.id === id ? { ...r, status } : r)));
        return { prev };
      },
      onError: (_e, _v, ctx: any) => ctx?.prev && qc.setQueryData(['prospects'], ctx.prev),
      onSettled: (_d, _e, v) => { inv(); qc.invalidateQueries({ queryKey: ['prospect_activity', v.id] }); },
    }),

    updateFields: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<Prospect> }) => {
        const { error } = await db.from('prospects').update(patch).eq('id', id);
        if (error) throw error;
      },
      onSuccess: inv,
    }),

    /** Quick log: activity row, last contact stamp, and New -> Contacted (notes are not contact). */
    logContact: useMutation({
      mutationFn: async ({ prospect, kind, summary, nextStatus }: {
        prospect: Prospect; kind: ProspectActivityKind; summary: string; nextStatus: ProspectStatus | null;
      }) => {
        await addActivity(prospect.id, kind, summary || null);
        if (kind === 'note') return;
        const patch: Record<string, unknown> = { last_contacted_at: new Date().toISOString(), last_contact_channel: kind };
        if (nextStatus) patch.status = nextStatus;
        const { error } = await db.from('prospects').update(patch).eq('id', prospect.id);
        if (error) throw error;
        if (nextStatus) await addActivity(prospect.id, 'status', 'Moved to Contacted');
      },
      onSuccess: (_d, v) => { inv(); qc.invalidateQueries({ queryKey: ['prospect_activity', v.prospect.id] }); },
    }),

    addLead: useMutation({
      mutationFn: async (row: {
        business_name: string; contact_name?: string; phone?: string; email?: string;
        city?: string; offer?: string; source: string; notes?: string;
      }) => {
        const clean = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]));
        const { data, error } = await db.from('prospects').insert({ ...clean, status: 'new' }).select('id').single();
        if (error) throw error;
        return data.id as string;
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