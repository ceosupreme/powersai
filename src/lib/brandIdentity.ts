const COLORS = ['#0b6562', '#2454a6', '#743d91', '#945000', '#9b3b4d', '#32623c'];
export function brandIdentity(id: string, name: string) {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  const initials = words.map(w => Array.from(w)[0]).join('').toLocaleUpperCase().slice(0, 4) || '?';
  const hash = Array.from(id).reduce((n, c) => ((n * 31 + c.codePointAt(0)!) >>> 0), 0);
  return { initials, color: COLORS[hash % COLORS.length] };
}
