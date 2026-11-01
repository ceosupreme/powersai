/** Portfolio brand sorting and type chips. Pure so the rules are testable. */
export type PortfolioSortKey = 'waiting' | 'score' | 'money' | 'potential' | 'live' | 'followers' | 'gaps' | 'name';

export const SORT_OPTIONS: { value: PortfolioSortKey; label: string }[] = [
  { value: 'waiting', label: 'Waiting on you' },
  { value: 'score', label: 'Score' },
  { value: 'money', label: 'Money this month' },
  { value: 'potential', label: 'Potential' },
  { value: 'live', label: 'Live channels' },
  { value: 'followers', label: 'Followers' },
  { value: 'gaps', label: 'Setup gaps' },
  { value: 'name', label: 'Name (A to Z)' },
];
export const SORT_STORAGE_KEY = 'portfolio.brandSort';

export const TYPE_CHIPS: { key: string; label: string; type: string | null }[] = [
  { key: 'all', label: 'All', type: null },
  { key: 'brands', label: 'Brands', type: 'internal_brand' },
  { key: 'channels', label: 'Channels', type: 'content_channel' },
  { key: 'apps', label: 'Apps', type: 'app_build' },
  { key: 'services', label: 'Services', type: 'service_offer' },
];

export interface ChannelStat { total: number; live: number; followers: number }
export interface SetupStat { inPlace: number; needed: number; gaps: number; gate?: string | null }
interface SortCard { id: string; name: string; overall: number | null; monthRevenue: number | null; potential: number | null }

/** Highest first, empty values last. */
const desc = (a: number | null | undefined, b: number | null | undefined) => {
  const an = a == null, bn = b == null;
  if (an || bn) return an === bn ? 0 : an ? 1 : -1;
  return b - a;
};

export function portfolioSorter(
  key: PortfolioSortKey,
  work?: Map<string, { waitingCount: number }> | null,
  channels?: Map<string, ChannelStat> | null,
  setup?: Map<string, SetupStat> | null,
) {
  const byName = (a: SortCard, b: SortCard) => a.name.localeCompare(b.name);
  return (a: SortCard, b: SortCard): number => {
    switch (key) {
      case 'score': return desc(a.overall, b.overall) || byName(a, b);
      case 'money': return desc(a.monthRevenue, b.monthRevenue) || byName(a, b);
      case 'potential': return desc(a.potential, b.potential) || byName(a, b);
      case 'live': return desc(channels?.get(a.id)?.live ?? 0, channels?.get(b.id)?.live ?? 0) || byName(a, b);
      case 'followers': return desc(channels?.get(a.id)?.followers ?? 0, channels?.get(b.id)?.followers ?? 0) || byName(a, b);
      case 'gaps': return desc(setup?.get(a.id)?.gaps ?? null, setup?.get(b.id)?.gaps ?? null) || byName(a, b);
      case 'name': return byName(a, b);
      default:
        return (work?.get(b.id)?.waitingCount ?? -1) - (work?.get(a.id)?.waitingCount ?? -1) || (b.overall ?? -1) - (a.overall ?? -1);
    }
  };
}
