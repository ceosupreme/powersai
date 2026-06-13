// Daily score snapshot writer (Prompt 23).
// Iterates all venues with growth_findings rows and upserts today's snapshot
// into growth_score_snapshots, computed from the current open-finding state.
//
// Trigger:  pg_cron daily, or manually with { venue_id?: uuid }
// Auth:     service-role only; no JWT required (cron-style internal job).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type CategoryKey =
  | 'revenue' | 'menu' | 'events' | 'local'
  | 'reputation' | 'social' | 'website' | 'operational';

const CATEGORIES: CategoryKey[] = [
  'revenue', 'menu', 'events', 'local',
  'reputation', 'social', 'website', 'operational',
];

const SEVERITY_PENALTY: Record<Severity, number> = {
  Critical: 25, High: 15, Medium: 8, Low: 3,
};

// Pacific-Time YYYY-MM-DD for the unique (venue_id, snapshot_date) key.
const todayPT = (): string => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
};

const computeScores = (findings: Array<{ category: string; severity: string }>) => {
  const perCat: Record<CategoryKey, number> = {
    revenue: 100, menu: 100, events: 100, local: 100,
    reputation: 100, social: 100, website: 100, operational: 100,
  };
  let critical = 0; let high = 0;
  for (const f of findings) {
    const sev = f.severity as Severity;
    if (sev === 'Critical') critical += 1;
    else if (sev === 'High') high += 1;
    const cat = (CATEGORIES.includes(f.category as CategoryKey)
      ? f.category as CategoryKey
      : 'operational');
    perCat[cat] = Math.max(0, perCat[cat] - (SEVERITY_PENALTY[sev] ?? 3));
  }
  const overall = Math.round(
    CATEGORIES.reduce((s, k) => s + perCat[k], 0) / CATEGORIES.length,
  );
  return { perCat, overall, critical, high, total: findings.length };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let onlyVenue: string | null = null;
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body && typeof body.venue_id === 'string') onlyVenue = body.venue_id;
    } catch (_) { /* ignore: cron sends no body */ }
  }

  // Determine the venue universe.
  let venueIds: string[] = [];
  if (onlyVenue) {
    venueIds = [onlyVenue];
  } else {
    const { data, error } = await supabase
      .from('growth_findings')
      .select('venue_id')
      .neq('status', 'Resolved')
      .limit(10000);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    venueIds = Array.from(new Set((data ?? []).map(r => r.venue_id).filter(Boolean)));
  }

  const date = todayPT();
  const written: string[] = [];
  const failed: { venue_id: string; error: string }[] = [];

  for (const venueId of venueIds) {
    const { data: findings, error: fErr } = await supabase
      .from('growth_findings')
      .select('category, severity')
      .eq('venue_id', venueId)
      .neq('status', 'Resolved');
    if (fErr) {
      failed.push({ venue_id: venueId, error: fErr.message });
      continue;
    }
    const { perCat, overall, critical, high, total } = computeScores(findings ?? []);

    const { error: upErr } = await supabase
      .from('growth_score_snapshots')
      .upsert({
        venue_id: venueId,
        snapshot_date: date,
        growth_score: overall,
        category_scores: perCat,
        findings_open_count: total,
        findings_critical_count: critical,
        findings_high_count: high,
        source: 'daily_snapshot',
      }, { onConflict: 'venue_id,snapshot_date' });

    if (upErr) failed.push({ venue_id: venueId, error: upErr.message });
    else written.push(venueId);
  }

  return new Response(JSON.stringify({
    ok: true, date, written: written.length, failed,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
