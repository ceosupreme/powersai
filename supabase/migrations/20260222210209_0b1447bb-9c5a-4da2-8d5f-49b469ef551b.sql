ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS asana_score_section_gid text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS asana_write_project_gid text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS asana_write_section_gid text;