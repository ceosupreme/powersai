/**
 * Pure helpers that turn raw weekly data into the stat tiles + comparison
 * shown inside the MetricDetailDrawer. One switch per scoreKey.
 *
 * All formatting uses `—` for missing values (never 0, never blank).
 */

import { resolveMetricTarget, PillarMetricConfig } from '@/config/pillarMetrics';

export interface StatTile {
  label: string;
  value: string;
}

export interface MetricComparison {
  pct: number;
  label: string; // 'vs LY' or 'vs target'
  fromTo: string; // human-readable "$142,300 → $148,275"
  isGood: boolean;
}

export interface MetricStats {
  tiles: StatTile[];
  comparison?: MetricComparison;
  /** True only for KDS metric when no KDS data is available. */
  kdsEmpty?: boolean;
}

export interface MetricStatsContext {
  scorecard: Record<string, unknown> | null | undefined;
  currentCore: Record<string, unknown> | null | undefined;
  priorYearCore: Record<string, unknown> | null | undefined;
  periodConfig: Record<string, unknown> | null | undefined;
  metric: PillarMetricConfig;
}

// ---------- formatters ----------

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const fmtCurrency = (v: number | null, opts?: { cents?: boolean }): string => {
  if (v === null) return '—';
  const cents = opts?.cents ?? Math.abs(v) < 1000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(v);
};

const fmtNumber = (v: number | null): string => {
  if (v === null) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(v));
};

const fmtDecimal = (v: number | null, decimals = 1): string => {
  if (v === null) return '—';
  return v.toFixed(decimals);
};

const fmtPercent = (v: number | null, opts?: { multiplyBy100?: boolean; decimals?: number }): string => {
  if (v === null) return '—';
  const mul = opts?.multiplyBy100 ?? false;
  const display = mul ? v * 100 : v;
  return `${display.toFixed(opts?.decimals ?? 1)}%`;
};

const fmtMins = (v: number | null): string => {
  if (v === null) return '—';
  return `${v.toFixed(0)} min`;
};

const DAYS_IN_WEEK = 7;

// ---------- comparison builder (mirrors PillarMetricRow logic) ----------

function buildComparison(
  ctx: MetricStatsContext,
  actual: number | null,
  formatter: (n: number | null) => string,
): MetricComparison | undefined {
  if (actual === null) return undefined;
  const resolved = resolveMetricTarget(ctx.metric, ctx.priorYearCore, ctx.periodConfig);
  if (!resolved || resolved.value === 0) return undefined;

  // For multiplyBy100 metrics, both actual and target are stored as decimals.
  const target = resolved.value;
  const pct = ((actual - target) / Math.abs(target)) * 100;
  const isGood = ctx.metric.lowerIsBetter ? pct <= 0 : pct >= 0;

  return {
    pct,
    label: resolved.label,
    fromTo: `${formatter(target)} → ${formatter(actual)}`,
    isGood,
  };
}

// ---------- main builder ----------

export function buildMetricStats(scoreKey: string, ctx: MetricStatsContext): MetricStats {
  const sc = ctx.scorecard || {};
  const cc = ctx.currentCore || {};
  const py = ctx.priorYearCore || {};
  const pc = ctx.periodConfig || {};

  switch (scoreKey) {
    // ---------------- REVENUE ----------------
    case 'r1_score': {
      const netSales = num((cc as any).net_sales) ?? num((sc as any).r1_actual);
      const target = num((pc as any).weekly_net_sales_target);
      return {
        tiles: [
          { label: 'Weekly net sales', value: fmtCurrency(netSales, { cents: false }) },
          { label: 'Daily average', value: fmtCurrency(netSales !== null ? netSales / DAYS_IN_WEEK : null, { cents: false }) },
          { label: 'Weekly target', value: fmtCurrency(target, { cents: false }) },
          { label: 'vs target', value: target && netSales !== null ? `${(((netSales - target) / target) * 100).toFixed(1)}%` : '—' },
        ],
        comparison: buildComparison(ctx, netSales, (v) => fmtCurrency(v, { cents: false })),
      };
    }
    case 'r2_score': {
      const orders = num((cc as any).transactions) ?? num((sc as any).r2_actual);
      const guests = num((cc as any).weekly_guests);
      return {
        tiles: [
          { label: 'Total orders', value: fmtNumber(orders) },
          { label: 'Total guests', value: fmtNumber(guests) },
          { label: 'Daily avg orders', value: fmtNumber(orders !== null ? orders / DAYS_IN_WEEK : null) },
          { label: 'Daily avg guests', value: fmtNumber(guests !== null ? guests / DAYS_IN_WEEK : null) },
        ],
        comparison: buildComparison(ctx, orders, fmtNumber),
      };
    }
    case 'r3_score': {
      const aov = num((cc as any).aov) ?? num((sc as any).r3_actual);
      const lyAov = num((py as any).aov);
      const netSales = num((cc as any).net_sales);
      const orders = num((cc as any).transactions);
      return {
        tiles: [
          { label: 'Avg check', value: fmtCurrency(aov) },
          { label: 'LY avg check', value: fmtCurrency(lyAov) },
          { label: 'Net sales', value: fmtCurrency(netSales, { cents: false }) },
          { label: 'Total orders', value: fmtNumber(orders) },
        ],
        comparison: buildComparison(ctx, aov, fmtCurrency),
      };
    }
    case 'r4_score': {
      const comps = num((cc as any).comps_amount);
      const discounts = num((cc as any).discount_amount);
      const netSales = num((cc as any).net_sales);
      const combined = comps !== null && discounts !== null ? comps + discounts : (comps ?? discounts);
      const combinedPct = combined !== null && netSales && netSales > 0 ? (combined / netSales) * 100 : null;
      return {
        tiles: [
          { label: 'Comps', value: fmtCurrency(comps, { cents: false }) },
          { label: 'Discounts', value: fmtCurrency(discounts, { cents: false }) },
          { label: 'Combined', value: fmtCurrency(combined, { cents: false }) },
          { label: '% of net sales', value: combinedPct !== null ? `${combinedPct.toFixed(2)}%` : '—' },
        ],
        comparison: buildComparison(ctx, num((sc as any).r4_actual), (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }

    // ---------------- LABOR ----------------
    case 'l1_score': {
      const laborCost = num((cc as any).labor_cost_total);
      const netSales = num((cc as any).net_sales);
      const laborPct = num((cc as any).labor_pct) ?? num((sc as any).l1_actual);
      return {
        tiles: [
          { label: 'Labor cost', value: fmtCurrency(laborCost, { cents: false }) },
          { label: 'Net sales', value: fmtCurrency(netSales, { cents: false }) },
          { label: 'Labor %', value: fmtPercent(laborPct, { multiplyBy100: true }) },
          { label: 'Hours worked', value: fmtNumber(num((cc as any).labor_hours_total)) },
        ],
        comparison: buildComparison(ctx, laborPct, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }
    case 'l2_score': {
      const netSales = num((cc as any).net_sales);
      const hours = num((cc as any).labor_hours_total);
      const splh = num((cc as any).splh) ?? num((sc as any).l2_actual);
      return {
        tiles: [
          { label: 'Net sales', value: fmtCurrency(netSales, { cents: false }) },
          { label: 'Total labor hours', value: fmtNumber(hours) },
          { label: 'SPLH', value: fmtCurrency(splh) },
          { label: 'Labor cost', value: fmtCurrency(num((cc as any).labor_cost_total), { cents: false }) },
        ],
        comparison: buildComparison(ctx, splh, fmtCurrency),
      };
    }
    case 'l3_score': {
      const sched = num((cc as any).scheduled_hours);
      const actual = num((cc as any).actual_hours);
      const variancePct = num((cc as any).schedule_variance_pct) ?? num((sc as any).l3_actual);
      const varianceHrs = sched !== null && actual !== null ? actual - sched : null;
      return {
        tiles: [
          { label: 'Scheduled hrs', value: fmtNumber(sched) },
          { label: 'Actual hrs', value: fmtNumber(actual) },
          { label: 'Variance hrs', value: varianceHrs !== null ? `${varianceHrs >= 0 ? '+' : ''}${fmtNumber(Math.abs(varianceHrs))}`.replace('+—', '—') : '—' },
          { label: 'Variance %', value: fmtPercent(variancePct, { multiplyBy100: true }) },
        ],
        comparison: buildComparison(ctx, variancePct, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }
    case 'l4_score': {
      const otHours = num((cc as any).overtime_hours);
      const totalHours = num((cc as any).labor_hours_total);
      const laborCost = num((cc as any).labor_cost_total);
      const otRate = num((cc as any).overtime_rate) ?? num((sc as any).l4_actual);
      // OT cost ≈ ot_hours × avg hourly rate × 1.5 (time-and-a-half).
      // Conservative: ot_hours × (laborCost/totalHours). Surfaced as approximate.
      const otCost = otHours !== null && totalHours && totalHours > 0 && laborCost !== null
        ? (otHours * (laborCost / totalHours))
        : null;
      const otPctOfHours = otHours !== null && totalHours && totalHours > 0
        ? (otHours / totalHours) * 100
        : null;
      return {
        tiles: [
          { label: 'OT hours', value: fmtNumber(otHours) },
          { label: 'OT cost (est.)', value: fmtCurrency(otCost, { cents: false }) },
          { label: 'OT % of hours', value: otPctOfHours !== null ? `${otPctOfHours.toFixed(1)}%` : '—' },
          { label: 'Total hours', value: fmtNumber(totalHours) },
        ],
        comparison: buildComparison(ctx, otRate, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }
    case 'l5_score': {
      const score = num((cc as any).engage_composite_score) ?? num((sc as any).l5_actual);
      const target = num((pc as any).engage_score_target);
      return {
        tiles: [
          { label: 'Composite score', value: fmtDecimal(score, 1) },
          { label: 'Target', value: fmtDecimal(target, 1) },
          { label: 'Avg shift score', value: fmtDecimal(num((cc as any).engage_avg_shift_score), 1) },
          { label: 'Avg tenure (days)', value: fmtDecimal(num((cc as any).engage_avg_tenure), 0) },
        ],
        comparison: buildComparison(ctx, score, (v) => fmtDecimal(v, 1)),
      };
    }

    // ---------------- OPERATIONS ----------------
    case 'o1_score': {
      const due = num((cc as any).tasks_due);
      const completed = num((cc as any).tasks_completed);
      const inRed = num((cc as any).tasks_in_red);
      const onTime = num((cc as any).tasks_on_time);
      const completionPct = num((cc as any).task_completion_pct) ?? num((sc as any).o1_actual);
      const onTimePct = num((cc as any).on_time_rate);
      return {
        tiles: [
          { label: 'Assigned', value: fmtNumber(due) },
          { label: 'Completed', value: fmtNumber(completed) },
          { label: 'In the Red', value: fmtNumber(inRed) },
          { label: 'On-Time', value: fmtNumber(onTime) },
          { label: 'Resolution %', value: fmtPercent(completionPct, { multiplyBy100: true }) },
          { label: 'On-Time %', value: fmtPercent(onTimePct, { multiplyBy100: true }) },
        ],
        comparison: buildComparison(ctx, completionPct, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }
    case 'o2_score': {
      const turn = num((cc as any).turn_time_avg_min) ?? num((sc as any).o2_actual);
      const target = num((pc as any).turn_time_target_min);
      const lyTurn = num((py as any).turn_time_avg_min);
      return {
        tiles: [
          { label: 'Avg turn time', value: fmtMins(turn) },
          { label: 'Target', value: fmtMins(target) },
          { label: 'LY avg turn', value: fmtMins(lyTurn) },
          { label: 'Δ vs target', value: turn !== null && target !== null ? `${turn - target >= 0 ? '+' : ''}${(turn - target).toFixed(0)} min` : '—' },
        ],
        comparison: buildComparison(ctx, turn, fmtMins),
      };
    }
    case 'o3_score': {
      const voidAmt = num((cc as any).void_amount);
      const voidRate = num((cc as any).void_rate) ?? num((sc as any).o3_actual);
      const gross = num((cc as any).gross_sales);
      return {
        tiles: [
          { label: 'Void count', value: '—' },
          { label: 'Void $', value: fmtCurrency(voidAmt, { cents: false }) },
          { label: 'Void % of gross', value: fmtPercent(voidRate, { multiplyBy100: true }) },
          { label: 'Gross sales', value: fmtCurrency(gross, { cents: false }) },
        ],
        comparison: buildComparison(ctx, voidRate, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }
    case 'o4_score': {
      const unpaid = num((cc as any).unpaid_checks_amount) ?? num((sc as any).o4_actual);
      const lyUnpaid = num((py as any).unpaid_checks_amount);
      return {
        tiles: [
          { label: 'Unpaid count', value: '—' },
          { label: 'Unpaid $', value: fmtCurrency(unpaid, { cents: false }) },
          { label: 'LY unpaid $', value: fmtCurrency(lyUnpaid, { cents: false }) },
          { label: 'Δ vs LY', value: unpaid !== null && lyUnpaid !== null && lyUnpaid !== 0 ? `${(((unpaid - lyUnpaid) / Math.abs(lyUnpaid)) * 100).toFixed(1)}%` : '—' },
        ],
        comparison: buildComparison(ctx, unpaid, (v) => fmtCurrency(v, { cents: false })),
      };
    }
    case 'o5_score': {
      const total = num((cc as any).sidework_tasks_total);
      const done = num((cc as any).sidework_tasks_completed);
      const pct = num((cc as any).sidework_completion_pct) ?? num((sc as any).o5_actual);
      return {
        tiles: [
          { label: 'Tasks assigned', value: fmtNumber(total) },
          { label: 'Tasks completed', value: fmtNumber(done) },
          { label: 'Completion %', value: fmtPercent(pct, { multiplyBy100: true }) },
          { label: 'Outstanding', value: total !== null && done !== null ? fmtNumber(total - done) : '—' },
        ],
        comparison: buildComparison(ctx, pct, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }

    // ---------------- GUEST EXPERIENCE ----------------
    case 'g1_score': {
      const guests = num((cc as any).weekly_guests) ?? num((sc as any).g1_actual);
      const lyGuests = num((py as any).weekly_guests);
      return {
        tiles: [
          { label: 'Total guests', value: fmtNumber(guests) },
          { label: 'Daily average', value: fmtNumber(guests !== null ? guests / DAYS_IN_WEEK : null) },
          { label: 'LY guests', value: fmtNumber(lyGuests) },
          { label: 'Δ vs LY', value: guests !== null && lyGuests !== null && lyGuests !== 0 ? `${(((guests - lyGuests) / Math.abs(lyGuests)) * 100).toFixed(1)}%` : '—' },
        ],
        comparison: buildComparison(ctx, guests, fmtNumber),
      };
    }
    case 'g2_score': {
      const tips = num((cc as any).tips_amount);
      const netSales = num((cc as any).net_sales);
      const tipPct = num((cc as any).tip_pct) ?? num((sc as any).g2_actual);
      const lyTipPct = num((py as any).tip_pct);
      return {
        tiles: [
          { label: 'Total tips', value: fmtCurrency(tips, { cents: false }) },
          { label: 'Net sales', value: fmtCurrency(netSales, { cents: false }) },
          { label: 'Tip %', value: fmtPercent(tipPct, { multiplyBy100: true }) },
          { label: 'LY tip %', value: fmtPercent(lyTipPct, { multiplyBy100: true }) },
        ],
        comparison: buildComparison(ctx, tipPct, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }
    case 'g3_score': {
      const refundAmt = num((cc as any).refund_amount);
      const refundPct = num((cc as any).refund_pct) ?? num((sc as any).g3_actual);
      const gross = num((cc as any).gross_sales);
      const lyRefundPct = num((py as any).refund_pct);
      return {
        tiles: [
          { label: 'Refund count', value: '—' },
          { label: 'Refund $', value: fmtCurrency(refundAmt, { cents: false }) },
          { label: 'Refund % of gross', value: fmtPercent(refundPct, { multiplyBy100: true }) },
          { label: 'LY refund %', value: fmtPercent(lyRefundPct, { multiplyBy100: true }) },
        ],
        comparison: buildComparison(ctx, refundPct, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }
    case 'g4_score': {
      const google = num((cc as any).google_rating);
      const yelp = num((cc as any).yelp_rating);
      const composite = num((cc as any).online_reputation_score) ?? num((sc as any).g4_actual);
      const lyComposite = num((py as any).online_reputation_score);
      return {
        tiles: [
          { label: 'Google rating', value: google !== null ? `${google.toFixed(2)} ★` : '—' },
          { label: 'Yelp rating', value: yelp !== null ? `${yelp.toFixed(2)} ★` : '—' },
          { label: 'Composite', value: composite !== null ? composite.toFixed(2) : '—' },
          { label: 'Prior period', value: lyComposite !== null ? lyComposite.toFixed(2) : '—' },
        ],
        comparison: buildComparison(ctx, composite, (v) => v !== null ? v.toFixed(2) : '—'),
      };
    }
    case 'g5_score': {
      const kdsPct = num((cc as any).kds_over_25_pct) ?? num((sc as any).g5_actual);
      const avgKds = num((cc as any).avg_kds_time_mins);
      const totalTickets = num((cc as any).kds_total_tickets);
      const overTickets = num((cc as any).kds_over_25_tickets);
      // Treat as empty only when nothing exists at all.
      if (kdsPct === null && avgKds === null && totalTickets === null) {
        return { tiles: [], kdsEmpty: true };
      }
      const fmtCount = (v: number | null) =>
        v === null ? '—' : new Intl.NumberFormat('en-US').format(Math.round(v));
      return {
        tiles: [
          { label: 'Total KDS tickets', value: fmtCount(totalTickets) },
          { label: 'Tickets > 25 min', value: fmtCount(overTickets) },
          { label: '% over 25 min', value: fmtPercent(kdsPct, { multiplyBy100: true }) },
          { label: 'Avg KDS time', value: fmtMins(avgKds) },
        ],
        comparison: buildComparison(ctx, kdsPct, (v) => fmtPercent(v, { multiplyBy100: true })),
      };
    }

    default:
      return { tiles: [] };
  }
}
