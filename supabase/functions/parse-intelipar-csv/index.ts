import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  INTELIPAR_HEADERS,
  buildCanonicalHeaderMap,
  getByCanonical,
  parseCSVLine,
  parseNum,
  sha256Hex,
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

const sanitizeText = (s: string | null | undefined): string | null => {
  if (s === null || s === undefined) return null;
  const cleaned = String(s).replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const __disabled = await guardIntegration('sculpture', corsHeaders);
  if (__disabled) return __disabled;
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
    if (lines.length < 2) return json({ error: 'CSV is empty or has no data rows' }, 400);

    const headerFields = parseCSVLine(lines[0]);

    // Header-name-based mapping. Tolerates per-venue extra columns like
    // "Purchased", "Unopened Onhand", "Open Onhand" interleaved among canonicals.
    const headerMap = buildCanonicalHeaderMap(headerFields, INTELIPAR_HEADERS);
    if (!headerMap.ok) {
      return json({
        code: 'SCHEMA_DRIFT_DETECTED',
        error: headerMap.message ?? 'Required InteliPar columns are missing.',
        missing: headerMap.missing,
        received_header: headerFields,
      }, 422);
    }

    console.log('[parser-validate]', JSON.stringify({
      report_type: 'intelipar',
      venue_id,
      period: `${period_start}..${period_end}`,
      received_cols: headerFields.length,
      canonical_cols_found: INTELIPAR_HEADERS.length,
      ignored_extras: headerMap.ignoredExtras.map((e) => e.rawHeader),
    }));

    const headerHash = await sha256Hex(headerFields.join('|'));
    const get = (fields: string[], canonical: string) =>
      getByCanonical(fields, headerMap.index, canonical);

    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const vendor = sanitizeText(get(fields, 'Vendor'));
      const itemName = sanitizeText(get(fields, 'Item Name'));
      // Skip blank rows (no item AND no vendor)
      if (!vendor && !itemName) continue;
      rows.push({
        venue_id,
        period_start,
        period_end,
        source_file: source_file ?? null,
        raw_header_hash: headerHash,
        vendor,
        total_order: parseNum(get(fields, 'Total Order')),
        order_uom: sanitizeText(get(fields, 'Order (UOM)')),
        item_name: itemName,
        item_size: sanitizeText(get(fields, 'Item Size')),
        unit_cost: parseNum(get(fields, 'Unit Cost')),
        on_hand_cost: parseNum(get(fields, 'On-Hand (cost)')),
        on_hand_qty: parseNum(get(fields, 'On-Hand')),
        used: parseNum(get(fields, 'Used')),
        historical_usage: parseNum(get(fields, 'Historical Usage')),
        par: parseNum(get(fields, 'Par')),
        excess_stock_onhand: parseNum(get(fields, 'Excess Stock Onhand')),
        // days_remaining: preserve raw string ('>365', '-', '140.2')
        days_remaining: sanitizeText(get(fields, 'Days Remaining')),
      });
    }

    if (rows.length === 0) return json({ error: 'No data rows parsed' }, 400);

    const { error: delErr } = await supabase
      .from('inventory_intelipar')
      .delete()
      .eq('venue_id', venue_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end);
    if (delErr) return json({ error: `Delete failed: ${delErr.message}` }, 500);

    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error: insErr } = await supabase.from('inventory_intelipar').insert(slice);
      if (insErr) {
        return json({
          error: `Insert failed at offset ${i}: ${insErr.message}`,
          rows_inserted_before_failure: inserted,
        }, 500);
      }
      inserted += slice.length;
    }

    return json({
      success: true,
      rows_imported: inserted,
      total_rows_parsed: rows.length,
      ignored_extra_columns: headerMap.ignoredExtras.map((e) => e.rawHeader),
    }, 200);
  } catch (err) {
    console.error('parse-intelipar-csv error:', err);
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
