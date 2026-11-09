import { supabase } from '@/integrations/supabase/client';

/** The most rows the database API returns for one request. */
export const PAGE_SIZE = 1000;
/** How many ids go into one request, so the request address stays short. */
const CHUNK_SIZE = 150;

/**
 * Every row a query matches, even past the per-request row limit of the database API.
 * `makeQuery` must return a fresh, filtered query each time, selected with { count: 'exact' }.
 * The first request goes out as-is, so a small answer costs one round trip and comes back in
 * the same order a plain request would. The exact count says whether rows were held back,
 * whatever the server's limit is; only then do we start again in a fixed order and page by
 * the number of rows each request actually returned, so no page overlaps or skips.
 */
export async function fetchAllPages<T = any>(makeQuery: () => any, orderKeys: string[] = ['id']): Promise<T[]> {
  const first = await makeQuery().range(0, PAGE_SIZE - 1);
  if (first.error) throw first.error;
  const rows = (first.data ?? []) as T[];
  const total: number | null = typeof first.count === 'number' ? first.count : null;
  if (total != null ? rows.length >= total : rows.length < PAGE_SIZE) return rows;
  const all: T[] = [];
  for (let from = 0; ; ) {
    let q = makeQuery();
    for (const key of orderKeys) q = q.order(key, { ascending: true });
    const page = await q.range(from, from + PAGE_SIZE - 1);
    if (page.error) throw page.error;
    const data = (page.data ?? []) as T[];
    all.push(...data);
    from += data.length;
    const expected: number | null = typeof page.count === 'number' ? page.count : total;
    if (data.length === 0 || (expected != null ? from >= expected : data.length < PAGE_SIZE)) return all;
  }
}

/**
 * Rows of `table` whose `column` is one of `values`: one request for many projects
 * instead of one request per project. `filter` adds the rest of the conditions.
 */
export async function fetchRowsIn<T = any>(
  table: string,
  columns: string,
  column: string,
  values: readonly (string | null | undefined)[],
  filter: (q: any) => any = (q) => q,
  orderKeys: string[] = ['id'],
): Promise<T[]> {
  const unique = [...new Set(values.filter((v): v is string => !!v))];
  if (!unique.length) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) chunks.push(unique.slice(i, i + CHUNK_SIZE));
  const parts = await Promise.all(
    chunks.map((chunk) =>
      fetchAllPages<T>(() => filter((supabase as any).from(table).select(columns, { count: 'exact' }).in(column, chunk)), orderKeys),
    ),
  );
  return parts.flat();
}

/** Rows grouped by one of their fields, each group kept in the order the rows arrived. */
export function groupBy<T extends Record<string, any>>(rows: readonly T[], key: string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const k = row[key] as string;
    const list = out.get(k);
    if (list) list.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/** A copy of the row without one field, used to drop the grouping column again. */
export function omit<T extends Record<string, any>>(row: T, key: string): T {
  const { [key]: _dropped, ...rest } = row;
  return rest as T;
}
