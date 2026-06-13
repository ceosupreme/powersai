import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryReport {
  id: string;
  venue_id: string;
  period_start: string;
  period_end: string;
  report_type: string;
  source_file: string | null;
  total_missing_cost: number | null;
  sculpture_rating: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  report_id: string;
  venue_id: string;
  item_name: string;
  is_category_total: boolean;
  category: string | null;
  used: number | null;
  sold: number | null;
  missing: number | null;
  missing_pct: number | null;
  missing_cost: number | null;
  pour_cost: number | null;
  ideal_pour_cost: number | null;
  sculpture_rating: number | null;
  on_hand: number | null;
  purchases: number | null;
  revenue: number | null;
  spillage_cost: number | null;
  period_start: string;
  period_end: string;
}

export function useInventoryReports(venueId: string | undefined) {
  return useQuery({
    queryKey: ['inventory-reports', venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_reports')
        .select('*')
        .eq('venue_id', venueId!)
        .order('period_end', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as InventoryReport[];
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLatestInventoryReport(venueId: string | undefined) {
  return useQuery({
    queryKey: ['inventory-latest-report', venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_reports')
        .select('*')
        .eq('venue_id', venueId!)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InventoryReport | null;
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryItems(reportId: string | undefined) {
  return useQuery({
    queryKey: ['inventory-items', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('report_id', reportId!)
        .order('missing_cost', { ascending: true });
      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
    enabled: !!reportId,
    staleTime: 5 * 60 * 1000,
  });
}
