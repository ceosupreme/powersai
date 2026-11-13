import { priorityLabel, type NextTenRow } from '@/hooks/useNextTen';
import type { TaskExplanation } from './TaskExplainer';

/** The explanation shown when a Next 10 row is expanded. */
export function nextTenTask(row: NextTenRow): TaskExplanation {
  const e = row.explain ?? {};
  const isAction = row.source === 'Action';
  return {
    title: row.step,
    detail: e.detail ?? null,
    why: e.why ?? null,
    ownerKind: e.ownerKind ?? null,
    minutes: e.minutes ?? null,
    brand: row.projectName || null,
    priority: isAction && row.priorityRank && row.priorityRank <= 4 ? priorityLabel(row.priorityRank) : null,
    dueDate: isAction ? row.dueDate ?? null : null,
    pillar: e.pillar ?? null,
    status: e.status ?? (isAction ? null : row.source),
    projectId: row.projectId,
    hideYourPart: !isAction,
  };
}
