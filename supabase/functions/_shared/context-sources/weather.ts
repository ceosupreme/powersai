// Weather adapter — National Weather Service (api.weather.gov).
// Two-phase: resolve venue lat/lng → grid (cached), then pull /forecast.
// US-only. No API key required, but a User-Agent header is mandatory.

// deno-lint-ignore-file no-explicit-any
import type { ContextSourceAdapter, AdapterPullResult, VenueRow, NormalizedContextItem } from './types.ts';

const UA = 'BarPulse Growth Audit (contact@barpulsehq.com)';
const NWS_BASE = 'https://api.weather.gov';

async function nwsFetch(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json' } });
  if (!res.ok) throw new Error(`NWS ${res.status} ${url}`);
  return await res.json();
}

async function resolveGrid(supabase: any, venue: VenueRow) {
  if (venue.lat == null || venue.lng == null) throw new Error('venue lat/lng missing');

  const { data: cached } = await supabase
    .from('venue_weather_grid_cache')
    .select('forecast_url, lat, lng, resolved_at')
    .eq('venue_id', venue.id)
    .maybeSingle();
  // Cache hit if lat/lng unchanged and resolved within 90 days
  if (cached
      && Number(cached.lat) === Number(venue.lat)
      && Number(cached.lng) === Number(venue.lng)
      && Date.now() - new Date(cached.resolved_at).getTime() < 90 * 86400_000) {
    return cached.forecast_url as string;
  }

  const points = await nwsFetch(`${NWS_BASE}/points/${venue.lat},${venue.lng}`);
  const props = points?.properties;
  if (!props?.forecast) throw new Error('NWS points missing forecast url');

  await supabase.from('venue_weather_grid_cache').upsert({
    venue_id: venue.id,
    lat: venue.lat,
    lng: venue.lng,
    office: props.gridId,
    grid_x: props.gridX,
    grid_y: props.gridY,
    forecast_url: props.forecast,
    resolved_at: new Date().toISOString(),
  });
  return props.forecast as string;
}

function tagsForPeriod(period: any): string[] {
  const tags: string[] = [];
  const t = period.temperature ?? 0;
  if (t >= 90) tags.push('hot');
  if (t >= 95) tags.push('heat_advisory_zone');
  if (t <= 35) tags.push('cold');
  const sf = (period.shortForecast ?? '').toLowerCase();
  if (sf.includes('rain') || sf.includes('shower') || sf.includes('thunder')) tags.push('rain');
  if (sf.includes('snow')) tags.push('snow');
  if (sf.includes('sunny') || sf.includes('clear')) tags.push('clear');
  if (period.probabilityOfPrecipitation?.value != null && period.probabilityOfPrecipitation.value >= 60) tags.push('high_precip_risk');
  return tags;
}

export const weatherAdapter: ContextSourceAdapter = {
  id: 'weather',
  async pull(supabase, venue): Promise<AdapterPullResult> {
    const errors: string[] = [];
    if (venue.lat == null || venue.lng == null) {
      errors.push('weather: venue lat/lng missing');
      return { items: [], errors };
    }
    try {
      const forecastUrl = await resolveGrid(supabase, venue);
      const forecast = await nwsFetch(forecastUrl);
      const periods: any[] = forecast?.properties?.periods ?? [];

      // Roll daytime periods into one item per day; capture the daytime + adjacent night.
      const byDate: Record<string, { high?: number; low?: number; day?: any; night?: any; tags: Set<string> }> = {};
      for (const p of periods) {
        const date = (p.startTime as string).slice(0, 10);
        const slot = (byDate[date] ||= { tags: new Set() });
        if (p.isDaytime) {
          slot.day = p;
          slot.high = p.temperature;
        } else {
          slot.night = p;
          slot.low = p.temperature;
        }
        for (const t of tagsForPeriod(p)) slot.tags.add(t);
      }

      const items: NormalizedContextItem[] = Object.entries(byDate).map(([date, v]) => ({
        source_type: 'weather',
        source_ref: `nws:${venue.id}:${date}`,
        event_date: date,
        valid_until: date,
        payload: {
          title: v.day?.shortForecast ?? v.night?.shortForecast ?? 'Forecast',
          summary: v.day?.detailedForecast ?? v.night?.detailedForecast ?? '',
          high_f: v.high ?? null,
          low_f: v.low ?? null,
          tags: Array.from(v.tags),
          short_day: v.day?.shortForecast ?? null,
          short_night: v.night?.shortForecast ?? null,
          precip_prob_day: v.day?.probabilityOfPrecipitation?.value ?? null,
          wind: v.day?.windSpeed ?? null,
        },
      }));

      // Roll-up: detect heat-wave windows (≥5 consecutive days >=90F)
      const sorted = items.slice().sort((a,b) => a.event_date.localeCompare(b.event_date));
      let runStart: string | null = null;
      let runLen = 0;
      const heatWaves: NormalizedContextItem[] = [];
      const flushRun = (endDate: string | null) => {
        if (runStart && runLen >= 5 && endDate) {
          heatWaves.push({
            source_type: 'weather',
            source_ref: `nws:${venue.id}:heat_wave:${runStart}`,
            event_date: runStart,
            valid_until: endDate,
            payload: {
              title: `Heat wave: ${runLen} consecutive days ≥90°F`,
              summary: `Forecast indicates ${runLen} days of high temperatures at or above 90°F starting ${runStart}.`,
              tags: ['heat_wave', 'patio_opportunity', 'frozen_drink_opportunity'],
              start: runStart,
              end: endDate,
              consecutive_days: runLen,
            },
          });
        }
        runStart = null; runLen = 0;
      };
      for (const it of sorted) {
        const high = (it.payload.high_f ?? 0) as number;
        if (high >= 90) {
          if (!runStart) runStart = it.event_date;
          runLen += 1;
        } else {
          flushRun(sorted[sorted.indexOf(it) - 1]?.event_date ?? null);
        }
      }
      flushRun(sorted[sorted.length - 1]?.event_date ?? null);

      return { items: [...items, ...heatWaves], errors };
    } catch (e) {
      errors.push(`weather: ${e instanceof Error ? e.message : String(e)}`);
      return { items: [], errors };
    }
  },
};
