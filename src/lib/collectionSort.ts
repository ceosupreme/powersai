/** Shared ordering: unknown values stay last in either direction; names break ties. */
export function compareOptional(a: number | null | undefined, b: number | null | undefined, direction = 1) {
  const av = a != null && Number.isFinite(a), bv = b != null && Number.isFinite(b);
  if (!av || !bv) return av === bv ? 0 : av ? -1 : 1;
  return (a! - b!) * direction;
}
export function dateValue(value: string | null | undefined) {
  if (!value) return null;
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : null;
}
export function compareName(a: string, b: string) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); }

export function sortCollection<T extends { id: string; title: string; created_at?: string | null; due_date?: string | null; value?: number | null; quality_score?: number | null }>(rows: readonly T[], key: string): T[] {
  return [...rows].sort((a, b) => {
    const tie = () => compareName(a.title, b.title) || a.id.localeCompare(b.id);
    if (key === 'name') return tie();
    if (key === 'due') return compareOptional(dateValue(a.due_date), dateValue(b.due_date)) || tie();
    if (key === 'value') return compareOptional(a.value, b.value, -1) || tie();
    if (key === 'quality') return compareOptional(a.quality_score, b.quality_score, -1) || tie();
    return compareOptional(dateValue(a.created_at), dateValue(b.created_at), key === 'oldest' ? 1 : -1) || tie();
  });
}
