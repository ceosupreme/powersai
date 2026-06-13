
-- Migration 6: New tables Part 2 — Content + Marketing

CREATE TABLE IF NOT EXISTS weekly_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID NOT NULL REFERENCES weeks(id),
  headline TEXT,
  overall_sentiment TEXT,
  overall_score DECIMAL(5,2),
  overall_grade TEXT,
  revenue_score DECIMAL(5,2),
  labor_score DECIMAL(5,2),
  operations_score DECIMAL(5,2),
  guest_score DECIMAL(5,2),
  marketing_score DECIMAL(5,2),
  highlights TEXT,
  highlights_json JSONB,
  watch_fors TEXT,
  watch_fors_json JSONB,
  priority_actions TEXT,
  priority_actions_json JSONB,
  talking_points TEXT,
  talking_points_json JSONB,
  revenue_summary TEXT,
  labor_summary TEXT,
  operations_summary TEXT,
  guest_summary TEXT,
  marketing_summary TEXT,
  recognition TEXT,
  coaching_needed TEXT,
  next_week_focus TEXT,
  upcoming_events TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, week_id)
);
ALTER TABLE weekly_briefings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  scope doc_scope NOT NULL,
  category doc_category NOT NULL,
  subcategory TEXT,
  tags TEXT[],
  title TEXT NOT NULL,
  description TEXT,
  version TEXT,
  effective_date DATE,
  expiry_date DATE,
  content_type TEXT,
  full_text TEXT,
  summary TEXT,
  key_points TEXT,
  attachment_url TEXT,
  external_url TEXT,
  status doc_status NOT NULL DEFAULT 'draft',
  access_level access_level NOT NULL DEFAULT 'all_staff',
  requires_acknowledgment BOOLEAN DEFAULT false,
  owner_id UUID,
  last_reviewed_by UUID,
  last_reviewed_at DATE,
  superseded_by UUID REFERENCES knowledge_base(id),
  ai_suggested_category TEXT,
  ai_extracted_keywords TEXT[],
  ai_document_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS doc_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_base(id),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id),
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (document_id, employee_id)
);
ALTER TABLE doc_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS online_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID NOT NULL REFERENCES weeks(id),
  platform review_platform NOT NULL,
  avg_rating DECIMAL(3,2),
  new_reviews_count INTEGER DEFAULT 0,
  response_needed_count INTEGER DEFAULT 0,
  themes_top TEXT,
  notable_quotes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE online_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS secret_shop_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID NOT NULL REFERENCES weeks(id),
  shop_date DATE NOT NULL,
  total_score_pct DECIMAL(5,2),
  total_points_earned INTEGER,
  total_points_possible INTEGER,
  shop_day TEXT,
  arrival_time TEXT,
  departure_time TEXT,
  duration_minutes INTEGER,
  shopper_age INTEGER,
  shopper_gender TEXT,
  amount_spent DECIMAL(8,2),
  party_size INTEGER,
  business_level TEXT,
  guest_count_estimate INTEGER,
  server_bartender_name TEXT,
  failed_areas TEXT,
  positives TEXT,
  summary_narrative TEXT,
  failed_questions TEXT[],
  top_performers TEXT[],
  report_pdf_url TEXT,
  scores_detail JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE secret_shop_audits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS weekly_sales_mix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID NOT NULL REFERENCES weeks(id),
  food_sales DECIMAL(10,2),
  food_qty INTEGER,
  food_pct DECIMAL(5,2),
  beer_sales DECIMAL(10,2),
  beer_qty INTEGER,
  beer_pct DECIMAL(5,2),
  liquor_sales DECIMAL(10,2),
  liquor_qty INTEGER,
  liquor_pct DECIMAL(5,2),
  wine_sales DECIMAL(10,2),
  wine_qty INTEGER,
  wine_pct DECIMAL(5,2),
  other_sales DECIMAL(10,2),
  other_qty INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE weekly_sales_mix ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS top_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID NOT NULL REFERENCES weeks(id),
  rank SMALLINT,
  item_name TEXT NOT NULL,
  category TEXT,
  net_sales DECIMAL(10,2),
  quantity_sold INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE top_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS toast_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID NOT NULL REFERENCES weeks(id),
  period_start DATE,
  period_end DATE,
  your_net_sales DECIMAL(12,2),
  peer_net_sales DECIMAL(12,2),
  vs_peer_net_sales_pct DECIMAL(5,2),
  your_order_count INTEGER,
  peer_order_count INTEGER,
  vs_peer_orders_pct DECIMAL(5,2),
  your_quantity_sold INTEGER,
  peer_quantity_sold INTEGER,
  vs_peer_quantity_pct DECIMAL(5,2),
  your_avg_order_value DECIMAL(8,2),
  peer_avg_order_value DECIMAL(8,2),
  vs_peer_aov_pct DECIMAL(5,2),
  your_items_per_order DECIMAL(5,2),
  peer_items_per_order DECIMAL(5,2),
  your_splh DECIMAL(8,2),
  peer_splh DECIMAL(8,2),
  vs_peer_splh_pct DECIMAL(5,2),
  import_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE toast_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID REFERENCES weeks(id),
  event_name TEXT NOT NULL,
  event_date DATE,
  event_type event_type_enum,
  description TEXT,
  expected_attendance INTEGER,
  actual_attendance INTEGER,
  marketing_spend DECIMAL(8,2),
  promoted_channels TEXT[],
  performance_rating performance_label,
  revenue_estimate DECIMAL(10,2),
  content_captured BOOLEAN DEFAULT false,
  content_posted BOOLEAN DEFAULT false,
  content_notes TEXT,
  what_worked TEXT,
  what_didnt_work TEXT,
  repeat_event BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID REFERENCES weeks(id),
  platform social_platform NOT NULL,
  post_date DATE,
  post_type post_type,
  content TEXT,
  description TEXT,
  post_url TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  profile_visits INTEGER DEFAULT 0,
  video_watch_time INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  is_boosted BOOLEAN DEFAULT false,
  boost_spend DECIMAL(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS weekly_social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID NOT NULL REFERENCES weeks(id),
  platform social_platform NOT NULL,
  followers_start INTEGER,
  followers_end INTEGER,
  followers_net INTEGER,
  posts_count INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  profile_visits INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE weekly_social_metrics ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID REFERENCES weeks(id),
  name TEXT NOT NULL,
  promo_type promo_type,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  venue_id UUID NOT NULL REFERENCES venues(id),
  week_id UUID REFERENCES weeks(id),
  redemption_date DATE,
  quantity INTEGER DEFAULT 0,
  redemption_count INTEGER DEFAULT 0,
  total_discount_given DECIMAL(10,2),
  estimated_revenue_lift DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;
