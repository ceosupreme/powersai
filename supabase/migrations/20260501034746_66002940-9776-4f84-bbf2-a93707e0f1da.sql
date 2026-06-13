-- 1. Backfill venue_id from bar_id where missing
UPDATE public.insights
   SET venue_id = bar_id::uuid
 WHERE venue_id IS NULL
   AND bar_id IS NOT NULL;

-- 2. Swap SELECT policy from bar_id to venue_id
DROP POLICY IF EXISTS "Select insights" ON public.insights;

CREATE POLICY "Select insights" ON public.insights
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_has_bar_access(auth.uid(), (venue_id)::text)
  );