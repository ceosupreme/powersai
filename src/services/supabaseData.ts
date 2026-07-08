import { supabase } from '@/integrations/supabase/client';
import type { Venue, VenueWeek } from '@/types/venue';

// ─── Venues ──────────────────────────────────────────────────────────

export async function fetchVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, bar_code, city, owner_name, gm_name, is_active')
    .eq('is_active', true)
    .eq('is_prospect_shell', false)
    .order('name');
  if (error) throw error;
  return (data || []) as unknown as Venue[];
}

// ─── Weeks ───────────────────────────────────────────────────────────

export async function fetchWeeksForBar(barId: string): Promise<VenueWeek[]> {
  const { data, error } = await supabase
    .from('weeks')
    .select('id, week_id, bar_id, week_start, week_end, status')
    .eq('bar_id', barId)
    .order('week_start', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as VenueWeek[];
}

// ─── Competitive Analysis ────────────────────────────────────────────

export async function fetchToastBenchmarks(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('toast_benchmarks')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId);
  if (error) throw error;
  return data || [];
}

export async function fetchWeeklySalesMix(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('weekly_sales_mix')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId);
  if (error) throw error;
  return data || [];
}

export async function fetchTopItems(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('top_items')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId)
    .order('rank')
    .limit(10);
  if (error) throw error;
  return data || [];
}

export async function fetchMenuGroups(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('menu_groups')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId)
    .order('net_amount', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTopProductGroups(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('top_product_groups')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId)
    .order('net_sales', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data || [];
}

// ─── Guest Experience ────────────────────────────────────────────────

export async function fetchSecretShopAudits(barId: string, weekId?: string) {
  let query = (supabase as any)
    .from('secret_shop_audits')
    .select('*')
    .eq('bar_id', barId)
    .order('shop_date', { ascending: false });
  if (weekId) {
    query = query.eq('week_id', weekId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchSecretShopHistory(barId: string, limit = 6) {
  const { data, error } = await (supabase as any)
    .from('secret_shop_audits')
    .select('*')
    .eq('bar_id', barId)
    .order('shop_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchOnlineReviews(barId: string, weekId?: string) {
  let query = (supabase as any)
    .from('online_reviews')
    .select('*')
    .eq('bar_id', barId);
  if (weekId) {
    query = query.eq('week_id', weekId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─── Social Media ────────────────────────────────────────────────────

export async function fetchSocialAccounts(barId: string) {
  const { data, error } = await (supabase as any)
    .from('social_accounts')
    .select('*')
    .eq('bar_id', barId);
  if (error) {
    console.warn('social_accounts query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function fetchWeeklySocialMetrics(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('weekly_social_metrics')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId);
  if (error) throw error;
  return data || [];
}

export async function fetchSocialMediaPosts(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('social_media_posts')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId);
  if (error) throw error;
  return data || [];
}

// ─── Marketing ───────────────────────────────────────────────────────

export async function fetchMarketingEvents(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('marketing_events')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId);
  if (error) throw error;
  return data || [];
}

export async function fetchPromotions(barId: string) {
  const { data, error } = await (supabase as any)
    .from('promotions')
    .select('*')
    .eq('bar_id', barId);
  if (error) throw error;
  return data || [];
}

// ─── Insights & Actions ─────────────────────────────────────────────

export async function fetchAlerts(barId: string, weekId?: string) {
  let query = supabase
    .from('insights')
    .select('*')
    .eq('bar_id', barId)
    .in('severity', ['High', 'Critical']);
  if (weekId) {
    query = query.eq('week_id', weekId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    week: [],
    pillar: row.pillar || 'Operations',
    severity: row.severity || 'Medium',
    metric_name: row.source_metric || row.title || '',
    metric_value: row.source_value || '',
    threshold: '',
    message: row.summary || row.title || '',
  }));
}

export async function updateActionItemApproval(
  id: string,
  fields: {
    approval_status?: string;
    asana_task_gid?: string;
    asana_task_url?: string;
    approved_by_id?: string;
    rejected_by_id?: string;
    rejection_reason?: string;
  }
) {
  const payload: Record<string, unknown> = {
    approval_status: fields.approval_status,
  };
  if (fields.asana_task_gid !== undefined) payload.asana_task_gid = fields.asana_task_gid;
  if (fields.asana_task_url !== undefined) payload.asana_task_url = fields.asana_task_url;
  if (fields.approval_status === 'Approved' && fields.approved_by_id) {
    payload.approved_by_id = fields.approved_by_id;
    payload.approved_at = new Date().toISOString();
  }
  if (fields.approval_status === 'Rejected' && fields.rejected_by_id) {
    payload.rejected_by_id = fields.rejected_by_id;
    payload.rejected_at = new Date().toISOString();
    if (fields.rejection_reason !== undefined) payload.rejection_reason = fields.rejection_reason;
  }
  const { error } = await supabase
    .from('action_items')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function updateInsightStatus(id: string, status: string) {
  const { error } = await supabase
    .from('insights')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

// ─── Weekly Briefing ─────────────────────────────────────────────────

export async function fetchWeeklyBriefings(barId: string, weekId: string) {
  const { data, error } = await (supabase as any)
    .from('weekly_briefings')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId)
    .limit(1);
  if (error) throw error;
  return data || [];
}

// ─── Scorecards (for Marketing page) ────────────────────────────────

export async function fetchWeeklyScorecardForWeek(barId: string, weekId: string) {
  const { data, error } = await supabase
    .from('weekly_scorecard')
    .select('*')
    .eq('bar_id', barId)
    .eq('week_id', weekId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchWeeklyScorecardsForBar(barId: string, limit = 8) {
  const { data, error } = await supabase
    .from('weekly_scorecard')
    .select('*')
    .eq('bar_id', barId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ─── Weekly Core (for history charts) ────────────────────────────────

export async function fetchWeeklyCoresForBar(barId: string, limit = 12) {
  const { data, error } = await supabase
    .from('weekly_core')
    .select('*')
    .eq('bar_id', barId)
    .order('week_start', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
