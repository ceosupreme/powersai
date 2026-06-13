
-- ─── website_mappings ───────────────────────────────────────────────
CREATE TABLE public.website_mappings (
  venue_id uuid PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  website_url text,
  canonical_url text,
  cms_detected text,
  js_heavy boolean NOT NULL DEFAULT false,
  manual_only boolean NOT NULL DEFAULT false,
  last_resolved_at timestamptz,
  last_resolve_error text,
  consecutive_fetch_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all website mappings"
  ON public.website_mappings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue users can read their website mappings"
  ON public.website_mappings FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()));

CREATE POLICY "Venue owners/gms can insert their website mappings"
  ON public.website_mappings FOR INSERT
  WITH CHECK (
    venue_id = ANY (public.user_venue_ids())
    AND public.get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm')
  );

CREATE POLICY "Venue owners/gms can update their website mappings"
  ON public.website_mappings FOR UPDATE
  USING (
    venue_id = ANY (public.user_venue_ids())
    AND public.get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm')
  );

CREATE TRIGGER website_mappings_updated_at
  BEFORE UPDATE ON public.website_mappings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── website_snapshots ──────────────────────────────────────────────
CREATE TABLE public.website_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('automated','manual')),
  scope text NOT NULL CHECK (scope IN ('weekly_full','daily_pagespeed','manual_entry')),

  -- site-level
  http_status integer,
  response_ms integer,
  https_enabled boolean,
  sitemap_present boolean,
  robots_present boolean,
  robots_allows_crawl boolean,
  discovered_page_count integer,
  mobile_friendly boolean,
  cms_detected text,
  fetch_error text,

  -- pagespeed (mobile)
  perf_score integer,
  inp_ms integer,
  lcp_ms integer,
  cls numeric,

  -- page inventory
  has_menu_page boolean,
  menu_is_pdf_only boolean,
  has_happy_hour_page boolean,
  has_events_page boolean,
  has_private_party_page boolean,
  private_party_has_form boolean,
  private_party_linked_from_home boolean,
  has_contact_page boolean,
  has_contact_form boolean,
  has_about_page boolean,
  has_reservations_page boolean,
  has_email_signup boolean,
  has_social_links boolean,
  phone_prominent boolean,
  email_prominent boolean,

  -- aggregated SEO
  pages_audited integer,
  pages_with_title integer,
  pages_with_meta_desc integer,
  pages_with_h1 integer,
  avg_word_count numeric,
  image_alt_coverage_pct numeric,
  schema_types_detected text[],
  has_localbusiness_schema boolean,

  notes text,
  raw jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX website_snapshots_venue_captured_idx
  ON public.website_snapshots (venue_id, captured_at DESC);

CREATE INDEX website_snapshots_venue_scope_idx
  ON public.website_snapshots (venue_id, scope, captured_at DESC);

ALTER TABLE public.website_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all website snapshots"
  ON public.website_snapshots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue users can read their website snapshots"
  ON public.website_snapshots FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()));

CREATE POLICY "Venue owners/gms can insert manual website snapshots"
  ON public.website_snapshots FOR INSERT
  WITH CHECK (
    venue_id = ANY (public.user_venue_ids())
    AND public.get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm')
    AND source = 'manual'
  );

-- ─── website_pages ──────────────────────────────────────────────────
CREATE TABLE public.website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.website_snapshots(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  url text NOT NULL,
  http_status integer,
  title text,
  title_len integer,
  meta_description text,
  meta_description_len integer,
  h1_text text,
  h1_count integer,
  image_count integer,
  images_with_alt integer,
  schema_types text[],
  word_count integer,
  internal_link_count integer,
  last_modified timestamptz,
  page_kind text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX website_pages_snapshot_idx ON public.website_pages (snapshot_id);
CREATE INDEX website_pages_venue_kind_idx ON public.website_pages (venue_id, page_kind);

ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all website pages"
  ON public.website_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue users can read their website pages"
  ON public.website_pages FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()));
