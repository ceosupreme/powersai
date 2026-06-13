// Shared analyzer contract. Each analyzer is a module exporting `{ id, run }`.
// The dispatcher in `growth-audit-refresh` iterates over the registry generically;
// adding a new analyzer = drop a file + register it in `index.ts`.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type AnalyzerResult = {
  inserted: number;
  updated: number;
  resolved: number;
  skipped: number;
  errors: string[];
  ms: number;
  /** Optional notes for run summary (e.g., "insufficient data: 2 weeks"). */
  note?: string;
};

export type AnalyzerModule = {
  id: string;
  /** Returns counts. Must NEVER throw — catch internally and push to errors[]. */
  run: (supabase: SupabaseClient, venueId: string) => Promise<AnalyzerResult>;
};

export const emptyResult = (): AnalyzerResult => ({
  inserted: 0, updated: 0, resolved: 0, skipped: 0, errors: [], ms: 0,
});
