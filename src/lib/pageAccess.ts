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

/** Per-person overrides: enabled=false hides a page, enabled=true shows it even if the role default is off. */
export function applyUserOverrides<T extends string>(
  rolePages: readonly T[],
  overrides: { page_key: string; enabled: boolean }[] | null | undefined,
  knownPages: readonly T[],
): T[] {
  const known = new Set<string>(knownPages);
  const result = new Set<string>(rolePages);
  for (const row of overrides ?? []) {
    if (!known.has(row.page_key)) continue;
    if (row.enabled === true) result.add(row.page_key);
    else if (row.enabled === false) result.delete(row.page_key);
  }
  return knownPages.filter((key) => result.has(key));
}

/** Rows to keep for one person: only switches that differ from the role default. */
export function overridePlan(
  desired: Record<string, boolean>,
  roleDefaults: ReadonlySet<string>,
): { upsert: { page_key: string; enabled: boolean }[]; remove: string[] } {
  const upsert: { page_key: string; enabled: boolean }[] = [];
  const remove: string[] = [];
  for (const [page_key, enabled] of Object.entries(desired)) {
    if (enabled === roleDefaults.has(page_key)) remove.push(page_key);
    else upsert.push({ page_key, enabled });
  }
  return { upsert, remove };
}

export interface MenuSwitchRow { pageKey: string; labels: string[]; adminOnly: boolean; alwaysOn: boolean }
export interface MenuSwitchGroup { label: string; rows: MenuSwitchRow[] }

/** Side-menu items grouped as they appear, items sharing a page key merged onto one row. */
export function menuSwitchGroups(
  groups: readonly { label: string; items: readonly { label: string; pageKey: string; adminOnly?: boolean }[] }[],
): MenuSwitchGroup[] {
  const seen = new Map<string, MenuSwitchRow>();
  const out: MenuSwitchGroup[] = [];
  for (const group of groups) {
    const rows: MenuSwitchRow[] = [];
    for (const item of group.items) {
      if (item.adminOnly) { rows.push({ pageKey: item.pageKey, labels: [item.label], adminOnly: true, alwaysOn: false }); continue; }
      const existing = seen.get(item.pageKey);
      if (existing) { existing.labels.push(item.label); continue; }
      const row: MenuSwitchRow = { pageKey: item.pageKey, labels: [item.label], adminOnly: false, alwaysOn: item.pageKey === 'dashboard' };
      seen.set(item.pageKey, row);
      rows.push(row);
    }
    if (rows.length) out.push({ label: group.label, rows });
  }
  return out;
}
