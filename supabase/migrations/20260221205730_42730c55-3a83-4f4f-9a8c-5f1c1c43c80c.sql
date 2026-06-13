
-- Create auto_approve_log table
CREATE TABLE public.auto_approve_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id uuid NOT NULL,
  bar_id text NOT NULL,
  action_title text NOT NULL,
  pillar text NOT NULL,
  rule_triggered text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.auto_approve_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto_approve_log"
  ON public.auto_approve_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view auto_approve_log for their bars"
  ON public.auto_approve_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id));

-- Add auto_approved flag to action_items
ALTER TABLE public.action_items
  ADD COLUMN auto_approved boolean NOT NULL DEFAULT false;
