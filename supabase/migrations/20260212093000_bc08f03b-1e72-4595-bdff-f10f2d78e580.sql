
-- Create user_venue_roles table
CREATE TABLE public.user_venue_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES public.bars(id) ON DELETE CASCADE, -- NULL for portfolio-level owner
  role TEXT NOT NULL CHECK (role IN ('owner', 'gm', 'lead', 'foh', 'boh')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, venue_id)
);

-- Enable RLS
ALTER TABLE public.user_venue_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check venue role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_venue_role(_user_id UUID, _venue_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_venue_roles
  WHERE user_id = _user_id
    AND (venue_id = _venue_id OR venue_id IS NULL)
  ORDER BY CASE role
    WHEN 'owner' THEN 1
    WHEN 'gm' THEN 2
    WHEN 'lead' THEN 3
    WHEN 'foh' THEN 4
    WHEN 'boh' THEN 5
  END
  LIMIT 1
$$;

-- RLS policies
CREATE POLICY "Users can read their own venue roles"
ON public.user_venue_roles
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert venue roles"
ON public.user_venue_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update venue roles"
ON public.user_venue_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete venue roles"
ON public.user_venue_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_user_venue_roles_updated_at
BEFORE UPDATE ON public.user_venue_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
