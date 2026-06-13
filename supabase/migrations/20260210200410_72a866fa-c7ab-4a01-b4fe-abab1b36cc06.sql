
-- Migrate existing 'manager' users to 'gm'
UPDATE public.user_roles SET role = 'gm' WHERE role = 'manager';

-- Update the user_can_access_page function to use role_page_defaults
CREATE OR REPLACE FUNCTION public.user_can_access_page(_user_id uuid, _page_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN has_role(_user_id, 'admin') THEN true
      ELSE COALESCE(
        (SELECT enabled FROM public.role_page_defaults 
         WHERE role = (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
           AND page_key = _page_key),
        true
      )
    END
$function$;
