import type { ExecutionAdapterType } from '../types';
import type { ExecutionAdapter } from './types';
import { asanaAdapter } from './asanaAdapter';
import { mockAdapter } from './mockAdapter';
import { queryClient } from '@/lib/queryClient';

export type AdapterMode = 'live' | 'mock';

const STORAGE_KEY = 'marketing-hub-adapter-mode';
export const getAdapterMode = (): AdapterMode =>
  (typeof window !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as AdapterMode)) || 'mock';
export const setAdapterMode = (m: AdapterMode) => {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, m);
};

// Phase 1: if `asana` is in app_config.integrations_disabled, every adapter
// request resolves through the mock adapter — never hits the real edge fns.
function asanaIsDisabled(): boolean {
  const cached = queryClient.getQueryData<string[]>(['app_config', 'integrations_disabled']);
  return Array.isArray(cached) && cached.includes('asana');
}

const NotImplemented = (id: ExecutionAdapterType): ExecutionAdapter => ({
  id,
  previewPush: () => Promise.reject(new Error(`${id} adapter not implemented`)),
  push: () => Promise.reject(new Error(`${id} adapter not implemented`)),
  pull: () => Promise.reject(new Error(`${id} adapter not implemented`)),
  postComment: () => Promise.reject(new Error(`${id} adapter not implemented`)),
  markSyncLost: c => c,
});

export const getAdapter = (type: ExecutionAdapterType): ExecutionAdapter => {
  if (type === 'asana') {
    if (asanaIsDisabled()) return mockAdapter;
    return getAdapterMode() === 'mock' ? mockAdapter : asanaAdapter;
  }
  return NotImplemented(type);
};
