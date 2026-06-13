-- Create bar_targets table for admin-editable targets
CREATE TABLE public.bar_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id TEXT NOT NULL UNIQUE,
  labor_pct_target DECIMAL(5,2),
  comps_pct_target DECIMAL(5,2),
  splh_target DECIMAL(10,2),
  weekly_revenue_target DECIMAL(12,2),
  voids_pct_target DECIMAL(5,2),
  tips_pct_target DECIMAL(5,2),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.bar_targets ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can manage targets
CREATE POLICY "Admins can manage targets" ON public.bar_targets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  daily_summary_email BOOLEAN DEFAULT true,
  labor_threshold_alerts BOOLEAN DEFAULT true,
  ai_insight_notifications BOOLEAN DEFAULT true,
  weekly_report BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: Users manage own preferences, admins can see all
CREATE POLICY "Users manage own preferences" ON public.user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger for bar_targets
CREATE TRIGGER update_bar_targets_updated_at
  BEFORE UPDATE ON public.bar_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();