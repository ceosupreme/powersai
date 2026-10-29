/** A failed or empty permissions lookup never grants a non-admin page access. */
export function resolvePageAccess<T extends string>(
  role: string | null,
  defaults: { page_key: string; enabled: boolean }[] | null | undefined,
  knownPages: readonly T[],
  lookupFailed = false,
): T[] {
  if (!role || lookupFailed) return [];
  if (role === 'admin') return [...knownPages];
  const known = new Set<string>(knownPages);
  return [...new Set((defaults ?? [])
    .filter((row) => row.enabled === true && known.has(row.page_key))
    .map((row) => row.page_key as T))];
}
