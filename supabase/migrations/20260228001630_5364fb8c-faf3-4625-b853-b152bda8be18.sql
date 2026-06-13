
-- Create inventory_reports table
CREATE TABLE public.inventory_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'detailed',
  source_file TEXT,
  total_missing_cost NUMERIC,
  sculpture_rating NUMERIC,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.inventory_reports(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_category_total BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  used NUMERIC,
  sold NUMERIC,
  missing NUMERIC,
  missing_pct NUMERIC,
  missing_cost NUMERIC,
  pour_cost NUMERIC,
  ideal_pour_cost NUMERIC,
  sculpture_rating NUMERIC,
  on_hand NUMERIC,
  purchases NUMERIC,
  revenue NUMERIC,
  spillage_cost NUMERIC,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);

-- Enable RLS
ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_reports
CREATE POLICY "Users can view inventory reports for their venues"
  ON public.inventory_reports FOR SELECT
  USING (venue_id = ANY(public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert inventory reports for their venues"
  ON public.inventory_reports FOR INSERT
  WITH CHECK (venue_id = ANY(public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete inventory reports for their venues"
  ON public.inventory_reports FOR DELETE
  USING (venue_id = ANY(public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for inventory_items
CREATE POLICY "Users can view inventory items for their venues"
  ON public.inventory_items FOR SELECT
  USING (venue_id = ANY(public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert inventory items for their venues"
  ON public.inventory_items FOR INSERT
  WITH CHECK (venue_id = ANY(public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete inventory items for their venues"
  ON public.inventory_items FOR DELETE
  USING (venue_id = ANY(public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

-- Service role bypass for edge functions
CREATE POLICY "Service role full access reports"
  ON public.inventory_reports FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access items"
  ON public.inventory_items FOR ALL
  USING (auth.role() = 'service_role');

-- Create storage bucket for raw file archival
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-uploads', 'inventory-uploads', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload inventory files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inventory-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read inventory files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory-uploads' AND auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_inventory_reports_venue_period ON public.inventory_reports(venue_id, period_start, period_end);
CREATE INDEX idx_inventory_items_report ON public.inventory_items(report_id);
CREATE INDEX idx_inventory_items_venue_period ON public.inventory_items(venue_id, period_start, period_end);
