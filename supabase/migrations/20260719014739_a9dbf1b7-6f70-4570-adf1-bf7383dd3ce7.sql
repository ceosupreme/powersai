-- Seed role_page_defaults for new pageKey 'project_home' — owner enabled, all others explicit false
INSERT INTO public.role_page_defaults (role, page_key, enabled) VALUES
  ('owner',      'project_home', true),
  ('gm',         'project_home', false),
  ('shift_lead', 'project_home', false),
  ('staff',      'project_home', false),
  ('client',     'project_home', false)
ON CONFLICT (role, page_key) DO UPDATE SET enabled = EXCLUDED.enabled;