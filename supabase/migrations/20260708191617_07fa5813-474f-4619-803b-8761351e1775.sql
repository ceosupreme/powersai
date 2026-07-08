
ALTER TABLE public.project_type_qualifier_config
  ADD COLUMN IF NOT EXISTS operation_footprint_options jsonb NULL;

UPDATE public.project_type_qualifier_config
   SET operation_footprint_options = jsonb_build_object(
         'solo_owner', jsonb_build_object(
            'label', 'Solo owner-operator',
            'guidance', 'One person doing everything — sales, service, admin.'
         ),
         'small_crew_2_5', jsonb_build_object(
            'label', 'Small crew (2–5)',
            'guidance', 'Owner plus a handful of technicians.'
         ),
         'crew_6_plus', jsonb_build_object(
            'label', 'Larger crew (6+)',
            'guidance', 'Full-time office and multiple crews.'
         ),
         'multi_location', jsonb_build_object(
            'label', 'Multi-location',
            'guidance', 'More than one branch, region, or franchise.'
         )
       )
 WHERE project_type = 'home_services';
