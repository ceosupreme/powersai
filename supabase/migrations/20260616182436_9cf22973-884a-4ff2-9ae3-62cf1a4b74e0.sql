CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  format text,
  stage text NOT NULL DEFAULT 'idea',
  hook text,
  cta text,
  primary_keyword text,
  affiliate_link text,
  product_id uuid,
  due_date date,
  scheduled_at timestamptz,
  published_at timestamptz,
  is_repurposed boolean NOT NULL DEFAULT false,
  is_monetized boolean NOT NULL DEFAULT false,
  performance jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view content_items for accessible projects"
  ON public.content_items FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE POLICY "insert content_items for accessible projects"
  ON public.content_items FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_project(project_id) AND created_by = auth.uid());

CREATE POLICY "update content_items for accessible projects"
  ON public.content_items FOR UPDATE TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE POLICY "delete content_items for accessible projects"
  ON public.content_items FOR DELETE TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE INDEX content_items_project_stage_idx ON public.content_items(project_id, stage);

CREATE TRIGGER trg_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();