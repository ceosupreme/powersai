// Supabase-backed campaign store. Same interface a future swap can keep.
// Reads/writes the `marketing_campaigns` table; rows are mapped 1:1 onto the
// `Campaign` TypeScript type via fromRow / toRow.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  Campaign, CampaignAttachment, CampaignOrigin, CampaignResults, CampaignStatus,
  CampaignType, ExecutionAdapter, MarketingChannel, Recurrence,
} from './types';

const TABLE = 'marketing_campaigns';
const QK = ['marketing_campaigns'] as const;

type Row = Record<string, any>;

const fromRow = (r: Row): Campaign => ({
  id: r.id,
  venueId: r.venue_id,
  venueName: r.venue_name,
  origin: r.origin as CampaignOrigin,
  externalSubsource: r.external_subsource ?? null,
  originatingFindingId: r.originating_finding_id ?? null,
  title: r.title,
  type: r.type as CampaignType,
  status: r.status as CampaignStatus,
  startDate: r.start_date,
  endDate: r.end_date,
  startTime: r.start_time ?? undefined,
  endTime: r.end_time ?? undefined,
  description: r.description ?? '',
  objective: r.objective ?? '',
  recurrence: (r.recurrence ?? 'One-Time') as Recurrence,
  targetAudience: r.target_audience ?? '',
  channels: (r.channels ?? []) as MarketingChannel[],
  brandPartner: r.brand_partner ?? null,
  brandPartnerContribution: r.brand_partner_contribution ?? null,
  budget: r.budget ?? null,
  expectedGuestCount: r.expected_guest_count ?? null,
  expectedRevenueImpact: r.expected_revenue_impact ?? null,
  linkedToastPromoCode: r.linked_toast_promo_code ?? null,
  linkedMenuItems: (r.linked_menu_items ?? []) as string[],
  successMetric: r.success_metric ?? '',
  assignedTo: r.assigned_to ?? null,
  internalNotes: r.internal_notes ?? undefined,
  attachments: (r.attachments ?? []) as CampaignAttachment[],
  executionAdapter: (r.execution_adapter ?? null) as ExecutionAdapter | null,
  syncLost: !!r.sync_lost,
  lastSyncedFrom: r.last_synced_from ?? null,
  needsDetails: !!r.needs_details,
  missingFields: (r.missing_fields ?? []) as string[],
  results: (r.results ?? null) as CampaignResults | null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRow = (c: Campaign): Row => ({
  id: c.id,
  venue_id: c.venueId,
  venue_name: c.venueName,
  origin: c.origin,
  external_subsource: c.externalSubsource ?? null,
  originating_finding_id: c.originatingFindingId ?? null,
  title: c.title,
  type: c.type,
  status: c.status,
  start_date: c.startDate,
  end_date: c.endDate,
  start_time: c.startTime ?? null,
  end_time: c.endTime ?? null,
  description: c.description,
  objective: c.objective,
  recurrence: c.recurrence,
  target_audience: c.targetAudience,
  channels: c.channels,
  brand_partner: c.brandPartner ?? null,
  brand_partner_contribution: c.brandPartnerContribution ?? null,
  budget: c.budget ?? null,
  expected_guest_count: c.expectedGuestCount ?? null,
  expected_revenue_impact: c.expectedRevenueImpact ?? null,
  linked_toast_promo_code: c.linkedToastPromoCode ?? null,
  linked_menu_items: c.linkedMenuItems,
  success_metric: c.successMetric,
  assigned_to: c.assignedTo ?? null,
  internal_notes: c.internalNotes ?? null,
  attachments: c.attachments,
  execution_adapter: c.executionAdapter ?? null,
  sync_lost: !!c.syncLost,
  last_synced_from: c.lastSyncedFrom ?? null,
  needs_details: !!c.needsDetails,
  missing_fields: c.missingFields ?? [],
  results: c.results ?? null,
  updated_at: new Date().toISOString(),
});

export const useCampaignStore = () => {
  const qc = useQueryClient();

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(fromRow);
    },
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: async (c: Campaign) => {
      const { data: row, error } = await supabase
        .from(TABLE as any)
        .insert(toRow(c) as any)
        .select()
        .single();
      if (error) throw error;
      return fromRow(row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Campaign> }) => {
      // Merge against the current cached campaign so partial patches keep all fields.
      const current = (qc.getQueryData<Campaign[]>(QK) ?? data).find(c => c.id === id);
      if (!current) throw new Error(`Campaign ${id} not found`);
      const next: Campaign = { ...current, ...patch, updatedAt: new Date().toISOString() };
      const { data: row, error } = await supabase
        .from(TABLE as any)
        .update(toRow(next) as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return fromRow(row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  return {
    campaigns: data,
    loading: isLoading,
    refresh: () => refetch(),
    get: (id: string) => data.find(c => c.id === id) ?? null,
    add: (c: Campaign) => addMutation.mutateAsync(c),
    update: (id: string, patch: Partial<Campaign>) =>
      updateMutation.mutateAsync({ id, patch }),
    isMutating: addMutation.isPending || updateMutation.isPending,
  };
};

export const newCampaignId = () =>
  `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
