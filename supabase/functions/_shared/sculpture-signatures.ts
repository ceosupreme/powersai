// =====================================================================
// Sculpture Hospitality report signatures — single source of truth.
// Add a new entry here when a new report parser is wired in.
// =====================================================================

export type SculptureReportType =
  | 'detailed_variance'
  | 'summary_variance'
  | 'drink_mix'
  | 'intelipar'
  | 'cost_fluctuation'
  | 'inventory_csv'
  | 'unknown';

export const SUPPORTED_PARSERS: Record<SculptureReportType, boolean> = {
  detailed_variance: true,
  summary_variance: true,
  drink_mix: true,
  intelipar: true,
  cost_fluctuation: true,
  inventory_csv: true,
  unknown: false,
};

export const REPORT_LABELS: Record<SculptureReportType, string> = {
  detailed_variance: 'Detailed Variance Report',
  summary_variance: 'Summary Variance Report',
  drink_mix: 'Drink Mix Report',
  intelipar: 'InteliPar Report',
  cost_fluctuation: 'Cost Fluctuation Report',
  inventory_csv: 'Inventory Report (CSV)',
  unknown: 'Unknown report',
};

export const NOT_SUPPORTED_REASON: Partial<Record<SculptureReportType, string>> = {
  unknown: 'Unrecognized header. Sculpture may have changed this report format.',
};

// ---- canonical exact-header specs ----
// Labels exactly as Sculpture Hospitality emits them in the real CSV exports.
export const SUMMARY_VARIANCE_HEADERS: string[] = [
  'Item Name',
  'Used',
  'Sold',
  'Missing',
  '% Missing',
  'Missing (cost)',
  'Revenue Potential',
  'On-Hand (cost)',
  'Used (cost)',
  'Revenue',
  'Spillage (cost)',
  'Pour Cost',
  'Ideal Pour Cost',
  'Sculpture Rating',
];

export const INTELIPAR_HEADERS: string[] = [
  'Vendor',
  'Total Order',
  'Order (UOM)',
  'Item Name',
  'Item Size',
  'Unit Cost',
  'On-Hand (cost)',
  'On-Hand',
  'Used',
  'Historical Usage',
  'Par',
  'Excess Stock Onhand',
  'Days Remaining',
];

export const COST_FLUCTUATION_HEADERS: string[] = [
  'Product Name',
  'Invoice Date',
  'Vendor',
  'Invoice Number',
  'Price',
  'Price Difference',
  'Difference %',
];

// CSV inventory header — Sculpture inventory export "INV_<siteid>_SITENUM_<yyyymmdd>.csv".
export const INVENTORY_CSV_HEADERS: string[] = [
  'StorageLocation',
  'InventoryItem',
  'GLCode',
  'InventoryTakingUnit',
  'ContainerSize',
  'ConversionUnit',
  'Price',
  'Quantity',
  'UserName',
];

export interface ExactHeaderResult {
  ok: boolean;
  mismatchAt?: number;
  expected?: string;
  received?: string;
  message?: string;
}

// =====================================================================
// Header-name-based field mapping.
//
// Used for parsers where Sculpture has been observed to:
//   (a) reorder canonical columns across venues, and/or
//   (b) interleave additional venue-specific columns.
//
// Drift protection: ALL canonical names must be present (case- and
// whitespace-insensitive). Position and extras are tolerated. Extras are
// returned as `ignoredExtras` for logging and silently skipped at parse time.
//
// This is the same pattern Drink Mix already uses (see scanDrinkMixSections).
// =====================================================================
export interface HeaderMapResult {
  ok: boolean;
  index: Record<string, number>;          // normalized canonical name -> column index in received
  missing: string[];                      // canonical names not found
  ignoredExtras: { columnIndex: number; rawHeader: string }[];
  message?: string;
}

export function buildCanonicalHeaderMap(
  received: string[],
  canonical: string[],
): HeaderMapResult {
  const index: Record<string, number> = {};
  const ignoredExtras: { columnIndex: number; rawHeader: string }[] = [];
  // Build position lookup from received header (first occurrence wins).
  const receivedNorm = received.map((h) => normalizeHeaderCell(h ?? ''));
  const positionByName: Record<string, number> = {};
  receivedNorm.forEach((name, i) => {
    if (!name) return;
    if (!(name in positionByName)) positionByName[name] = i;
  });
  // Resolve each canonical name.
  const canonicalNorm = new Set<string>();
  const missing: string[] = [];
  for (const c of canonical) {
    const key = normalizeHeaderCell(c);
    canonicalNorm.add(key);
    if (key in positionByName) {
      index[key] = positionByName[key];
    } else {
      missing.push(c);
    }
  }
  // Anything in received but not canonical = extra.
  receivedNorm.forEach((name, i) => {
    if (!name) return;
    if (!canonicalNorm.has(name)) {
      ignoredExtras.push({ columnIndex: i, rawHeader: received[i] ?? '' });
    }
  });
  if (missing.length > 0) {
    return {
      ok: false,
      index,
      missing,
      ignoredExtras,
      message: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.map((m) => `"${m}"`).join(', ')}.`,
    };
  }
  return { ok: true, index, missing: [], ignoredExtras };
}

// Lookup helper used by parsers built on buildCanonicalHeaderMap.
export function getByCanonical(
  fields: string[],
  map: Record<string, number>,
  canonicalName: string,
): string | undefined {
  const key = normalizeHeaderCell(canonicalName);
  const idx = map[key];
  if (idx === undefined) return undefined;
  return fields[idx];
}

export function validateExactHeader(received: string[], expected: string[]): ExactHeaderResult {
  if (received.length !== expected.length) {
    return {
      ok: false,
      message: `Column count mismatch: expected ${expected.length}, got ${received.length}.`,
      expected: expected.join(', '),
      received: received.join(', '),
    };
  }
  for (let i = 0; i < expected.length; i++) {
    if (normalizeHeaderCell(received[i]) !== normalizeHeaderCell(expected[i])) {
      return {
        ok: false,
        mismatchAt: i,
        expected: expected[i],
        received: received[i],
        message: `Header column ${i + 1} mismatch: expected "${expected[i]}", got "${received[i]}".`,
      };
    }
  }
  return { ok: true };
}

// ---- header normalization ----
export function normalizeHeaderCell(raw: string): string {
  return raw
    .replace(/^"+|"+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ---- CSV line parser (handles quoted fields and "" escape) ----
export function parseCSVLine(line: string): string[] {
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

// =====================================================================
// Drink Mix — header-aware section model
// =====================================================================

// Canonical 5 base columns every Drink Mix report must start with.
export const DRINK_MIX_BASE_HEADERS: string[] = [
  'PLU',
  'Recipe Name',
  'Qty Sold',
  'Cost',
  'Tax / Discount',
];

// Canonical section keys we know how to map → DB columns.
export type DrinkMixSectionKey = 'regular' | 'spill' | 'comp' | 'sales_2';

// Canonical field keys within a section.
export type DrinkMixField = 'qty' | 'price' | 'pour_cost' | 'total_profit' | 'theoretical_profit';

// Suffix (text inside trailing parens, normalized) → canonical field key.
const SUFFIX_TO_FIELD: Record<string, DrinkMixField> = {
  'qty': 'qty',
  'price': 'price',
  'pour cost': 'pour_cost',
  'pour cost %': 'pour_cost',
  'total profit': 'total_profit',
  'theoretical profit': 'theoretical_profit',
};

// Map normalized section prefix → canonical section key.
const SECTION_PREFIX_ALIASES: Record<string, DrinkMixSectionKey> = {
  'regular': 'regular',
  'regular price': 'regular',
  'spill': 'spill',
  'spills': 'spill',
  'comp': 'comp',
  'comps': 'comp',
  'sales 2': 'sales_2',
};

// Friendly label for each canonical key (UI / log output).
export const SECTION_LABELS: Record<DrinkMixSectionKey, string> = {
  regular: 'Regular',
  spill: 'Spills',
  comp: 'Comps',
  sales_2: 'Sales 2',
};

export type DrinkMixFieldKey = `${DrinkMixSectionKey}_${DrinkMixField}`;

export interface DrinkMixSectionScan {
  sections: DrinkMixSectionKey[];           // canonical keys, in first-seen order, deduped
  sectionLabels: string[];                  // raw prefix labels (Title Case-ish, from CSV)
  // Absolute column index per (section, field). Only populated for cells we recognized.
  fieldIndex: Partial<Record<DrinkMixFieldKey, number>>;
  unknownSection?: { prefix: string; columnIndex: number; rawHeader: string };
  unknownColumn?: { columnIndex: number; rawHeader: string; reason: string };
}

/**
 * Strip a single trailing parenthesized suffix like "(Qty)" or "(Total Profit)".
 * Also tolerates an unparenthesized trailing suffix word (some venues drop the parens).
 */
function splitHeaderSuffix(normalized: string): { prefix: string; suffix: string } | null {
  const parenMatch = normalized.match(/^(.*)\s*\(([^()]+)\)\s*$/);
  if (parenMatch) {
    return { prefix: parenMatch[1].trim(), suffix: parenMatch[2].trim() };
  }
  // Fallback: trailing bare suffix word(s) — try longest first to avoid 'profit' eating 'total profit'.
  const candidates = Object.keys(SUFFIX_TO_FIELD).sort((a, b) => b.length - a.length);
  for (const suffix of candidates) {
    if (normalized === suffix) return { prefix: '', suffix };
    if (normalized.endsWith(' ' + suffix)) {
      return { prefix: normalized.slice(0, -suffix.length - 1).trim(), suffix };
    }
  }
  return null;
}

/**
 * Classify each Drink Mix column past the 5 base columns by its (prefix, suffix) header.
 * No assumption about section width, order, or contiguity — every column stands on its own.
 * Returns a (section_field → column_index) map plus diagnostics for unknown prefixes/suffixes.
 */
export function scanDrinkMixSections(allHeaders: string[]): DrinkMixSectionScan {
  const result: DrinkMixSectionScan = {
    sections: [],
    sectionLabels: [],
    fieldIndex: {},
  };
  const start = DRINK_MIX_BASE_HEADERS.length; // = 5
  const seen = new Set<DrinkMixSectionKey>();

  for (let i = start; i < allHeaders.length; i++) {
    const raw = allHeaders[i] ?? '';
    const normalized = normalizeHeaderCell(raw);
    if (!normalized) continue; // skip stray empty trailing column

    const split = splitHeaderSuffix(normalized);
    if (!split) {
      result.unknownColumn = {
        columnIndex: i,
        rawHeader: raw,
        reason: `Could not parse header into (prefix, suffix). Expected something like "Spills (Qty)" or "Regular price (Price)".`,
      };
      return result;
    }

    const field = SUFFIX_TO_FIELD[split.suffix];
    if (!field) {
      result.unknownColumn = {
        columnIndex: i,
        rawHeader: raw,
        reason: `Unrecognized field suffix "(${split.suffix})". Expected one of: Qty, Price, Pour Cost, Total Profit, Theoretical Profit.`,
      };
      return result;
    }

    const canonical = SECTION_PREFIX_ALIASES[split.prefix];
    if (!canonical) {
      result.unknownSection = { prefix: split.prefix, columnIndex: i, rawHeader: raw };
      return result;
    }

    if (!seen.has(canonical)) {
      seen.add(canonical);
      result.sections.push(canonical);
      result.sectionLabels.push(
        split.prefix.replace(/\b\w/g, (c) => c.toUpperCase()),
      );
    }

    const key = `${canonical}_${field}` as DrinkMixFieldKey;
    result.fieldIndex[key] = i;
  }

  return result;
}

// ---- header signatures ----
interface SignatureRule {
  type: SculptureReportType;
  firstColumn: string;
  columnCount?: number | number[];
  minColumnCount?: number;
  distinguishingHeader?: { index: number; value: string };
  // For drink_mix: validate first 5 columns instead of width.
  baseHeaders?: string[];
}

const SIGNATURES: SignatureRule[] = [
  {
    type: 'detailed_variance',
    firstColumn: 'item name',
    columnCount: [9, 10],
    distinguishingHeader: { index: 6, value: 'pour cost' },
  },
  {
    type: 'summary_variance',
    firstColumn: 'item name',
    // Per-venue variations may add columns or reorder past index 6. Accept >=14 cols
    // as long as the distinguishing header at position 6 is "revenue potential".
    // Final canonical-name validation happens in buildCanonicalHeaderMap.
    minColumnCount: 14,
    distinguishingHeader: { index: 6, value: 'revenue potential' },
  },
  {
    type: 'drink_mix',
    firstColumn: 'plu',
    baseHeaders: DRINK_MIX_BASE_HEADERS,
  },
  {
    type: 'intelipar',
    firstColumn: 'vendor',
    // Per-venue variations may add columns (e.g. "Purchased", "Unopened Onhand", "Open Onhand").
    // No other Sculpture report starts with "vendor", so firstColumn alone is sufficient
    // for type detection. Final canonical-name validation happens in buildCanonicalHeaderMap.
  },
  {
    type: 'cost_fluctuation',
    firstColumn: 'product name',
    columnCount: 7,
  },
  {
    type: 'inventory_csv',
    firstColumn: 'storagelocation',
    columnCount: 9,
  },
];

export function detectReportType(headerFields: string[]): SculptureReportType {
  const normalized = headerFields.map(normalizeHeaderCell);
  for (const rule of SIGNATURES) {
    if (normalized[0] !== rule.firstColumn) continue;

    if (rule.baseHeaders) {
      // Drink Mix: validate first N columns, ignore total width.
      if (normalized.length < rule.baseHeaders.length) continue;
      const baseOk = rule.baseHeaders.every(
        (h, idx) => normalized[idx] === normalizeHeaderCell(h),
      );
      if (!baseOk) continue;
      return rule.type;
    }

    if (rule.columnCount !== undefined) {
      const widthOk = Array.isArray(rule.columnCount)
        ? rule.columnCount.includes(normalized.length)
        : rule.columnCount === normalized.length;
      if (!widthOk) continue;
    }
    if (rule.minColumnCount !== undefined && normalized.length < rule.minColumnCount) {
      continue;
    }
    if (rule.distinguishingHeader) {
      const { index, value } = rule.distinguishingHeader;
      if (normalized[index] !== value) continue;
    }
    return rule.type;
  }
  return 'unknown';
}

export function headersMatch(received: string[], expected: string[]): boolean {
  if (received.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (normalizeHeaderCell(received[i]) !== normalizeHeaderCell(expected[i])) return false;
  }
  return true;
}

// ---- filename helpers ----
const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

const REPORT_TITLE_TOKENS = [
  'cost fluctuation report',
  'cost fluctuation',
  'inventory report',
  'inventory',
  'intelipar report',
  'intelipar',
  'summary variance report',
  'summary variance',
  'detailed variance report',
  'detailed variance',
  'drink mix report',
  'drink mix',
];

export function parseDateRangeFromFilename(filename: string): { period_start: string; period_end: string } | null {
  // Pattern A: 2026-04-07_to_2026-04-13 (ISO underscore)
  const iso = filename.match(/(\d{4})-(\d{2})-(\d{2})[ _]?to[ _-]?(\d{4})-(\d{2})-(\d{2})/i);
  if (iso) {
    const [, y1, m1, d1, y2, m2, d2] = iso;
    return { period_start: `${y1}-${m1}-${d1}`, period_end: `${y2}-${m2}-${d2}` };
  }

  // Pattern B: Apr_7_to_Apr_13_2026 (existing underscore form)
  const underscore = filename.match(/(\w+)_(\d+)_to_(\w+)_(\d+)_(\d{4})/i);
  if (underscore) {
    const [, mo1, d1, mo2, d2, yr] = underscore;
    const m1 = MONTH_MAP[mo1.toLowerCase()];
    const m2 = MONTH_MAP[mo2.toLowerCase()];
    if (m1 && m2) {
      return {
        period_start: `${yr}-${m1}-${d1.padStart(2, '0')}`,
        period_end: `${yr}-${m2}-${d2.padStart(2, '0')}`,
      };
    }
  }

  // Pattern C: "Apr 7 to Apr 13 2026" (spaces, possibly different months)
  const spaced = filename.match(/(\w+)\s+(\d{1,2})\s+to\s+(\w+)\s+(\d{1,2})[\s,]+(\d{4})/i);
  if (spaced) {
    const [, mo1, d1, mo2, d2, yr] = spaced;
    const m1 = MONTH_MAP[mo1.toLowerCase()];
    const m2 = MONTH_MAP[mo2.toLowerCase()];
    if (m1 && m2) {
      return {
        period_start: `${yr}-${m1}-${d1.padStart(2, '0')}`,
        period_end: `${yr}-${m2}-${d2.padStart(2, '0')}`,
      };
    }
  }

  // Pattern D: "Apr 7 to 13 2026" (single month, just a day range)
  const sameMonth = filename.match(/(\w+)\s+(\d{1,2})\s+to\s+(\d{1,2})[\s,]+(\d{4})/i);
  if (sameMonth) {
    const [, mo, d1, d2, yr] = sameMonth;
    const m = MONTH_MAP[mo.toLowerCase()];
    if (m) {
      return {
        period_start: `${yr}-${m}-${d1.padStart(2, '0')}`,
        period_end: `${yr}-${m}-${d2.padStart(2, '0')}`,
      };
    }
  }

  return null;
}

// ---- Sculpture inventory CSV filename helpers ----
// Format: INV_<siteid>_SITENUM_<yyyymmdd>.csv (siteid digits, date = 8 digits)

export function parseSculptureSiteId(filename: string): string | null {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const m = base.match(/^INV_(\d+)_SITENUM_/i);
  return m ? m[1] : null;
}

export interface SnapshotDateParseResult {
  parsed_date: string | null;       // YYYY-MM-DD or null
  raw_digits: string | null;        // the 8-digit chunk after SITENUM_
  picked_format: 'MMDD' | 'DDMM' | null;
  reason?: string;
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function parseSnapshotDateFromFilename(filename: string): SnapshotDateParseResult {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const m = base.match(/_SITENUM_(\d{8})/i);
  if (!m) return { parsed_date: null, raw_digits: null, picked_format: null, reason: 'No 8-digit date after SITENUM_' };
  const digits = m[1];
  const y = parseInt(digits.slice(0, 4), 10);
  if (y < 2020 || y > 2099) {
    return { parsed_date: null, raw_digits: digits, picked_format: null, reason: `Year ${y} out of expected range 2020-2099` };
  }
  const a = parseInt(digits.slice(4, 6), 10);
  const b = parseInt(digits.slice(6, 8), 10);
  // Try MMDD first
  if (isValidYMD(y, a, b)) {
    return {
      parsed_date: `${y}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`,
      raw_digits: digits,
      picked_format: 'MMDD',
    };
  }
  // Fall back to DDMM
  if (isValidYMD(y, b, a)) {
    return {
      parsed_date: `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`,
      raw_digits: digits,
      picked_format: 'DDMM',
    };
  }
  return {
    parsed_date: null,
    raw_digits: digits,
    picked_format: null,
    reason: `Neither MMDD (${a}/${b}) nor DDMM (${b}/${a}) is a valid calendar date in ${y}`,
  };
}

export function parseVenueTokenFromFilename(filename: string): string | null {
  const base = filename.split(/[\\/]/).pop()!.replace(/\.(csv|xlsx)$/i, '');

  // Strip any trailing "for <date>..." / "_<date>..." segment so it doesn't end up in the venue token.
  const cleaned = base
    .replace(/\s+for\s+.+$/i, '')
    .replace(/_\d{4}-\d{2}-\d{2}.*$/i, '')
    .replace(/_(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[ _]?\d.*$/i, '')
    .trim();

  const isReportTitle = (s: string) => {
    const norm = s.toLowerCase().replace(/\s+/g, ' ').trim();
    return REPORT_TITLE_TOKENS.some(
      (t) => norm === t || norm.startsWith(t + ' ') || norm.endsWith(' ' + t),
    );
  };

  // Try splitting on " - " (preferred), then "-", then "_" — pick first segment that is NOT a report title.
  const separators: RegExp[] = [/\s-\s/, /-/, /_/];
  for (const sep of separators) {
    const parts = cleaned.split(sep).map((p) => p.replace(/_+/g, ' ').trim()).filter(Boolean);
    if (parts.length < 2) continue;
    for (const part of parts) {
      if (!isReportTitle(part) && part.length > 1) return part;
    }
  }

  // Fallback: original behavior — first segment before "-".
  const dashIdx = cleaned.indexOf('-');
  if (dashIdx > 0) {
    const token = cleaned.slice(0, dashIdx).replace(/_+/g, ' ').trim();
    if (token.length > 0 && !isReportTitle(token)) return token;
  }
  return cleaned.length > 0 ? cleaned : null;
}

export function matchVenue(
  token: string,
  venues: { id: string; name: string }[],
): { id: string; name: string } | null {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const target = normalize(token);
  if (!target) return null;
  for (const v of venues) {
    if (normalize(v.name) === target) return v;
  }
  for (const v of venues) {
    const n = normalize(v.name);
    if (n.startsWith(target) || target.startsWith(n)) return v;
  }
  for (const v of venues) {
    const n = normalize(v.name);
    if (n.includes(target) || target.includes(n)) return v;
  }
  return null;
}

// ---- numeric parsers ----
export function parseNum(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '' || trimmed === '-') return null;
  const cleaned = trimmed.replace(/[$,%+]/g, '').replace(/\s*(oz|CAN|BTL|KEG)\s*/gi, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
