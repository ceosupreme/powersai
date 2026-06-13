
-- 1. ALTER bars: add missing columns
ALTER TABLE public.bars
  ADD COLUMN IF NOT EXISTS bar_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS toast_restaurant_guid TEXT,
  ADD COLUMN IF NOT EXISTS asana_gm_log_task_gid TEXT,
  ADD COLUMN IF NOT EXISTS asana_lead_log_task_gid TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. CREATE period_config
CREATE TABLE public.period_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  effective_start DATE NOT NULL,
  effective_end DATE,
  -- Revenue targets
  weekly_net_sales_target DECIMAL,
  weekly_orders_target DECIMAL,
  weekly_aov_target DECIMAL,
  discount_pct_target DECIMAL DEFAULT 0.05,
  -- Labor targets
  labor_pct_target DECIMAL DEFAULT 0.22,
  splh_target DECIMAL DEFAULT 85,
  schedule_variance_target DECIMAL DEFAULT 0.05,
  overtime_rate_target DECIMAL DEFAULT 0.02,
  -- Operations targets
  task_completion_target DECIMAL DEFAULT 0.90,
  turn_time_target_min DECIMAL DEFAULT 15,
  void_rate_target DECIMAL DEFAULT 0.01,
  unpaid_amount_target DECIMAL DEFAULT 0,
  -- Guest targets
  weekly_guests_target DECIMAL DEFAULT 1200,
  tip_pct_target DECIMAL DEFAULT 0.20,
  refund_pct_target DECIMAL DEFAULT 0.01,
  google_rating_target DECIMAL DEFAULT 4.5,
  -- Pillar weights
  weight_guest INTEGER DEFAULT 35,
  weight_revenue INTEGER DEFAULT 25,
  weight_labor INTEGER DEFAULT 20,
  weight_operations INTEGER DEFAULT 20,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_bar_period UNIQUE (bar_id, effective_start)
);

-- 3. CREATE weeks
CREATE TABLE public.weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id TEXT UNIQUE NOT NULL,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT DEFAULT 'in_progress',
  period_config_id UUID REFERENCES public.period_config(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_bar_week UNIQUE (bar_id, week_start)
);

-- 4. CREATE days
CREATE TABLE public.days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id TEXT UNIQUE NOT NULL,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  is_holiday BOOLEAN DEFAULT false,
  holiday_name TEXT,
  CONSTRAINT unique_bar_date UNIQUE (bar_id, date)
);

-- 5. Indexes
CREATE INDEX idx_period_config_bar_id ON public.period_config(bar_id);
CREATE INDEX idx_weeks_bar_id ON public.weeks(bar_id);
CREATE INDEX idx_weeks_week_id ON public.weeks(week_id);
CREATE INDEX idx_weeks_period_config_id ON public.weeks(period_config_id);
CREATE INDEX idx_days_bar_id ON public.days(bar_id);
CREATE INDEX idx_days_week_id ON public.days(week_id);
CREATE INDEX idx_days_day_id ON public.days(day_id);

-- 6. RLS policies
ALTER TABLE public.period_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;

-- period_config policies
CREATE POLICY "Users can view period_config for their bars"
  ON public.period_config FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id::text));

CREATE POLICY "Admins can insert period_config"
  ON public.period_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update period_config"
  ON public.period_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete period_config"
  ON public.period_config FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- weeks policies
CREATE POLICY "Users can view weeks for their bars"
  ON public.weeks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id::text));

CREATE POLICY "Admins can insert weeks"
  ON public.weeks FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update weeks"
  ON public.weeks FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete weeks"
  ON public.weeks FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- days policies
CREATE POLICY "Users can view days for their bars"
  ON public.days FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id::text));

CREATE POLICY "Admins can insert days"
  ON public.days FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update days"
  ON public.days FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete days"
  ON public.days FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
