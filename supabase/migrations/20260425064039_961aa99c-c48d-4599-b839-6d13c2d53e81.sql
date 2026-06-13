
-- ============================================================
-- Sculpture inventory tables: 4 dedicated report stores
-- ============================================================

-- 1. Summary Variance --------------------------------------------------
CREATE TABLE public.inventory_summary_variance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  source_report_type text NOT NULL DEFAULT 'summary_variance',
  raw_header_hash text,
  source_file text,
  category_name text NOT NULL,
  is_grand_total boolean NOT NULL DEFAULT false,
  used numeric,
  sold numeric,
  missing numeric,
  missing_pct numeric,
  missing_cost numeric,
  revenue_potential numeric,
  on_hand_cost numeric,
  used_cost numeric,
  revenue numeric,
  spillage_cost numeric,
  pour_cost_pct numeric,
  ideal_pour_cost_pct numeric,
  sculpture_rating_pct numeric
);

CREATE INDEX idx_inv_summary_variance_venue_period
  ON public.inventory_summary_variance (venue_id, period_end DESC);

ALTER TABLE public.inventory_summary_variance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue members can view summary variance"
  ON public.inventory_summary_variance
  FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and GMs can insert summary variance"
  ON public.inventory_summary_variance
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );

CREATE POLICY "Admins and GMs can delete summary variance"
  ON public.inventory_summary_variance
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );

-- 2. InteliPar ---------------------------------------------------------
CREATE TABLE public.inventory_intelipar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  source_report_type text NOT NULL DEFAULT 'intelipar',
  raw_header_hash text,
  source_file text,
  vendor text,
  total_order numeric,
  order_uom text,
  item_name text,
  item_size text,
  unit_cost numeric,
  on_hand_cost numeric,
  on_hand_qty numeric,
  used numeric,
  historical_usage numeric,
  par numeric,
  excess_stock_onhand numeric,
  days_remaining text
);

CREATE INDEX idx_inv_intelipar_venue_period
  ON public.inventory_intelipar (venue_id, period_end DESC);

ALTER TABLE public.inventory_intelipar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue members can view intelipar"
  ON public.inventory_intelipar
  FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and GMs can insert intelipar"
  ON public.inventory_intelipar
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );

CREATE POLICY "Admins and GMs can delete intelipar"
  ON public.inventory_intelipar
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );

-- 3. Cost History (Cost Fluctuation report) ----------------------------
CREATE TABLE public.inventory_cost_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  source_report_type text NOT NULL DEFAULT 'cost_fluctuation',
  raw_header_hash text,
  source_file text,
  product_name text NOT NULL,
  invoice_date date,
  vendor text,
  invoice_number text,
  price numeric,
  price_difference numeric,
  difference_pct numeric
);

CREATE INDEX idx_inv_cost_history_venue_period
  ON public.inventory_cost_history (venue_id, period_end DESC);
CREATE INDEX idx_inv_cost_history_product
  ON public.inventory_cost_history (venue_id, product_name);

ALTER TABLE public.inventory_cost_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue members can view cost history"
  ON public.inventory_cost_history
  FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and GMs can insert cost history"
  ON public.inventory_cost_history
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );

CREATE POLICY "Admins and GMs can delete cost history"
  ON public.inventory_cost_history
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );

-- 4. Station Stock (Inventory XLSX) ------------------------------------
CREATE TABLE public.inventory_station_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  source_report_type text NOT NULL DEFAULT 'inventory_xlsx',
  raw_header_hash text,
  source_file text,
  item_name text,
  station text,
  item_size text,
  on_hand_qty numeric,
  on_hand_uom text
);

CREATE INDEX idx_inv_station_stock_venue_period
  ON public.inventory_station_stock (venue_id, period_end DESC);
CREATE INDEX idx_inv_station_stock_item_station
  ON public.inventory_station_stock (venue_id, item_name, station);

ALTER TABLE public.inventory_station_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue members can view station stock"
  ON public.inventory_station_stock
  FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and GMs can insert station stock"
  ON public.inventory_station_stock
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );

CREATE POLICY "Admins and GMs can delete station stock"
  ON public.inventory_station_stock
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_position(auth.uid(), 'general_manager')
  );
