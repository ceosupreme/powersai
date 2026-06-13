CREATE TABLE public.asana_gm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  gm_asana_gid TEXT NOT NULL,
  task_gid TEXT NOT NULL,
  name TEXT,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_on DATE,
  created_at_asana TIMESTAMPTZ,
  modified_at_asana TIMESTAMPTZ,
  permalink_url TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asana_gm_tasks_venue_task_unique UNIQUE (venue_id, task_gid)
);

CREATE INDEX idx_asana_gm_tasks_venue_completed ON public.asana_gm_tasks (venue_id, completed);
CREATE INDEX idx_asana_gm_tasks_gm_gid ON public.asana_gm_tasks (gm_asana_gid);
CREATE INDEX idx_asana_gm_tasks_due_on ON public.asana_gm_tasks (due_on);

ALTER TABLE public.asana_gm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue members can view GM tasks"
ON public.asana_gm_tasks
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR venue_id = ANY (public.user_venue_ids())
);

CREATE POLICY "Service role can insert GM tasks"
ON public.asana_gm_tasks
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update GM tasks"
ON public.asana_gm_tasks
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete GM tasks"
ON public.asana_gm_tasks
FOR DELETE
TO service_role
USING (true);