
-- Item 1: workspace GID column
ALTER TABLE public.venue_execution_adapters
  ADD COLUMN asana_workspace_gid text;

ALTER TABLE public.venue_execution_adapters
  ADD CONSTRAINT venue_execution_adapters_workspace_gid_format
  CHECK (asana_workspace_gid IS NULL OR asana_workspace_gid ~ '^[0-9]{10,20}$');

-- Item 2: per-user dismissal of onboarding banner
CREATE TABLE public.venue_onboarding_dismissals (
  user_id uuid NOT NULL,
  venue_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

ALTER TABLE public.venue_onboarding_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dismissals"
  ON public.venue_onboarding_dismissals FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own dismissals"
  ON public.venue_onboarding_dismissals FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own dismissals"
  ON public.venue_onboarding_dismissals FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Item 4: Asana sync health tracking
CREATE TABLE public.venue_asana_sync_health (
  venue_id uuid PRIMARY KEY,
  consecutive_failures int NOT NULL DEFAULT 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_asana_sync_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sync health"
  ON public.venue_asana_sync_health FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue owners read sync health"
  ON public.venue_asana_sync_health FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR get_user_venue_role(auth.uid(), venue_id) = 'owner'
  );

CREATE TRIGGER trg_venue_asana_sync_health_updated_at
  BEFORE UPDATE ON public.venue_asana_sync_health
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
