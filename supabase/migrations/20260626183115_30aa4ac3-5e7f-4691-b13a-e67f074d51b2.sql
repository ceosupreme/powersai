
-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.service_subscription_status AS ENUM ('active','paused','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. service_packages
CREATE TABLE public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text,
  primary_channel text CHECK (primary_channel IN ('door_opener','email','phone','meeting')),
  one_time_price numeric(12,2) NOT NULL DEFAULT 0,
  monthly_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  price_note text,
  description text,
  fulfillment_bundle_id uuid REFERENCES public.automation_bundles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_packages_bundle ON public.service_packages(fulfillment_bundle_id);
GRANT SELECT ON public.service_packages TO authenticated;
GRANT ALL ON public.service_packages TO service_role;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read service_packages" ON public.service_packages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert service_packages" ON public.service_packages
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admins update service_packages" ON public.service_packages
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete service_packages" ON public.service_packages
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_service_packages_updated_at BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. service_package_items
CREATE TABLE public.service_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_package_items_package ON public.service_package_items(package_id);
GRANT SELECT ON public.service_package_items TO authenticated;
GRANT ALL ON public.service_package_items TO service_role;
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read service_package_items" ON public.service_package_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert service_package_items" ON public.service_package_items
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admins update service_package_items" ON public.service_package_items
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete service_package_items" ON public.service_package_items
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_service_package_items_updated_at BEFORE UPDATE ON public.service_package_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. venue_service_subscriptions
CREATE TABLE public.venue_service_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.service_packages(id),
  status public.service_subscription_status NOT NULL DEFAULT 'active',
  one_time_price_agreed numeric(12,2),
  monthly_price_agreed numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_venue_service_subscriptions_venue ON public.venue_service_subscriptions(venue_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_service_subscriptions TO authenticated;
GRANT ALL ON public.venue_service_subscriptions TO service_role;
ALTER TABLE public.venue_service_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project access read venue_service_subscriptions" ON public.venue_service_subscriptions
  FOR SELECT TO authenticated USING (user_can_access_project(venue_id));
CREATE POLICY "project access insert venue_service_subscriptions" ON public.venue_service_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_can_access_project(venue_id));
CREATE POLICY "project access update venue_service_subscriptions" ON public.venue_service_subscriptions
  FOR UPDATE TO authenticated USING (user_can_access_project(venue_id)) WITH CHECK (user_can_access_project(venue_id));
CREATE POLICY "project access delete venue_service_subscriptions" ON public.venue_service_subscriptions
  FOR DELETE TO authenticated USING (user_can_access_project(venue_id));
CREATE TRIGGER trg_venue_service_subscriptions_updated_at BEFORE UPDATE ON public.venue_service_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. crm_deals.package_id
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.service_packages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_package ON public.crm_deals(package_id);
