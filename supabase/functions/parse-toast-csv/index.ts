import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Toast venue name aliases → BarPulse bar_code
const VENUE_ALIASES: Record<string, string> = {
  'aero club': 'Aero',
  'club marina': 'CM',
  'harbor town pub': 'harbor-town',
  'harbor town': 'harbor-town',
  'the hearth house': 'Hearth',
  'hearth house': 'Hearth',
  'the hills local pub': 'HILLS',
  'the hills': 'HILLS',
  'sycamore den': 'Sycamore',
  'waterfront bar & grill': 'WFBG',
  'waterfront bar and grill': 'WFBG',
  'werewolf': 'wolf',
};

// Toast export numbers → bar_code
const EXPORT_NUM_MAP: Record<string, string> = {
  '111239': 'Aero',
  '105504': 'CM',
  '88383': 'harbor-town',
  '220357': 'Hearth',
  '112793': 'HILLS',
  '111580': 'WFBG',
  '121634': 'wolf',
};

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

function parseNumber(raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const cleaned = raw.replace(/[$,%\s]/g, '').replace(/,/g, '');
  if (cleaned === '') return null;
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  const s = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYYMMDD (no separators)
  const ymd = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  // MM/DD/YYYY or M/D/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  // M/D/YY
  const mdy2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdy2) {
    const yr = parseInt(mdy2[3]) > 50 ? `19${mdy2[3]}` : `20${mdy2[3]}`;
    return `${yr}-${mdy2[1].padStart(2, '0')}-${mdy2[2].padStart(2, '0')}`;
  }
  return null;
}

function parseDateFromFileName(fileName: string): string | null {
  if (!fileName) return null;
  const base = fileName.split('/').pop() || fileName;

  const ymd = base.match(/(\d{4})[-_](\d{1,2})[-_](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  const mdy = base.match(/(\d{1,2})[-_](\d{1,2})[-_](\d{4})/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }

  return null;
}

function fuzzyMatchVenue(name: string): string | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  // Direct alias match
  if (VENUE_ALIASES[lower]) return VENUE_ALIASES[lower];
  // Export number match
  if (EXPORT_NUM_MAP[name.trim()]) return EXPORT_NUM_MAP[name.trim()];
  // Partial match
  for (const [alias, code] of Object.entries(VENUE_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return code;
  }
  return null;
}

// Fuzzy match header columns
function matchHeader(header: string, candidates: string[]): boolean {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  return candidates.some(c => h.includes(c.toLowerCase().replace(/[^a-z0-9]/g, '')));
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (matchHeader(headers[i], candidates)) return i;
  }
  return -1;
}

// bar_code → venue mapping (loaded from DB)
interface VenueMap {
  [barCode: string]: { id: string; name: string };
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
    const { csv_content, data_type, conflict_mode, venue_bar_code, report_date, file_name } = body;
    // data_type: 'labor' | 'sales' | 'both'
    // conflict_mode: 'skip' | 'overwrite'
    // venue_bar_code: optional — if provided, all rows map to this venue

    if (!csv_content) {
      return new Response(JSON.stringify({ error: 'Missing csv_content' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load venues for mapping
    const { data: venues } = await supabase.from('venues').select('id, name, bar_code');
    const venueMap: VenueMap = {};
    for (const v of (venues || [])) {
      venueMap[v.bar_code] = { id: v.id, name: v.name };
    }

    const lines = csv_content.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV has no data rows' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^\uFEFF/, ''));
    console.log('CSV headers detected:', JSON.stringify(headers));

    const fallbackDate = parseDate(report_date || '') || parseDateFromFileName(file_name || '');

    // Find column indices
    const dateIdx = findColumnIndex(headers, ['Date', 'Business Date', 'BusinessDate', 'Day', 'Report Date', 'Opened', 'Period', 'Biz Date', 'Trans Date', 'Transaction Date', 'Week of', 'WeekOf']);
    const locationIdx = findColumnIndex(headers, ['Location', 'Restaurant', 'Venue', 'Store']);
    
    // Labor columns — prioritize "Total Hours" over generic "Hours" to avoid matching "Regular Hours"
    const totalHoursIdx = findColumnIndex(headers, ['Total Hours', 'Total hours']);
    const regularHoursIdx = findColumnIndex(headers, ['Regular Hours', 'Regular hours']);
    const genericLaborHoursIdx = findColumnIndex(headers, ['Labor Hours', 'Hours']);
    // Use Total Hours if available; otherwise fall back to generic match
    const laborHoursIdx = totalHoursIdx !== -1 ? totalHoursIdx : genericLaborHoursIdx;
    // Labor cost — prioritize "Total cost" to avoid matching "Labor % (net)"
    const totalCostIdx = findColumnIndex(headers, ['Total cost', 'Total Cost']);
    const genericLaborCostIdx = findColumnIndex(headers, ['Labor Cost', 'Total Labor Cost']);
    const laborCostIdx = totalCostIdx !== -1 ? totalCostIdx : genericLaborCostIdx;
    const laborPctIdx = findColumnIndex(headers, ['Labor %', 'Labor Pct', 'Labor Percent']);
    const splhIdx = findColumnIndex(headers, ['SPLH', 'Sales Per Labor Hour']);
    const overtimeIdx = findColumnIndex(headers, ['Overtime Hours', 'OT Hours']);
    const tipsIdx = findColumnIndex(headers, ['Tips', 'Total Tips', 'Tip Amount']);
    
    // Sales columns
    const netSalesIdx = findColumnIndex(headers, ['Net Sales', 'NetSales']);
    const grossSalesIdx = findColumnIndex(headers, ['Gross Sales', 'GrossSales']);
    const transactionsIdx = findColumnIndex(headers, ['Transaction Count', 'Transactions', 'Orders', 'Order Count']);
    const guestsIdx = findColumnIndex(headers, ['Guest Count', 'Guests', 'Covers']);
    const avgCheckIdx = findColumnIndex(headers, ['Average Check', 'Avg Check', 'AvgCheck']);
    const discountsIdx = findColumnIndex(headers, ['Discount', 'Discounts', 'Discount Amount']);
    const compsIdx = findColumnIndex(headers, ['Comp', 'Comps', 'Comp Amount']);
    const voidsIdx = findColumnIndex(headers, ['Void', 'Voids', 'Void Amount']);
    const refundsIdx = findColumnIndex(headers, ['Refund', 'Refunds', 'Refund Amount']);

    if (dateIdx === -1 && !fallbackDate) {
      return new Response(JSON.stringify({
        error: 'Could not find a Date column in the CSV headers. Please include a Date column or provide a fallback report_date.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse rows
    interface ParsedRow {
      date: string;
      bar_code: string;
      venue_name: string;
      venue_id: string | null;
      labor_hours: number | null;
      labor_cost: number | null;
      labor_pct: number | null;
      splh: number | null;
      overtime_hours: number | null;
      tips: number | null;
      net_sales: number | null;
      gross_sales: number | null;
      orders_count: number | null;
      guests: number | null;
      avg_check: number | null;
      discounts: number | null;
      comps: number | null;
      voids: number | null;
      refunds: number | null;
      unmapped_location: string | null;
    }

    const parsed: ParsedRow[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const rawDate = dateIdx !== -1 ? (fields[dateIdx] || '') : (fallbackDate || '');
      const date = parseDate(rawDate) || fallbackDate;
      if (!date) {
        if (rawDate.trim()) warnings.push(`Row ${i + 1}: could not parse date "${rawDate}"`);
        continue;
      }

      let barCode = venue_bar_code || '';
      let venueName = '';
      let venueId: string | null = null;
      let unmappedLoc: string | null = null;

      if (!venue_bar_code && locationIdx !== -1) {
        const loc = fields[locationIdx] || '';
        const matched = fuzzyMatchVenue(loc);
        if (matched && venueMap[matched]) {
          barCode = matched;
          venueName = venueMap[matched].name;
          venueId = venueMap[matched].id;
        } else {
          unmappedLoc = loc;
          warnings.push(`Row ${i + 1}: could not match location "${loc}"`);
        }
      } else if (venue_bar_code && venueMap[venue_bar_code]) {
        barCode = venue_bar_code;
        venueName = venueMap[venue_bar_code].name;
        venueId = venueMap[venue_bar_code].id;
      }

      if (!barCode && !unmappedLoc) continue;

      parsed.push({
        date,
        bar_code: barCode,
        venue_name: venueName,
        venue_id: venueId,
        unmapped_location: unmappedLoc,
        labor_hours: laborHoursIdx !== -1 ? parseNumber(fields[laborHoursIdx]) : null,
        labor_cost: laborCostIdx !== -1 ? parseNumber(fields[laborCostIdx]) : null,
        labor_pct: laborPctIdx !== -1 ? parseNumber(fields[laborPctIdx]) : null,
        splh: splhIdx !== -1 ? parseNumber(fields[splhIdx]) : null,
        overtime_hours: overtimeIdx !== -1 ? parseNumber(fields[overtimeIdx]) : null,
        tips: tipsIdx !== -1 ? parseNumber(fields[tipsIdx]) : null,
        net_sales: netSalesIdx !== -1 ? parseNumber(fields[netSalesIdx]) : null,
        gross_sales: grossSalesIdx !== -1 ? parseNumber(fields[grossSalesIdx]) : null,
        orders_count: transactionsIdx !== -1 ? parseNumber(fields[transactionsIdx]) : null,
        guests: guestsIdx !== -1 ? parseNumber(fields[guestsIdx]) : null,
        avg_check: avgCheckIdx !== -1 ? parseNumber(fields[avgCheckIdx]) : null,
        discounts: discountsIdx !== -1 ? parseNumber(fields[discountsIdx]) : null,
        comps: compsIdx !== -1 ? parseNumber(fields[compsIdx]) : null,
        voids: voidsIdx !== -1 ? parseNumber(fields[voidsIdx]) : null,
        refunds: refundsIdx !== -1 ? parseNumber(fields[refundsIdx]) : null,
      });
    }

    // If this is preview mode (no confirm flag), return parsed data
    if (!body.confirm) {
      return new Response(JSON.stringify({
        preview: true,
        rows: parsed,
        warnings,
        columns_detected: {
          date: dateIdx !== -1 || !!fallbackDate,
          location: locationIdx !== -1,
          labor_hours: laborHoursIdx !== -1,
          labor_cost: laborCostIdx !== -1,
          labor_pct: laborPctIdx !== -1,
          splh: splhIdx !== -1,
          overtime_hours: overtimeIdx !== -1,
          tips: tipsIdx !== -1,
          net_sales: netSalesIdx !== -1,
          gross_sales: grossSalesIdx !== -1,
          orders_count: transactionsIdx !== -1,
          guests: guestsIdx !== -1,
          avg_check: avgCheckIdx !== -1,
          discounts: discountsIdx !== -1,
          comps: compsIdx !== -1,
          voids: voidsIdx !== -1,
          refunds: refundsIdx !== -1,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === COMMIT MODE ===
    const validRows = parsed.filter(r => r.bar_code && !r.unmapped_location);
    if (validRows.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid rows to import (all locations unmapped)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing rows for snapshot (for revert)
    const dateSet = [...new Set(validRows.map(r => r.date))];
    const barSet = [...new Set(validRows.map(r => r.bar_code))];
    
    const { data: existingRows } = await supabase
      .from('daily_metrics')
      .select('*')
      .in('bar_id', barSet)
      .in('date', dateSet);

    const existingMap = new Map<string, any>();
    for (const row of ((existingRows as any[]) || [])) {
      existingMap.set(`${row.bar_id}_${row.date}`, row);
    }

    const previousValues: Record<string, unknown>[] = [];
    let upsertedCount = 0;
    let skippedCount = 0;

    for (const row of validRows) {
      const key = `${row.bar_code}_${row.date}`;
      const existing = existingMap.get(key);

      if (existing && conflict_mode === 'skip') {
        skippedCount++;
        continue;
      }

      if (existing) {
        previousValues.push(existing);
      }

      // Build upsert payload — only set non-null fields from CSV
      const payload: Record<string, unknown> = {
        bar_id: row.bar_code,
        date: row.date,
        venue_id: row.venue_id,
        source: 'manual_upload',
      };

      if (row.labor_hours !== null) payload.labor_hours = row.labor_hours;
      if (row.labor_cost !== null) payload.labor_cost = row.labor_cost;
      if (row.labor_pct !== null) payload.labor_pct = row.labor_pct;
      if (row.splh !== null) payload.splh = row.splh;
      if (row.overtime_hours !== null) payload.overtime_hours = row.overtime_hours;
      if (row.tips !== null) {
        payload.tips = row.tips;
        if (row.net_sales !== null && row.net_sales > 0) {
          payload.tip_pct = Math.round((row.tips / row.net_sales) * 10000) / 100;
        }
      }
      if (row.refunds !== null) {
        payload.refunds = row.refunds;
        if (row.net_sales !== null && row.net_sales > 0) {
          payload.refund_pct = Math.round((row.refunds / row.net_sales) * 10000) / 100;
        }
      }
      if (row.net_sales !== null) payload.net_sales = row.net_sales;
      if (row.gross_sales !== null) payload.gross_sales = row.gross_sales;
      if (row.orders_count !== null) payload.orders_count = row.orders_count;
      if (row.guests !== null) payload.guests = row.guests;
      if (row.avg_check !== null) payload.avg_check = row.avg_check;
      if (row.discounts !== null) payload.discounts = row.discounts;
      if (row.comps !== null) payload.comps = row.comps;
      if (row.voids !== null) payload.voids = row.voids;
      // refunds already handled above with refund_pct

      const { error } = await supabase
        .from('daily_metrics')
        .upsert(payload as any, { onConflict: 'bar_id,date' });

      if (error) {
        console.error(`Upsert error for ${key}:`, error.message);
        warnings.push(`Failed to upsert ${row.venue_name} ${row.date}: ${error.message}`);
      } else {
        upsertedCount++;
      }
    }

    // Record upload history
    const dates = validRows.map(r => r.date).sort();
    const venueIds = [...new Set(validRows.map(r => r.venue_id).filter(Boolean))];

    // Get user from auth header
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
      venue_id: venueIds.length === 1 ? venueIds[0] : null,
      bar_id: barSet.length === 1 ? barSet[0] : null,
      date_range_start: dates[0],
      date_range_end: dates[dates.length - 1],
      data_type: data_type || 'both',
      method: 'csv_upload',
      record_count: upsertedCount,
      file_name: file_name || null,
      previous_values: previousValues.length > 0 ? previousValues : null,
    });

    // Trigger weekly score recompute for affected weeks
    try {
      for (const barCode of barSet) {
        const venue = venueMap[barCode];
        if (!venue) continue;
        // Compute distinct Monday-based week starts from uploaded dates
        const venueDates = validRows
          .filter(r => r.bar_code === barCode)
          .map(r => r.date);
        const weekStarts = [...new Set(venueDates.map(d => {
          const dt = new Date(d + 'T00:00:00Z');
          const day = dt.getUTCDay(); // 0=Sun
          const diff = day === 0 ? -6 : 1 - day;
          dt.setUTCDate(dt.getUTCDate() + diff);
          return dt.toISOString().slice(0, 10);
        }))];
        for (const ws of weekStarts) {
          await supabase.functions.invoke('compute-weekly-scores', {
            body: { bar_id: venue.id, week_start: ws },
          });
        }
      }
    } catch (e) {
      console.error('Score recompute error:', e);
      warnings.push('Data imported but weekly score recompute failed — scores may be stale');
    }

    return new Response(JSON.stringify({
      success: true,
      upserted: upsertedCount,
      skipped: skippedCount,
      warnings,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('parse-toast-csv error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
