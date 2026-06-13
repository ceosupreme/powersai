
-- 1. Create shift_feedback table for 7shifts shift feedback data
CREATE TABLE public.shift_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  feedback_date date NOT NULL,
  employee_name text,
  employee_id bigint,
  rating integer NOT NULL,
  comment text,
  shift_id bigint,
  seven_shifts_id bigint,
  shift_start timestamptz,
  shift_end timestamptz,
  location_id bigint,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bar_id, seven_shifts_id)
);

ALTER TABLE public.shift_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read shift_feedback" ON public.shift_feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service insert shift_feedback" ON public.shift_feedback
  FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Add task_source column to venues
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS task_source text DEFAULT 'none';

-- Auto-set based on existing config
UPDATE public.venues SET task_source = 'asana' WHERE asana_project_gid IS NOT NULL AND task_source = 'none';
UPDATE public.venues SET task_source = '7shifts' WHERE asana_project_gid IS NULL AND seven_shifts_location_id IS NOT NULL AND task_source = 'none';
