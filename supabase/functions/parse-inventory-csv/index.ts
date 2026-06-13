import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================================
// SCHEMA-DRIFT GUARDRAIL — single source of truth for Sculpture headers.
// If Sculpture changes a report format, update this block (and only this
// block) to add a new variant. Any unrecognized header is rejected.
// =====================================================================
const EXPECTED_HEADERS: Record<string, string[]> = {
  // Detailed Variance Report — current 10-column layout (Apr 2026+)
  detailed_v10: [
    'Item Name', 'Used', 'Sold', 'Missing', '% Missing', 'Missing (cost)',
    'Pour Cost', 'Ideal Pour Cost', 'Purchases', 'On-Hand',
  ],
  // Detailed Variance Report — 10-col variant where col 8 is "Actual Average Pour Size" (oz) instead of Ideal Pour Cost
  detailed_v10_pour_size: [
    'Item Name', 'Used', 'Sold', 'Missing', '% Missing', 'Missing (cost)',
    'Pour Cost', 'Actual Average Pour Size', 'Purchases', 'On-Hand',
  ],
  // Legacy 9-column Detailed (no Ideal Pour Cost)
  detailed_v9: [
    'Item Name', 'Used', 'Sold', 'Missing', '% Missing', 'Missing (cost)',
    'Pour Cost', 'Purchases', 'On-Hand',
  ],
  // Summary Variance Report — 14 columns
  summary_v14: [
    'Item Name', 'Used', 'Sold', 'Missing', '% Missing', 'Missing (cost)',
    'Revenue Potential', 'On-Hand (cost)', 'Used (cost)', 'Revenue',
    'Spillage (cost)', 'Pour Cost', 'Ideal Pour Cost', 'Sculpture Rating',
  ],
};

function normalizeHeaderCell(raw: string): string {
  return raw
    .replace(/^"+|"+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function headersMatch(received: string[], expected: string[]): boolean {
  if (received.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (normalizeHeaderCell(received[i]) !== normalizeHeaderCell(expected[i])) return false;
  }
  return true;
}

/**
 * Returns the matched variant key (e.g. 'detailed_v10') or null if no
 * known shape matches. Caller is responsible for rejecting on null.
 */
function detectVariant(received: string[], reportType: 'detailed' | 'summary'): string | null {
  const candidates = reportType === 'detailed'
    ? ['detailed_v10', 'detailed_v10_pour_size', 'detailed_v9']
    : ['summary_v14'];
  for (const key of candidates) {
    if (headersMatch(received, EXPECTED_HEADERS[key])) return key;
  }
  return null;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Parse value strings from Sculpture CSV
function parseNumeric(raw: string): number | null {
  if (!raw || raw.trim() === '') return null;
  const cleaned = raw.replace(/[$,]/g, '').replace(/\s*(oz|CAN|BTL|KEG)\s*/gi, '').trim();
  if (cleaned === '') return null;
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parsePct(raw: string): number | null {
  if (!raw || raw.trim() === '') return null;
  const cleaned = raw.replace(/[%+]/g, '').trim();
  if (cleaned === '') return null;
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseCost(raw: string): number | null {
  if (!raw || raw.trim() === '') return null;
  const cleaned = raw.replace(/[$,+]/g, '').trim();
  if (cleaned === '') return null;
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

// Simple CSV parser that handles quoted fields
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

interface ParsedItem {
  item_name: string;
  is_category_total: boolean;
  category: string | null;
  used: number | null;
  sold: number | null;
  missing: number | null;
  missing_pct: number | null;
  missing_cost: number | null;
  pour_cost: number | null;
  ideal_pour_cost: number | null;
  sculpture_rating: number | null;
  on_hand: number | null;
  purchases: number | null;
  revenue: number | null;
  spillage_cost: number | null;
}

type DetailedVariant = 'detailed_v10' | 'detailed_v10_pour_size' | 'detailed_v9';

function parseDetailedRow(fields: string[], variant: DetailedVariant): ParsedItem | null {
  const itemName = fields[0]?.replace(/^"|"$/g, '').trim();
  if (!itemName) return null;

  const used = parseNumeric(fields[1]);
  const sold = parseNumeric(fields[2]);
  const missing = parseNumeric(fields[3]);
  const missingPct = parsePct(fields[4]);
  const missingCost = parseCost(fields[5]);
  const pourCost = parsePct(fields[6]);

  let idealPourCost: number | null = null;
  let purchases: number | null = null;
  let onHand: number | null = null;

  if (variant === 'detailed_v10') {
    // 10-col: Pour Cost, Ideal Pour Cost, Purchases, On-Hand
    idealPourCost = parsePct(fields[7]);
    purchases = parseNumeric(fields[8]);
    onHand = parseNumeric(fields[9]);
  } else if (variant === 'detailed_v10_pour_size') {
    // 10-col variant: col 7 is "Actual Average Pour Size" (oz) — not a cost; skip storing as ideal_pour_cost
    purchases = parseNumeric(fields[8]);
    onHand = parseNumeric(fields[9]);
  } else {
    // 9-col legacy: Pour Cost, Purchases, On-Hand (no Ideal Pour Cost)
    purchases = parseNumeric(fields[7]);
    onHand = parseNumeric(fields[8]);
  }


  const hasData = used !== null || sold !== null || missing !== null || missingCost !== null;
  const isCategoryTotal = itemName.startsWith('Total ');
  if (!hasData && !isCategoryTotal) return null;

  return {
    item_name: itemName,
    is_category_total: isCategoryTotal,
    category: null,
    used, sold, missing,
    missing_pct: missingPct,
    missing_cost: missingCost,
    pour_cost: pourCost,
    ideal_pour_cost: idealPourCost,
    sculpture_rating: null,
    on_hand: onHand,
    purchases,
    revenue: null,
    spillage_cost: null,
  };
}

function parseSummaryRow(fields: string[]): ParsedItem | null {
  // Columns: Item Name, Used, Sold, Missing, % Missing, Missing (cost), Revenue Potential, On-Hand (cost), Used (cost), Revenue, Spillage (cost), Pour Cost, Ideal Pour Cost, Sculpture Rating
  const itemName = fields[0]?.replace(/^"|"$/g, '').trim();
  if (!itemName) return null;

  return {
    item_name: itemName,
    is_category_total: itemName.startsWith('Total ') || itemName === 'GRAND TOTAL',
    category: null,
    used: parseNumeric(fields[1]),
    sold: parseNumeric(fields[2]),
    missing: parseNumeric(fields[3]),
    missing_pct: parsePct(fields[4]),
    missing_cost: parseCost(fields[5]),
    pour_cost: parsePct(fields[11]),
    ideal_pour_cost: parsePct(fields[12]),
    sculpture_rating: parsePct(fields[13]),
    on_hand: parseCost(fields[7]), // On-Hand (cost)
    purchases: null,
    revenue: parseCost(fields[9]),
    spillage_cost: parseCost(fields[10]),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { csv_content, venue_id, period_start, period_end, report_type, source_file } = body;

    if (!csv_content || !venue_id || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: 'Missing required fields: csv_content, venue_id, period_start, period_end' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lines = csv_content.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV file is empty or has no data rows' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect format from header row
    const headerFields = parseCSVLine(lines[0]);
    const colCount = headerFields.length;
    const detectedType: 'summary' | 'detailed' =
      report_type ?? (colCount >= 14 ? 'summary' : 'detailed');

    // ============ SCHEMA-DRIFT GUARDRAIL ============
    // Reject any upload whose header doesn't match a known Sculpture variant.
    // Single source of truth: EXPECTED_HEADERS at top of file.
    const variant = detectVariant(headerFields, detectedType);
    if (!variant) {
      const candidates = detectedType === 'detailed'
        ? ['detailed_v10', 'detailed_v10_pour_size', 'detailed_v9']
        : ['summary_v14'];
      const expectedList = candidates
        .map((k) => `${k}: [${EXPECTED_HEADERS[k].join(', ')}]`)
        .join('  |  ');
      const receivedList = headerFields.join(', ');
      return new Response(JSON.stringify({
        error: `Sculpture may have changed this report format. Expected one of: ${expectedList}. Received header: [${receivedList}]. Upload has been rejected to prevent data corruption. Please contact BarPulse admin.`,
        code: 'SCHEMA_DRIFT_DETECTED',
        detected_report_type: detectedType,
        received_header: headerFields,
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Forensic: hash the normalized header so future drift is auditable.
    const normalizedHeaderJoin = headerFields.map(normalizeHeaderCell).join('|');
    const rawHeaderHash = await sha256Hex(normalizedHeaderJoin);

    // Parse all rows
    const items: ParsedItem[] = [];
    let grandTotalMissingCost: number | null = null;
    let grandSculptureRating: number | null = null;

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const item = detectedType === 'summary'
        ? parseSummaryRow(fields)
        : parseDetailedRow(fields, variant as DetailedVariant);

      if (!item) continue;

      // Extract grand total
      if (item.item_name === 'GRAND TOTAL') {
        grandTotalMissingCost = item.missing_cost;
        grandSculptureRating = item.sculpture_rating;
        continue; // Don't store the grand total as a line item
      }

      items.push(item);
    }

    // Detailed reports lack a GRAND TOTAL row; sum category totals as fallback
    if (grandTotalMissingCost === null) {
      const summed = items
        .filter(i => i.is_category_total && typeof i.missing_cost === 'number')
        .reduce((sum, i) => sum + (i.missing_cost as number), 0);
      grandTotalMissingCost = summed !== 0 ? summed : null;
    }

    // Assign categories: items belong to the category of the next "Total X:" row
    if (detectedType === 'detailed') {
      let currentCategory = 'Unknown';
      // Walk backwards to assign category from Total rows
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].is_category_total) {
          currentCategory = items[i].item_name.replace(/^Total\s+/, '').replace(/:$/, '');
        }
        items[i].category = currentCategory;
      }
    } else {
      // Summary: each row IS a category, totals are aggregates
      for (const item of items) {
        if (!item.is_category_total) {
          item.category = item.item_name.replace(/:$/, '');
        } else {
          item.category = item.item_name.replace(/^Total\s+/, '').replace(/:$/, '');
        }
      }
    }

    // Delete existing report for same venue/period/type to allow re-upload
    await supabase
      .from('inventory_items')
      .delete()
      .eq('venue_id', venue_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end);

    await supabase
      .from('inventory_reports')
      .delete()
      .eq('venue_id', venue_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .eq('report_type', detectedType);

    // Insert report
    const { data: report, error: reportErr } = await supabase
      .from('inventory_reports')
      .insert({
        venue_id,
        period_start,
        period_end,
        report_type: detectedType,
        source_file: source_file || 'upload.csv',
        total_missing_cost: grandTotalMissingCost,
        sculpture_rating: grandSculptureRating,
        raw_header_hash: rawHeaderHash,
      })
      .select('id')
      .single();

    if (reportErr) {
      console.error('Report insert error:', reportErr);
      return new Response(JSON.stringify({ error: `Failed to create report: ${reportErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert items in batches
    const itemRows = items.map(item => ({
      report_id: report.id,
      venue_id,
      item_name: item.item_name,
      is_category_total: item.is_category_total,
      category: item.category,
      used: item.used,
      sold: item.sold,
      missing: item.missing,
      missing_pct: item.missing_pct,
      missing_cost: item.missing_cost,
      pour_cost: item.pour_cost,
      ideal_pour_cost: item.ideal_pour_cost,
      sculpture_rating: item.sculpture_rating,
      on_hand: item.on_hand,
      purchases: item.purchases,
      revenue: item.revenue,
      spillage_cost: item.spillage_cost,
      period_start,
      period_end,
    }));

    const BATCH_SIZE = 100;
    let totalInserted = 0;
    for (let i = 0; i < itemRows.length; i += BATCH_SIZE) {
      const batch = itemRows.slice(i, i + BATCH_SIZE);
      const { error: itemErr } = await supabase.from('inventory_items').insert(batch);
      if (itemErr) {
        console.error(`Batch insert error at offset ${i}:`, itemErr.message);
      } else {
        totalInserted += batch.length;
      }
    }

    // Build top variances for response
    const topVariances = items
      .filter(i => i.missing_cost !== null && i.missing_cost < 0)
      .sort((a, b) => (a.missing_cost ?? 0) - (b.missing_cost ?? 0))
      .slice(0, 5)
      .map(i => ({
        item: i.item_name,
        missing_cost: i.missing_cost,
        missing_pct: i.missing_pct,
      }));

    const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

    return new Response(JSON.stringify({
      success: true,
      report_id: report.id,
      report_type: detectedType,
      rows_imported: totalInserted,
      total_rows_parsed: items.length,
      categories_found: categories,
      total_missing_cost: grandTotalMissingCost,
      sculpture_rating: grandSculptureRating,
      top_variances: topVariances,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Parse inventory CSV error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
