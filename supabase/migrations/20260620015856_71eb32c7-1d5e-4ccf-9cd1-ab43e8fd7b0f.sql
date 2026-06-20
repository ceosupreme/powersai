
-- Pillar templates
INSERT INTO public.pillar_templates (project_type, pillar_key, pillar_label, weight, sort_order, data_source) VALUES
  ('home_services', 'demand_capture',         'Demand Capture',          30, 10, NULL),
  ('home_services', 'sales_estimates',        'Sales & Estimates',       25, 20, NULL),
  ('home_services', 'capacity_dispatch',      'Capacity & Dispatch',     20, 30, NULL),
  ('home_services', 'retention_membership',   'Retention & Membership',  15, 40, NULL),
  ('home_services', 'reputation',             'Reputation',              10, 50, NULL)
ON CONFLICT (project_type, pillar_key) DO NOTHING;

-- Leak vectors
INSERT INTO public.project_type_leak_vectors
  (project_type, name, detect_signal, dollarize_formula, benchmark, severity, sort_order) VALUES
  ('home_services', 'Missed calls',
   'inbound call without answer or callback within SLA',
   'missed_calls * booking_rate * avg_ticket',
   '< 5% missed during business hours',
   'headline', 10),
  ('home_services', 'Unsold estimates',
   'estimate sent without sold/lost disposition in N days',
   'open_estimates * close_rate * avg_ticket',
   '> 40% close rate',
   'headline', 20),
  ('home_services', 'Lapsing memberships',
   'membership past renewal window without renewal',
   'lapsing_members * monthly_value * 12',
   '< 10% lapse rate',
   'supporting', 30)
ON CONFLICT (project_type, name) DO NOTHING;

-- Qualifier fields
INSERT INTO public.project_type_qualifier_fields
  (project_type, field_key, field_label, field_type, is_shared, channel, sort_order) VALUES
  ('home_services', 'contact',                'Contact',                 'text',    true,  'phone', 10),
  ('home_services', 'location',               'Location',                'text',    true,  'phone', 20),
  ('home_services', 'urgency',                'Urgency',                 'select',  true,  'phone', 30),
  ('home_services', 'budget_signal',          'Budget Signal',           'text',    true,  'phone', 40),
  ('home_services', 'timeline',               'Timeline',                'text',    true,  'phone', 50),
  ('home_services', 'trade',                  'Trade',                   'select',  false, 'phone', 60),
  ('home_services', 'job_type',               'Job Type',                'select',  false, 'phone', 70),
  ('home_services', 'service_area',           'Service Area',            'text',    false, 'phone', 80),
  ('home_services', 'emergency_vs_scheduled', 'Emergency vs Scheduled',  'select',  false, 'phone', 90),
  ('home_services', 'property_type',          'Property Type',           'select',  false, 'phone', 100)
ON CONFLICT (project_type, field_key) DO NOTHING;

-- Qualifier config
INSERT INTO public.project_type_qualifier_config (project_type, ready_definition, primary_channel) VALUES
  ('home_services',
   'in-area job of a type the operator wants, with urgency + contactable',
   'phone')
ON CONFLICT (project_type) DO NOTHING;
