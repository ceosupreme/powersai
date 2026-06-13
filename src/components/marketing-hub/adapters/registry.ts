import type { ExecutionAdapterType } from '../types';
import type { ExecutionAdapter } from './types';
import { asanaAdapter } from './asanaAdapter';
import { mockAdapter } from './mockAdapter';

export type AdapterMode = 'live' | 'mock';

const STORAGE_KEY = 'marketing-hub-adapter-mode';
export const getAdapterMode = (): AdapterMode =>
  (typeof window !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as AdapterMode)) || 'mock';
export const setAdapterMode = (m: AdapterMode) => {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, m);
};

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
    return getAdapterMode() === 'mock' ? mockAdapter : asanaAdapter;
  }
  return NotImplemented(type);
};
