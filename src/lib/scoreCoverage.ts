export interface ScoreCoverage {
  measured: number;
  total: number;
  scored: number;
  unit: 'KPIs' | 'pillars';
  /** Oldest input contributing to the displayed reporting period. */
  asOf: string | null;
  latestUpdate: string | null;
  missingTimestamps: number;
  weekStart: string | null;
  snapshots: number;
  flows: number;
  unavailable: boolean;
}

interface Definition { pillar_key: string; kpi_key: string; target: number | null }
interface Measurement {
  pillar_key: string; kpi_key: string; actual: number | null; updated_at?: string | null;
  observed_at?: string | null; window_end?: string | null; measurement_kind?: string | null;
}
interface PillarMeasurement { pillar_key: string; score: number | null; updated_at?: string | null }

const isNumber = (value: unknown) => value !== null && value !== undefined && Number.isFinite(Number(value));
const validTime = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? value : null;

/** Import time cannot make an old reporting window look freshly measured. */
function measurementTime(value: Measurement): string | null {
  const observed = validTime(value.observed_at);
  const end = value.measurement_kind === 'flow' ? validTime(value.window_end) : null;
  if (observed && end) return Date.parse(end) < Date.parse(observed) ? end : observed;
  return end ?? observed ?? validTime(value.updated_at);
}

/** Coverage counts real observations, including zero; a missing target cannot score. */
export function deriveScoreCoverage(
  definitions: Definition[],
  measurements: Measurement[],
  pillars: { pillar_key: string }[],
  pillarValues: PillarMeasurement[],
  unavailable = false,
  weekStart: string | null = null,
): ScoreCoverage {
  const values = new Map(measurements.map((value) => [`${value.pillar_key}:${value.kpi_key}`, value]));
  const knownPillars = new Set(pillars.map((pillar) => pillar.pillar_key));
  const defs = definitions.filter((def) => knownPillars.has(def.pillar_key));
  const observed = defs.flatMap((def) => {
    const value = values.get(`${def.pillar_key}:${def.kpi_key}`);
    return value && isNumber(value.actual) ? [{ def, value }] : [];
  });
  const manual = pillarValues.filter((value) => knownPillars.has(value.pillar_key) && isNumber(value.score));
  const times = (defs.length ? observed.map(({ value }) => measurementTime(value)) : manual.map(value => value.updated_at))
    .filter((value): value is string => !!value && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return {
    measured: defs.length ? observed.length : manual.length,
    total: defs.length || pillars.length,
    scored: defs.length ? observed.filter(({ def }) => isNumber(def.target)).length : manual.length,
    unit: defs.length ? 'KPIs' : 'pillars',
    asOf: times[0] ?? null,
    latestUpdate: times[times.length - 1] ?? null,
    missingTimestamps: (defs.length ? observed.length : manual.length) - times.length,
    weekStart,
    snapshots: observed.filter(({ value }) => value.measurement_kind === 'snapshot').length,
    flows: observed.filter(({ value }) => value.measurement_kind === 'flow').length,
    unavailable,
  };
}
