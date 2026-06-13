
-- Update can_view_log_type function to support staff_quick_log
CREATE OR REPLACE FUNCTION public.can_view_log_type(_user_id uuid, _log_type log_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN true
    WHEN public.user_has_position(_user_id, 'general_manager') THEN true
    WHEN _log_type IN ('lead_log', 'staff_quick_log') AND public.user_has_position(_user_id, 'shift_lead') THEN true
    WHEN _log_type = 'staff_quick_log' AND public.user_has_position(_user_id, 'staff') THEN true
    ELSE false
  END
$$;

-- Insert 15 form fields
INSERT INTO form_fields (key, label, field_type, options_json, voice_enabled) VALUES
  ('issue_date', 'Date', 'date', NULL, false),
  ('staff_position', 'Position', 'select', '["FOH","BOH"]'::jsonb, false),
  ('report_type', 'What are you reporting?', 'select', '["Maintenance Issue","Safety Issue","Guest Issue","Staff Issue","Inventory / Product Issue","Incident","Other"]'::jsonb, false),
  ('is_urgent', 'Is this urgent or time-sensitive?', 'boolean', NULL, false),
  ('ql_location', 'Location', 'select', '["Bar","Kitchen","Bathroom","Dining Area","Patio","Storage","Office","Other"]'::jsonb, false),
  ('location_other', 'Other location', 'short_text', NULL, false),
  ('ql_description', 'What happened? (Be brief)', 'long_text', NULL, true),
  ('guest_involved', 'Was a guest involved?', 'boolean', NULL, false),
  ('guest_details', 'Guest details', 'long_text', NULL, true),
  ('staff_involved', 'Was staff involved?', 'boolean', NULL, false),
  ('staff_details', 'Staff details', 'long_text', NULL, true),
  ('item_affected', 'Item affected', 'short_text', NULL, false),
  ('safety_risk', 'Is anyone at risk?', 'boolean', NULL, false),
  ('photo_upload', 'Add photo (optional)', 'short_text', NULL, false),
  ('additional_notes', 'Additional notes', 'long_text', NULL, true);

-- Insert log_type_fields rows individually to avoid UNION type mismatch
INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Basic Info', 1, true, NULL FROM form_fields WHERE key = 'issue_date';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Basic Info', 2, true, NULL FROM form_fields WHERE key = 'staff_position';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'What Are You Reporting?', 3, true, NULL FROM form_fields WHERE key = 'report_type';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Details', 4, false, NULL FROM form_fields WHERE key = 'is_urgent';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Details', 5, false, NULL FROM form_fields WHERE key = 'ql_location';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Details', 6, false, '{"field":"ql_location","equals":"Other"}'::jsonb FROM form_fields WHERE key = 'location_other';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Details', 7, true, NULL FROM form_fields WHERE key = 'ql_description';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Follow-Ups', 8, false, '{"field":"report_type","in":["Guest Issue","Incident"]}'::jsonb FROM form_fields WHERE key = 'guest_involved';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Follow-Ups', 9, false, '{"field":"guest_involved","equals":true}'::jsonb FROM form_fields WHERE key = 'guest_details';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Follow-Ups', 10, false, '{"field":"report_type","in":["Staff Issue","Incident"]}'::jsonb FROM form_fields WHERE key = 'staff_involved';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Follow-Ups', 11, false, '{"field":"staff_involved","equals":true}'::jsonb FROM form_fields WHERE key = 'staff_details';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Follow-Ups', 12, false, '{"field":"report_type","equals":"Inventory / Product Issue"}'::jsonb FROM form_fields WHERE key = 'item_affected';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Follow-Ups', 13, false, '{"field":"report_type","in":["Safety Issue","Incident"]}'::jsonb FROM form_fields WHERE key = 'safety_risk';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Optional Extras', 14, false, NULL FROM form_fields WHERE key = 'photo_upload';

INSERT INTO log_type_fields (log_type, field_id, section, sort_order, required, condition_json)
SELECT 'staff_quick_log'::log_type, id, 'Optional Extras', 15, false, NULL FROM form_fields WHERE key = 'additional_notes';
