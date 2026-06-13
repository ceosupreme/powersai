import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  DRINK_MIX_BASE_HEADERS,
  normalizeHeaderCell,
  parseCSVLine,
  parseNum,
  scanDrinkMixSections,
  SECTION_LABELS,
  sha256Hex,
  type DrinkMixSectionKey,
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

interface DrinkMixRow {
  plu: string;
  recipe_name: string | null;
  qty_sold: number | null;
  cost: number | null;
  tax_discount_pct: number | null;
  // All section fields nullable; absent sections stay undefined → SQL NULL.
  regular_price?: number | null;
  regular_pour_cost_pct?: number | null;
  regular_total_profit?: number | null;
  regular_theoretical_profit?: number | null;
  // (Note: regular_qty does not exist in the schema; the "qty" of the regular
  // section is captured by the top-level qty_sold field.)
  spill_qty?: number | null;
  spill_price?: number | null;
  spill_pour_cost_pct?: number | null;
  spill_total_profit?: number | null;
  spill_theoretical_profit?: number | null;
  comp_qty?: number | null;
  comp_price?: number | null;
  comp_pour_cost_pct?: number | null;
  comp_total_profit?: number | null;
  comp_theoretical_profit?: number | null;
  sales_2_qty?: number | null;
  sales_2_price?: number | null;
  sales_2_pour_cost_pct?: number | null;
  sales_2_total_profit?: number | null;
  sales_2_theoretical_profit?: number | null;
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
      return json({
        error: 'Missing required fields: csv_content, venue_id, period_start, period_end',
      }, 400);
    }

    const lines = csv_content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return json({ error: 'CSV is empty or has no data rows' }, 400);

    const headerFields = parseCSVLine(lines[0]);

    // Validate the 5 base columns strictly.
    const baseOk = DRINK_MIX_BASE_HEADERS.every(
      (h, idx) => normalizeHeaderCell(headerFields[idx] ?? '') === normalizeHeaderCell(h),
    );
    if (!baseOk) {
      return json({
        error: `Sculpture may have changed the Drink Mix Report format. Expected the first 5 columns to be exactly "PLU,Recipe Name,Qty Sold,Cost,Tax / Discount". Received: [${headerFields.slice(0, 5).join(', ')}]. Upload rejected to prevent data corruption.`,
        code: 'SCHEMA_DRIFT_DETECTED',
        detected_report_type: 'drink_mix',
        received_header: headerFields,
        expected_base_header: DRINK_MIX_BASE_HEADERS,
      }, 422);
    }

    // Classify each Drink Mix column past the 5 base columns by its (prefix, suffix) header.
    const scan = scanDrinkMixSections(headerFields);
    if (scan.unknownSection) {
      return json({
        error: `Unrecognized Drink Mix section "${scan.unknownSection.prefix}" at column ${scan.unknownSection.columnIndex + 1} ("${scan.unknownSection.rawHeader}"). Sculpture may have changed this report format.`,
        code: 'SCHEMA_DRIFT_DETECTED',
        detected_report_type: 'drink_mix',
        unknown_section: scan.unknownSection,
        received_header: headerFields,
      }, 422);
    }
    if (scan.unknownColumn) {
      return json({
        error: `Drink Mix column ${scan.unknownColumn.columnIndex + 1} ("${scan.unknownColumn.rawHeader}") is unrecognized: ${scan.unknownColumn.reason}`,
        code: 'SCHEMA_DRIFT_DETECTED',
        detected_report_type: 'drink_mix',
        unknown_column: scan.unknownColumn,
        received_header: headerFields,
      }, 422);
    }

    const sectionsPresent = scan.sections;

    const normalizedHeaderJoin = headerFields.map(normalizeHeaderCell).join('|');
    const rawHeaderHash = await sha256Hex(normalizedHeaderJoin);

    // Map every recognized (section, field) → its DB column name.
    // Note: source CSV `(Pour Cost)` maps to DB `${section}_pour_cost_pct`.
    const fieldToDbColumn = (key: string): keyof DrinkMixRow | null => {
      const map: Record<string, keyof DrinkMixRow> = {
        regular_qty: 'qty_sold', // Regular has no Qty column in any known venue, but tolerate it.
        regular_price: 'regular_price',
        regular_pour_cost: 'regular_pour_cost_pct',
        regular_total_profit: 'regular_total_profit',
        regular_theoretical_profit: 'regular_theoretical_profit',
        spill_qty: 'spill_qty',
        spill_price: 'spill_price',
        spill_pour_cost: 'spill_pour_cost_pct',
        spill_total_profit: 'spill_total_profit',
        spill_theoretical_profit: 'spill_theoretical_profit',
        comp_qty: 'comp_qty',
        comp_price: 'comp_price',
        comp_pour_cost: 'comp_pour_cost_pct',
        comp_total_profit: 'comp_total_profit',
        comp_theoretical_profit: 'comp_theoretical_profit',
        sales_2_qty: 'sales_2_qty',
        sales_2_price: 'sales_2_price',
        sales_2_pour_cost: 'sales_2_pour_cost_pct',
        sales_2_total_profit: 'sales_2_total_profit',
        sales_2_theoretical_profit: 'sales_2_theoretical_profit',
      };
      return map[key] ?? null;
    };

    // Build rows.
    const rows: DrinkMixRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 5) continue;
      const plu = sanitizeText(fields[0]?.replace(/^"|"$/g, '').trim());
      if (!plu) continue;

      const row: DrinkMixRow = {
        plu,
        recipe_name: sanitizeText(fields[1]?.trim()) || null,
        qty_sold: parseNum(fields[2]),
        cost: parseNum(fields[3]),
        tax_discount_pct: parseNum(fields[4]),
      };

      for (const [fieldKey, colIdx] of Object.entries(scan.fieldIndex)) {
        if (colIdx === undefined) continue;
        const dbCol = fieldToDbColumn(fieldKey);
        if (!dbCol) continue;
        const val = parseNum(fields[colIdx]);
        // Don't overwrite the canonical qty_sold with a NULL from a section's qty.
        if (dbCol === 'qty_sold' && val === null) continue;
        // deno-lint-ignore no-explicit-any
        (row as any)[dbCol] = val;
      }

      rows.push(row);
    }

    // Re-upload semantics: delete existing for (venue, period).
    await supabase
      .from('drink_mix_items')
      .delete()
      .eq('venue_id', venue_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end);

    const BATCH_SIZE = 500;
    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
        ...r,
        venue_id,
        period_start,
        period_end,
        source_report_type: 'drink_mix',
        raw_header_hash: rawHeaderHash,
        source_file: source_file || null,
      }));
      const { error: insErr } = await supabase.from('drink_mix_items').insert(batch);
      if (insErr) {
        console.error(`Batch insert error at offset ${i}:`, insErr.message);
        return json({
          error: `Insert failed at offset ${i}: ${insErr.message}`,
          rows_inserted_before_failure: totalInserted,
        }, 500);
      }
      totalInserted += batch.length;
    }

    const activePluCount = rows.filter((r) => (r.qty_sold ?? 0) > 0).length;

    // Log section diagnostics.
    const presentLabels = sectionsPresent.map((k) => SECTION_LABELS[k]);
    const fieldsDetected = Object.keys(scan.fieldIndex).length;
    const standard: DrinkMixSectionKey[] = ['regular', 'spill', 'comp'];
    const missing = standard
      .filter((k) => !sectionsPresent.includes(k))
      .map((k) => SECTION_LABELS[k]);
    const missingNote = missing.length > 0 ? ` No ${missing.join(', ')} section${missing.length > 1 ? 's' : ''}.` : '';
    console.log(
      `Parsed drink_mix venue=${venue_id} period=${period_start}..${period_end}: sections=[${presentLabels.join(', ')}] fields=${fieldsDetected} cols=${headerFields.length}.${missingNote}`,
    );

    return json({
      success: true,
      rows_imported: totalInserted,
      total_rows_parsed: rows.length,
      active_plu_count: activePluCount,
      catalog_size: rows.length,
      sections_detected: sectionsPresent,
      section_labels: presentLabels,
      column_count: headerFields.length,
      fields_detected: fieldsDetected,
    }, 200);
  } catch (err) {
    console.error('parse-drink-mix-csv error:', err);
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

// Strip NUL bytes (\u0000) which Postgres text columns reject as
// "unsupported Unicode escape sequence". Sculpture exports occasionally
// contain stray null bytes inside quoted recipe-name cells.
function sanitizeText(s: string | undefined | null): string {
  if (s == null) return '';
  // Remove NULs and other C0 control chars except tab/newline/carriage return.
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

