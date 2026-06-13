-- Drop existing task policies
DROP POLICY IF EXISTS "Users can create tasks for their bars" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks for their bars" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bars" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bars" ON public.tasks;

-- Recreate with admin access
CREATE POLICY "Users can create tasks for their bars" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id)
);

CREATE POLICY "Users can view tasks for their bars" 
ON public.tasks 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id)
);

CREATE POLICY "Users can update tasks for their bars" 
ON public.tasks 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id)
);

CREATE POLICY "Users can delete tasks for their bars" 
ON public.tasks 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR user_has_bar_access(auth.uid(), bar_id)
);