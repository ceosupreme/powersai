CREATE TABLE public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX email_suppressions_project_email_lower_idx
  ON public.email_suppressions (project_id, lower(email));

CREATE INDEX email_suppressions_project_idx
  ON public.email_suppressions (project_id);

GRANT SELECT, INSERT, DELETE ON public.email_suppressions TO authenticated;
GRANT ALL ON public.email_suppressions TO service_role;

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

-- Reads: project-access scoped, and client role explicitly excluded.
CREATE POLICY "Non-clients with project access can read suppressions"
  ON public.email_suppressions FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_project(project_id)
    AND NOT public.has_role(auth.uid(), 'client')
  );

-- Writes: admins, or non-client users with project access.
CREATE POLICY "Operators can add suppressions"
  ON public.email_suppressions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_access_project(project_id)
    AND NOT public.has_role(auth.uid(), 'client')
  );

CREATE POLICY "Operators can remove suppressions"
  ON public.email_suppressions FOR DELETE
  TO authenticated
  USING (
    public.user_can_access_project(project_id)
    AND NOT public.has_role(auth.uid(), 'client')
  );