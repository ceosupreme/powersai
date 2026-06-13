-- Fix RLS policies to use PERMISSIVE mode (OR logic) instead of RESTRICTIVE (AND logic)
-- This allows users to access their own data OR admins to access all data

-- Drop existing RESTRICTIVE policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create combined PERMISSIVE policies for profiles
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- Drop existing RESTRICTIVE policies on user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create combined PERMISSIVE policies for user_roles
CREATE POLICY "user_roles_select_policy"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_insert_policy"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_update_policy"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_delete_policy"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop existing RESTRICTIVE policies on user_bar_assignments
DROP POLICY IF EXISTS "Users can view own bar assignments" ON public.user_bar_assignments;
DROP POLICY IF EXISTS "Admins can view all bar assignments" ON public.user_bar_assignments;
DROP POLICY IF EXISTS "Admins can insert bar assignments" ON public.user_bar_assignments;
DROP POLICY IF EXISTS "Admins can update bar assignments" ON public.user_bar_assignments;
DROP POLICY IF EXISTS "Admins can delete bar assignments" ON public.user_bar_assignments;

-- Create combined PERMISSIVE policies for user_bar_assignments
CREATE POLICY "user_bar_assignments_select_policy"
  ON public.user_bar_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_bar_assignments_insert_policy"
  ON public.user_bar_assignments FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_bar_assignments_update_policy"
  ON public.user_bar_assignments FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_bar_assignments_delete_policy"
  ON public.user_bar_assignments FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));