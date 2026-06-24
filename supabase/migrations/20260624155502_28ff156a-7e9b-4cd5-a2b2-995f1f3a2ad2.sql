
-- affiliate_programs
DROP POLICY IF EXISTS "Authenticated can read affiliate_programs" ON public.affiliate_programs;
DROP POLICY IF EXISTS "Authenticated can update affiliate_programs" ON public.affiliate_programs;
DROP POLICY IF EXISTS "Authenticated can delete affiliate_programs" ON public.affiliate_programs;
CREATE POLICY "Owner or admin can read affiliate_programs" ON public.affiliate_programs FOR SELECT USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin can update affiliate_programs" ON public.affiliate_programs FOR UPDATE USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin can delete affiliate_programs" ON public.affiliate_programs FOR DELETE USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- channel_products
DROP POLICY IF EXISTS "Authenticated can read channel_products" ON public.channel_products;
DROP POLICY IF EXISTS "Authenticated can update channel_products" ON public.channel_products;
DROP POLICY IF EXISTS "Authenticated can delete channel_products" ON public.channel_products;
CREATE POLICY "Owner or admin can read channel_products" ON public.channel_products FOR SELECT USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin can update channel_products" ON public.channel_products FOR UPDATE USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin can delete channel_products" ON public.channel_products FOR DELETE USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- service_offers
DROP POLICY IF EXISTS "Authenticated can read service_offers" ON public.service_offers;
DROP POLICY IF EXISTS "Authenticated can update service_offers" ON public.service_offers;
DROP POLICY IF EXISTS "Authenticated can delete service_offers" ON public.service_offers;
CREATE POLICY "Owner or admin can read service_offers" ON public.service_offers FOR SELECT USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin can update service_offers" ON public.service_offers FOR UPDATE USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin can delete service_offers" ON public.service_offers FOR DELETE USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
