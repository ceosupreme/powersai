
-- ============================================================
-- 1. gm_logs
-- ============================================================
CREATE TABLE public.gm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES public.days(id),
  bar_id UUID NOT NULL REFERENCES public.bars(id),
  date DATE NOT NULL,
  asana_task_gid TEXT,
  asana_comment_gid TEXT UNIQUE,
  author_name TEXT,
  comment_created_at TIMESTAMPTZ,
  raw_text TEXT,
  -- Parsed basic
  gm_on_duty TEXT,
  opening_manager TEXT,
  closing_manager TEXT,
  expected_close_time TEXT,
  -- Parsed operations
  overall_shift_summary TEXT,
  pacing TEXT,
  staffing_issues TEXT,
  guest_vibe TEXT,
  -- Parsed staff
  staff_highlights JSONB DEFAULT '[]'::jsonb,
  coaching_corrections JSONB DEFAULT '[]'::jsonb,
  team_energy TEXT,
  training_needs JSONB DEFAULT '[]'::jsonb,
  -- Parsed inventory
  items_86d JSONB DEFAULT '[]'::jsonb,
  low_stock_watchlist JSONB DEFAULT '[]'::jsonb,
  prep_issues TEXT,
  waste_comps TEXT,
  -- Parsed maintenance
  broken_items JSONB DEFAULT '[]'::jsonb,
  new_problems JSONB DEFAULT '[]'::jsonb,
  cleanliness_notes TEXT,
  safety_concerns JSONB DEFAULT '[]'::jsonb,
  -- Parsed guest
  guest_complaints JSONB DEFAULT '[]'::jsonb,
  guest_compliments JSONB DEFAULT '[]'::jsonb,
  vips_regulars JSONB DEFAULT '[]'::jsonb,
  -- Parse tracking
  is_parsed BOOLEAN NOT NULL DEFAULT false,
  parsed_at TIMESTAMPTZ,
  parse_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select gm_logs" ON public.gm_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id::text));
CREATE POLICY "Insert gm_logs admin" ON public.gm_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Update gm_logs admin" ON public.gm_logs FOR UPDATE
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete gm_logs admin" ON public.gm_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_gm_logs_bar_id ON public.gm_logs(bar_id);
CREATE INDEX idx_gm_logs_day_id ON public.gm_logs(day_id);
CREATE INDEX idx_gm_logs_bar_date ON public.gm_logs(bar_id, date);

-- ============================================================
-- 2. lead_logs
-- ============================================================
CREATE TABLE public.lead_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES public.days(id),
  bar_id UUID NOT NULL REFERENCES public.bars(id),
  date DATE NOT NULL,
  shift TEXT,
  asana_task_gid TEXT,
  asana_comment_gid TEXT UNIQUE,
  author_name TEXT,
  comment_created_at TIMESTAMPTZ,
  raw_text TEXT,
  -- Parsed text fields
  cleaning_issues TEXT,
  business_flow TEXT,
  toast_computer_issues TEXT,
  staffing_levels TEXT,
  customer_issues TEXT,
  improvement_suggestions TEXT,
  -- Parsed arrays
  new_customers JSONB DEFAULT '[]'::jsonb,
  items_out JSONB DEFAULT '[]'::jsonb,
  shoutouts JSONB DEFAULT '[]'::jsonb,
  issues JSONB DEFAULT '[]'::jsonb,
  -- Parse tracking
  is_parsed BOOLEAN NOT NULL DEFAULT false,
  parsed_at TIMESTAMPTZ,
  parse_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select lead_logs" ON public.lead_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id::text));
CREATE POLICY "Insert lead_logs admin" ON public.lead_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Update lead_logs admin" ON public.lead_logs FOR UPDATE
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete lead_logs admin" ON public.lead_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_lead_logs_bar_id ON public.lead_logs(bar_id);
CREATE INDEX idx_lead_logs_day_id ON public.lead_logs(day_id);
CREATE INDEX idx_lead_logs_bar_date ON public.lead_logs(bar_id, date);

-- ============================================================
-- 3. shift_logs
-- ============================================================
CREATE TABLE public.shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES public.days(id),
  bar_id UUID NOT NULL REFERENCES public.bars(id),
  date DATE NOT NULL,
  shift TEXT,
  log_type TEXT,
  author_user_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  submitted_at TIMESTAMPTZ,
  raw_text TEXT,
  -- Structured fields
  shift_summary TEXT,
  pacing TEXT,
  guest_vibe TEXT,
  team_energy TEXT,
  staffing_notes TEXT,
  items_86d JSONB DEFAULT '[]'::jsonb,
  low_stock JSONB DEFAULT '[]'::jsonb,
  maintenance_issues JSONB DEFAULT '[]'::jsonb,
  safety_concerns JSONB DEFAULT '[]'::jsonb,
  guest_complaints JSONB DEFAULT '[]'::jsonb,
  guest_compliments JSONB DEFAULT '[]'::jsonb,
  staff_highlights JSONB DEFAULT '[]'::jsonb,
  coaching_notes JSONB DEFAULT '[]'::jsonb,
  new_customers JSONB DEFAULT '[]'::jsonb,
  improvement_suggestions TEXT,
  -- Ratings
  foh_rating INTEGER,
  boh_rating INTEGER,
  product_rating INTEGER,
  hospitality_rating INTEGER,
  -- Processing
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select shift_logs" ON public.shift_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id::text));
CREATE POLICY "Insert shift_logs authenticated" ON public.shift_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_has_bar_access(auth.uid(), bar_id::text));
CREATE POLICY "Update shift_logs admin" ON public.shift_logs FOR UPDATE
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete shift_logs admin" ON public.shift_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_shift_logs_bar_id ON public.shift_logs(bar_id);
CREATE INDEX idx_shift_logs_day_id ON public.shift_logs(day_id);
CREATE INDEX idx_shift_logs_bar_date ON public.shift_logs(bar_id, date);
CREATE INDEX idx_shift_logs_author ON public.shift_logs(author_user_id);

-- ============================================================
-- 4. insights
-- ============================================================
CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES public.weeks(id),
  day_id UUID REFERENCES public.days(id),
  bar_id UUID NOT NULL REFERENCES public.bars(id),
  pillar TEXT NOT NULL,
  insight_type TEXT NOT NULL DEFAULT 'Issue',
  severity TEXT NOT NULL DEFAULT 'Medium',
  title TEXT NOT NULL,
  summary TEXT,
  detail TEXT,
  -- Source tracking
  source_type TEXT,
  source_date DATE,
  source_metric TEXT,
  source_value TEXT,
  source_context TEXT,
  source_log_id UUID,
  source_log_type TEXT,
  -- Impact & confidence
  estimated_impact TEXT,
  confidence TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  is_recurring BOOLEAN DEFAULT false,
  streak_weeks INTEGER DEFAULT 0,
  related_insight_id UUID REFERENCES public.insights(id),
  employee_name TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select insights" ON public.insights FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id::text));
CREATE POLICY "Insert insights admin" ON public.insights FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Update insights admin" ON public.insights FOR UPDATE
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete insights admin" ON public.insights FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_insights_bar_id ON public.insights(bar_id);
CREATE INDEX idx_insights_week_id ON public.insights(week_id);
CREATE INDEX idx_insights_day_id ON public.insights(day_id);
CREATE INDEX idx_insights_related ON public.insights(related_insight_id);

-- ============================================================
-- 5. action_items
-- ============================================================
CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID REFERENCES public.insights(id),
  week_id UUID REFERENCES public.weeks(id),
  bar_id UUID NOT NULL REFERENCES public.bars(id),
  title TEXT NOT NULL,
  detail TEXT,
  estimated_minutes INTEGER,
  effort_level TEXT,
  priority TEXT DEFAULT 'P3-Medium',
  suggested_assignee TEXT,
  assignee TEXT,
  due_date DATE,
  approval_status TEXT NOT NULL DEFAULT 'Pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Not Started',
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  outcome_rating INTEGER,
  asana_task_gid TEXT,
  asana_task_url TEXT,
  synced_to_asana_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select action_items" ON public.action_items FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), bar_id::text));
CREATE POLICY "Insert action_items admin" ON public.action_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Update action_items admin" ON public.action_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete action_items admin" ON public.action_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_action_items_bar_id ON public.action_items(bar_id);
CREATE INDEX idx_action_items_week_id ON public.action_items(week_id);
CREATE INDEX idx_action_items_insight_id ON public.action_items(insight_id);
