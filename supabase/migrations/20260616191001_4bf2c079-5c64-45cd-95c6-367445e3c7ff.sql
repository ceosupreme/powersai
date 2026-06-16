
-- 1. affiliate_programs (global)
CREATE TABLE public.affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  niche text,
  commission_type text,
  commission_detail text,
  link text,
  status text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_programs TO authenticated;
GRANT ALL ON public.affiliate_programs TO service_role;
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read affiliate_programs" ON public.affiliate_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert affiliate_programs" ON public.affiliate_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update affiliate_programs" ON public.affiliate_programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete affiliate_programs" ON public.affiliate_programs FOR DELETE TO authenticated USING (true);
CREATE TRIGGER affiliate_programs_set_updated_at BEFORE UPDATE ON public.affiliate_programs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. channel_products (global)
CREATE TABLE public.channel_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(12,2),
  funnel_stage text,
  lead_magnet text,
  sales_page_url text,
  status text,
  monthly_sales numeric,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_products TO authenticated;
GRANT ALL ON public.channel_products TO service_role;
ALTER TABLE public.channel_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read channel_products" ON public.channel_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert channel_products" ON public.channel_products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update channel_products" ON public.channel_products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete channel_products" ON public.channel_products FOR DELETE TO authenticated USING (true);
CREATE TRIGGER channel_products_set_updated_at BEFORE UPDATE ON public.channel_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. channel_product_channels (join)
CREATE TABLE public.channel_product_channels (
  product_id uuid NOT NULL REFERENCES public.channel_products(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, project_id)
);
CREATE INDEX channel_product_channels_project_idx ON public.channel_product_channels(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_product_channels TO authenticated;
GRANT ALL ON public.channel_product_channels TO service_role;
ALTER TABLE public.channel_product_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read product channel links" ON public.channel_product_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Project-access required to attach products" ON public.channel_product_channels FOR INSERT TO authenticated WITH CHECK (public.user_can_access_project(project_id));
CREATE POLICY "Project-access required to detach products" ON public.channel_product_channels FOR DELETE TO authenticated USING (public.user_can_access_project(project_id));

-- 4. Wire real FKs (verified 0 non-null values prior)
ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.channel_products(id) ON DELETE SET NULL;

ALTER TABLE public.channel_revenue
  ADD CONSTRAINT channel_revenue_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.channel_products(id) ON DELETE SET NULL;
