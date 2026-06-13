// Fetches the Toast restaurant configuration (closeoutHour, timezone) once
// per restaurant and caches the result for the lifetime of the edge function
// invocation. Default closeoutHour is 4 (4am local) per Toast convention.

const cache = new Map<string, { closeoutHour: number; timezone: string | null; fetchedAt: number }>();
const TTL_MS = 60 * 60 * 1000; // 1h within a single warm function instance

export interface ToastRestaurantConfig {
  closeoutHour: number;        // 0..23
  timezone: string | null;     // IANA tz string from Toast, may be null
}

export async function getRestaurantConfig(
  token: string,
  restaurantGuid: string,
): Promise<ToastRestaurantConfig> {
  const cached = cache.get(restaurantGuid);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { closeoutHour: cached.closeoutHour, timezone: cached.timezone };
  }

  try {
    const res = await fetch(
      `https://ws-api.toasttab.com/restaurants/v1/restaurants/${restaurantGuid}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Toast-Restaurant-External-ID": restaurantGuid,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) {
      console.warn(`[toast-restaurant-config] ${res.status} for ${restaurantGuid}, using defaults`);
      const fallback: ToastRestaurantConfig = { closeoutHour: 4, timezone: null };
      cache.set(restaurantGuid, { ...fallback, fetchedAt: Date.now() });
      return fallback;
    }
    const body = await res.json();
    // Toast nests this under general.closeoutHour.
    const closeoutHour: number =
      body?.general?.closeoutHour ?? body?.closeoutHour ?? 4;
    const timezone: string | null =
      body?.general?.timeZone ?? body?.general?.timezone ?? body?.timeZone ?? null;
    const cfg: ToastRestaurantConfig = {
      closeoutHour: typeof closeoutHour === "number" ? closeoutHour : 4,
      timezone,
    };
    cache.set(restaurantGuid, { ...cfg, fetchedAt: Date.now() });
    return cfg;
  } catch (err) {
    console.warn(`[toast-restaurant-config] fetch failed for ${restaurantGuid}:`, err);
    const fallback: ToastRestaurantConfig = { closeoutHour: 4, timezone: null };
    cache.set(restaurantGuid, { ...fallback, fetchedAt: Date.now() });
    return fallback;
  }
}

/**
 * Returns the previous business date in the given timezone, formatted both as
 * an ISO date (YYYY-MM-DD) and Toast's compact form (YYYYMMDD).
 *
 * The "previous" business date is computed against an effective "now" that is
 * shifted backward by closeoutHour, so that e.g. on April 26 at 2am with a 4am
 * closeout, "yesterday" still refers to April 24 (because April 25's business
 * day technically runs until 4am on April 26).
 */
export function previousBusinessDate(
  closeoutHour: number,
  timezone: string,
  now: Date = new Date(),
): { iso: string; compact: string } {
  // Get current date parts in the target timezone.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10);
  const day = parseInt(get("day"), 10);
  const hour = parseInt(get("hour"), 10);

  // Construct the local date.
  const localToday = new Date(Date.UTC(year, month - 1, day));
  // If we're between midnight and closeoutHour, "today's" business date in
  // Toast's view is still yesterday.
  const isStillYesterdayBusinessDate = hour < closeoutHour;
  const subtractDays = isStillYesterdayBusinessDate ? 2 : 1;
  const target = new Date(localToday);
  target.setUTCDate(target.getUTCDate() - subtractDays);

  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  return { iso: `${y}-${m}-${d}`, compact: `${y}${m}${d}` };
}

/**
 * Returns true if "now" has crossed closeoutHour + buffer past the given
 * business date in the venue timezone — i.e. it's safe to pull final numbers.
 */
export function isPastCloseout(
  businessDateIso: string,
  closeoutHour: number,
  timezone: string,
  bufferMinutes = 30,
  now: Date = new Date(),
): boolean {
  // The cutoff is closeoutHour on the day AFTER businessDate (e.g. 4am on the
  // following day). We render that cutoff in the venue tz and compare to now.
  const [y, m, d] = businessDateIso.split("-").map((n) => parseInt(n, 10));
  const cutoffUtcGuess = new Date(Date.UTC(y, m - 1, d + 1, closeoutHour, bufferMinutes));

  // Convert "now" to the same wall-clock representation in the venue tz to
  // compare reliably across DST. Easiest: produce ISO strings in the tz.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const nowParts = fmt.formatToParts(now);
  const get = (t: string) => nowParts.find((p) => p.type === t)?.value ?? "";
  const nowLocal = new Date(Date.UTC(
    parseInt(get("year"), 10),
    parseInt(get("month"), 10) - 1,
    parseInt(get("day"), 10),
    parseInt(get("hour"), 10),
    parseInt(get("minute"), 10),
  ));
  return nowLocal.getTime() >= cutoffUtcGuess.getTime();
}
