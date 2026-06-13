// Generic execution adapter interface. Asana is the first implementation;
// monday/clickup/barpulse_native can be added without changing callers.

import type { Campaign, ExecutionAdapter as ExecutionAdapterRecord, ExecutionAdapterType } from '../types';
import type { ActionPackAsset } from '@/components/growth-audit/action-packs/types';

export type AdapterCustomFieldPreview = {
  key: string;
  asana_name: string;
  gid: string | null;
  value: string | number | null;
};

export type AdapterCommentPreview = {
  asset_id: string;
  kind: string;
  preview: string;
};

export type AdapterAttachmentPreview = {
  filename: string;
  size_bytes: number;
};

export type DryRunPreview = {
  task_name: string;
  section: { gid: string; name: string };
  project_gid: string;
  start_on: string;
  due_on: string;
  notes_preview: string;
  custom_fields: AdapterCustomFieldPreview[];
  subtasks: string[];
  comments: AdapterCommentPreview[];
  attachments: AdapterAttachmentPreview[];
  live_writes_enabled: boolean;
};

export type AdapterPushResult = {
  external_task_id: string;
  permalink_url?: string | null;
  synced_at: string;
};

export type AdapterPullResult = {
  syncLost: boolean;
  patch?: Partial<Campaign>;
  subtasks?: { gid: string; name: string; completed: boolean; completed_at?: string | null }[];
  comments?: { gid: string; text: string; author: string; created_at: string }[];
};

export interface ExecutionAdapter {
  id: ExecutionAdapterType;
  previewPush(campaign: Campaign, assets: ActionPackAsset[]): Promise<DryRunPreview>;
  push(
    campaign: Campaign,
    assets: ActionPackAsset[],
    opts?: { attachments?: { filename: string; content_type: string; base64: string }[] },
  ): Promise<{ adapter: ExecutionAdapterRecord; result: AdapterPushResult }>;
  pull(campaign: Campaign): Promise<AdapterPullResult>;
  postComment(campaign: Campaign, body: string): Promise<void>;
  markSyncLost(campaign: Campaign): Campaign;
}
