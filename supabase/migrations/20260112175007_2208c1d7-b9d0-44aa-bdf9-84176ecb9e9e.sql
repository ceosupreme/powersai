-- Create table for multi-bar assignments
CREATE TABLE public.user_bar_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bar_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, bar_id)
);

-- Enable RLS
ALTER TABLE public.user_bar_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own bar assignments
CREATE POLICY "Users can view own bar assignments"
  ON public.user_bar_assignments FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all bar assignments
CREATE POLICY "Admins can view all bar assignments"
  ON public.user_bar_assignments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert bar assignments
CREATE POLICY "Admins can insert bar assignments"
  ON public.user_bar_assignments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can update bar assignments
CREATE POLICY "Admins can update bar assignments"
  ON public.user_bar_assignments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete bar assignments
CREATE POLICY "Admins can delete bar assignments"
  ON public.user_bar_assignments FOR DELETE
  USING (has_role(auth.uid(), 'admin'));