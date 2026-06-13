
-- ============================================================
-- 1. ALTER daily_metrics — add 5 missing columns
-- ============================================================
ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS day_id UUID UNIQUE REFERENCES public.days(id),
  ADD COLUMN IF NOT EXISTS scheduled_hours DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS scheduled_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS unpaid_checks_count INTEGER,
  ADD COLUMN IF NOT EXISTS guests INTEGER;

CREATE INDEX IF NOT EXISTS idx_daily_metrics_day_id ON public.daily_metrics(day_id);

-- ============================================================
-- 2. CREATE weekly_core
-- ============================================================
CREATE TABLE public.weekly_core (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL UNIQUE REFERENCES public.weeks(id) ON DELETE CASCADE,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,

  -- Revenue
  gross_sales DECIMAL(12,2),
  net_sales DECIMAL(12,2),
  transactions INTEGER,
  aov DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  discount_pct DECIMAL(5,4),

  -- Labor
  labor_cost_total DECIMAL(10,2),
  labor_hours_total DECIMAL(8,2),
  labor_pct DECIMAL(5,4),
  splh DECIMAL(8,2),
  scheduled_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2),
  schedule_variance_pct DECIMAL(5,4),
  overtime_hours DECIMAL(8,2),
  overtime_rate DECIMAL(5,4),

  -- Operations
  tasks_due INTEGER,
  tasks_completed INTEGER,
  task_completion_pct DECIMAL(5,4),
  turn_time_avg_min INTEGER,
  void_amount DECIMAL(10,2),
  void_rate DECIMAL(5,4),
  unpaid_checks_amount DECIMAL(10,2),

  -- Guest
  weekly_guests INTEGER,
  tips_amount DECIMAL(10,2),
  tip_pct DECIMAL(5,4),
  refund_amount DECIMAL(10,2),
  refund_pct DECIMAL(5,4),
  google_rating DECIMAL(3,2),

  -- Context
  comps_amount DECIMAL(10,2),
  employee_logs_count INTEGER,
  stockout_count INTEGER,
  critical_alerts_count INTEGER,

  -- YoY
  last_year_net_sales DECIMAL(12,2),
  yoy_change_pct DECIMAL(5,4),

  notes TEXT,
  computed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.weekly_core ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weekly_core for their bars"
  ON public.weekly_core FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id::text));

CREATE POLICY "Admins can insert weekly_core"
  ON public.weekly_core FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update weekly_core"
  ON public.weekly_core FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete weekly_core"
  ON public.weekly_core FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_weekly_core_bar_id ON public.weekly_core(bar_id);
CREATE INDEX idx_weekly_core_week_id ON public.weekly_core(week_id);

-- ============================================================
-- 3. CREATE weekly_scorecard
-- ============================================================
CREATE TABLE public.weekly_scorecard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL UNIQUE REFERENCES public.weeks(id) ON DELETE CASCADE,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,

  -- Overall
  overall_score INTEGER,
  overall_grade TEXT,
  confidence INTEGER,
  trend_4wk TEXT,

  -- Pillar scores
  guest_score INTEGER,
  revenue_score INTEGER,
  labor_score INTEGER,
  operations_score INTEGER,

  -- Revenue signals R1-R4
  r1_actual DECIMAL(12,2),  r1_score INTEGER,
  r2_actual DECIMAL(12,2),  r2_score INTEGER,
  r3_actual DECIMAL(12,2),  r3_score INTEGER,
  r4_actual DECIMAL(12,2),  r4_score INTEGER,

  -- Labor signals L1-L4
  l1_actual DECIMAL(10,2),  l1_score INTEGER,
  l2_actual DECIMAL(10,2),  l2_score INTEGER,
  l3_actual DECIMAL(10,2),  l3_score INTEGER,
  l4_actual DECIMAL(10,2),  l4_score INTEGER,

  -- Operations signals O1-O4
  o1_actual DECIMAL(10,2),  o1_score INTEGER,
  o2_actual DECIMAL(10,2),  o2_score INTEGER,
  o3_actual DECIMAL(10,2),  o3_score INTEGER,
  o4_actual DECIMAL(10,2),  o4_score INTEGER,

  -- Guest signals G1-G4
  g1_actual DECIMAL(10,2),  g1_score INTEGER,
  g2_actual DECIMAL(10,2),  g2_score INTEGER,
  g3_actual DECIMAL(10,2),  g3_score INTEGER,
  g4_actual DECIMAL(10,2),  g4_score INTEGER,

  -- Narratives
  monday_briefing TEXT,
  wins TEXT,
  key_drivers TEXT,

  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.weekly_scorecard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weekly_scorecard for their bars"
  ON public.weekly_scorecard FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id::text));

CREATE POLICY "Admins can insert weekly_scorecard"
  ON public.weekly_scorecard FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update weekly_scorecard"
  ON public.weekly_scorecard FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete weekly_scorecard"
  ON public.weekly_scorecard FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_weekly_scorecard_bar_id ON public.weekly_scorecard(bar_id);
CREATE INDEX idx_weekly_scorecard_week_id ON public.weekly_scorecard(week_id);
