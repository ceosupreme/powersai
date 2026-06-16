CREATE TABLE public.channel_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  revenue_type text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  period_month date NOT NULL,
  product_id uuid NULL,
  source_note text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_revenue TO authenticated;
GRANT ALL ON public.channel_revenue TO service_role;

ALTER TABLE public.channel_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_revenue_select" ON public.channel_revenue
  FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE POLICY "channel_revenue_insert" ON public.channel_revenue
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_project(project_id));

CREATE POLICY "channel_revenue_update" ON public.channel_revenue
  FOR UPDATE TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE POLICY "channel_revenue_delete" ON public.channel_revenue
  FOR DELETE TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE INDEX idx_channel_revenue_project_month
  ON public.channel_revenue(project_id, period_month DESC);

CREATE TRIGGER channel_revenue_set_updated_at
  BEFORE UPDATE ON public.channel_revenue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();