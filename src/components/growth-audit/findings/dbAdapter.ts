// Maps a row from `growth_findings` (DB) to the in-app Finding shape used
// across cards, detail sheets, the Action Center and the Overview score
// derivation. Keeps the rest of the UI tree free of DB-shape coupling.

import type { Tables } from '@/integrations/supabase/types';
import type {
  Finding,
  FindingCategoryKey,
  FindingSeverity,
  FindingStatus,
  EvidenceSource,
} from './mockFindings';
import type { FindingType } from './findingTypes';
import { FINDING_TYPE_TEMPLATES } from './findingTypes';
import { computePriorityScore } from './findingScales';

export type GrowthFindingRow = Tables<'growth_findings'>;

const clamp1to5 = (n: number | null | undefined): 1 | 2 | 3 | 4 | 5 => {
  const v = Math.round(Number(n ?? 3));
  return Math.max(1, Math.min(5, v)) as 1 | 2 | 3 | 4 | 5;
};

export function dbFindingToFinding(row: GrowthFindingRow): Finding {
  const type = row.type_id as FindingType;
  const tmpl = FINDING_TYPE_TEMPLATES[type];
  const ru = clamp1to5(row.revenue_upside);
  const ea = clamp1to5(row.ease);
  const co = clamp1to5(row.confidence);
  const op = clamp1to5(row.operational_risk);
  const evidence = (row.evidence ?? { summary: '', sources: [] }) as {
    summary?: string;
    sources?: EvidenceSource[];
  };

  return {
    id: row.id,
    title: row.title,
    category: (row.category as FindingCategoryKey) ?? tmpl?.category ?? 'revenue',
    type,
    severity: row.severity as FindingSeverity,
    revenueUpside: ru,
    ease: ea,
    confidence: co,
    operationalRisk: op,
    priorityScore:
      Number(row.priority_score) || computePriorityScore(ru, ea, co, op),
    isTrafficDriving:
      row.is_traffic_driving ?? tmpl?.defaultTrafficDriving ?? false,
    gateReason: row.gate_reason ?? undefined,
    evidence: {
      summary: evidence.summary ?? '',
      sources: Array.isArray(evidence.sources) ? evidence.sources : [],
    },
    diagnosis: row.diagnosis ?? '',
    recommendedAction: row.recommended_action ?? '',
    status: row.status as FindingStatus,
    snoozedUntil: row.snoozed_until ?? undefined,
    dismissReason: row.dismiss_reason ?? undefined,
    actionPackId: row.action_pack_id ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    result:
      (row.outcome as Finding['result'] | null | undefined) ?? undefined,
    createdAt: row.first_detected_at ?? row.created_at ?? new Date().toISOString(),
    signalKey: (row as any).signal_key ?? null,
    metadata: ((row as any).metadata ?? {}) as Record<string, unknown>,
  };
}
