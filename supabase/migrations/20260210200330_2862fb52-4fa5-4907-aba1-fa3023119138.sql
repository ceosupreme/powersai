
-- Step 1: Add new enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gm';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shift_lead';

-- Step 2: Create role_page_defaults table
CREATE TABLE public.role_page_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  page_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, page_key)
);

ALTER TABLE public.role_page_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role page defaults"
  ON public.role_page_defaults
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read role page defaults"
  ON public.role_page_defaults
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_role_page_defaults_updated_at
  BEFORE UPDATE ON public.role_page_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
