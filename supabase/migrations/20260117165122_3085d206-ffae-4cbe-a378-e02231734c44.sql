-- Create bars table for location management
CREATE TABLE public.bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can view bars, only admins can manage
CREATE POLICY "bars_select_policy" ON public.bars
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "bars_insert_policy" ON public.bars
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "bars_update_policy" ON public.bars
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "bars_delete_policy" ON public.bars
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_bars_updated_at
  BEFORE UPDATE ON public.bars
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();