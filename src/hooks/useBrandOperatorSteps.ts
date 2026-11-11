import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { isSnoozed, type NextTenRow } from '@/hooks/useNextTen';

interface OperatorAction {
  id: string;
  title: string;
  detail: string | null;
  priority: string | null;
  status: string | null;
  approval_status: string | null;
  owner_kind: string | null;
  assignee_id: string | null;
  assignee: string | null;
  job_id: string | null;
  due_date: string | null;
  snoozed_until: string | null;
  depends_on: string | null;
  created_at: string | null;
}

const priorityRank = (value: string | null): number => {
  const m = value?.match(/P([1-4])/i);
  if (m) return Number(m[1]);
  if (/critical/i.test(value ?? '')) return 1;
  if (/high/i.test(value ?? '')) return 2;
  if (/medium/i.test(value ?? '')) return 3;
  if (/low/i.test(value ?? '')) return 4;
  return 5;
};

/** The brand operator sees only steps addressed to them or genuinely unassigned
 * steps. A step addressed to the founder is not shown to a new teammate.
 * Database RLS is still the authority for row access.
 */
export function useBrandOperatorSteps(projectId: string | null, projectName: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ['next-ten', 'brand-operator', projectId, userId],
    enabled: !!projectId && !!userId,
    queryFn: async (): Promise<{ rows: NextTenRow[]; blocked: number }> => {
      const { data, error } = await (supabase as any).from('action_items')
        .select('id,title,detail,priority,status,approval_status,owner_kind,assignee_id,assignee,job_id,due_date,snoozed_until,depends_on,created_at')
        .or(`bar_id.eq.${projectId},venue_id.eq.${projectId}`)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      const all = (data ?? []) as OperatorAction[];
      const statuses = new Map<string, string | null>(all.map((item) => [item.id, item.status]));
      const missing = [...new Set(all.map((item) => item.depends_on).filter(
        (id): id is string => !!id && !statuses.has(id),
      ))];
      if (missing.length) {
        const extra = await (supabase as any).from('action_items').select('id,status').in('id', missing);
        if (extra.error) throw extra.error;
        for (const row of extra.data ?? []) statuses.set(row.id, row.status);
      }
      const assigned = all.filter((item) =>
        item.owner_kind === 'owner' &&
        (item.assignee_id === userId || (!item.assignee_id && !item.assignee?.trim())) &&
        item.status !== 'Done' && item.status !== 'Cancelled' &&
        item.approval_status !== 'Rejected' && !isSnoozed(item.snoozed_until),
      );
      const ready = assigned.filter((item) =>
        item.approval_status !== 'Blocked' &&
        (!item.depends_on || statuses.get(item.depends_on) === 'Done'),
      );
      ready.sort((a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        (a.due_date ?? '9999-12-31').localeCompare(b.due_date ?? '9999-12-31') ||
        (a.created_at ?? '').localeCompare(b.created_at ?? ''),
      );
      return {
        rows: ready.map((item) => ({
          key: `action-${item.id}`, source: 'Action' as const,
          step: item.title, projectId: projectId!, projectName,
          refId: item.id, jobId: item.job_id,
          note: item.detail?.slice(0, 160) || 'Open for instructions',
          priorityRank: priorityRank(item.priority),
          rank: 100 - priorityRank(item.priority) * 10,
          dueDate: item.due_date, createdAt: item.created_at,
        })),
        blocked: assigned.length - ready.length,
      };
    },
  });
}
