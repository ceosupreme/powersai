// Real, DB-backed audit history. Replaces the prior mock seam.
//
// - runs:             from growth_audit_runs joined with growth_score_snapshots,
//                     with snapshot findings reconstructed from growth_findings
//                     active at each run's triggered_at.
// - findingsFlow:     monthly opened vs resolved counts from growth_findings
//                     lifecycle timestamps (last 6 months).
// - campaignActivity: monthly launched + outcome breakdown from
//                     marketing_campaigns ⨝ finding_campaign_links.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AuditRun,
  AuditRunType,
  CampaignActivityPoint,
  FindingsFlowPoint,
  ScoreSnapshotPoint,
  SnapshotFinding,
} from './historyTypes';
import type { FindingCategoryKey } from '../findings/mockFindings';

const EMPTY_CAT_SCORES = (): Record<FindingCategoryKey, number> => ({
  revenue: 0, menu: 0, events: 0, local: 0,
  reputation: 0, social: 0, website: 0, operational: 0, context: 0,
});

// ────────────────────────────────────────────────────────────────
// useAuditHistory(venueId)
// ────────────────────────────────────────────────────────────────
export function useAuditHistory(venueId: string | null | undefined) {
  const runsQ = useQuery({
    queryKey: ['growth-audit-history', 'runs', venueId ?? 'none'],
    enabled: !!venueId,
    queryFn: async (): Promise<AuditRun[]> => {
      const [runsRes, snapsRes, findingsRes] = await Promise.all([
        supabase
          .from('growth_audit_runs')
          .select('id, triggered_at, status, notes, summary, triggered_by')
          .eq('venue_id', venueId!)
          .order('triggered_at', { ascending: false })
          .limit(60),
        supabase
          .from('growth_score_snapshots')
          .select('audit_run_id, growth_score, category_scores, snapshot_date')
          .eq('venue_id', venueId!),
        supabase
          .from('growth_findings')
          .select('id, title, category, severity, priority_score, first_detected_at, resolved_at')
          .eq('venue_id', venueId!),
      ]);
      if (runsRes.error) throw runsRes.error;
      if (snapsRes.error) throw snapsRes.error;
      if (findingsRes.error) throw findingsRes.error;

      const snapByRun = new Map<string, typeof snapsRes.data[number]>();
      (snapsRes.data ?? []).forEach(s => {
        if (s.audit_run_id) snapByRun.set(s.audit_run_id, s);
      });

      // Resolve display names for triggering users (manual runs only).
      const userIds = Array.from(new Set(
        (runsRes.data ?? []).map(r => r.triggered_by).filter((v): v is string => !!v)
      ));
      const nameByUser = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        (profiles ?? []).forEach(p => {
          nameByUser.set(p.id, p.full_name || p.email || 'Team member');
        });
      }

      const allFindings = findingsRes.data ?? [];

      // Reverse-chronological so [0] is newest. Build delta strings against the
      // *prior* (older) run.
      const sorted = [...(runsRes.data ?? [])].sort(
        (a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime(),
      );

      const runs: AuditRun[] = sorted.map((r, idx) => {
        const snap = snapByRun.get(r.id);
        const summary = (r.summary ?? {}) as Record<string, unknown>;
        const overall = Number(snap?.growth_score ?? summary.growth_score ?? 0) || 0;
        const cs = (snap?.category_scores ?? summary.category_scores ?? {}) as Partial<Record<FindingCategoryKey, number>>;
        const categoryScores = { ...EMPTY_CAT_SCORES(), ...cs } as Record<FindingCategoryKey, number>;

        // Active findings at this run's timestamp (frozen reconstruction).
        const ts = new Date(r.triggered_at).getTime();
        const active = allFindings.filter(f => {
          const start = new Date(f.first_detected_at).getTime();
          if (start > ts) return false;
          if (!f.resolved_at) return true;
          return new Date(f.resolved_at).getTime() > ts;
        });
        const findings: SnapshotFinding[] = active
          .sort((a, b) => Number(b.priority_score) - Number(a.priority_score))
          .slice(0, 25)
          .map(f => ({
            id: f.id,
            title: f.title,
            category: f.category as FindingCategoryKey,
            severity: f.severity as SnapshotFinding['severity'],
            priorityScore: Number(f.priority_score) || 0,
          }));

        // Build "key changes" line from delta vs prior-older run.
        const prior = sorted[idx + 1];
        let keyChanges = 'Audit run completed.';
        if (prior) {
          const priorSnap = snapByRun.get(prior.id);
          const priorOverall = Number(priorSnap?.growth_score ?? 0) || 0;
          const delta = overall - priorOverall;
          keyChanges = delta === 0
            ? 'Overall score unchanged vs prior run.'
            : `Overall ${delta > 0 ? '+' : ''}${delta} vs prior run.`;
        } else {
          keyChanges = 'First audit run — baseline established.';
        }
        if (r.notes) keyChanges = `${keyChanges} ${r.notes}`.trim();

        const type: AuditRunType = (r.triggered_by ? 'manual' : 'scheduled');
        const triggeredByName = r.triggered_by ? nameByUser.get(r.triggered_by) : undefined;

        return {
          id: r.id,
          timestamp: r.triggered_at,
          type,
          overallScore: overall,
          categoryScores,
          findings,
          keyChanges,
          triggeredByName,
        };
      });

      return runs;
    },
    staleTime: 60 * 1000,
  });

  const findingsFlowQ = useQuery({
    queryKey: ['growth-audit-history', 'findings-flow', venueId ?? 'none'],
    enabled: !!venueId,
    queryFn: async (): Promise<FindingsFlowPoint[]> => {
      const since = new Date();
      since.setMonth(since.getMonth() - 5);
      since.setDate(1);
      const { data, error } = await supabase
        .from('growth_findings')
        .select('first_detected_at, resolved_at')
        .eq('venue_id', venueId!)
        .gte('first_detected_at', since.toISOString());
      if (error) throw error;

      const months: { key: string; label: string }[] = [];
      const cursor = new Date(since);
      for (let i = 0; i < 6; i += 1) {
        months.push({
          key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
          label: cursor.toLocaleDateString('en-US', { month: 'short' }),
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      const opened = new Map(months.map(m => [m.key, 0]));
      const resolved = new Map(months.map(m => [m.key, 0]));
      (data ?? []).forEach(row => {
        const o = new Date(row.first_detected_at);
        const ok = `${o.getFullYear()}-${String(o.getMonth() + 1).padStart(2, '0')}`;
        if (opened.has(ok)) opened.set(ok, (opened.get(ok) ?? 0) + 1);
        if (row.resolved_at) {
          const r = new Date(row.resolved_at);
          const rk = `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}`;
          if (resolved.has(rk)) resolved.set(rk, (resolved.get(rk) ?? 0) + 1);
        }
      });
      return months.map(m => ({
        month: m.label,
        opened: opened.get(m.key) ?? 0,
        resolved: resolved.get(m.key) ?? 0,
      }));
    },
    staleTime: 60 * 1000,
  });

  const campaignActivityQ = useQuery({
    queryKey: ['growth-audit-history', 'campaign-activity', venueId ?? 'none'],
    enabled: !!venueId,
    queryFn: async (): Promise<CampaignActivityPoint[]> => {
      const since = new Date();
      since.setMonth(since.getMonth() - 5);
      since.setDate(1);
      const sinceStr = since.toISOString().slice(0, 10);
      const [campaignsRes, linksRes] = await Promise.all([
        supabase
          .from('marketing_campaigns')
          .select('id, start_date')
          .eq('venue_id', venueId!)
          .gte('start_date', sinceStr),
        supabase
          .from('finding_campaign_links')
          .select('campaign_id, outcome')
          .eq('venue_id', venueId!),
      ]);
      if (campaignsRes.error) throw campaignsRes.error;
      if (linksRes.error) throw linksRes.error;

      const months: { key: string; label: string }[] = [];
      const cursor = new Date(since);
      for (let i = 0; i < 6; i += 1) {
        months.push({
          key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
          label: cursor.toLocaleDateString('en-US', { month: 'short' }),
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      const launched = new Map(months.map(m => [m.key, 0]));
      const outcomeByMonth = new Map<string, { repeat: number; tweak: number; retire: number }>();
      months.forEach(m => outcomeByMonth.set(m.key, { repeat: 0, tweak: 0, retire: 0 }));

      const monthFor = (iso: string) => {
        const [y, mo] = iso.split('-');
        return `${y}-${mo}`;
      };
      const campaignMonth = new Map<string, string>();
      (campaignsRes.data ?? []).forEach(c => {
        const k = monthFor(c.start_date);
        campaignMonth.set(c.id, k);
        if (launched.has(k)) launched.set(k, (launched.get(k) ?? 0) + 1);
      });

      // Outcome → category mapping
      // 'Resolved' → repeat (success), 'Inconclusive' → tweak, 'Failed' → retire,
      // 'Open' is in-flight (skipped).
      (linksRes.data ?? []).forEach(l => {
        const k = campaignMonth.get(l.campaign_id);
        if (!k) return;
        const bucket = outcomeByMonth.get(k);
        if (!bucket) return;
        if (l.outcome === 'Resolved') bucket.repeat += 1;
        else if (l.outcome === 'Inconclusive') bucket.tweak += 1;
        else if (l.outcome === 'Failed') bucket.retire += 1;
      });

      return months.map(m => ({
        month: m.label,
        launched: launched.get(m.key) ?? 0,
        ...(outcomeByMonth.get(m.key) ?? { repeat: 0, tweak: 0, retire: 0 }),
      }));
    },
    staleTime: 60 * 1000,
  });

  return {
    runs: runsQ.data ?? [],
    findingsFlow: findingsFlowQ.data ?? [],
    campaignActivity: campaignActivityQ.data ?? [],
    isLoading: runsQ.isLoading || findingsFlowQ.isLoading || campaignActivityQ.isLoading,
  };
}

// ────────────────────────────────────────────────────────────────
// useScoreSnapshots(venueId, range)
// ────────────────────────────────────────────────────────────────
export type ScoreRange = '1M' | '3M' | '6M' | 'ALL';

export function useScoreSnapshots(venueId: string | null | undefined, range: ScoreRange = '6M') {
  return useQuery({
    queryKey: ['growth-audit-history', 'score-snapshots', venueId ?? 'none', range],
    enabled: !!venueId,
    queryFn: async (): Promise<ScoreSnapshotPoint[]> => {
      let query = supabase
        .from('growth_score_snapshots')
        .select('snapshot_date, growth_score, category_scores')
        .eq('venue_id', venueId!)
        .order('snapshot_date', { ascending: true });
      if (range !== 'ALL') {
        const days = range === '1M' ? 30 : range === '3M' ? 90 : 180;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        query = query.gte('snapshot_date', cutoff.toISOString().slice(0, 10));
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(row => {
        const cs = (row.category_scores ?? {}) as Partial<Record<FindingCategoryKey, number>>;
        return {
          date: row.snapshot_date,
          overall: row.growth_score ?? null,
          revenue: cs.revenue ?? null,
          menu: cs.menu ?? null,
          events: cs.events ?? null,
          local: cs.local ?? null,
          reputation: cs.reputation ?? null,
          social: cs.social ?? null,
          website: cs.website ?? null,
          operational: cs.operational ?? null,
        };
      });
    },
    staleTime: 60 * 1000,
  });
}
