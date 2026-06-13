import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  INVENTORY_CSV_HEADERS,
  parseCSVLine,
  parseNum,
  sha256Hex,
  validateExactHeader,
} from '../_shared/sculpture-signatures.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  csv_content: string;
  venue_id: string;
  period_start: string;
  period_end: string;
  source_file?: string;
}

const sanitizeText = (s: unknown): string | null => {
  if (s === null || s === undefined) return null;
  const cleaned = String(s).replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = (await req.json()) as ParseRequest;
    const { csv_content, venue_id, period_start, period_end, source_file } = body || {};

    if (!csv_content || !venue_id || !period_start || !period_end) {
      return json({ error: 'Missing required fields: csv_content, venue_id, period_start, period_end' }, 400);
    }

    const lines = csv_content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return json({ error: 'CSV has fewer than 2 rows' }, 400);

    const headerFields = parseCSVLine(lines[0]);
    const drift = validateExactHeader(headerFields, INVENTORY_CSV_HEADERS);
    if (!drift.ok) {
      return json({
        code: 'SCHEMA_DRIFT_DETECTED',
        error: drift.message,
        mismatch_at: drift.mismatchAt,
        expected: drift.expected,
        received: drift.received,
        full_received_header: headerFields,
      }, 422);
    }

    console.log('[parse-inventory-csv-v2] starting', JSON.stringify({
      venue_id,
      period_start,
      period_end,
      source_file: source_file ?? null,
      data_rows: lines.length - 1,
    }));

    const headerHash = await sha256Hex(headerFields.join('|'));

    // Column indices (header has been validated to be exactly INVENTORY_CSV_HEADERS).
    const COL_STATION = 0;
    const COL_ITEM = 1;
    const COL_UOM = 3;
    const COL_SIZE = 4;
    const COL_QTY = 7;

    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const itemName = sanitizeText(fields[COL_ITEM]);
      const station = sanitizeText(fields[COL_STATION]);
      if (!itemName && !station) continue;

      const sizeRaw = sanitizeText(fields[COL_SIZE]);
      rows.push({
        venue_id,
        period_start,
        period_end,
        source_file: source_file ?? null,
        source_report_type: 'inventory_csv',
        raw_header_hash: headerHash,
        item_name: itemName,
        station,
        item_size: sizeRaw === '-' ? null : sizeRaw,
        on_hand_qty: parseNum(fields[COL_QTY] ?? null),
        on_hand_uom: sanitizeText(fields[COL_UOM]),
      });
    }

    if (rows.length === 0) return json({ error: 'No data rows parsed' }, 400);

    const { error: delErr } = await supabase
      .from('inventory_station_stock')
      .delete()
      .eq('venue_id', venue_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end);
    if (delErr) return json({ error: `Delete failed: ${delErr.message}` }, 500);

    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error: insErr } = await supabase.from('inventory_station_stock').insert(slice);
      if (insErr) {
        return json({
          error: `Insert failed at offset ${i}: ${insErr.message}`,
          rows_inserted_before_failure: inserted,
        }, 500);
      }
      inserted += slice.length;
    }

    console.log('[parse-inventory-csv-v2] success', JSON.stringify({ rows_imported: inserted }));

    return json({
      success: true,
      rows_imported: inserted,
      total_rows_parsed: rows.length,
    }, 200);
  } catch (err) {
    console.error('parse-inventory-csv-v2 error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
