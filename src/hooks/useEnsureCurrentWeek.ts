import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Monday-start / Sunday-end range for the current calendar week (local time). */
export function currentWeekRange(base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const dow = d.getDay(); // 0 = Sunday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

  // ISO week number of the Monday
  const tmp = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return {
    week_start: iso(monday),
    week_end: iso(sunday),
    week_id: `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
  };
}

/**
 * For non-client projects: make sure a `weeks` row exists for the current
 * calendar week so the header week selector has something to select.
 * No-op for client projects (enabled = false) — the canonical path is untouched.
 */
export function useEnsureCurrentWeek(projectId: string | null | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !projectId) return;
    const { week_start, week_end, week_id } = currentWeekRange();
    const marker = `${projectId}:${week_start}`;
    if (attempted.current === marker) return;
    attempted.current = marker;

    (async () => {
      const { data: existing } = await supabase
        .from('weeks')
        .select('id')
        .eq('bar_id', projectId)
        .eq('week_start', week_start)
        .maybeSingle();
      if (existing) return;

      const { error } = await supabase.from('weeks').insert({
        bar_id: projectId,
        week_id,
        week_start,
        week_end,
        status: 'in_progress',
        is_locked: false,
      });
      if (error) {
        // Unique-violation races are fine; anything else is logged only.
        if (error.code !== '23505') console.warn('[useEnsureCurrentWeek]', error.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ['all-weeks'] });
      qc.invalidateQueries({ queryKey: ['weeks', projectId] });
      qc.invalidateQueries({ queryKey: ['supabase', 'weeks', projectId] });
    })();
  }, [projectId, enabled, qc]);
}
