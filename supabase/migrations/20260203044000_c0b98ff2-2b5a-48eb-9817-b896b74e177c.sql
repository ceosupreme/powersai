-- ============================================
-- PHASE 1: Dual-Source Architecture Tables
-- ============================================

-- App config table for feature flags (data source toggle)
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY "Admins can manage app_config"
  ON public.app_config FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Anyone authenticated can read config
CREATE POLICY "Authenticated users can read app_config"
  ON public.app_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default data source config
INSERT INTO public.app_config (key, value)
VALUES ('data_source', '{"insights": "airtable", "last_sync": null}');

-- ============================================
-- Daily Toast Metrics Table
-- ============================================
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Sales metrics
  net_sales NUMERIC,
  gross_sales NUMERIC,
  orders_count INTEGER,
  avg_check NUMERIC,
  discounts NUMERIC,
  discounts_pct NUMERIC,
  refunds NUMERIC,
  refund_pct NUMERIC,
  voids NUMERIC,
  void_pct NUMERIC,
  
  -- Labor metrics
  labor_cost NUMERIC,
  labor_pct NUMERIC,
  labor_hours NUMERIC,
  splh NUMERIC,
  foh_hours NUMERIC,
  boh_hours NUMERIC,
  overtime_hours NUMERIC,
  overtime_pct NUMERIC,
  
  -- Tips
  tips NUMERIC,
  tip_pct NUMERIC,
  
  -- Food & Beverage
  food_sales NUMERIC,
  bev_sales NUMERIC,
  
  -- Service metrics
  avg_turn_time_mins NUMERIC,
  tickets_count INTEGER,
  unpaid_amount NUMERIC,
  comps NUMERIC,
  comps_pct NUMERIC,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'toast',
  airtable_synced BOOLEAN DEFAULT false,
  
  UNIQUE(bar_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view metrics for their bars
CREATE POLICY "Users can view daily_metrics for their bars"
  ON public.daily_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id));

-- Admins can manage metrics
CREATE POLICY "Admins can manage daily_metrics"
  ON public.daily_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- Manager Log Entries (from Asana)
-- ============================================
CREATE TABLE public.manager_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id TEXT NOT NULL,
  date DATE NOT NULL,
  log_type TEXT NOT NULL CHECK (log_type IN ('gm_log', 'lead_log')),
  
  -- Asana reference
  asana_comment_gid TEXT UNIQUE,
  asana_task_gid TEXT,
  
  -- Content
  author_name TEXT,
  content TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manager_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their bars
CREATE POLICY "Users can view manager_logs for their bars"
  ON public.manager_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id));

-- Admins can manage logs
CREATE POLICY "Admins can manage manager_logs"
  ON public.manager_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- Insight Cards (unified insights + actions)
-- ============================================
CREATE TABLE public.insight_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id TEXT NOT NULL,
  week_start DATE,
  week_end DATE,
  
  -- Insight fields
  pillar TEXT NOT NULL CHECK (pillar IN ('Revenue', 'Labor', 'Operations', 'Guest Experience', 'Marketing')),
  severity TEXT NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
  insight_type TEXT DEFAULT 'Issue',
  title TEXT NOT NULL,
  summary TEXT,
  narrative TEXT,
  
  -- Action fields  
  action_title TEXT,
  action_detail TEXT,
  effort_minutes INTEGER,
  due_date DATE,
  
  -- Workflow
  approval_status TEXT DEFAULT 'Proposed' CHECK (approval_status IN ('Proposed', 'Approved', 'Rejected')),
  status TEXT DEFAULT 'Not Started',
  assignee_id UUID REFERENCES public.profiles(id),
  asana_task_gid TEXT,
  asana_task_url TEXT,
  
  -- Citations (detailed for Deep Dive)
  source_refs JSONB DEFAULT '[]',
  simple_citation TEXT,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT now(),
  airtable_record_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(bar_id, week_start, title)
);

-- Enable RLS
ALTER TABLE public.insight_cards ENABLE ROW LEVEL SECURITY;

-- Users can view insight_cards for their bars
CREATE POLICY "Users can view insight_cards for their bars"
  ON public.insight_cards FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id));

-- Users can update insight_cards for their bars (approval flow)
CREATE POLICY "Users can update insight_cards for their bars"
  ON public.insight_cards FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id))
  WITH CHECK (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id));

-- Admins can manage insight_cards
CREATE POLICY "Admins can manage insight_cards"
  ON public.insight_cards FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_insight_cards_bar_week ON public.insight_cards(bar_id, week_start DESC);
CREATE INDEX idx_daily_metrics_bar_date ON public.daily_metrics(bar_id, date DESC);
CREATE INDEX idx_manager_logs_bar_date ON public.manager_logs(bar_id, date DESC);

-- Add updated_at trigger for insight_cards
CREATE TRIGGER update_insight_cards_updated_at
  BEFORE UPDATE ON public.insight_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();