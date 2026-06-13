// Events adapter — Ticketmaster Discovery API. Lat/lng radius search for
// upcoming concerts, conventions, festivals, and major events.

// deno-lint-ignore-file no-explicit-any
import type { ContextSourceAdapter, AdapterPullResult, VenueRow, NormalizedContextItem } from './types.ts';
import { isoToday, addDaysISO } from './types.ts';

const RADIUS_MILES = 10;
const LOOKAHEAD_DAYS = 30;
const PAGE_SIZE = 50;

export const eventsAdapter: ContextSourceAdapter = {
  id: 'events',
  async pull(_supabase, venue: VenueRow): Promise<AdapterPullResult> {
    const errors: string[] = [];
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      errors.push('events: TICKETMASTER_API_KEY missing');
      return { items: [], errors };
    }
    if (venue.lat == null || venue.lng == null) {
      errors.push('events: venue lat/lng missing');
      return { items: [], errors };
    }

    try {
      const startISO = `${isoToday()}T00:00:00Z`;
      const endISO = `${addDaysISO(isoToday(), LOOKAHEAD_DAYS)}T23:59:59Z`;
      const params = new URLSearchParams({
        apikey: apiKey,
        latlong: `${venue.lat},${venue.lng}`,
        radius: String(RADIUS_MILES),
        unit: 'miles',
        startDateTime: startISO,
        endDateTime: endISO,
        size: String(PAGE_SIZE),
        sort: 'date,asc',
      });
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Ticketmaster ${res.status}`);
      const json = await res.json();
      const events: any[] = json?._embedded?.events ?? [];

      const items: NormalizedContextItem[] = events.map((e) => {
        const date = e.dates?.start?.localDate ?? isoToday();
        const venueObj = e._embedded?.venues?.[0] ?? {};
        const distance = venueObj.distance ?? null;
        const classification = e.classifications?.[0]?.segment?.name ?? 'Event';
        const subType = e.classifications?.[0]?.genre?.name ?? null;

        return {
          source_type: 'events' as const,
          source_ref: `tm:${e.id}`,
          event_date: date,
          valid_until: date,
          payload: {
            title: e.name ?? '',
            summary: `${classification}${subType ? ` — ${subType}` : ''} at ${venueObj.name ?? 'nearby venue'}`,
            classification,
            sub_type: subType,
            venue_name: venueObj.name ?? null,
            venue_city: venueObj.city?.name ?? null,
            distance_miles: distance,
            url: e.url ?? null,
            start_time: e.dates?.start?.localTime ?? null,
            tags: ['event', classification.toLowerCase().replace(/\s+/g, '_')],
          },
        };
      });

      return { items, errors };
    } catch (e) {
      errors.push(`events: ${e instanceof Error ? e.message : String(e)}`);
      return { items: [], errors };
    }
  },
};
