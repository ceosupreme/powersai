// Calendar adapter — expands context_calendar_entries (global + venue-custom)
// for the next 21 days. No external API calls.

// deno-lint-ignore-file no-explicit-any
import type { ContextSourceAdapter, AdapterPullResult, VenueRow } from './types.ts';
import { isoToday, addDaysISO } from './types.ts';

type CalRow = {
  slug: string;
  name: string;
  category: string;
  recurrence_rule: string | null;
  fixed_date: string | null;
  relevance_categories: string[];
  historical_relevance_score: number;
  notes: string | null;
};

const HORIZON_DAYS = 21;

// Very small RRULE expander supporting the subset used in seed data:
//   - 'MM-DD' simple form (fixed annual)
//   - RRULE:FREQ=YEARLY;BYMONTH=N;BYMONTHDAY=N
//   - RRULE:FREQ=YEARLY;BYMONTH=N;BYDAY=NDD where DD = MO|TU|WE|TH|FR|SA|SU
//     and N = 1..5 or -1 (last)
function expandToDate(rule: string | null, fixedDate: string | null, year: number): string | null {
  if (fixedDate) return fixedDate;
  if (!rule) return null;
  const trimmed = rule.trim();

  // Simple MM-DD
  if (/^\d{2}-\d{2}$/.test(trimmed)) {
    return `${year}-${trimmed}`;
  }

  // RRULE
  if (trimmed.startsWith('RRULE:')) {
    const parts = Object.fromEntries(
      trimmed.replace(/^RRULE:/, '').split(';').map((kv) => kv.split('=')),
    );
    const month = parseInt(parts.BYMONTH, 10);
    if (!month) return null;

    if (parts.BYMONTHDAY) {
      const day = parseInt(parts.BYMONTHDAY, 10);
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    if (parts.BYDAY) {
      const m = parts.BYDAY.match(/^(-?\d)(MO|TU|WE|TH|FR|SA|SU)$/);
      if (!m) return null;
      const ord = parseInt(m[1], 10);
      const dowMap: Record<string, number> = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };
      const targetDow = dowMap[m[2]];

      if (ord > 0) {
        // Nth occurrence in month
        const first = new Date(Date.UTC(year, month - 1, 1));
        const firstDow = first.getUTCDay();
        const offset = (targetDow - firstDow + 7) % 7;
        const day = 1 + offset + (ord - 1) * 7;
        const dt = new Date(Date.UTC(year, month - 1, day));
        if (dt.getUTCMonth() !== month - 1) return null; // overflowed
        return dt.toISOString().slice(0, 10);
      } else {
        // Last occurrence in month
        const last = new Date(Date.UTC(year, month, 0));
        const lastDow = last.getUTCDay();
        const offset = (lastDow - targetDow + 7) % 7;
        const day = last.getUTCDate() - offset;
        return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
      }
    }
  }

  return null;
}

export const calendarAdapter: ContextSourceAdapter = {
  id: 'calendar',
  async pull(supabase, venue: VenueRow): Promise<AdapterPullResult> {
    const errors: string[] = [];
    try {
      const { data, error } = await supabase
        .from('context_calendar_entries')
        .select('slug,name,category,recurrence_rule,fixed_date,relevance_categories,historical_relevance_score,notes')
        .eq('is_active', true)
        .or(`venue_id.is.null,venue_id.eq.${venue.id}`);
      if (error) throw error;

      const today = isoToday();
      const horizon = addDaysISO(today, HORIZON_DAYS);
      const items: AdapterPullResult['items'] = [];

      const yearNow = parseInt(today.slice(0, 4), 10);
      const yearNext = yearNow + 1;

      for (const row of (data ?? []) as CalRow[]) {
        for (const yr of [yearNow, yearNext]) {
          const date = expandToDate(row.recurrence_rule, row.fixed_date, yr);
          if (!date) continue;
          if (date < today || date > horizon) continue;
          items.push({
            source_type: 'calendar',
            source_ref: `${row.slug}:${date}`,
            event_date: date,
            valid_until: date,
            payload: {
              title: row.name,
              summary: row.notes ?? '',
              tags: [row.category, ...row.relevance_categories],
              category: row.category,
              relevance_categories: row.relevance_categories,
              historical_relevance_score: row.historical_relevance_score,
              slug: row.slug,
            },
          });
        }
      }

      return { items, errors };
    } catch (e) {
      errors.push(`calendar: ${e instanceof Error ? e.message : String(e)}`);
      return { items: [], errors };
    }
  },
};
