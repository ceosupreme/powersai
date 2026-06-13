-- Help & guidance: per-user state + checklist progress
CREATE TABLE public.user_help_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  help_enabled boolean NOT NULL DEFAULT true,
  dismissed_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_help_state TO authenticated;
GRANT ALL ON public.user_help_state TO service_role;

ALTER TABLE public.user_help_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own help state"
  ON public.user_help_state FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_help_state_updated_at
  BEFORE UPDATE ON public.user_help_state
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE public.user_checklist_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_checklist_progress TO authenticated;
GRANT ALL ON public.user_checklist_progress TO service_role;

ALTER TABLE public.user_checklist_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own checklist progress"
  ON public.user_checklist_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());