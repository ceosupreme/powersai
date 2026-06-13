import { useState, useEffect, useCallback } from 'react';
import { format, addDays, parseISO, startOfWeek } from 'date-fns';
import {
  CalendarIcon,
  FileSearch,
  Download,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const CSV_HEADERS = [
  'venue_name', 'week_start', 'layer',
  'net_sales', 'total_orders', 'total_guests', 'total_tips', 'total_labor_cost',
  'total_labor_hours', 'overtime_hours', 'void_amount', 'discount_amount',
  'refund_amount', 'turn_time', 'labor_pct', 'splh', 'tip_pct', 'void_pct',
  'discount_pct', 'ot_rate', 'avg_order_value',
  'overall_score', 'revenue_score', 'labor_score', 'ops_score', 'guest_score', 'confidence_pct',
  'R1_target', 'R1_actual', 'R1_score', 'R2_target', 'R2_actual', 'R2_score',
  'R3_target', 'R3_actual', 'R3_score', 'R4_target', 'R4_actual', 'R4_score',
  'L1_target', 'L1_actual', 'L1_score', 'L2_target', 'L2_actual', 'L2_score',
  'L3_target', 'L3_actual', 'L3_score', 'L4_target', 'L4_actual', 'L4_score',
  'O1_target', 'O1_actual', 'O1_score', 'O2_target', 'O2_actual', 'O2_score',
  'O3_target', 'O3_actual', 'O3_score', 'O4_target', 'O4_actual', 'O4_score',
  'G1_target', 'G1_actual', 'G1_score', 'G2_target', 'G2_actual', 'G2_score',
  'G3_target', 'G3_actual', 'G3_score', 'G4_target', 'G4_actual', 'G4_score',
  // Coverage of the Toast check/day report (tips, unpaid, turn time all share
  // the same source). Sales-weighted for tips, day-count for unpaid/turn.
  // Below 85% the weekly rollup suppresses the corresponding metric.
  'tip_coverage_pct', 'unpaid_coverage_pct', 'turn_coverage_pct',
];

interface CheckResult {
  label: string;
  passed: boolean;
  details: string;
}

interface ActiveVenue {
  id: string;
  name: string;
  bar_code: string;
}

interface RecomputeFailure {
  venueId: string;
  venueName: string;
  weekStart: string;
  message: string;
}

interface TraceDailyMetricsRow {
  date: string;
  source: string | null;
  net_sales: number | null;
  orders_count: number | null;
  guests: number | null;
  tips: number | null;
  tips_amount: number | null;
  voids: number | null;
  voids_amount: number | null;
  discounts: number | null;
  discounts_amount: number | null;
  refunds: number | null;
  refunds_amount: number | null;
  avg_turn_time_mins: number | null;
  synced_at: string | null;
  last_synced_at: string | null;
}

interface RecomputeTrace {
  key: string;
  venueId: string;
  venueName: string;
  barCode: string;
  weekStart: string;
  weekEnd: string;
  readMode: string;
  readKey: string;
  dailyReadQuery: string;
  fallbackQuery: string | null;
  aggregationFields: Record<string, string>;
  dailyMetricsRows: TraceDailyMetricsRow[];
  dailySums: Record<string, number | null>;
  weeklyCorePayload: Record<string, unknown>;
  computedAt: string | null;
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  return String(v);
}

function safeDiv(a: number | null, b: number | null): string {
  if (a == null || b == null || b === 0) return 'NULL';
  return String(a / b);
}

function getMonday(dateStr: string): string {
  const d = parseISO(dateStr);
  const mon = startOfWeek(d, { weekStartsOn: 1 });
  return format(mon, 'yyyy-MM-dd');
}

function generateMondaysBetween(start: Date, end: Date): string[] {
  const mondays: string[] = [];
  let current = startOfWeek(start, { weekStartsOn: 1 });
  if (current < start) current = addDays(current, 7);
  while (current <= end) {
    mondays.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 7);
  }
  return mondays;
}

function missingRow(venueName: string, weekStart: string, layer: string): string[] {
  const row = new Array(CSV_HEADERS.length).fill('MISSING');
  row[0] = venueName;
  row[1] = weekStart;
  row[2] = layer;
  return row;
}

// Trailing 3 cells for tip/unpaid/turn coverage on rows that don't compute them.
function blankCoverageColumns(): string[] {
  return ['', '', ''];
}

function blankScoreColumns(): string[] {
  return new Array(54).fill('');
}

function parseMetric(value: string): number | null {
  if (value === 'MISSING' || value === 'NULL' || value === '') return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function runQuickChecks(rows: string[][]): CheckResult[] {
  const checks: CheckResult[] = [];
  const grouped: Record<string, Record<string, string[]>> = {};

  for (const row of rows) {
    const key = `${row[0]}|${row[1]}`;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][row[2]] = row;
  }

  let amountFails = 0;
  const amountDetails: string[] = [];
  const amountMetrics: Array<[number, string]> = [
    [10, 'voids'],
    [11, 'discounts'],
    [12, 'refunds'],
  ];

  for (const [key, layers] of Object.entries(grouped)) {
    const da = layers.daily_agg;
    const wc = layers.weekly_core;
    if (!da || !wc) continue;

    for (const [columnIndex, metricName] of amountMetrics) {
      const dailyValue = parseMetric(da[columnIndex]);
      const weeklyValue = parseMetric(wc[columnIndex]);
      if (dailyValue == null || weeklyValue == null) continue;
      if (dailyValue > 100 && weeklyValue < 10) {
        amountFails++;
        if (amountDetails.length < 4) {
          amountDetails.push(
            `${key.replace('|', ' ')} ${metricName}: daily=$${dailyValue.toFixed(0)} vs core=$${weeklyValue.toFixed(0)}`,
          );
        }
      }
    }
  }

  checks.push({
    label: 'Dollar amounts stay in amount columns',
    passed: amountFails === 0,
    details: amountFails === 0 ? 'All rows pass' : `${amountFails} mismatches: ${amountDetails.join('; ')}`,
  });

  let deltaFails = 0;
  const deltaDetails: string[] = [];
  for (const [key, layers] of Object.entries(grouped)) {
    const da = layers.daily_agg;
    const wc = layers.weekly_core;
    if (!da || !wc) continue;

    for (const [columnIndex, metricName] of [[4, 'orders'], [5, 'guests'], [6, 'tips']] as [number, string][]) {
      const dailyValue = parseMetric(da[columnIndex]);
      const weeklyValue = parseMetric(wc[columnIndex]);
      if (dailyValue == null || weeklyValue == null || dailyValue === 0) continue;

      const pctDiff = Math.abs(dailyValue - weeklyValue) / dailyValue;
      if (pctDiff > 0.05) {
        deltaFails++;
        if (deltaDetails.length < 4) {
          deltaDetails.push(`${key.replace('|', ' ')} ${metricName}: ${(pctDiff * 100).toFixed(1)}% off`);
        }
      }
    }
  }

  checks.push({
    label: 'Orders/guests/tips delta < 5%',
    passed: deltaFails === 0,
    details: deltaFails === 0 ? 'All rows pass' : `${deltaFails} mismatches: ${deltaDetails.join('; ')}`,
  });

  let zeroFails = 0;
  const zeroDetails: string[] = [];
  for (const [key, layers] of Object.entries(grouped)) {
    const da = layers.daily_agg;
    const wc = layers.weekly_core;
    if (!da || !wc) continue;

    const dailyHasData = [3, 4, 5, 6].some((index) => (parseMetric(da[index]) ?? 0) > 0);
    const weeklyAllZero = [3, 4, 5, 6].every((index) => {
      const value = parseMetric(wc[index]);
      return value == null || value === 0;
    });

    if (dailyHasData && weeklyAllZero) {
      zeroFails++;
      if (zeroDetails.length < 4) zeroDetails.push(key.replace('|', ' '));
    }
  }

  checks.push({
    label: 'No zeroed weekly_core when daily has data',
    passed: zeroFails === 0,
    details: zeroFails === 0 ? 'All rows pass' : `${zeroFails} zeroed weeks: ${zeroDetails.join('; ')}`,
  });

  return checks;
}

async function fetchActiveVenues(): Promise<ActiveVenue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, bar_code')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  if (!data?.length) throw new Error('No venues found');
  return data as ActiveVenue[];
}

async function generateAuditRows(
  startDate: Date,
  endDate: Date,
  onProgress: (pct: number, text: string) => void,
): Promise<{ rows: string[][]; venueCount: number }> {
  onProgress(0, 'Fetching venues...');
  const venues = await fetchActiveVenues();

  const { data: allTargets } = await supabase
    .from('bar_targets')
    .select('bar_id, weekly_revenue_target, labor_pct_target, splh_target, tips_pct_target, voids_pct_target, comps_pct_target');

  const targetMap: Record<string, Record<string, unknown>> = {};
  (allTargets || []).forEach((target: any) => {
    targetMap[target.bar_id] = target;
  });

  const allMondays = generateMondaysBetween(startDate, endDate);
  const rows: string[][] = [];

  for (let venueIndex = 0; venueIndex < venues.length; venueIndex++) {
    const venue = venues[venueIndex];
    onProgress(
      Math.round((venueIndex / venues.length) * 100),
      `Auditing ${venue.name} (${venueIndex + 1}/${venues.length})...`,
    );

    const { data: weeksData } = await supabase
      .from('weeks')
      .select('id, week_start')
      .eq('bar_id', venue.id)
      .gte('week_start', format(startDate, 'yyyy-MM-dd'))
      .lte('week_start', format(endDate, 'yyyy-MM-dd'));

    const weekMap: Record<string, string> = {};
    (weeksData || []).forEach((week: { id: string; week_start: string }) => {
      weekMap[week.week_start] = week.id;
    });

    const { data: dailyData } = await supabase
      .from('daily_metrics')
      .select('date, net_sales, orders_count, guests, tips_amount, tips, labor_cost_total, labor_cost, labor_hours_total, labor_hours, overtime_hours, voids_amount, voids, discounts_amount, discounts, refunds_amount, refunds, avg_turn_time_mins, unpaid_amount, tip_data_missing')
      .eq('bar_id', venue.bar_code)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));

    const dailyByWeek: Record<string, Array<Record<string, number | string | boolean | null>>> = {};
    (dailyData || []).forEach((day: Record<string, number | string | boolean | null>) => {
      const monday = getMonday(String(day.date));
      if (!dailyByWeek[monday]) dailyByWeek[monday] = [];
      dailyByWeek[monday].push(day);
    });

    const weekUUIDs = Object.values(weekMap);
    const coreMap: Record<string, any> = {};
    const scorecardMap: Record<string, any> = {};

    if (weekUUIDs.length > 0) {
      const [{ data: coreData }, { data: scorecardData }] = await Promise.all([
        supabase.from('weekly_core').select('*').eq('bar_id', venue.id).in('week_id', weekUUIDs),
        supabase.from('weekly_scorecard').select('*').eq('bar_id', venue.id).in('week_id', weekUUIDs),
      ]);

      (coreData || []).forEach((core: any) => {
        coreMap[core.week_id] = core;
      });
      (scorecardData || []).forEach((scorecard: any) => {
        scorecardMap[scorecard.week_id] = scorecard;
      });
    }

    const targets = targetMap[venue.bar_code] || {};

    for (const monday of allMondays) {
      const weekUUID = weekMap[monday];
      const days = dailyByWeek[monday];

      if (!days || days.length === 0) {
        rows.push(missingRow(venue.name, monday, 'daily_agg'));
      } else {
        const sum = (key: string, fallback?: string) => {
          let total: number | null = null;
          for (const day of days) {
            const value = day[key] ?? (fallback ? day[fallback] : null);
            if (value != null) total = (total || 0) + Number(value);
          }
          return total;
        };

        const netSales = sum('net_sales');
        const orders = sum('orders_count');
        const guests = sum('guests');
        const tips = sum('tips', 'tips_amount');
        const laborCost = sum('labor_cost', 'labor_cost_total');
        const laborHours = sum('labor_hours', 'labor_hours_total');
        const overtimeHours = sum('overtime_hours');
        const voids = sum('voids', 'voids_amount');
        const discounts = sum('discounts', 'discounts_amount');
        const refunds = sum('refunds', 'refunds_amount');

        let turnTimeWeighted: number | null = null;
        let turnTimeOrders = 0;
        for (const day of days) {
          if (day.avg_turn_time_mins != null && day.orders_count != null && Number(day.orders_count) > 0) {
            turnTimeWeighted = (turnTimeWeighted || 0) + Number(day.avg_turn_time_mins) * Number(day.orders_count);
            turnTimeOrders += Number(day.orders_count);
          }
        }
        const turnTime = turnTimeOrders > 0 && turnTimeWeighted != null ? turnTimeWeighted / turnTimeOrders : null;

        // Coverage of Toast check/day report (tips/unpaid/turn share source).
        // tip coverage is sales-weighted; unpaid/turn are day-count.
        const tipsCovDenom = days.reduce((acc, d) =>
          acc + ((d.tips != null || d.tips_amount != null) ? (Number(d.net_sales) || 0) : 0), 0);
        const tipCoveragePct = netSales && netSales > 0 ? tipsCovDenom / netSales : null;
        const unpaidDays = days.filter(d => d.unpaid_amount != null).length;
        const turnDays = days.filter(d => d.avg_turn_time_mins != null).length;
        const unpaidCoveragePct = days.length > 0 ? unpaidDays / days.length : null;
        const turnCoveragePct = days.length > 0 ? turnDays / days.length : null;
        const fmtPct = (p: number | null) => p == null ? 'NULL' : (Math.round(p * 1000) / 10).toFixed(1) + '%';

        rows.push([
          venue.name, monday, 'daily_agg',
          fmt(netSales), fmt(orders), fmt(guests), fmt(tips), fmt(laborCost),
          fmt(laborHours), fmt(overtimeHours), fmt(voids), fmt(discounts), fmt(refunds),
          fmt(turnTime != null ? Math.round(turnTime * 100) / 100 : null),
          safeDiv(laborCost, netSales), safeDiv(netSales, laborHours),
          safeDiv(tips, netSales), safeDiv(voids, netSales), safeDiv(discounts, netSales),
          safeDiv(overtimeHours, laborHours), safeDiv(netSales, orders),
          ...blankScoreColumns(),
          fmtPct(tipCoveragePct), fmtPct(unpaidCoveragePct), fmtPct(turnCoveragePct),
        ]);
      }

      if (!weekUUID || !coreMap[weekUUID]) {
        rows.push(missingRow(venue.name, monday, 'weekly_core'));
      } else {
        const weeklyCore = coreMap[weekUUID];
        rows.push([
          venue.name, monday, 'weekly_core',
          fmt(Number(weeklyCore.net_sales ?? null)), fmt(Number(weeklyCore.transactions ?? null)), fmt(Number(weeklyCore.weekly_guests ?? null)),
          fmt(Number(weeklyCore.tips_amount ?? null)), fmt(Number(weeklyCore.labor_cost_total ?? null)), fmt(Number(weeklyCore.labor_hours_total ?? null)),
          fmt(Number(weeklyCore.overtime_hours ?? null)), fmt(Number(weeklyCore.void_amount ?? null)), fmt(Number(weeklyCore.discount_amount ?? null)),
          fmt(Number(weeklyCore.refund_amount ?? null)), fmt(Number(weeklyCore.turn_time_avg_min ?? null)),
          fmt(Number(weeklyCore.labor_pct ?? null)), fmt(Number(weeklyCore.splh ?? null)), fmt(Number(weeklyCore.tip_pct ?? null)),
          fmt(Number(weeklyCore.void_rate ?? null)), fmt(Number(weeklyCore.discount_pct ?? null)), fmt(Number(weeklyCore.overtime_rate ?? null)),
          fmt(Number(weeklyCore.aov ?? null)),
          ...blankScoreColumns(),
          ...blankCoverageColumns(),
        ]);
      }

      if (!weekUUID || !scorecardMap[weekUUID]) {
        rows.push(missingRow(venue.name, monday, 'scorecard'));
      } else {
        const scorecard = scorecardMap[weekUUID];
        const targetValue = (key: string) => fmt((targets[key] as number | null | undefined) ?? null);
        rows.push([
          venue.name, monday, 'scorecard',
          fmt(Number(scorecard.r1_actual ?? null)), fmt(Number(scorecard.r2_actual ?? null)), '',
          fmt(Number(scorecard.g1_actual ?? null)), fmt(Number(scorecard.l1_actual ?? null)), fmt(Number(scorecard.l2_actual ?? null)),
          fmt(Number(scorecard.l3_actual ?? null)), fmt(Number(scorecard.o1_actual ?? null)), fmt(Number(scorecard.o2_actual ?? null)),
          '', fmt(Number(scorecard.o3_actual ?? null)),
          '', '', '', '', '', '', '',
          fmt(Number(scorecard.overall_score ?? null)), fmt(Number(scorecard.revenue_score ?? null)), fmt(Number(scorecard.labor_score ?? null)),
          fmt(Number(scorecard.operations_score ?? null)), fmt(Number(scorecard.guest_score ?? null)), fmt(Number(scorecard.confidence ?? null)),
          targetValue('weekly_revenue_target'), fmt(Number(scorecard.r1_actual ?? null)), fmt(Number(scorecard.r1_score ?? null)),
          'N/A', fmt(Number(scorecard.r2_actual ?? null)), fmt(Number(scorecard.r2_score ?? null)),
          'N/A', fmt(Number(scorecard.r3_actual ?? null)), fmt(Number(scorecard.r3_score ?? null)),
          'N/A', fmt(Number(scorecard.r4_actual ?? null)), fmt(Number(scorecard.r4_score ?? null)),
          targetValue('labor_pct_target'), fmt(Number(scorecard.l1_actual ?? null)), fmt(Number(scorecard.l1_score ?? null)),
          targetValue('splh_target'), fmt(Number(scorecard.l2_actual ?? null)), fmt(Number(scorecard.l2_score ?? null)),
          'N/A', fmt(Number(scorecard.l3_actual ?? null)), fmt(Number(scorecard.l3_score ?? null)),
          'N/A', fmt(Number(scorecard.l4_actual ?? null)), fmt(Number(scorecard.l4_score ?? null)),
          targetValue('voids_pct_target'), fmt(Number(scorecard.o1_actual ?? null)), fmt(Number(scorecard.o1_score ?? null)),
          'N/A', fmt(Number(scorecard.o2_actual ?? null)), fmt(Number(scorecard.o2_score ?? null)),
          'N/A', fmt(Number(scorecard.o3_actual ?? null)), fmt(Number(scorecard.o3_score ?? null)),
          'N/A', fmt(Number(scorecard.o4_actual ?? null)), fmt(Number(scorecard.o4_score ?? null)),
          targetValue('tips_pct_target'), fmt(Number(scorecard.g1_actual ?? null)), fmt(Number(scorecard.g1_score ?? null)),
          'N/A', fmt(Number(scorecard.g2_actual ?? null)), fmt(Number(scorecard.g2_score ?? null)),
          'N/A', fmt(Number(scorecard.g3_actual ?? null)), fmt(Number(scorecard.g3_score ?? null)),
          'N/A', fmt(Number(scorecard.g4_actual ?? null)), fmt(Number(scorecard.g4_score ?? null)),
          ...blankCoverageColumns(),
        ]);
      }
    }
  }

  return { rows, venueCount: venues.length };
}

function buildTraceFromResult(venue: ActiveVenue, weekStart: string, result: Record<string, any>): RecomputeTrace {
  const trace = result.trace || {};
  const key = `${venue.id}|${weekStart}`;

  return {
    key,
    venueId: venue.id,
    venueName: venue.name,
    barCode: venue.bar_code,
    weekStart,
    weekEnd: trace.week_end || addDays(weekStart, 6),
    readMode: trace.read_source || 'unknown',
    readKey: trace.read_key || venue.bar_code || venue.id,
    dailyReadQuery: trace.daily_query || `from("daily_metrics").select("*").eq("bar_id", "${venue.bar_code || venue.id}").gte("date", "${weekStart}").lte("date", "${addDays(weekStart, 6)}")`,
    fallbackQuery: trace.fallback_query || null,
    aggregationFields: trace.aggregation_fields || {},
    dailyMetricsRows: trace.daily_metrics_rows || [],
    dailySums: trace.daily_sums || {},
    weeklyCorePayload: trace.weekly_core_payload || {},
    computedAt: trace.weekly_core_payload?.computed_at || null,
  };
}

export const DataAuditTab = () => {
  const [startDate, setStartDate] = useState<Date>(new Date('2025-01-06'));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [csvBlob, setCsvBlob] = useState<Blob | null>(null);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputePhase, setRecomputePhase] = useState<'idle' | 'recompute' | 'verify'>('idle');
  const [recomputeProgress, setRecomputeProgress] = useState({ done: 0, total: 0 });
  const [recomputeFailures, setRecomputeFailures] = useState<RecomputeFailure[]>([]);
  const [traceEntries, setTraceEntries] = useState<Record<string, RecomputeTrace>>({});
  const [selectedTraceKey, setSelectedTraceKey] = useState('');

  useEffect(() => {
    if (!csvBlob) {
      setCsvUrl(null);
      return;
    }

    const url = URL.createObjectURL(csvBlob);
    setCsvUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [csvBlob]);

  const traceList = Object.values(traceEntries).sort((left, right) => {
    const venueCompare = left.venueName.localeCompare(right.venueName);
    if (venueCompare !== 0) return venueCompare;
    return left.weekStart.localeCompare(right.weekStart);
  });

  const selectedTrace = selectedTraceKey ? traceEntries[selectedTraceKey] : traceList[0] || null;

  useEffect(() => {
    if (!traceList.length) {
      if (selectedTraceKey) setSelectedTraceKey('');
      return;
    }

    if (!selectedTraceKey || !traceEntries[selectedTraceKey]) {
      setSelectedTraceKey(traceList[0].key);
    }
  }, [traceEntries, traceList, selectedTraceKey]);

  const buildCsv = (rows: string[][]): Blob => {
    const csvContent = [
      CSV_HEADERS.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    return new Blob([csvContent], { type: 'text/csv' });
  };

  const runAudit = async () => {
    setRunning(true);
    setProgress(0);
    setCsvBlob(null);
    setCheckResults(null);

    try {
      const { rows, venueCount } = await generateAuditRows(startDate, endDate, (pct, text) => {
        setProgress(pct);
        setStatusText(text);
      });

      const blob = buildCsv(rows);
      setCsvBlob(blob);
      setCheckResults(runQuickChecks(rows));
      setProgress(100);
      setStatusText(`Done — ${rows.length} rows generated for ${venueCount} venues.`);
      toast({ title: 'Audit complete', description: `${rows.length} rows ready to download.` });
    } catch (err: any) {
      toast({ title: 'Audit failed', description: err.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const runRecomputeAndVerify = useCallback(async () => {
    setRecomputing(true);
    setRecomputePhase('recompute');
    setCsvBlob(null);
    setCheckResults(null);
    setProgress(0);
    setRecomputeFailures([]);
    setTraceEntries({});
    setSelectedTraceKey('');

    try {
      const [venues, allMondays] = await Promise.all([
        fetchActiveVenues(),
        Promise.resolve(generateMondaysBetween(startDate, endDate)),
      ]);

      const total = venues.length * allMondays.length;
      const nextTraces: Record<string, RecomputeTrace> = {};
      const failures: RecomputeFailure[] = [];

      setRecomputeProgress({ done: 0, total });
      setStatusText(`Recomputing ${total} venue-weeks...`);
      toast({ title: 'Recompute started', description: `Processing ${total} venue-weeks one at a time.` });

      let completed = 0;
      for (const weekStart of allMondays) {
        for (const venue of venues) {
          setStatusText(`Recomputing ${venue.name} for ${weekStart} (${completed + 1}/${total})...`);
          setRecomputeProgress({ done: completed, total });
          setProgress(Math.round((completed / total) * 50));

          const { data, error } = await supabase.functions.invoke('compute-weekly-scores', {
            body: {
              bar_id: venue.id,
              week_start: weekStart,
              include_trace: true,
            },
          });

          if (error) {
            failures.push({
              venueId: venue.id,
              venueName: venue.name,
              weekStart,
              message: error.message,
            });
            completed += 1;
            continue;
          }

          const result = data?.results?.[0];
          if (!result) {
            failures.push({
              venueId: venue.id,
              venueName: venue.name,
              weekStart,
              message: 'Function returned no per-venue result.',
            });
            completed += 1;
            continue;
          }

          if (result.status !== 'ok') {
            failures.push({
              venueId: venue.id,
              venueName: venue.name,
              weekStart,
              message: result.error || 'Unknown recompute error.',
            });
            completed += 1;
            continue;
          }

          const trace = buildTraceFromResult(venue, weekStart, result);
          if (!trace.computedAt) {
            failures.push({
              venueId: venue.id,
              venueName: venue.name,
              weekStart,
              message: 'Missing weekly_core computed_at in function trace.',
            });
            completed += 1;
            continue;
          }

          nextTraces[trace.key] = trace;
          completed += 1;
        }
      }

      setTraceEntries(nextTraces);
      setRecomputeFailures(failures);
      setRecomputeProgress({ done: total, total });
      setProgress(50);

      if (failures.length > 0 || Object.keys(nextTraces).length !== total) {
        const missing = total - Object.keys(nextTraces).length;
        const summary = [
          failures.length > 0 ? `${failures.length} failed` : null,
          missing > 0 ? `${missing} missing traces` : null,
        ].filter(Boolean).join(', ');

        setStatusText(`Recompute incomplete — ${summary}. Verification blocked.`);
        toast({
          title: 'Recompute incomplete',
          description: summary || 'One or more venue-weeks did not finish cleanly.',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Recompute complete', description: `All ${total} venue-weeks finished. Starting verification...` });
      setRecomputePhase('verify');
      setStatusText('Running verification audit...');

      const { rows, venueCount } = await generateAuditRows(startDate, endDate, (pct, text) => {
        setProgress(50 + Math.round(pct * 0.5));
        setStatusText(`Verifying: ${text}`);
      });

      const blob = buildCsv(rows);
      const checks = runQuickChecks(rows);
      const allPassed = checks.every((check) => check.passed);

      setCsvBlob(blob);
      setCheckResults(checks);
      setProgress(100);
      setStatusText(`Verification complete — ${rows.length} rows for ${venueCount} venues. ${allPassed ? 'All checks passed.' : 'Checks still failed.'}`);
      toast({
        title: allPassed ? 'Verification passed' : 'Verification complete with warnings',
        description: `${checks.filter((check) => check.passed).length}/${checks.length} checks passed.`,
        variant: allPassed ? undefined : 'destructive',
      });
    } catch (err: any) {
      toast({ title: 'Recompute failed', description: err.message, variant: 'destructive' });
    } finally {
      setRecomputing(false);
      setRecomputePhase('idle');
    }
  }, [startDate, endDate]);

  const isWorking = running || recomputing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          Data Accuracy Audit
        </CardTitle>
        <CardDescription>
          Compare daily_metrics aggregations → weekly_core → weekly_scorecard and inspect the exact read/write trace for recomputes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[160px] justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} className="pointer-events-auto p-3" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[160px] justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(endDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} className="pointer-events-auto p-3" />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={runAudit} disabled={isWorking}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
            Run Audit
          </Button>

          <Button onClick={runRecomputeAndVerify} disabled={isWorking} variant="secondary">
            {recomputing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recompute All & Verify
          </Button>

          {csvUrl && (
            <>
              <Button variant="outline" asChild>
                <a href={csvUrl} download={`barpulse-audit-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href={csvUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              </Button>
            </>
          )}
        </div>

        {(isWorking || statusText) && (
          <div className="space-y-2">
            {recomputing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={cn('font-medium', recomputePhase === 'recompute' && 'text-primary')}>
                  ① Recompute ({recomputeProgress.done}/{recomputeProgress.total})
                </span>
                <span>→</span>
                <span className={cn('font-medium', recomputePhase === 'verify' && 'text-primary')}>
                  ② Verify
                </span>
              </div>
            )}
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
        )}

        {recomputeFailures.length > 0 && (
          <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <h4 className="flex items-center gap-1 text-sm font-semibold text-destructive">
              <XCircle className="h-4 w-4" />
              Recompute Failures
            </h4>
            <p className="text-sm text-muted-foreground">
              Verification was blocked because {recomputeFailures.length} venue-weeks did not finish cleanly.
            </p>
            <div className="space-y-1 text-sm">
              {recomputeFailures.slice(0, 10).map((failure) => (
                <div key={`${failure.venueId}-${failure.weekStart}`}>
                  <span className="font-medium">{failure.venueName}</span>
                  <span className="text-muted-foreground"> — {failure.weekStart} — {failure.message}</span>
                </div>
              ))}
              {recomputeFailures.length > 10 && (
                <p className="text-muted-foreground">...and {recomputeFailures.length - 10} more.</p>
              )}
            </div>
          </div>
        )}

        {checkResults && (
          <div className="space-y-2 rounded-md border p-3">
            <h4 className="flex items-center gap-1 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Verification Checks
            </h4>
            {checkResults.map((check) => (
              <div key={check.label} className="flex items-start gap-2 text-sm">
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <div>
                  <span className="font-medium">{check.label}</span>
                  <span className="ml-2 text-muted-foreground">— {check.details}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {traceList.length > 0 && selectedTrace && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Execution Trace</label>
                <select
                  value={selectedTrace.key}
                  onChange={(event) => setSelectedTraceKey(event.target.value)}
                  className="min-w-[320px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {traceList.map((trace) => (
                    <option key={trace.key} value={trace.key}>
                      {trace.venueName} — {trace.weekStart}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-muted-foreground">
                Read mode: <span className="font-medium text-foreground">{selectedTrace.readMode}</span>
                <span className="mx-2">•</span>
                Read key: <span className="font-medium text-foreground">{selectedTrace.readKey}</span>
                <span className="mx-2">•</span>
                computed_at: <span className="font-medium text-foreground">{selectedTrace.computedAt || 'missing'}</span>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="space-y-2 rounded-md border p-3">
                <h4 className="text-sm font-semibold">Exact read path</h4>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">
                  {selectedTrace.dailyReadQuery}
                </pre>
                {selectedTrace.fallbackQuery && (
                  <>
                    <p className="text-xs text-muted-foreground">Fallback if primary returns zero rows:</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">
                      {selectedTrace.fallbackQuery}
                    </pre>
                  </>
                )}
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <h4 className="text-sm font-semibold">Aggregation fields + write payload</h4>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify({
                    aggregation_fields: selectedTrace.aggregationFields,
                    daily_sums: selectedTrace.dailySums,
                    weekly_core_payload: selectedTrace.weeklyCorePayload,
                  }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <h4 className="text-sm font-semibold">Raw daily_metrics rows read ({selectedTrace.dailyMetricsRows.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-2 font-medium">date</th>
                      <th className="px-2 py-2 font-medium">source</th>
                      <th className="px-2 py-2 font-medium">net_sales</th>
                      <th className="px-2 py-2 font-medium">orders_count</th>
                      <th className="px-2 py-2 font-medium">guests</th>
                      <th className="px-2 py-2 font-medium">tips</th>
                      <th className="px-2 py-2 font-medium">tips_amount</th>
                      <th className="px-2 py-2 font-medium">voids</th>
                      <th className="px-2 py-2 font-medium">voids_amount</th>
                      <th className="px-2 py-2 font-medium">discounts</th>
                      <th className="px-2 py-2 font-medium">discounts_amount</th>
                      <th className="px-2 py-2 font-medium">refunds</th>
                      <th className="px-2 py-2 font-medium">refunds_amount</th>
                      <th className="px-2 py-2 font-medium">turn_time</th>
                      <th className="px-2 py-2 font-medium">synced_at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTrace.dailyMetricsRows.map((row) => (
                      <tr key={`${selectedTrace.key}-${row.date}-${row.source ?? 'unknown'}`} className="border-b last:border-0">
                        <td className="px-2 py-2">{row.date}</td>
                        <td className="px-2 py-2">{row.source || 'NULL'}</td>
                        <td className="px-2 py-2">{fmt(row.net_sales)}</td>
                        <td className="px-2 py-2">{fmt(row.orders_count)}</td>
                        <td className="px-2 py-2">{fmt(row.guests)}</td>
                        <td className="px-2 py-2">{fmt(row.tips)}</td>
                        <td className="px-2 py-2">{fmt(row.tips_amount)}</td>
                        <td className="px-2 py-2">{fmt(row.voids)}</td>
                        <td className="px-2 py-2">{fmt(row.voids_amount)}</td>
                        <td className="px-2 py-2">{fmt(row.discounts)}</td>
                        <td className="px-2 py-2">{fmt(row.discounts_amount)}</td>
                        <td className="px-2 py-2">{fmt(row.refunds)}</td>
                        <td className="px-2 py-2">{fmt(row.refunds_amount)}</td>
                        <td className="px-2 py-2">{fmt(row.avg_turn_time_mins)}</td>
                        <td className="px-2 py-2">{row.last_synced_at || row.synced_at || 'NULL'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
