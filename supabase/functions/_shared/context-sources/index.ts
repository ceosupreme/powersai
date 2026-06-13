// Context source registry. Adding a source = drop a file + push it here.

import type { ContextSourceAdapter } from './types.ts';
import { calendarAdapter } from './calendar.ts';
import { weatherAdapter } from './weather.ts';
import { newsAdapter } from './news.ts';
import { sportsAdapter } from './sports.ts';
import { eventsAdapter } from './events.ts';

export const ALL_CONTEXT_SOURCES: ContextSourceAdapter[] = [
  calendarAdapter,
  weatherAdapter,
  newsAdapter,
  sportsAdapter,
  eventsAdapter,
];

export type { ContextSourceAdapter, NormalizedContextItem, VenueRow, ContextSourceType } from './types.ts';
