// Canonical types for BarPulse – Supabase-native schema
// This file replaces src/types/airtable.ts

// ─── Core Types ──────────────────────────────────────────────────────

export interface Venue {
  id: string;
  name: string;
  bar_code: string;
  city: string | null;
  owner_name: string | null;
  gm_name: string | null;
  is_active: boolean;
}

/** Backward-compatible alias so existing code using `Bar` still works */
export interface Bar {
  id: string;
  bar_id: string;
  bar_name: string;
  city: string;
  owner_name: string;
  gm_name: string;
}

/** Convert a Venue to the legacy Bar shape */
export function venueToBar(venue: Venue): Bar {
  return {
    id: venue.id,
    bar_id: venue.bar_code || venue.id,
    bar_name: venue.name,
    city: venue.city || '',
    owner_name: venue.owner_name || '',
    gm_name: venue.gm_name || '',
  };
}

export interface VenueWeek {
  id: string;
  week_id: string;
  bar_id: string;
  week_start: string;
  week_end: string;
  status: string | null;
}

/** Backward-compatible Week alias (no Airtable linked-record arrays) */
export interface Week {
  id: string;
  week_id: string;
  bar: string[];
  week_start: string;
  week_end: string;
  status: string;
}

export function venueWeekToWeek(vw: VenueWeek): Week {
  return {
    id: vw.id,
    week_id: vw.week_id,
    bar: [vw.bar_id],
    week_start: vw.week_start,
    week_end: vw.week_end,
    status: vw.status || 'active',
  };
}

// ─── Scorecard / Core / Alert ────────────────────────────────────────

export interface WeeklyScorecard {
  id: string;
  week: string[];
  overall_score: number;
  overall_grade: Grade;
  confidence: string;
  trend_4wk: string;
  revenue_score: number;
  labor_score: number;
  operations_score: number;
  guest_experience_score: number;
  marketing_score?: number;
  marketing_drivers?: string;
  marketing_explanation?: string;
  event_performance_score?: number;
  social_media_score?: number;
  content_capture_score?: number;
  promo_effectiveness_score?: number;
  monday_briefing: string;
  wins: string;
  key_drivers: string;
  revenue_drivers: string;
  labor_drivers: string;
  operations_drivers: string;
  guest_experience_drivers: string;
  R1_net_sales_vs_target?: number;
  R2_transactions_vs_target?: number;
  R3_avg_check_vs_target?: number;
  R4_comps_discounts_pct?: number;
  L1_labor_pct_vs_target?: number;
  L2_splh_vs_target?: number;
  L3_schedule_adherence?: number;
  L4_overtime_rate?: number;
  O1_task_completion_pct?: number;
  O2_ticket_time_impact?: number;
  O3_void_pct?: number;
  O4_critical_alerts_count?: number;
  O5_employee_logs_vs_target?: number;
  G1_composite_rating?: number;
  G2_cleanliness?: number;
  G3_review_momentum_per_1k?: number;
  G4_secret_shop_overall?: number;
  G5_tip_pct_vs_target?: number;
  S1_posts_vs_target?: number;
  S2_views_per_post_wow?: number;
  S3_interactions_wow?: number;
  S4_marketing_effort?: number;
  S5_marketing_results?: number;
}

export interface WeeklyCore {
  id: string;
  week: string[];
  net_sales: number;
  transactions: number;
  aov: number;
  labor_pct: number;
  scheduled_hours: number;
  labor_cost_total: number;
  discount_pct: number;
  comps_amount: number;
  void_rate: number;
  void_amount: number;
  turn_time_avg_min: number;
  tip_pct: number;
  weekly_guests: number;
  yoy_change_pct: number | null;
}

export interface Alert {
  id: string;
  week: string[];
  pillar: 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience';
  severity: 'High' | 'Medium' | 'Low';
  metric_name: string;
  metric_value: string;
  threshold: string;
  message: string;
}

// ─── Insights & Actions ─────────────────────────────────────────────

export interface Insight {
  id: string;
  week: string[];
  pillar: Pillar;
  priority: Priority;
  title: string;
  summary: string;
  facts: string;
  estimated_weekly_impact_dollars: number;
}

export interface Action {
  id: string;
  Name: string;
  week: string[];
  insight: string[];
  pillar?: string;
  title: string;
  details: string;
  estimated_minutes: number;
  due_date_suggested: string;
  approval_status: ApprovalStatus;
  approved_at?: string;
  asana_task_gid?: string;
  asana_task_url?: string;
}

export interface WeeklyInsight {
  id: string;
  title: string;
  summary: string;
  detail: string;
  pillar: Pillar;
  severity: Priority;
  week: string[];
}

export interface ActionItem {
  id: string;
  insight: string[];
  title: string;
  detail: string;
  estimated_minutes: number;
  effort_level: string;
  approval_status: ApprovalStatus;
  due_date: string;
  asana_task_gid?: string;
  asana_task_url?: string;
  week: string[];
}

export interface ActionCard {
  id: string;
  week: string[];
  pillar: Pillar;
  priority: Priority;
  insight_title: string;
  insight_summary: string;
  problem_detail: string;
  action_title: string;
  action_detail?: string;
  estimated_minutes: number;
  effort_level?: string;
  due_date: string;
  approval_status: ApprovalStatus;
  approved_at?: string;
  assignee_gid?: string;
  asana_task_gid?: string;
  asana_task_url?: string;
  insightId?: string;
  auto_approved?: boolean;
  source_metric?: string | null;
  generated_by?: string | null;
}

// ─── Guest Experience ────────────────────────────────────────────────

export interface SecretShopAudit {
  id: string;
  week: string[];
  bar?: string[];
  shop_date: string;
  day_of_week?: string;
  arrival_time?: string;
  departure_time?: string;
  duration_minutes?: number;
  server_name?: string;
  amount_spent?: number;
  party_size?: number;
  business_level?: 'Slow' | 'Moderate' | 'Busy' | 'Slammed';
  total_score_pct: number;
  total_points?: number;
  max_points?: number;
  prior_shop_score_pct?: number;
  greeting_score: number;
  service_score: number;
  food_score: number;
  cleanliness_score: number;
  failed_areas: string;
  positives: string;
  notable_quotes: string;
  summary_narrative?: string;
}

export interface OnlineReviewSignal {
  id: string;
  week: string[];
  platform: 'Google' | 'Yelp';
  avg_rating: number;
  new_reviews_count: number;
  themes_top: string;
  themes_positive?: string;
  themes_negative?: string;
  notable_quotes: string;
  responded?: boolean;
  review_preview?: string;
  review_date?: string;
}

export interface PeriodConfig {
  id: string;
  bar: string[];
  period_name: string;
  weekly_sales_target: number;
  labor_pct_target: number;
  comps_pct_target: number;
  voids_pct_target: number;
}

export interface Knowledge {
  id: string;
  category: 'SOP' | 'Policy' | 'FAQ' | 'Training' | 'Contact';
  topic: string;
  title: string;
  content: string;
  pillar: 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience' | 'General';
}

// ─── Competitive Analysis ────────────────────────────────────────────

export interface ToastBenchmark {
  id: string;
  week: string[];
  bar: string[];
  period_start: string;
  period_end: string;
  your_net_sales: number;
  peer_net_sales: number;
  vs_peer_net_sales_pct: string;
  your_order_count: number;
  peer_order_count: number;
  vs_peer_orders_pct: string;
  your_quantity_sold: number;
  peer_quantity_sold: number;
  vs_peer_quantity_pct: string;
  your_avg_order_value: number;
  peer_avg_order_value: number;
  vs_peer_aov_pct: string;
  your_items_per_order: number;
  peer_items_per_order: number;
  your_splh: number;
  peer_splh: number;
  vs_peer_splh_pct: string;
  import_date: string;
}

export interface WeeklySalesMix {
  id: string;
  week: string[];
  bar: string[];
  food_sales: number;
  food_qty: number;
  food_pct: string;
  beer_sales: number;
  beer_qty: number;
  beer_pct: string;
  liquor_sales: number;
  liquor_qty: number;
  liquor_pct: string;
  wine_sales: number;
  wine_qty: number;
  wine_pct: string;
  other_sales: number;
  other_qty: number;
}

export interface TopItem {
  id: string;
  week: string[];
  bar: string[];
  rank: number;
  item_name: string;
  category: SalesMixCategory;
  net_sales: number;
  quantity_sold: number;
}

export interface MenuGroup {
  id: string;
  week: string[];
  bar: string[];
  menu_name: string;
  avg_price: number;
  item_qty: number;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
}

export interface TopProductGroup {
  id: string;
  week: string[];
  bar: string[];
  rank: number;
  group_name: string;
  quantity_sold: number;
  net_sales: number;
}

export type SalesMixCategory = 'Food' | 'Beer' | 'Liquor' | 'Wine';

// ─── Social Media ────────────────────────────────────────────────────

export type SocialPlatform = 'Instagram' | 'Facebook' | 'TikTok' | 'Google Business' | 'Yelp';
export type SocialPostType = 'Photo' | 'Video' | 'Reel' | 'Story' | 'Carousel' | 'Text';

export interface SocialAccount {
  id: string;
  bar: string[];
  platform: SocialPlatform;
  current_followers: number;
  profile_url?: string;
  last_updated: string;
}

export interface WeeklySocialMetrics {
  id: string;
  week: string[];
  bar: string[];
  platform: SocialPlatform;
  followers_start: number;
  followers_end: number;
  followers_change: number;
  posts_count: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profile_visits: number;
  website_clicks: number;
  mentions: number;
  engagement_rate: number;
  prev_likes?: number;
  prev_comments?: number;
  prev_shares?: number;
  prev_saves?: number;
  prev_profile_visits?: number;
  prev_website_clicks?: number;
  prev_mentions?: number;
}

export interface SocialMediaPost {
  id: string;
  week: string[];
  bar: string[];
  platform: SocialPlatform;
  post_date: string;
  post_type: SocialPostType;
  content: string;
  post_url?: string;
  thumbnail_url?: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  views?: number;
}

// ─── Marketing ───────────────────────────────────────────────────────

export type MarketingEventType = 'Trivia' | 'Live Music' | 'Sports' | 'Theme Night' | 'Happy Hour' | 'Special';
export type PromotionType = 'Happy Hour' | 'BOGO' | 'Discount' | 'Event Special' | 'Loyalty';

export interface MarketingEvent {
  id: string;
  week: string[];
  bar: string[];
  event_name: string;
  event_date: string;
  event_type: MarketingEventType;
  expected_attendance: number;
  actual_attendance: number;
  performance_rating: 1 | 2 | 3 | 4 | 5;
  content_captured: boolean;
  notes?: string;
}

export interface Promotion {
  id: string;
  bar: string[];
  promo_name: string;
  promo_type: PromotionType;
  active: boolean;
  schedule: string;
  discount_description: string;
  weekly_redemptions?: number;
  discount_given?: number;
}

// ─── Shared Enums ────────────────────────────────────────────────────

export type Pillar = 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience' | 'Marketing';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type Severity = 'High' | 'Medium' | 'Low';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type ApprovalStatus = 'Proposed' | 'Approved' | 'Rejected' | 'Pending';

// ─── Legacy re-exports for backward compat ──────────────────────────

export interface AirtableUser {
  id: string;
  user_id: number;
  Name: string;
  Email: string;
  Role: 'Owner' | 'Admin' | 'Manager' | 'Shift Lead' | 'Staff';
  Bars: string[];
  Active: boolean;
  Date_Added: string;
  Notes?: string;
  GMLogs?: string[];
  ActionCards?: string[];
}
