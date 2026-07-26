
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'places' CHECK (source IN ('places','social','jobs','network','manual')),
  niche text REFERENCES public.project_types(id) ON UPDATE CASCADE ON DELETE SET NULL,
  city text,
  business_name text NOT NULL,
  place_id text,
  phone text,
  website text,
  rating numeric,
  review_count int,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','checked','queued','contacted','dead','promoted')),
  leak_run_id uuid REFERENCES public.leak_stack_runs(id) ON DELETE SET NULL,
  leak_total numeric,
  risk_total numeric,
  snapshot jsonb,
  shell_venue_id uuid,
  last_error text,
  promoted_lead_id uuid,
  promoted_company_id uuid,
  miner_run_id uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX prospects_place_id_uniq ON public.prospects (place_id) WHERE place_id IS NOT NULL;
CREATE INDEX prospects_status_leak_idx ON public.prospects (status, leak_total DESC NULLS LAST);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can read prospects" ON public.prospects
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
);
CREATE POLICY "Operators can insert prospects" ON public.prospects
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
);
CREATE POLICY "Operators can update prospects" ON public.prospects
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
);
CREATE POLICY "Admins can delete prospects" ON public.prospects
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER prospects_set_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.miner_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche text REFERENCES public.project_types(id) ON UPDATE CASCADE ON DELETE SET NULL,
  city text,
  requested int NOT NULL DEFAULT 0,
  found int NOT NULL DEFAULT 0,
  kept int NOT NULL DEFAULT 0,
  checked int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','complete','failed')),
  error text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.miner_runs TO authenticated;
GRANT ALL ON public.miner_runs TO service_role;
ALTER TABLE public.miner_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can read miner runs" ON public.miner_runs
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
);
CREATE POLICY "Operators can insert miner runs" ON public.miner_runs
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
);
CREATE POLICY "Operators can update miner runs" ON public.miner_runs
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'client')
);

ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_miner_run_fk FOREIGN KEY (miner_run_id)
  REFERENCES public.miner_runs(id) ON DELETE SET NULL;
