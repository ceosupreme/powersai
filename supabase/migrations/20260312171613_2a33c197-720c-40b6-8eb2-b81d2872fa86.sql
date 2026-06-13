
CREATE TABLE public.manual_upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  venue_id UUID REFERENCES public.venues(id),
  bar_id TEXT,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'labor',
  method TEXT NOT NULL DEFAULT 'csv_upload',
  record_count INTEGER NOT NULL DEFAULT 0,
  file_name TEXT,
  previous_values JSONB,
  reverted_at TIMESTAMPTZ
);

ALTER TABLE public.manual_upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage upload history"
  ON public.manual_upload_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
