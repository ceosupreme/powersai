import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Toast venue name/address fragments → BarPulse bar_code
const VENUE_HINTS: Record<string, string> = {
  'aero': 'Aero',
  'club marina': 'CM',
  'harbor town': 'harbor-town',
  'hearth': 'Hearth',
  'hills': 'HILLS',
  'la mesa': 'HILLS',
  '8758': 'HILLS',
  'sycamore': 'Sycamore',
  'waterfront': 'WFBG',
  'werewolf': 'wolf',
};

function fuzzyMatchVenue(location: string): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [hint, code] of Object.entries(VENUE_HINTS)) {
    if (lower.includes(hint)) return code;
  }
  return null;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse Toast "Fulfillment Time" strings like:
 * "10 minutes and 39 seconds"
 * "7 minutes and 20 seconds"
 * "45 seconds"
 * "1 hour, 2 minutes and 30 seconds"
 * Returns decimal minutes, or null if unparseable.
 */
function parseFulfillmentTime(raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const s = raw.trim().toLowerCase();
  let totalSeconds = 0;

  const hourMatch = s.match(/(\d+)\s*hours?/);
  const minMatch = s.match(/(\d+)\s*minutes?/);
  const secMatch = s.match(/(\d+)\s*seconds?/);

  if (!hourMatch && !minMatch && !secMatch) return null;

  if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
  if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
  if (secMatch) totalSeconds += parseInt(secMatch[1]);

  return totalSeconds / 60; // decimal minutes
}

/**
 * Parse dates like "3/30/26 11:09 AM" → "2026-03-30"
 */
function parseFiredDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  const s = raw.trim();
  // M/D/YY H:MM AM/PM or M/D/YYYY ...
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return null;
  let year = match[3];
  if (year.length === 2) {
    year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
  }
  return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const c of candidates) {
      if (h.includes(c.toLowerCase().replace(/[^a-z0-9]/g, ''))) return i;
    }
  }
  return -1;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { csv_content, venue_id, confirm, week_start } = body;

    if (!csv_content) {
      return new Response(JSON.stringify({ error: 'Missing csv_content' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require explicit week_start (YYYY-MM-DD, Monday) — prevents 8-day bucket bug
    // where Toast exports include tickets straddling business-day boundaries.
    if (!week_start || !/^\d{4}-\d{2}-\d{2}$/.test(week_start)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid week_start (expected YYYY-MM-DD)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Compute inclusive [week_start, week_start+6] window using string math (PT-safe)
    const [wy, wm, wd] = week_start.split('-').map(Number);
    const _end = new Date(Date.UTC(wy, wm - 1, wd + 6));
    const week_end = `${_end.getUTCFullYear()}-${String(_end.getUTCMonth() + 1).padStart(2, '0')}-${String(_end.getUTCDate()).padStart(2, '0')}`;

    // Load venues
    const { data: venues } = await supabase.from('venues').select('id, name, bar_code');
    const venueMap: Record<string, { id: string; name: string; bar_code: string }> = {};
    for (const v of (venues || [])) {
      venueMap[v.bar_code] = v;
    }
    const venueById: Record<string, { id: string; name: string; bar_code: string }> = {};
    for (const v of (venues || [])) {
      venueById[v.id] = v;
    }

    const lines = csv_content.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV has no data rows' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = parseCSVLine(lines[0]).map((h: string) => h.replace(/^\uFEFF/, ''));
    console.log('KDS CSV headers:', JSON.stringify(headers));

    const locationIdx = findColumnIndex(headers, ['Location']);
    const firedDateIdx = findColumnIndex(headers, ['Fired Date', 'FiredDate']);
    const fulfillmentTimeIdx = findColumnIndex(headers, ['Fulfillment Time', 'FulfillmentTime']);

    if (firedDateIdx === -1) {
      return new Response(JSON.stringify({ error: 'Could not find "Fired Date" column' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (fulfillmentTimeIdx === -1) {
      return new Response(JSON.stringify({ error: 'Could not find "Fulfillment Time" column' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine target venue
    let targetBarCode: string | null = null;
    let targetVenue: { id: string; name: string; bar_code: string } | null = null;

    if (venue_id && venueById[venue_id]) {
      targetVenue = venueById[venue_id];
      targetBarCode = targetVenue.bar_code;
    }

    // Parse rows, group by date
    interface DayBucket {
      totalMins: number;
      count: number;
      over25Count: number;
    }
    const dayBuckets: Record<string, DayBucket> = {};
    const warnings: string[] = [];
    let totalRows = 0;
    let skippedRows = 0;
    let detectedLocation = '';

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const rawDate = fields[firedDateIdx] || '';
      const date = parseFiredDate(rawDate);
      if (!date) {
        if (rawDate.trim()) warnings.push(`Row ${i + 1}: could not parse date "${rawDate}"`);
        skippedRows++;
        continue;
      }

      const fulfillmentMins = parseFulfillmentTime(fields[fulfillmentTimeIdx] || '');
      if (fulfillmentMins === null || fulfillmentMins <= 0 || fulfillmentMins > 120) {
        skippedRows++;
        continue;
      }

      // Auto-detect venue from first row's location if not provided
      if (!targetBarCode && locationIdx !== -1) {
        const loc = fields[locationIdx] || '';
        if (!detectedLocation) detectedLocation = loc;
        const matched = fuzzyMatchVenue(loc);
        if (matched && venueMap[matched]) {
          targetBarCode = matched;
          targetVenue = venueMap[matched];
        }
      }

      totalRows++;
      if (!dayBuckets[date]) {
        dayBuckets[date] = { totalMins: 0, count: 0, over25Count: 0 };
      }
      dayBuckets[date].totalMins += fulfillmentMins;
      dayBuckets[date].count++;
      if (fulfillmentMins > 25) dayBuckets[date].over25Count++;
    }

    // Drop any buckets outside [week_start, week_end] — surface as warnings
    for (const date of Object.keys(dayBuckets)) {
      if (date < week_start || date > week_end) {
        const tix = dayBuckets[date].count;
        warnings.push(`Dropped out-of-window date ${date} (${tix} tickets, outside ${week_start}–${week_end})`);
        delete dayBuckets[date];
      }
    }

    // Build summary
    const dailySummary = Object.entries(dayBuckets)
      .map(([date, bucket]) => ({
        date,
        avg_kds_mins: Math.round((bucket.totalMins / bucket.count) * 100) / 100,
        kds_over_25_pct: Math.round((bucket.over25Count / bucket.count) * 10000) / 10000,
        kds_total_tickets: bucket.count,
        kds_over_25_tickets: bucket.over25Count,
        ticket_count: bucket.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Preview mode
    if (!confirm) {
      return new Response(JSON.stringify({
        preview: true,
        venue: targetVenue ? { id: targetVenue.id, name: targetVenue.name, bar_code: targetVenue.bar_code } : null,
        detected_location: detectedLocation,
        total_tickets: totalRows,
        skipped_rows: skippedRows,
        days: dailySummary,
        warnings: warnings.slice(0, 20),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === COMMIT MODE ===
    if (!targetBarCode || !targetVenue) {
      return new Response(JSON.stringify({ error: 'Could not determine venue. Please select a venue.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let upsertedCount = 0;
    // KDS-only columns. We must NEVER overwrite `source` on a row whose
    // net_sales / labor came from Toast API or a manual upload — the KDS
    // CSV only carries ticket-time data. Pattern: check if the row exists.
    // If yes, UPDATE only KDS fields (preserving source). If no, INSERT a
    // new row tagged source='kds_csv_upload'.
    for (const day of dailySummary) {
      const kdsFields = {
        avg_kds_time_mins: day.avg_kds_mins,
        kds_over_25_pct: day.kds_over_25_pct,
        kds_total_tickets: day.kds_total_tickets,
        kds_over_25_tickets: day.kds_over_25_tickets,
      } as any;

      const { data: existing } = await supabase
        .from('daily_metrics')
        .select('id, source')
        .eq('bar_id', targetBarCode)
        .eq('date', day.date)
        .maybeSingle();

      let error: any = null;
      if (existing) {
        // Patch KDS columns only — leave source/net_sales/labor alone.
        const { error: updErr } = await supabase
          .from('daily_metrics')
          .update(kdsFields)
          .eq('id', existing.id);
        error = updErr;
      } else {
        // Fresh insert — tag the row as KDS-sourced.
        const { error: insErr } = await supabase
          .from('daily_metrics')
          .insert({
            bar_id: targetBarCode,
            date: day.date,
            venue_id: targetVenue.id,
            ...kdsFields,
            source: 'kds_csv_upload',
          } as any);
        error = insErr;
      }

      if (error) {
        console.error(`KDS write error for ${day.date}:`, error.message);
        warnings.push(`Failed to write ${day.date}: ${error.message}`);
      } else {
        upsertedCount++;
      }
    }

    // Record upload history
    const dates = dailySummary.map(d => d.date).sort();
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      const { data: { user } } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    await supabase.from('manual_upload_history').insert({
      uploaded_by: userId,
      venue_id: targetVenue.id,
      bar_id: targetBarCode,
      date_range_start: dates[0],
      date_range_end: dates[dates.length - 1],
      data_type: 'kds',
      method: 'kds_csv_upload',
      record_count: upsertedCount,
      file_name: body.file_name || 'kitchen_details.csv',
    });

    // Trigger weekly score recompute
    try {
      const weekStarts = [...new Set(dates.map(d => {
        const dt = new Date(d + 'T00:00:00Z');
        const day = dt.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        dt.setUTCDate(dt.getUTCDate() + diff);
        return dt.toISOString().slice(0, 10);
      }))];

      for (const ws of weekStarts) {
        await supabase.functions.invoke('compute-weekly-scores', {
          body: { bar_id: targetVenue.id, week_start: ws },
        });
      }
    } catch (e) {
      console.error('Score recompute error:', e);
      warnings.push('KDS data imported but weekly score recompute failed');
    }

    return new Response(JSON.stringify({
      success: true,
      upserted: upsertedCount,
      days: dailySummary,
      warnings,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('parse-kds-csv error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
