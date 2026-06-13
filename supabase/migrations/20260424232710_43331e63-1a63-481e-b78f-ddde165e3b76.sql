ALTER TABLE public.drink_mix_items
  ADD COLUMN IF NOT EXISTS sales_2_qty                 numeric,
  ADD COLUMN IF NOT EXISTS sales_2_price               numeric,
  ADD COLUMN IF NOT EXISTS sales_2_pour_cost_pct       numeric,
  ADD COLUMN IF NOT EXISTS sales_2_total_profit        numeric,
  ADD COLUMN IF NOT EXISTS sales_2_theoretical_profit  numeric;