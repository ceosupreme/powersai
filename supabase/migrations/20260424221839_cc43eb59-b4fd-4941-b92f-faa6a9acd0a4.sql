CREATE TABLE IF NOT EXISTS public.drink_mix_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_report_type TEXT NOT NULL DEFAULT 'drink_mix',
  raw_header_hash TEXT,
  source_file TEXT,

  plu TEXT NOT NULL,
  recipe_name TEXT,
  qty_sold NUMERIC,
  cost NUMERIC,
  tax_discount_pct NUMERIC,

  regular_price NUMERIC,
  regular_pour_cost_pct NUMERIC,
  regular_total_profit NUMERIC,
  regular_theoretical_profit NUMERIC,

  spill_qty NUMERIC,
  spill_price NUMERIC,
  spill_pour_cost_pct NUMERIC,
  spill_total_profit NUMERIC,
  spill_theoretical_profit NUMERIC,

  comp_qty NUMERIC,
  comp_price NUMERIC,
  comp_pour_cost_pct NUMERIC,
  comp_total_profit NUMERIC,
  comp_theoretical_profit NUMERIC
);

CREATE INDEX IF NOT EXISTS drink_mix_items_venue_period_idx
  ON public.drink_mix_items (venue_id, period_end DESC);

CREATE INDEX IF NOT EXISTS drink_mix_items_venue_plu_idx
  ON public.drink_mix_items (venue_id, plu);

ALTER TABLE public.drink_mix_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access drink_mix_items"
  ON public.drink_mix_items
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view drink_mix_items for their venues"
  ON public.drink_mix_items
  FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete drink_mix_items for their venues"
  ON public.drink_mix_items
  FOR DELETE
  USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));