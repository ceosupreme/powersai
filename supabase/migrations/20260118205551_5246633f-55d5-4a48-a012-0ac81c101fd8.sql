-- =============================================
-- DAILY LOGS SYSTEM - DATABASE SCHEMA
-- =============================================

-- 1. CREATE ENUMS
-- =============================================

-- Position enum (maps to log access)
CREATE TYPE public.log_position AS ENUM ('general_manager', 'shift_lead');

-- Log type enum
CREATE TYPE public.log_type AS ENUM ('gm_log', 'lead_log');

-- Field type enum
CREATE TYPE public.field_type AS ENUM (
  'short_text', 'long_text', 'number', 'boolean', 
  'select', 'date', 'time', 'rating_1_10'
);

-- Log status enum
CREATE TYPE public.log_status AS ENUM ('draft', 'submitted');

-- 2. CREATE TABLES
-- =============================================

-- User positions junction table (users can have multiple positions)
CREATE TABLE public.user_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position public.log_position NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, position)
);

-- Form fields definitions (seed data)
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  field_type public.field_type NOT NULL,
  options_json JSONB,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which fields belong to which log type, in what order
CREATE TABLE public.log_type_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type public.log_type NOT NULL,
  field_id UUID NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  condition_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (log_type, field_id)
);

-- Log entries (a single log submission)
CREATE TABLE public.log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type public.log_type NOT NULL,
  bar_id TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.log_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log entry values (EAV pattern for field values)
CREATE TABLE public.log_entry_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_entry_id UUID NOT NULL REFERENCES public.log_entries(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  value_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (log_entry_id, field_id)
);

-- 3. CREATE INDEXES
-- =============================================
CREATE INDEX idx_user_positions_user_id ON public.user_positions(user_id);
CREATE INDEX idx_log_type_fields_log_type ON public.log_type_fields(log_type);
CREATE INDEX idx_log_entries_bar_id ON public.log_entries(bar_id);
CREATE INDEX idx_log_entries_created_by ON public.log_entries(created_by);
CREATE INDEX idx_log_entries_status ON public.log_entries(status);
CREATE INDEX idx_log_entry_values_log_entry_id ON public.log_entry_values(log_entry_id);

-- 4. CREATE TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_log_entries_updated_at
  BEFORE UPDATE ON public.log_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_log_entry_values_updated_at
  BEFORE UPDATE ON public.log_entry_values
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. SECURITY DEFINER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.user_has_position(_user_id uuid, _position log_position)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_positions
    WHERE user_id = _user_id AND position = _position
  ) OR public.has_role(_user_id, 'admin')
$$;

-- Helper function to check if user can view a specific log type
CREATE OR REPLACE FUNCTION public.can_view_log_type(_user_id uuid, _log_type log_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Admins can view everything
    WHEN public.has_role(_user_id, 'admin') THEN true
    -- GMs can view both log types
    WHEN public.user_has_position(_user_id, 'general_manager') THEN true
    -- Shift leads can only view lead_log
    WHEN _log_type = 'lead_log' AND public.user_has_position(_user_id, 'shift_lead') THEN true
    ELSE false
  END
$$;

-- 6. ENABLE RLS
-- =============================================
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_type_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entry_values ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES
-- =============================================

-- user_positions: Users can see their own, admins can see all
CREATE POLICY "Users can view own positions"
  ON public.user_positions FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert positions"
  ON public.user_positions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update positions"
  ON public.user_positions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete positions"
  ON public.user_positions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- form_fields: Everyone can read (reference data)
CREATE POLICY "Anyone can view form fields"
  ON public.form_fields FOR SELECT
  USING (true);

-- log_type_fields: Everyone can read (reference data)
CREATE POLICY "Anyone can view log type fields"
  ON public.log_type_fields FOR SELECT
  USING (true);

-- log_entries: Complex position-based access
CREATE POLICY "Users can view logs based on position and bar access"
  ON public.log_entries FOR SELECT
  USING (
    user_has_bar_access(auth.uid(), bar_id) 
    AND can_view_log_type(auth.uid(), log_type)
  );

CREATE POLICY "Users can create logs for their bars"
  ON public.log_entries FOR INSERT
  WITH CHECK (
    user_has_bar_access(auth.uid(), bar_id)
    AND auth.uid() = created_by
  );

CREATE POLICY "Users can update own draft logs"
  ON public.log_entries FOR UPDATE
  USING (
    auth.uid() = created_by 
    AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Users can delete own draft logs"
  ON public.log_entries FOR DELETE
  USING (
    auth.uid() = created_by 
    AND status = 'draft'
  );

-- log_entry_values: Inherit from parent log_entries
CREATE POLICY "Users can view values for accessible logs"
  ON public.log_entry_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.log_entries le
      WHERE le.id = log_entry_id
      AND user_has_bar_access(auth.uid(), le.bar_id)
      AND can_view_log_type(auth.uid(), le.log_type)
    )
  );

CREATE POLICY "Users can insert values for own draft logs"
  ON public.log_entry_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.log_entries le
      WHERE le.id = log_entry_id
      AND le.created_by = auth.uid()
      AND le.status = 'draft'
    )
  );

CREATE POLICY "Users can update values for own draft logs"
  ON public.log_entry_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.log_entries le
      WHERE le.id = log_entry_id
      AND le.created_by = auth.uid()
      AND le.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.log_entries le
      WHERE le.id = log_entry_id
      AND le.created_by = auth.uid()
      AND le.status = 'draft'
    )
  );

CREATE POLICY "Users can delete values for own draft logs"
  ON public.log_entry_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.log_entries le
      WHERE le.id = log_entry_id
      AND le.created_by = auth.uid()
      AND le.status = 'draft'
    )
  );

-- 8. SEED FORM FIELDS DATA
-- =============================================

-- GM LOG FIELDS
INSERT INTO public.form_fields (key, label, field_type, options_json, voice_enabled) VALUES
  ('gm_date', 'Date', 'date', NULL, false),
  ('gm_on_duty', 'GM on Duty', 'short_text', NULL, false),
  ('opening_manager', 'Opening Manager', 'short_text', NULL, false),
  ('closing_manager', 'Closing Manager', 'short_text', NULL, false),
  ('expected_close_time', 'Expected Close Time', 'time', NULL, false),
  ('overall_shift_summary', 'Overall Shift Summary', 'long_text', NULL, true),
  ('pacing', 'Pacing', 'select', '["Slow", "Steady", "Busy", "Slammed"]', false),
  ('staffing_issues', 'Staffing Issues', 'boolean', NULL, false),
  ('guest_vibe', 'Guest Vibe', 'select', '["Good", "Mixed", "Problematic"]', false),
  ('staff_highlights', 'Staff Highlights', 'long_text', NULL, true),
  ('coaching_corrections', 'Coaching/Corrections', 'long_text', NULL, true),
  ('team_energy', 'Team Energy', 'select', '["High", "Medium", "Low"]', false),
  ('training_needs', 'Training Needs', 'long_text', NULL, true),
  ('items_86d', 'Items 86''d', 'long_text', NULL, true),
  ('low_stock_watchlist', 'Low Stock Watchlist', 'long_text', NULL, true),
  ('prep_issues', 'Prep Issues', 'select', '["Too much", "Too little", "Missed items", "None"]', false),
  ('waste_comps', 'Waste/Comps', 'long_text', NULL, true),
  ('broken_items', 'Broken Items', 'long_text', NULL, true),
  ('new_problems_noticed', 'New Problems Noticed', 'long_text', NULL, true),
  ('cleanliness_notes', 'Cleanliness Notes', 'long_text', NULL, true),
  ('safety_concerns', 'Safety Concerns', 'long_text', NULL, true),
  ('guest_complaints_and_resolutions', 'Guest Complaints and Resolutions', 'long_text', NULL, true),
  ('guest_compliments', 'Guest Compliments', 'long_text', NULL, true),
  ('vips_regulars_spotted', 'VIPs/Regulars Spotted', 'long_text', NULL, true),
  ('events_today', 'Events Today', 'long_text', NULL, true),
  ('performance_snapshot', 'Performance Snapshot', 'long_text', NULL, true),
  ('promo_notes', 'Promo Notes', 'long_text', NULL, true),
  ('content_opportunities', 'Content Opportunities', 'long_text', NULL, true),
  ('voids_discounts_unusual', 'Voids/Discounts (Unusual)', 'long_text', NULL, true),
  ('deposits_cash_handling', 'Deposits/Cash Handling', 'long_text', NULL, true),
  ('register_issues', 'Register Issues', 'long_text', NULL, true),
  ('incidents', 'Incidents', 'long_text', NULL, true),
  ('id_issues', 'ID Issues', 'long_text', NULL, true),
  ('police_fire_interactions', 'Police/Fire Interactions', 'long_text', NULL, true),
  ('top_3_morning_tasks', 'Top 3 Morning Tasks', 'long_text', NULL, true),
  ('staffing_concerns_tomorrow', 'Staffing Concerns Tomorrow', 'long_text', NULL, true),
  ('orders_needed_tomorrow', 'Orders Needed Tomorrow', 'long_text', NULL, true);

-- SHIFT LEAD LOG FIELDS
INSERT INTO public.form_fields (key, label, field_type, options_json, voice_enabled) VALUES
  ('lead_date', 'Date', 'date', NULL, false),
  ('cleaning_issues', 'Cleaning Issues', 'long_text', NULL, true),
  ('business_flow', 'Business Flow', 'long_text', NULL, true),
  ('tickets_over_20_min', 'Tickets Over 20 Min', 'number', NULL, false),
  ('toast_computer_issues', 'Toast/Computer Issues', 'long_text', NULL, true),
  ('staffing_levels', 'Staffing Levels', 'select', '["Overstaffed", "Understaffed", "Perfectly staffed"]', false),
  ('staffing_adjustments_needed', 'Staffing Adjustments Needed', 'long_text', NULL, true),
  ('customer_issues', 'Customer Issues', 'long_text', NULL, true),
  ('new_customers_connection', 'New Customers Connection', 'long_text', NULL, true),
  ('improvements_for_htp', 'Improvements for HTP', 'long_text', NULL, true),
  ('out_of_anything', 'Out of Anything', 'long_text', NULL, true),
  ('his_and_byes', 'Hi''s and Bye''s', 'long_text', NULL, true),
  ('clock_out_time', 'Clock Out Time', 'time', NULL, false),
  ('product_performance', 'Product Performance', 'long_text', NULL, true),
  ('foh_efficiency_rating', 'FOH Efficiency Rating', 'rating_1_10', NULL, false),
  ('boh_flow_management', 'BOH Flow Management', 'long_text', NULL, true);

-- 9. SEED LOG_TYPE_FIELDS (with explicit enum casts)
-- =============================================

-- GM LOG FIELD MAPPINGS - Basic Info
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Basic Info', 1, true FROM public.form_fields WHERE key = 'gm_date';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Basic Info', 2, true FROM public.form_fields WHERE key = 'gm_on_duty';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Basic Info', 3, false FROM public.form_fields WHERE key = 'opening_manager';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Basic Info', 4, false FROM public.form_fields WHERE key = 'closing_manager';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Basic Info', 5, false FROM public.form_fields WHERE key = 'expected_close_time';

-- GM LOG FIELD MAPPINGS - Operations Check-In
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Operations Check-In', 1, true FROM public.form_fields WHERE key = 'overall_shift_summary';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Operations Check-In', 2, false FROM public.form_fields WHERE key = 'pacing';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Operations Check-In', 3, false FROM public.form_fields WHERE key = 'staffing_issues';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Operations Check-In', 4, false FROM public.form_fields WHERE key = 'guest_vibe';

-- GM LOG FIELD MAPPINGS - Staff & Service
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Staff & Service', 1, false FROM public.form_fields WHERE key = 'staff_highlights';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Staff & Service', 2, false FROM public.form_fields WHERE key = 'coaching_corrections';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Staff & Service', 3, false FROM public.form_fields WHERE key = 'team_energy';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Staff & Service', 4, false FROM public.form_fields WHERE key = 'training_needs';

-- GM LOG FIELD MAPPINGS - Inventory & Product
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Inventory & Product', 1, false FROM public.form_fields WHERE key = 'items_86d';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Inventory & Product', 2, false FROM public.form_fields WHERE key = 'low_stock_watchlist';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Inventory & Product', 3, false FROM public.form_fields WHERE key = 'prep_issues';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Inventory & Product', 4, false FROM public.form_fields WHERE key = 'waste_comps';

-- GM LOG FIELD MAPPINGS - Maintenance & Facility
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Maintenance & Facility', 1, false FROM public.form_fields WHERE key = 'broken_items';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Maintenance & Facility', 2, false FROM public.form_fields WHERE key = 'new_problems_noticed';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Maintenance & Facility', 3, false FROM public.form_fields WHERE key = 'cleanliness_notes';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Maintenance & Facility', 4, false FROM public.form_fields WHERE key = 'safety_concerns';

-- GM LOG FIELD MAPPINGS - Guest Notes
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Guest Notes', 1, false FROM public.form_fields WHERE key = 'guest_complaints_and_resolutions';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Guest Notes', 2, false FROM public.form_fields WHERE key = 'guest_compliments';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Guest Notes', 3, false FROM public.form_fields WHERE key = 'vips_regulars_spotted';

-- GM LOG FIELD MAPPINGS - Marketing / Events
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Marketing / Events', 1, false FROM public.form_fields WHERE key = 'events_today';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Marketing / Events', 2, false FROM public.form_fields WHERE key = 'performance_snapshot';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Marketing / Events', 3, false FROM public.form_fields WHERE key = 'promo_notes';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Marketing / Events', 4, false FROM public.form_fields WHERE key = 'content_opportunities';

-- GM LOG FIELD MAPPINGS - Cash / Admin
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Cash / Admin', 1, false FROM public.form_fields WHERE key = 'voids_discounts_unusual';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Cash / Admin', 2, false FROM public.form_fields WHERE key = 'deposits_cash_handling';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Cash / Admin', 3, false FROM public.form_fields WHERE key = 'register_issues';

-- GM LOG FIELD MAPPINGS - Security & Risk
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Security & Risk', 1, false FROM public.form_fields WHERE key = 'incidents';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Security & Risk', 2, false FROM public.form_fields WHERE key = 'id_issues';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Security & Risk', 3, false FROM public.form_fields WHERE key = 'police_fire_interactions';

-- GM LOG FIELD MAPPINGS - Tomorrow Prep
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Tomorrow Prep', 1, false FROM public.form_fields WHERE key = 'top_3_morning_tasks';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Tomorrow Prep', 2, false FROM public.form_fields WHERE key = 'staffing_concerns_tomorrow';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'gm_log'::log_type, id, 'Tomorrow Prep', 3, false FROM public.form_fields WHERE key = 'orders_needed_tomorrow';

-- LEAD LOG FIELD MAPPINGS - Shift Check-In
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 1, true FROM public.form_fields WHERE key = 'lead_date';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 2, false FROM public.form_fields WHERE key = 'cleaning_issues';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 3, false FROM public.form_fields WHERE key = 'business_flow';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 4, false FROM public.form_fields WHERE key = 'tickets_over_20_min';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 5, false FROM public.form_fields WHERE key = 'toast_computer_issues';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 6, false FROM public.form_fields WHERE key = 'staffing_levels';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 7, false FROM public.form_fields WHERE key = 'staffing_adjustments_needed';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 8, false FROM public.form_fields WHERE key = 'customer_issues';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 9, false FROM public.form_fields WHERE key = 'new_customers_connection';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 10, false FROM public.form_fields WHERE key = 'improvements_for_htp';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 11, false FROM public.form_fields WHERE key = 'out_of_anything';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 12, false FROM public.form_fields WHERE key = 'his_and_byes';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Shift Check-In', 13, false FROM public.form_fields WHERE key = 'clock_out_time';

-- LEAD LOG FIELD MAPPINGS - Kitchen Check-In
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Kitchen Check-In', 1, false FROM public.form_fields WHERE key = 'product_performance';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Kitchen Check-In', 2, false FROM public.form_fields WHERE key = 'foh_efficiency_rating';
INSERT INTO public.log_type_fields (log_type, field_id, section, sort_order, required)
SELECT 'lead_log'::log_type, id, 'Kitchen Check-In', 3, false FROM public.form_fields WHERE key = 'boh_flow_management';