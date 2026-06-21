
CREATE TABLE public.automation_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tier text,
  project_type text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.automation_bundles TO authenticated;
GRANT ALL ON public.automation_bundles TO service_role;

ALTER TABLE public.automation_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read bundles"
  ON public.automation_bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert bundles"
  ON public.automation_bundles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update bundles"
  ON public.automation_bundles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete bundles"
  ON public.automation_bundles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_automation_bundles_updated_at
  BEFORE UPDATE ON public.automation_bundles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.automation_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.automation_bundles(id) ON DELETE CASCADE,
  automation_key text NOT NULL CHECK (automation_key IN ('followup_sequence','reactivation','review_request')),
  default_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, automation_key)
);

GRANT SELECT ON public.automation_bundle_items TO authenticated;
GRANT ALL ON public.automation_bundle_items TO service_role;

ALTER TABLE public.automation_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read bundle items"
  ON public.automation_bundle_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert bundle items"
  ON public.automation_bundle_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update bundle items"
  ON public.automation_bundle_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete bundle items"
  ON public.automation_bundle_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_automation_bundle_items_updated_at
  BEFORE UPDATE ON public.automation_bundle_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_bundle_items_bundle ON public.automation_bundle_items(bundle_id);

-- Seed starter bundles (idempotent via name)
WITH ins AS (
  INSERT INTO public.automation_bundles (name, description, tier, project_type, sort_order)
  VALUES
    ('Tier 2 — Missed Money Recovery',
      'Full Tier 2 package: follow-up sequences, customer reactivation, and review requests.',
      'tier_2', NULL, 0),
    ('Lead Catcher',
      'Just the inbound follow-up sequence — for clients only buying lead nurture.',
      NULL, NULL, 10),
    ('Reviews Engine',
      'Just review-request automation — for clients only buying review growth.',
      NULL, NULL, 20),
    ('Reactivation',
      'Just customer reactivation — for clients only buying lapsed-customer win-back.',
      NULL, NULL, 30)
  ON CONFLICT DO NOTHING
  RETURNING id, name
)
INSERT INTO public.automation_bundle_items (bundle_id, automation_key, default_config, sort_order)
SELECT ins.id, k.automation_key, k.default_config, k.sort_order
FROM ins
JOIN LATERAL (
  VALUES
    ('Tier 2 — Missed Money Recovery', 'followup_sequence', '{"channels":["email"],"sequence_days":[0,1,3,7,14,30],"tone":"professional, direct, friendly","adapters":{"email":"manual_log","sms":"manual_log"}}'::jsonb, 0),
    ('Tier 2 — Missed Money Recovery', 'reactivation',      '{"adapters":{"email":"manual_log","sms":"manual_log"}}'::jsonb, 1),
    ('Tier 2 — Missed Money Recovery', 'review_request',    '{"delay_hours":2,"platform_link":"","venue_name":"","adapters":{"email":"manual_log","sms":"manual_log"}}'::jsonb, 2),
    ('Lead Catcher',   'followup_sequence', '{"channels":["email"],"sequence_days":[0,1,3,7,14,30],"tone":"professional, direct, friendly","adapters":{"email":"manual_log","sms":"manual_log"}}'::jsonb, 0),
    ('Reviews Engine', 'review_request',    '{"delay_hours":2,"platform_link":"","venue_name":"","adapters":{"email":"manual_log","sms":"manual_log"}}'::jsonb, 0),
    ('Reactivation',   'reactivation',      '{"adapters":{"email":"manual_log","sms":"manual_log"}}'::jsonb, 0)
) AS k(bundle_name, automation_key, default_config, sort_order)
  ON k.bundle_name = ins.name;
