-- Applied live on 2026-10-29 and recorded in supabase_migrations.schema_migrations.
--
-- Five tables let ANY signed-in account (including the client logins, and any
-- self-signup while public sign-up is on) read or change HQ-private data:
--   inbound_emails      forwarded mail, readable and editable by every authenticated user
--   site_events         public-site visit log, readable by every authenticated user
--   site_orders         Stripe checkouts, readable by every authenticated user
--   testimonials        fully editable by every authenticated user
--   vertical_research   readable by every authenticated user
-- Only the admin login needs these. The public site keeps logging visits
-- (anon INSERT on site_events) and reading published testimonials; edge
-- functions write with the service role, which bypasses RLS.

DROP POLICY IF EXISTS "signed in read inbound emails" ON public.inbound_emails;
DROP POLICY IF EXISTS "signed in mark inbound emails" ON public.inbound_emails;
CREATE POLICY "admin reads inbound emails" ON public.inbound_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin updates inbound emails" ON public.inbound_emails
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "signed in read site events" ON public.site_events;
CREATE POLICY "admin reads site events" ON public.site_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "signed in read site orders" ON public.site_orders;
CREATE POLICY "admin reads site orders" ON public.site_orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "owner manages testimonials" ON public.testimonials;
CREATE POLICY "admin manages testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "signed in read vertical research" ON public.vertical_research;
CREATE POLICY "admin reads vertical research" ON public.vertical_research
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
