import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  COST_FLUCTUATION_HEADERS,
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

const sanitizeText = (s: string | null | undefined): string | null => {
  if (s === null || s === undefined) return null;
  const cleaned = String(s).replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
};

// Parse "M/D/YYYY", "MM/DD/YYYY", or ISO into YYYY-MM-DD
function parseInvoiceDate(raw: string | null | undefined): string | null {
  const t = sanitizeText(raw);
  if (!t) return null;
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, mo, d, y] = m;
    if (y.length === 2) y = (parseInt(y, 10) >= 70 ? '19' : '20') + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Last resort
  const dt = new Date(t);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

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
    if (lines.length < 2) return json({ error: 'CSV is empty or has no data rows' }, 400);

    const headerFields = parseCSVLine(lines[0]);
    const drift = validateExactHeader(headerFields, COST_FLUCTUATION_HEADERS);
    if (!drift.ok) {
      return json({
        code: 'SCHEMA_DRIFT_DETECTED',
        error: drift.message,
        mismatch_at: drift.mismatchAt,
        expected: drift.expected,
        received: drift.received,
      }, 422);
    }

    const headerHash = await sha256Hex(headerFields.join('|'));

    // Hierarchical walker: rows where col 0 has a value and cols 1..6 are empty
    // are product-name "headers"; subsequent rows belong to that product until
    // the next product header is hit.
    let currentProduct: string | null = null;
    const rows: Record<string, unknown>[] = [];
    let orphanRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const first = sanitizeText(fields[0]);
      const restEmpty = fields.slice(1, 7).every((c) => !c?.trim());

      if (first && restEmpty) {
        currentProduct = first;
        continue;
      }

      // Detail row — needs a current product
      if (!currentProduct) {
        orphanRows++;
        continue;
      }

      // Skip fully blank rows defensively
      const anyContent = fields.slice(1, 7).some((c) => c?.trim());
      if (!anyContent) continue;

      rows.push({
        venue_id,
        period_start,
        period_end,
        source_file: source_file ?? null,
        raw_header_hash: headerHash,
        product_name: currentProduct,
        invoice_date: parseInvoiceDate(fields[1]),
        vendor: sanitizeText(fields[2]),
        invoice_number: sanitizeText(fields[3]),
        price: parseNum(fields[4]),
        price_difference: parseNum(fields[5]),
        difference_pct: parseNum(fields[6]),
      });
    }

    if (rows.length === 0) {
      return json({ error: 'No data rows parsed (no product-detail rows found)', orphan_rows: orphanRows }, 400);
    }

    const { error: delErr } = await supabase
      .from('inventory_cost_history')
      .delete()
      .eq('venue_id', venue_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end);
    if (delErr) return json({ error: `Delete failed: ${delErr.message}` }, 500);

    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error: insErr } = await supabase.from('inventory_cost_history').insert(slice);
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
      orphan_rows: orphanRows,
    }, 200);
  } catch (err) {
    console.error('parse-cost-fluctuation-csv error:', err);
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
