
ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS urgency_class text
    CHECK (urgency_class IN ('emergency','same_day','routine','estimate','maintenance')),
  ADD COLUMN IF NOT EXISTS urgency_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_inbound_leads_urgency_emergency
  ON public.inbound_leads (created_at DESC)
  WHERE urgency_class = 'emergency' AND first_response_at IS NULL;

ALTER TABLE public.project_type_qualifier_config
  ADD COLUMN IF NOT EXISTS urgency_options jsonb;

-- NOTE: urgency_options keys MUST stay within the five canonical classes
-- enforced by the inbound_leads.urgency_class CHECK constraint:
-- 'emergency','same_day','routine','estimate','maintenance'.
-- Adding new keys requires updating the CHECK constraint first.
UPDATE public.project_type_qualifier_config
SET urgency_options = jsonb_build_object(
  'emergency',   jsonb_build_object('label','Emergency','guidance','Active flooding, burst pipe, no heat/AC in extreme weather, no power, gas smell — needs someone NOW.'),
  'same_day',    jsonb_build_object('label','Same day','guidance','Broken but not dangerous; wants service today if possible.'),
  'routine',     jsonb_build_object('label','Routine','guidance','Standard repair or install, flexible within the week.'),
  'estimate',    jsonb_build_object('label','Estimate','guidance','Shopping quotes for planned work; no immediate need.'),
  'maintenance', jsonb_build_object('label','Maintenance','guidance','Preventive tune-up, seasonal check, or recurring service.')
)
WHERE project_type = 'home_services';
