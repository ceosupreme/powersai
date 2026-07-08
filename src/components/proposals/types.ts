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
}

export interface ProposalContent {
  intro_line: string;
  prospect_name: string;
  selected_leak_keys: string[];
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