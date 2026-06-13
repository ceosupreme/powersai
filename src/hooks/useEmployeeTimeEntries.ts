import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimeEntryRow {
  id: string;
  business_date: string;
  in_date: string | null;
  out_date: string | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  auto_clocked_out: boolean;
  toast_job_title: string | null;
  venue_id: string;
  breaks: BreakRow[];
}

export interface BreakRow {
  id: string;
  paid: boolean;
  missed: boolean;
  waived: boolean;
  in_date: string | null;
  out_date: string | null;
}

export const useEmployeeTimeEntries = (
  employeeId: string | undefined,
  venueId: string | null | undefined,
  windowDays: number = 90,
) => {
  return useQuery({
    queryKey: ['employee-time-entries', employeeId, venueId, windowDays],
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<TimeEntryRow[]> => {
      if (!employeeId) return [];
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - windowDays);
      const sinceISO = since.toISOString().slice(0, 10);

      let q = supabase
        .from('time_entries')
        .select('id, business_date, in_date, out_date, regular_hours, overtime_hours, auto_clocked_out, toast_job_title, venue_id')
        .eq('employee_id', employeeId)
        .gte('business_date', sinceISO)
        .neq('deleted', true)
        .order('business_date', { ascending: false });
      if (venueId) q = q.eq('venue_id', venueId);

      const { data: entries, error } = await q;
      if (error) throw error;
      const list = entries || [];
      if (list.length === 0) return [];

      const ids = list.map(e => e.id);
      const { data: breaks, error: bErr } = await supabase
        .from('time_entry_breaks')
        .select('id, time_entry_id, paid, missed, waived, in_date, out_date')
        .in('time_entry_id', ids);
      if (bErr) throw bErr;

      const breakMap = new Map<string, BreakRow[]>();
      for (const b of breaks || []) {
        const arr = breakMap.get(b.time_entry_id) || [];
        arr.push({
          id: b.id,
          paid: !!b.paid,
          missed: !!b.missed,
          waived: !!b.waived,
          in_date: b.in_date,
          out_date: b.out_date,
        });
        breakMap.set(b.time_entry_id, arr);
      }

      return list.map(e => ({
        ...e,
        breaks: breakMap.get(e.id) || [],
      })) as TimeEntryRow[];
    },
  });
};
