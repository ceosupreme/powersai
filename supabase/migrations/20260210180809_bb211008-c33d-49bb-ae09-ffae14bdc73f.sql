
CREATE TABLE public.staff_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  urgent boolean NOT NULL DEFAULT false,
  departments text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.staff_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view announcements for their bars"
  ON public.staff_announcements FOR SELECT
  USING (user_has_bar_access(auth.uid(), bar_id));

CREATE POLICY "Admins can manage announcements"
  ON public.staff_announcements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
