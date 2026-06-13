// ============================================================================
// Lead Log Rating Detector
// ============================================================================
// Reads `lead_logs.{lead_rating,bartender_rating,service_bartender_rating,
// window_rating,float_rating,vibe_rating}` (1-5 scale) populated by
// sync-asana-logs from the Lead Log Asana form, and fires deterministic
// insights when any field is <= 3.
//
//   rating == 3  → severity Medium
//   rating <= 2  → severity High
//
// Pillar: Operations. source_metric: 'lead_rating'. dedupe_hash:
// `lead_rating:{lead_log_id}:{field}` so each (log, field) gets at most one
// insight + one paired action_item.
//
// Volatile per-shift signal — exempt from sanity-check guardrail (callers
// don't need to gate this).
// ============================================================================

import { upsertDeterministicAction } from './deterministic-actions.ts';

type SupabaseClient = any;

const RATING_FIELDS: { key: string; label: string }[] = [
  { key: 'lead_rating',              label: 'Lead' },
  { key: 'bartender_rating',         label: 'Bartender' },
  { key: 'service_bartender_rating', label: 'Service Bartender' },
  { key: 'window_rating',            label: 'Window' },
  { key: 'float_rating',             label: 'Float' },
  { key: 'vibe_rating',              label: 'Vibe' },
];

async function resolveVenueName(supabase: SupabaseClient, venueId: string): Promise<string> {
  const { data } = await supabase
    .from('venues')
    .select('bar_name')
    .eq('id', venueId)
    .maybeSingle();
  return data?.bar_name || 'Venue';
}

export async function runDailyLeadRatingAlerts(
  supabase: SupabaseClient,
  venueId: string,
  businessDate: string, // 'YYYY-MM-DD' (Pacific)
  weekId: string | null = null,
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  const venueName = await resolveVenueName(supabase, venueId);

  const { data: logs, error } = await supabase
    .from('lead_logs')
    .select('id, date, shift, author_name, lead_rating, bartender_rating, service_bartender_rating, window_rating, float_rating, vibe_rating')
    .eq('bar_id', venueId)
    .eq('date', businessDate);

  if (error) {
    errors.push(`lead_logs query: ${error.message}`);
    return { created, errors };
  }

  for (const log of (logs || [])) {
    for (const f of RATING_FIELDS) {
      const v = log[f.key];
      if (v == null || typeof v !== 'number' || v >= 4) continue;

      const severity = v <= 2 ? 'High' : 'Medium';
      const shiftSuffix = log.shift ? ` (${log.shift})` : '';
      const title = `${f.label} rated ${v}/5 — ${venueName} — ${businessDate}${shiftSuffix}`;
      const summary = `Lead Log on ${businessDate}${shiftSuffix} rated ${f.label} ${v}/5 (1-5 scale).${log.author_name ? ` Reported by ${log.author_name}.` : ''}`;
      const detail = `Sub-4 lead-shift rating from the ${venueName} Lead Log Asana form.\n\nField: ${f.label}\nRating: ${v}/5\nDate: ${businessDate}${shiftSuffix}\n${log.author_name ? `Reporter: ${log.author_name}\n` : ''}\nThis is a per-shift coaching signal, not a compliance violation. Have the GM debrief with the lead and the named area within the week.`;
      const dedupe = `lead_rating:${log.id}:${f.key}`;

      const { data: insertedRow, error: insErr } = await supabase
        .from('insights')
        .insert({
          bar_id: venueId,
          venue_id: venueId,
          pillar: 'Operations',
          insight_type: 'Issue',
          severity,
          title,
          summary,
          detail,
          source_type: `Asana Lead Log — ${venueName}`,
          source_date: businessDate,
          source_metric: 'lead_rating',
          source_value: `${v}/5`,
          source_context: JSON.stringify({ lead_log_id: log.id, field: f.key, rating: v, shift: log.shift }),
          metric_name: f.key,
          metric_value: String(v),
          threshold: '4',
          dedupe_hash: dedupe,
          status: 'New',
          generated_by: 'deterministic_trigger',
          insight_mode: 'daily',
          week_id: weekId,
        })
        .select('id')
        .single();

      if (insErr) {
        if (insErr.code !== '23505') {
          errors.push(`lead_rating insert ${dedupe}: ${insErr.message}`);
        }
        continue; // 23505 = already fired (dedupe_hash unique); skip action too
      }

      created++;

      // Paired action_item
      try {
        await upsertDeterministicAction(supabase, {
          insight_id: insertedRow.id,
          bar_id: venueId,
          venue_id: venueId,
          pillar: 'Operations',
          severity,
          source_metric: 'lead_rating',
          source_date: businessDate,
          venue_name: venueName,
          metric_label: `${f.label} rating`,
          insight_title: title,
          insight_summary: summary,
          problem_detail: detail,
          week_id: weekId,
        });
      } catch (e: any) {
        errors.push(`lead_rating action ${dedupe}: ${e?.message || e}`);
      }
    }
  }

  return { created, errors };
}
