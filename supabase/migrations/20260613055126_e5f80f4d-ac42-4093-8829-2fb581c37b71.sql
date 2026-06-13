
CREATE TYPE public.capture_item_status AS ENUM ('inbox','routed','archived');
CREATE TYPE public.capture_routed_type AS ENUM ('task','idea','note','brand_asset','crm_lead','content_idea');
CREATE TYPE public.capture_ai_status AS ENUM ('none','pending','suggested','accepted','rejected');

CREATE TABLE public.capture_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text text NOT NULL,
  status public.capture_item_status NOT NULL DEFAULT 'inbox',
  routed_project_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  routed_type public.capture_routed_type,
  routed_at timestamptz,
  suggested_project_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  suggested_type public.capture_routed_type,
  ai_suggestion_status public.capture_ai_status NOT NULL DEFAULT 'none',
  ai_reasoning text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_items TO authenticated;
GRANT ALL ON public.capture_items TO service_role;
ALTER TABLE public.capture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capture_items_own_select" ON public.capture_items FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "capture_items_own_insert" ON public.capture_items FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "capture_items_own_update" ON public.capture_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "capture_items_own_delete" ON public.capture_items FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_capture_items_updated BEFORE UPDATE ON public.capture_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_capture_items_owner_status ON public.capture_items(created_by, status, created_at DESC);
