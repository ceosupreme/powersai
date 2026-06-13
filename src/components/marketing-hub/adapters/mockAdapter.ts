// Mock adapter — produces deterministic dry-run previews from local data
// only. Used by the Mock/Live toggle so demos and dev work without hitting
// Asana.

import type { Campaign } from '../types';
import type { ActionPackAsset } from '@/components/growth-audit/action-packs/types';
import type { DryRunPreview, ExecutionAdapter } from './types';

const FAKE_FIELD_NAMES = [
  ['effort_type', 'Effort Type'],
  ['marketing_status', 'Marketing Status'],
  ['recurrence', 'Recurrence'],
  ['brand_partner', 'Brand Partner'],
  ['budget', 'Budget / Cost'],
  ['expected_guest_count', 'Expected Guest Count'],
  ['expected_revenue_impact', 'Expected Revenue Impact'],
  ['toast_promo_code', 'Linked Toast Discount or Promo Code'],
  ['linked_menu_items', 'Linked Menu Items'],
  ['barpulse_sync_id', 'Supreme Team Media Sync ID'],
] as const;

const fieldValue = (key: string, c: Campaign): string | number | null => {
  switch (key) {
    case 'effort_type': return c.type;
    case 'marketing_status': return c.status;
    case 'recurrence': return c.recurrence;
    case 'brand_partner': return c.brandPartner ?? null;
    case 'budget': return c.budget ?? null;
    case 'expected_guest_count': return c.expectedGuestCount ?? null;
    case 'expected_revenue_impact': return c.expectedRevenueImpact ?? null;
    case 'toast_promo_code': return c.linkedToastPromoCode ?? null;
    case 'linked_menu_items': return c.linkedMenuItems.join(', ') || null;
    case 'barpulse_sync_id': return c.id;
  }
  return null;
};

export const mockAdapter: ExecutionAdapter = {
  id: 'asana',

  async previewPush(campaign, assets): Promise<DryRunPreview> {
    return {
      task_name: campaign.title,
      section: { gid: 'mock_section', name: 'Marketing Efforts' },
      project_gid: 'mock_project',
      start_on: campaign.startDate,
      due_on: campaign.endDate,
      notes_preview: campaign.description.slice(0, 600),
      custom_fields: FAKE_FIELD_NAMES.map(([key, name]) => ({
        key, asana_name: name, gid: `mock_${key}`,
        value: fieldValue(key, campaign),
      })),
      subtasks: ['Promotion Prep', 'Channel Execution', 'Operational Prep', 'Post-Event'],
      comments: assets.map(a => ({
        asset_id: a.id, kind: a.kind,
        preview: `${a.title} — ${a.body.slice(0, 140)}`,
      })),
      attachments: campaign.attachments.map(a => ({ filename: a.label, size_bytes: 0 })),
      live_writes_enabled: false,
    };
  },

  async push(campaign) {
    const synced_at = new Date().toISOString();
    return {
      adapter: {
        adapter_type: 'asana',
        external_id: `mock_task_${campaign.id}`,
        sync_status: 'Synced',
        last_synced_at: synced_at,
      },
      result: { external_task_id: `mock_task_${campaign.id}`, permalink_url: null, synced_at },
    };
  },

  async pull() {
    return { syncLost: false };
  },

  async postComment() {
    return;
  },

  markSyncLost(campaign) {
    return { ...campaign, syncLost: true };
  },
};
