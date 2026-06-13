-- Create user_page_permissions table
CREATE TABLE public.user_page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_key)
);

-- Enable RLS
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own permissions
CREATE POLICY "Users can view own page permissions"
ON public.user_page_permissions
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Only admins can insert permissions
CREATE POLICY "Admins can insert page permissions"
ON public.user_page_permissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update permissions
CREATE POLICY "Admins can update page permissions"
ON public.user_page_permissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can delete permissions
CREATE POLICY "Admins can delete page permissions"
ON public.user_page_permissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create security definer function to check page access
CREATE OR REPLACE FUNCTION public.user_can_access_page(_user_id uuid, _page_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins always have access
    CASE WHEN has_role(_user_id, 'admin') THEN true
    -- Dashboard is always accessible
    WHEN _page_key = 'dashboard' THEN true
    -- Check if there's an explicit disabled permission
    WHEN EXISTS (
      SELECT 1 FROM public.user_page_permissions
      WHERE user_id = _user_id AND page_key = _page_key AND enabled = false
    ) THEN false
    -- Default to enabled if no permission row exists
    ELSE true
    END
$$;

-- Add updated_at trigger
CREATE TRIGGER update_user_page_permissions_updated_at
BEFORE UPDATE ON public.user_page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();