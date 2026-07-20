
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name','')
  FROM auth.users u
 WHERE u.raw_user_meta_data->>'invited_role' = 'client'
   AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'client'::app_role
  FROM auth.users u
 WHERE u.raw_user_meta_data->>'invited_role' = 'client'
   AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.venue_assignments (user_id, venue_id, role_at_venue)
SELECT u.id, (u.raw_user_meta_data->>'invited_project_id')::uuid, 'client'
  FROM auth.users u
 WHERE u.raw_user_meta_data->>'invited_role' = 'client'
   AND u.raw_user_meta_data->>'invited_project_id' IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.venue_assignments va
      WHERE va.user_id = u.id
        AND va.venue_id = (u.raw_user_meta_data->>'invited_project_id')::uuid
   );
