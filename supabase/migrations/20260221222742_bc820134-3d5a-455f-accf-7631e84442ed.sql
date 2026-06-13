
-- Migration 8: RLS policies for all new tables

-- Helper: venue-scoped read for admins + venue members
-- Pattern: admin OR venue_id in user's assigned venues

-- employee_profiles
CREATE POLICY "Admins full access employee_profiles" ON employee_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view employee_profiles" ON employee_profiles FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- venue_profiles
CREATE POLICY "Admins full access venue_profiles" ON venue_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view venue_profiles" ON venue_profiles FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- venue_assignments
CREATE POLICY "Admins full access venue_assignments" ON venue_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own venue_assignments" ON venue_assignments FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- employee_weekly_metrics
CREATE POLICY "Admins full access employee_weekly_metrics" ON employee_weekly_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view employee_weekly_metrics" ON employee_weekly_metrics FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- employee_certifications
CREATE POLICY "Admins full access employee_certifications" ON employee_certifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view employee_certifications" ON employee_certifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employee_profiles ep
    WHERE ep.id = employee_certifications.employee_id
    AND ep.venue_id = ANY(user_venue_ids())
  ));

-- employee_incidents
CREATE POLICY "Admins full access employee_incidents" ON employee_incidents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view employee_incidents" ON employee_incidents FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- employee_reviews
CREATE POLICY "Admins full access employee_reviews" ON employee_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view employee_reviews" ON employee_reviews FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- weekly_briefings
CREATE POLICY "Admins full access weekly_briefings" ON weekly_briefings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view weekly_briefings" ON weekly_briefings FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- knowledge_base
CREATE POLICY "Admins full access knowledge_base" ON knowledge_base FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view knowledge_base" ON knowledge_base FOR SELECT
  USING (
    access_level = 'all_staff'
    OR (access_level = 'managers_only' AND has_role(auth.uid(), 'manager'::app_role))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- doc_acknowledgements
CREATE POLICY "Admins full access doc_acknowledgements" ON doc_acknowledgements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can view own doc_acknowledgements" ON doc_acknowledgements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employee_profiles ep
    WHERE ep.id = doc_acknowledgements.employee_id
    AND (ep.user_id = auth.uid() OR ep.venue_id = ANY(user_venue_ids()))
  ));

-- online_reviews
CREATE POLICY "Admins full access online_reviews" ON online_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view online_reviews" ON online_reviews FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- secret_shop_audits
CREATE POLICY "Admins full access secret_shop_audits" ON secret_shop_audits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view secret_shop_audits" ON secret_shop_audits FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- weekly_sales_mix
CREATE POLICY "Admins full access weekly_sales_mix" ON weekly_sales_mix FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view weekly_sales_mix" ON weekly_sales_mix FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- top_items
CREATE POLICY "Admins full access top_items" ON top_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view top_items" ON top_items FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- toast_benchmarks
CREATE POLICY "Admins full access toast_benchmarks" ON toast_benchmarks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view toast_benchmarks" ON toast_benchmarks FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- marketing_events
CREATE POLICY "Admins full access marketing_events" ON marketing_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view marketing_events" ON marketing_events FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- social_media_posts
CREATE POLICY "Admins full access social_media_posts" ON social_media_posts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view social_media_posts" ON social_media_posts FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- weekly_social_metrics
CREATE POLICY "Admins full access weekly_social_metrics" ON weekly_social_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view weekly_social_metrics" ON weekly_social_metrics FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- promotions
CREATE POLICY "Admins full access promotions" ON promotions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view promotions" ON promotions FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- promo_redemptions
CREATE POLICY "Admins full access promo_redemptions" ON promo_redemptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Venue members can view promo_redemptions" ON promo_redemptions FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));
