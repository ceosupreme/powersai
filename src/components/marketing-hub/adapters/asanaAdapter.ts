// Asana implementation of the ExecutionAdapter interface. All real Asana
// I/O happens in the marketing-asana-* edge functions; this client just
// shapes the payload and applies the resulting patch.

import { supabase } from '@/integrations/supabase/client';
import type { Campaign, ExecutionAdapter as ExecutionAdapterRecord } from '../types';
import type { ActionPackAsset } from '@/components/growth-audit/action-packs/types';
import type {
  AdapterPullResult, AdapterPushResult, DryRunPreview, ExecutionAdapter,
} from './types';

const buildCampaignPayload = (
  c: Campaign, assets: ActionPackAsset[], staffBrief?: string | null,
) => ({
  id: c.id,
  venueId: c.venueId,
  title: c.title,
  description: c.description,
  startDate: c.startDate,
  endDate: c.endDate,
  type: c.type,
  status: c.status,
  recurrence: c.recurrence,
  brandPartner: c.brandPartner ?? null,
  budget: c.budget ?? null,
  expectedGuestCount: c.expectedGuestCount ?? null,
  expectedRevenueImpact: c.expectedRevenueImpact ?? null,
  linkedToastPromoCode: c.linkedToastPromoCode ?? null,
  linkedMenuItems: c.linkedMenuItems,
  staffBrief: staffBrief ?? null,
  assets: assets.map(a => ({ id: a.id, kind: a.kind, title: a.title, body: a.body })),
  externalTaskId: c.executionAdapter?.external_id ?? null,
});

export const asanaAdapter: ExecutionAdapter = {
  id: 'asana',

  async previewPush(campaign, assets) {
    const staffBrief = assets.find(a => a.kind === 'staff_script')?.body;
    const { data, error } = await supabase.functions.invoke('marketing-asana-push', {
      body: { campaign: buildCampaignPayload(campaign, assets, staffBrief), dry_run: true },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data.preview as DryRunPreview;
  },

  async push(campaign, assets, opts) {
    const staffBrief = assets.find(a => a.kind === 'staff_script')?.body;
    const { data, error } = await supabase.functions.invoke('marketing-asana-push', {
      body: {
        campaign: { ...buildCampaignPayload(campaign, assets, staffBrief), attachments: opts?.attachments ?? [] },
        dry_run: false,
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    const adapter: ExecutionAdapterRecord = {
      adapter_type: 'asana',
      external_id: data.external_task_id,
      sync_status: 'Synced',
      last_synced_at: data.synced_at,
    };
    const result: AdapterPushResult = {
      external_task_id: data.external_task_id,
      permalink_url: data.permalink_url,
      synced_at: data.synced_at,
    };
    return { adapter, result };
  },

  async pull(campaign) {
    if (!campaign.executionAdapter?.external_id) {
      return { syncLost: false };
    }
    const { data, error } = await supabase.functions.invoke('marketing-asana-pull', {
      body: {
        venue_id: campaign.venueId,
        external_task_id: campaign.executionAdapter.external_id,
        campaign_id: campaign.id,
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return {
      syncLost: !!data.sync_lost,
      patch: data.patch as Partial<Campaign> | undefined,
      subtasks: data.subtasks,
      comments: data.comments,
    } satisfies AdapterPullResult;
  },

  async postComment(campaign, body) {
    if (!campaign.executionAdapter?.external_id) {
      throw new Error('Campaign has no Asana task to comment on.');
    }
    const { data, error } = await supabase.functions.invoke('marketing-asana-comment', {
      body: { external_task_id: campaign.executionAdapter.external_id, text: body },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
  },

  markSyncLost(campaign) {
    return {
      ...campaign,
      syncLost: true,
      executionAdapter: campaign.executionAdapter
        ? { ...campaign.executionAdapter, sync_status: 'Sync Failed', error_message: 'Task not found in Asana.' }
        : null,
    };
  },
};
