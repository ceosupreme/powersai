
-- CRM SELECT tightening
DROP POLICY IF EXISTS crm_companies_read ON public.crm_companies;
CREATE POLICY crm_companies_read ON public.crm_companies
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS crm_contacts_read ON public.crm_contacts;
CREATE POLICY crm_contacts_read ON public.crm_contacts
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS crm_deals_read ON public.crm_deals;
CREATE POLICY crm_deals_read ON public.crm_deals
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS crm_interactions_read ON public.crm_interactions;
CREATE POLICY crm_interactions_read ON public.crm_interactions
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- inbound_leads admin-only
DROP POLICY IF EXISTS "Authenticated can read inbound leads" ON public.inbound_leads;
CREATE POLICY "Admins can read inbound leads" ON public.inbound_leads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can update inbound leads" ON public.inbound_leads;
CREATE POLICY "Admins can update inbound leads" ON public.inbound_leads
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Remove NULL venue_id bypass
CREATE OR REPLACE FUNCTION public.get_user_venue_role(_user_id uuid, _venue_id uuid)
  RETURNS text
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_venue_roles
  WHERE user_id = _user_id
    AND venue_id = _venue_id
  ORDER BY CASE role
    WHEN 'owner' THEN 1
    WHEN 'gm' THEN 2
    WHEN 'lead' THEN 3
    WHEN 'foh' THEN 4
    WHEN 'boh' THEN 5
  END
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_project(_project_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.venue_assignments WHERE user_id = auth.uid() AND venue_id = _project_id)
    OR EXISTS (SELECT 1 FROM public.user_venue_roles WHERE user_id = auth.uid() AND venue_id = _project_id)
$function$;

-- Column-level revoke: venue_profiles physical security
REVOKE SELECT (alarm_code, safe_combo, wifi_password, liquor_license_number)
  ON public.venue_profiles FROM authenticated, anon;

-- Column-level revoke: venues toast credentials
REVOKE SELECT (toast_client_id, toast_client_secret)
  ON public.venues FROM authenticated, anon;
REVOKE UPDATE (toast_client_id, toast_client_secret)
  ON public.venues FROM authenticated, anon;
REVOKE INSERT (toast_client_id, toast_client_secret)
  ON public.venues FROM authenticated, anon;
