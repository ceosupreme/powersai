import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
  buildCanonicalHeaderMap,
  detectReportType,
  parseCSVLine,
  parseDateRangeFromFilename,
  parseVenueTokenFromFilename,
  parseSculptureSiteId,
  parseSnapshotDateFromFilename,
  matchVenue,
  REPORT_LABELS,
  SUPPORTED_PARSERS,
  NOT_SUPPORTED_REASON,
  scanDrinkMixSections,
  SECTION_LABELS,
  validateExactHeader,
  SUMMARY_VARIANCE_HEADERS,
  INTELIPAR_HEADERS,
  COST_FLUCTUATION_HEADERS,
  INVENTORY_CSV_HEADERS,
  type SculptureReportType,
  type DrinkMixSectionKey,
} from '../_shared/sculpture-signatures.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectRequest {
  file_name: string;
  csv_content?: string | null;
  mime_type?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const __disabled = await guardIntegration('sculpture', corsHeaders);
  if (__disabled) return __disabled;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = (await req.json()) as DetectRequest;
    if (!body?.file_name) {
      return json({ error: 'file_name required' }, 400);
    }

    const isXlsx = /\.xlsx$/i.test(body.file_name);
    const venueToken = parseVenueTokenFromFilename(body.file_name);
    const dateRange = parseDateRangeFromFilename(body.file_name);

    const { data: venues } = await supabase.from('venues').select('id, name');
    let venueMatch = venueToken && venues
      ? matchVenue(venueToken, venues as { id: string; name: string }[])
      : null;

    let reportType: SculptureReportType = 'unknown';
    let headerFields: string[] | null = null;
    let rowCount = 0;
    let snapshotDateIso: string | null = null;
    let siteId: string | null = null;
    let siteIdHint: string | null = null;

    if (isXlsx) {
      // XLSX inventory uploads are no longer supported. Tell the user to use the CSV export.
      reportType = 'unknown';
      return json({
        file_name: body.file_name,
        report_type: 'unknown',
        report_label: 'Unsupported XLSX upload',
        supported: false,
        not_supported_reason:
          'Inventory uploads now use the CSV export from Sculpture (filename like INV_19969_SITENUM_20261304.csv). XLSX inventory exports are no longer accepted — please re-export as CSV.',
        venue_id: null,
        venue_name: null,
        venue_token_from_filename: venueToken,
        period_start: null,
        period_end: null,
        row_count: 0,
        header_fields: null,
        is_xlsx: true,
      }, 200);
    }

    if (!body.csv_content) {
      return json({ error: 'csv_content required' }, 400);
    }

    const lines = body.csv_content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return json({ error: 'CSV is empty' }, 400);
    headerFields = parseCSVLine(lines[0]);
    reportType = detectReportType(headerFields);
    rowCount = Math.max(0, lines.length - 1);

    // Inventory CSV: parse site ID + snapshot date from filename, look up venue mapping.
    if (reportType === 'inventory_csv') {
      siteId = parseSculptureSiteId(body.file_name);
      const snap = parseSnapshotDateFromFilename(body.file_name);
      snapshotDateIso = snap.parsed_date;

      // Structured log for the validation gate.
      console.log('[snapshot-date-parse]', JSON.stringify({
        filename: body.file_name,
        raw_digits: snap.raw_digits,
        picked_format: snap.picked_format,
        parsed_date: snap.parsed_date,
        reason: snap.reason ?? null,
      }));

      if (siteId) {
        const { data: mapping } = await supabase
          .from('sculpture_site_mappings')
          .select('venue_id')
          .eq('site_id', siteId)
          .maybeSingle();
        if (mapping?.venue_id) {
          const v = (venues ?? []).find((x) => (x as { id: string }).id === mapping.venue_id) as
            | { id: string; name: string }
            | undefined;
          if (v) venueMatch = { id: v.id, name: v.name };
        } else {
          siteIdHint = `Site ID ${siteId} has no venue mapping. Add it under Settings → Sculpture Site IDs.`;
        }
      }
    }

    let supported = SUPPORTED_PARSERS[reportType] ?? false;
    let reportLabel: string = REPORT_LABELS[reportType];
    let notSupportedReason: string | undefined = supported
      ? undefined
      : (NOT_SUPPORTED_REASON[reportType] ?? 'Unrecognized format.');
    let drinkMixSections: DrinkMixSectionKey[] | undefined;
    let drinkMixSectionLabels: string[] | undefined;
    let drinkMixColumnCount: number | undefined;

    if (headerFields) {
      // Strict-header types (no per-venue variations observed yet).
      const strictDriftSpec: Partial<Record<SculptureReportType, string[]>> = {
        cost_fluctuation: COST_FLUCTUATION_HEADERS,
        inventory_csv: INVENTORY_CSV_HEADERS,
      };
      const strictExpected = strictDriftSpec[reportType];
      if (strictExpected) {
        const drift = validateExactHeader(headerFields, strictExpected);
        if (!drift.ok) {
          supported = false;
          notSupportedReason = drift.message ?? 'Header does not match the expected format.';
          reportLabel = `${REPORT_LABELS[reportType]} — header mismatch`;
        }
      }

      // Header-name-based types (tolerant of per-venue reorderings + extras).
      const nameDriftSpec: Partial<Record<SculptureReportType, string[]>> = {
        summary_variance: SUMMARY_VARIANCE_HEADERS,
        intelipar: INTELIPAR_HEADERS,
      };
      const nameExpected = nameDriftSpec[reportType];
      if (nameExpected) {
        const headerMap = buildCanonicalHeaderMap(headerFields, nameExpected);
        if (!headerMap.ok) {
          supported = false;
          notSupportedReason = headerMap.message ?? 'Required columns are missing from the header.';
          reportLabel = `${REPORT_LABELS[reportType]} — missing required column${(headerMap.missing?.length ?? 0) > 1 ? 's' : ''}`;
        } else if (headerMap.ignoredExtras.length > 0) {
          // Successful parse with extras — keep supported=true, just annotate the label.
          reportLabel = `${REPORT_LABELS[reportType]} — ${headerFields.length} cols (${headerMap.ignoredExtras.length} extra ignored)`;
        }
      }
    }

    if (reportType === 'drink_mix' && headerFields) {
      drinkMixColumnCount = headerFields.length;
      const scan = scanDrinkMixSections(headerFields);
      drinkMixSections = scan.sections;
      drinkMixSectionLabels = scan.sectionLabels;

      if (scan.unknownSection) {
        supported = false;
        notSupportedReason =
          `Unrecognized Drink Mix section header: "${scan.unknownSection.prefix}" at column ${scan.unknownSection.columnIndex + 1} ("${scan.unknownSection.rawHeader}"). Sculpture may have changed this report format.`;
        reportLabel = `Drink Mix Report — unrecognized section "${scan.unknownSection.prefix}"`;
      } else if (scan.unknownColumn) {
        supported = false;
        notSupportedReason =
          `Drink Mix column ${scan.unknownColumn.columnIndex + 1} ("${scan.unknownColumn.rawHeader}") is unrecognized: ${scan.unknownColumn.reason}`;
        reportLabel = `Drink Mix Report — unrecognized column "${scan.unknownColumn.rawHeader}"`;
      } else {
        const presentLabels = scan.sections.map((k) => SECTION_LABELS[k]);
        const expectedAll: DrinkMixSectionKey[] = ['regular', 'spill', 'comp'];
        const missing = expectedAll
          .filter((k) => !scan.sections.includes(k))
          .map((k) => SECTION_LABELS[k]);
        const missingNote = missing.length > 0 ? ` (no ${missing.join(', ')})` : '';
        reportLabel = `Drink Mix Report — ${drinkMixColumnCount} cols (${presentLabels.join(' + ')})${missingNote}`;
      }
    }

    // For inventory CSV, period_start = period_end = snapshot date.
    const periodStart = reportType === 'inventory_csv'
      ? snapshotDateIso
      : (dateRange?.period_start ?? null);
    const periodEnd = reportType === 'inventory_csv'
      ? snapshotDateIso
      : (dateRange?.period_end ?? null);

    return json({
      file_name: body.file_name,
      report_type: reportType,
      report_label: reportLabel,
      supported,
      not_supported_reason: supported ? undefined : notSupportedReason,
      venue_id: venueMatch?.id ?? null,
      venue_name: venueMatch?.name ?? null,
      venue_token_from_filename: venueToken,
      period_start: periodStart,
      period_end: periodEnd,
      row_count: rowCount,
      header_fields: headerFields,
      is_xlsx: isXlsx,
      drink_mix_sections: drinkMixSections,
      drink_mix_section_labels: drinkMixSectionLabels,
      drink_mix_column_count: drinkMixColumnCount,
      sculpture_site_id: siteId,
      site_id_hint: siteIdHint,
      snapshot_date: snapshotDateIso,
    }, 200);
  } catch (err) {
    console.error('detect-sculpture-report error:', err);
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
