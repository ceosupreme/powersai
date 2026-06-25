import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type FoundationStatus =
  | 'satisfied'
  | 'partial'
  | 'missing'
  | 'unknown'
  | 'not_applicable';

export interface CheckResult {
  status: FoundationStatus;
  evidence_url?: string | null;
  notes?: string | null;
  detected_at?: string;
}

export interface FoundationCheck {
  id: string;
  itemKey: string;
  run: (supabase: SupabaseClient, venueId: string) => Promise<CheckResult | null>;
}