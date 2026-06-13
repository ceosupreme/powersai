export const formatTenure = (days: number | null): string => {
  if (days === null) return '—';
  if (days < 60) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months}mo`;
  return `${(days / 365).toFixed(1)}y`;
};
