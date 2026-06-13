// Single entry point for Action Pack generation.
// AI path: calls the `growth-audit-action-pack` edge function (Lovable AI Gateway).
// Mock path: deterministic local generator.
// Switching paths is a one-line setMode() call from the UI.
//
// Accepts a GenerationContext discriminated union (Prompt 14 refactor) so we can
// later support manual-campaign and ad-hoc Action Pack flows without touching
// the call signature again.

import { supabase } from '@/integrations/supabase/client';
import type { Finding } from '../findings/mockFindings';
import { mockGenerateActionPack, mockRegenerateAsset } from './mockGenerator';
import type {
  ActionPack, ActionPackAsset, GenerationContext, GenerationMode, VenueContext,
} from './types';

const MODE_KEY = 'growth-audit-generation-mode';

export const getGenerationMode = (): GenerationMode => {
  const v = (typeof window !== 'undefined' && localStorage.getItem(MODE_KEY)) as GenerationMode | null;
  return v === 'mock' ? 'mock' : 'ai';
};

export const setGenerationMode = (m: GenerationMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODE_KEY, m);
};

/** Convenience wrapper for the only call site that exists today. */
export const fromFinding = (finding: Finding): GenerationContext => ({ kind: 'finding', finding });

export async function generateActionPack(
  context: GenerationContext,
  venue: VenueContext,
  mode: GenerationMode = getGenerationMode(),
): Promise<ActionPack> {
  if (mode === 'mock') return mockGenerateActionPack(context, venue);

  try {
    const { data, error } = await supabase.functions.invoke('growth-audit-action-pack', {
      body: { mode: 'pack', context, venue },
    });
    if (error) throw error;
    if (!data || !Array.isArray(data.assets)) throw new Error('Malformed AI response');
    return { ...data, source: 'ai' } as ActionPack;
  } catch (e) {
    console.warn('[GROWTH-AUDIT] AI generation failed, falling back to mock:', e);
    const pack = await mockGenerateActionPack(context, venue);
    return { ...pack, source: 'mock' };
  }
}

export async function regenerateAsset(
  asset: ActionPackAsset,
  context: GenerationContext,
  venue: VenueContext,
  refinement?: string,
  mode: GenerationMode = getGenerationMode(),
): Promise<ActionPackAsset> {
  if (mode === 'mock') return mockRegenerateAsset(asset, context, venue, refinement);

  try {
    const { data, error } = await supabase.functions.invoke('growth-audit-action-pack', {
      body: { mode: 'asset', context, venue, asset, refinement },
    });
    if (error) throw error;
    if (!data?.body) throw new Error('Malformed AI response');
    return {
      ...asset,
      body: data.body,
      meta: data.meta ?? asset.meta,
      regenerationCount: asset.regenerationCount + 1,
      editedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('[GROWTH-AUDIT] AI regenerate failed, falling back to mock:', e);
    return mockRegenerateAsset(asset, context, venue, refinement);
  }
}
