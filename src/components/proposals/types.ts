export type EngineKey = 'acquisition' | 'retention' | 'command_center' | 'delivery';

export const ENGINE_LABEL: Record<EngineKey, string> = {
  acquisition: 'Acquisition Engine',
  retention: 'Retention Engine',
  command_center: 'Command Center',
  delivery: 'Delivery Engine',
};

export type FootprintKey = 'solo_owner' | 'small_crew_2_5' | 'crew_6_plus' | 'multi_location';

export const FOOTPRINT_LABEL: Record<FootprintKey, string> = {
  solo_owner: 'Solo owner-operator',
  small_crew_2_5: 'Small crew (2–5)',
  crew_6_plus: 'Larger crew (6+)',
  multi_location: 'Multi-location',
};

export interface ManualLeak {
  name: string;
  monthly_dollars: number | null;
  note?: string;
  manual: true;
  /** Optional. Manual leaks default to captured revenue if unset. */
  risk_type?: 'captured_revenue' | 'avoided_loss';
}

/** Line item identifier persisted on a proposal. */
export interface SelectedLeak {
  /** Matches LeakStackResult.name — same display-string vocabulary that top_leak_key uses. */
  name: string;
  risk_type: 'captured_revenue' | 'avoided_loss';
}

export interface ProposalContent {
  intro_line: string;
  prospect_name: string;
  /**
   * Legacy shape (pre-risk-split): array of display-name strings, all captured_revenue.
   * Kept for backward-read of saved proposals. Do not write.
   */
  selected_leak_keys?: string[];
  /** Current shape: name + risk_type per line item. */
  selected_leaks?: SelectedLeak[];
  manual_leaks: ManualLeak[];
  engines_included: EngineKey[];
  package_id: string | null;
  price_display: string;
  footprint: FootprintKey | null;
  next_step_line: string;
  contact_line?: string;
}

export interface ProposalRow {
  id: string;
  company_id: string | null;
  venue_id: string | null;
  leak_stack_run_id: string | null;
  title: string;
  content: ProposalContent;
  status: 'draft' | 'sent';
  created_at: string;
  updated_at: string;
}