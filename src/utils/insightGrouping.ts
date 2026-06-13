import { ActionCardWithWeek } from '@/hooks/useActionItems';

export interface InsightGroup {
  id: string;
  parentCard: ActionCardWithWeek;
  children: ActionCardWithWeek[];
  severity: string;
  pillar: string;
  count: number;
}

const PRIORITY_RANK: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/**
 * Groups related insights that share the same pillar AND same week
 * into parent/child groups. Single items remain ungrouped.
 */
export function groupRelatedInsights(cards: ActionCardWithWeek[]): (ActionCardWithWeek | InsightGroup)[] {
  const groups = new Map<string, ActionCardWithWeek[]>();

  for (const card of cards) {
    const key = `${card.pillar || 'unknown'}_${card.weekStart || 'noweek'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(card);
  }

  const result: (ActionCardWithWeek | InsightGroup)[] = [];

  for (const [, groupCards] of groups) {
    if (groupCards.length < 2) {
      result.push(groupCards[0]);
    } else {
      // Sort by priority within group
      groupCards.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99));
      const parent = groupCards[0];
      const highestSeverity = groupCards.reduce((best, c) =>
        (PRIORITY_RANK[c.priority] ?? 99) < (PRIORITY_RANK[best] ?? 99) ? c.priority : best,
        groupCards[0].priority
      );

      result.push({
        id: `group_${parent.id}`,
        parentCard: parent,
        children: groupCards,
        severity: highestSeverity,
        pillar: parent.pillar || 'Unknown',
        count: groupCards.length,
      });
    }
  }

  // Sort groups by highest severity first
  result.sort((a, b) => {
    const aP = 'severity' in a ? a.severity : (a as ActionCardWithWeek).priority;
    const bP = 'severity' in b ? b.severity : (b as ActionCardWithWeek).priority;
    return (PRIORITY_RANK[aP] ?? 99) - (PRIORITY_RANK[bP] ?? 99);
  });

  return result;
}

export function isInsightGroup(item: ActionCardWithWeek | InsightGroup): item is InsightGroup {
  return 'children' in item && 'count' in item;
}
