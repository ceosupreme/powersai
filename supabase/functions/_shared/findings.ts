// _shared/findings.ts
// Reusable helpers for the Growth Audit continuous-signal model.
//
// Used by analyzers (Prompt 14+) to upsert / resolve / reconcile findings
// without each one re-implementing the idempotency dance.
//
// Contract:
//   - Every finding row carries a `signal_key` — a deterministic string the
//     analyzer computes from the condition's parameters (e.g.
//     `soft_shift:tuesday:1600-1900`). Same condition → same key, always.
//   - At most one *active* (resolved_at IS NULL) row per (venue_id, signal_key)
//     is enforced by a partial unique index in the database.
//   - Re-detecting an already-active finding refreshes `last_seen_at` plus any
//     fields the analyzer wants to update; it never inserts a duplicate.
//   - When a previously-detected condition no longer holds, the analyzer
//     calls `resolveFinding(...)` so the row's `resolved_at`/`status` are set
//     and the audit trail records the transition.
//   - `bulkReconcile(...)` is the sweep variant: pass the full set of currently-
//     true signal keys for a (venue, type) and any active row outside that set
//     gets resolved with a default reason.
//
// All writes use the service-role client. Audit trigger captures actor_service
// from `app.actor_service` GUC; set it via `setActorService(...)` before writes.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type FindingStatus =
  | 'New' | 'In Progress' | 'Sent to Marketing Hub'
  | 'Resolved' | 'Dismissed' | 'Snoozed';

export type EvidenceSource = { label: string; ref: string };
export type Evidence = { summary: string; sources: EvidenceSource[] };

export type FindingPayload = {
  type_id: string;
  category: string;
  severity: FindingSeverity;
  title: string;
  diagnosis: string;
  recommended_action: string;
  evidence: Evidence;
  revenue_upside: number;
  ease: number;
  confidence: number;
  operational_risk: number;
  is_traffic_driving?: boolean;
  gate_reason?: string | null;
  metadata?: Record<string, unknown>;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function computePriorityScore(
  upside: number, ease: number, confidence: number, opsRisk: number,
): number {
  const raw = upside * ease * confidence - opsRisk;
  return Math.round(Math.max(0, raw) / 124 * 100);
}

/** Set the actor_service identifier on the connection for the audit trigger. */
export async function setActorService(supabase: SupabaseClient, name: string, reason?: string) {
  try {
    await supabase.rpc('set_config' as any, { setting_name: 'app.actor_service', new_value: name, is_local: false });
    if (reason) {
      await supabase.rpc('set_config' as any, { setting_name: 'app.actor_reason', new_value: reason, is_local: false });
    }
  } catch { /* best-effort; audit trigger falls back to NULL */ }
}

/**
 * Upsert a finding. If an active row exists for (venue_id, signal_key), the
 * provided fields are merged in and `last_seen_at` is bumped. Otherwise a new
 * row is inserted with `first_detected_at = now()`.
 */
export async function upsertFinding(
  supabase: SupabaseClient,
  venueId: string,
  signalKey: string,
  payload: FindingPayload,
): Promise<{ id: string; inserted: boolean }> {
  const ru = clamp(payload.revenue_upside, 1, 5);
  const ea = clamp(payload.ease, 1, 5);
  const co = clamp(payload.confidence, 1, 5);
  const op = clamp(payload.operational_risk, 1, 5);

  // Look up an existing active row.
  const { data: existing, error: selErr } = await supabase
    .from('growth_findings')
    .select('id')
    .eq('venue_id', venueId)
    .eq('signal_key', signalKey)
    .is('resolved_at', null)
    .maybeSingle();
  if (selErr) throw selErr;

  const fields = {
    type_id: payload.type_id,
    category: payload.category,
    severity: payload.severity,
    title: payload.title,
    diagnosis: payload.diagnosis,
    recommended_action: payload.recommended_action,
    evidence: payload.evidence,
    revenue_upside: ru,
    ease: ea,
    confidence: co,
    operational_risk: op,
    priority_score: computePriorityScore(ru, ea, co, op),
    is_traffic_driving: payload.is_traffic_driving ?? false,
    gate_reason: payload.gate_reason ?? null,
    metadata: payload.metadata ?? {},
  };

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from('growth_findings')
      .update({ ...fields, last_seen_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updErr) throw updErr;
    return { id: existing.id, inserted: false };
  }

  const { data: ins, error: insErr } = await supabase
    .from('growth_findings')
    .insert({
      venue_id: venueId,
      signal_key: signalKey,
      status: 'New',
      ...fields,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return { id: ins.id, inserted: true };
}

/** Resolve the active finding for (venue_id, signal_key), if any. */
export async function resolveFinding(
  supabase: SupabaseClient,
  venueId: string,
  signalKey: string,
  reason: string,
  actorService = 'analyzer',
): Promise<boolean> {
  await setActorService(supabase, actorService, reason);
  const { data, error } = await supabase
    .from('growth_findings')
    .update({ status: 'Resolved', resolved_at: new Date().toISOString() })
    .eq('venue_id', venueId)
    .eq('signal_key', signalKey)
    .is('resolved_at', null)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Sweep helper. For a given (venue, type), resolve any active finding whose
 * signal_key is NOT in `currentSignalKeys`. Returns the number resolved.
 * Seeded fixtures (signal_key starting with `seed:`) are left untouched so
 * demo data isn't wiped on the first analyzer run.
 */
export async function bulkReconcile(
  supabase: SupabaseClient,
  venueId: string,
  typeId: string,
  currentSignalKeys: string[],
  reason = 'no_longer_detected',
  actorService = 'analyzer',
): Promise<number> {
  const { data: actives, error } = await supabase
    .from('growth_findings')
    .select('id, signal_key')
    .eq('venue_id', venueId)
    .eq('type_id', typeId)
    .is('resolved_at', null);
  if (error) throw error;

  const currentSet = new Set(currentSignalKeys);
  const stale = (actives ?? []).filter(
    (r) => !currentSet.has(r.signal_key) && !r.signal_key.startsWith('seed:'),
  );
  if (stale.length === 0) return 0;

  await setActorService(supabase, actorService, reason);
  const { error: updErr } = await supabase
    .from('growth_findings')
    .update({ status: 'Resolved', resolved_at: new Date().toISOString() })
    .in('id', stale.map((r) => r.id));
  if (updErr) throw updErr;
  return stale.length;
}
