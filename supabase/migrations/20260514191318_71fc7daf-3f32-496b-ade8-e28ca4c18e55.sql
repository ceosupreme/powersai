-- ─── gbp_place_mappings ─────────────────────────────────────────────
CREATE TABLE public.gbp_place_mappings (
  venue_id uuid PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  place_id text,
  last_resolved_at timestamptz,
  last_resolve_error text,
  consecutive_fetch_failures integer NOT NULL DEFAULT 0,
  manual_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gbp_place_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all place mappings"
  ON public.gbp_place_mappings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue users can read their place mappings"
  ON public.gbp_place_mappings FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()));

CREATE POLICY "Venue owners/gms can write their place mappings"
  ON public.gbp_place_mappings FOR INSERT
  WITH CHECK (
    venue_id = ANY (public.user_venue_ids())
    AND public.get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm')
  );

CREATE POLICY "Venue owners/gms can update their place mappings"
  ON public.gbp_place_mappings FOR UPDATE
  USING (
    venue_id = ANY (public.user_venue_ids())
    AND public.get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm')
  );

CREATE TRIGGER gbp_place_mappings_updated_at
  BEFORE UPDATE ON public.gbp_place_mappings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── gbp_snapshots ──────────────────────────────────────────────────
CREATE TABLE public.gbp_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('automated','manual')),
  scope text NOT NULL CHECK (scope IN ('daily_basics','weekly_full','manual')),

  -- profile completeness
  primary_category text,
  secondary_categories text[],
  description text,
  hours_complete boolean,
  holiday_hours_set boolean,
  service_area_set boolean,
  service_options jsonb,
  attributes jsonb,
  verified boolean,
  website text,

  -- engagement
  photo_count integer,
  last_photo_at timestamptz,
  post_count integer,
  last_post_at timestamptz,
  qa_total integer,
  qa_unanswered integer,
  last_qa_answered_at timestamptz,
  review_response_rate_30d numeric,
  last_review_response_at timestamptz,

  -- NAP
  gbp_name text,
  gbp_address text,
  gbp_phone text,
  nap_match_name boolean,
  nap_match_address boolean,
  nap_match_phone boolean,

  raw jsonb,
  fetch_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gbp_snapshots_venue_captured_idx
  ON public.gbp_snapshots (venue_id, captured_at DESC);

CREATE INDEX gbp_snapshots_venue_good_idx
  ON public.gbp_snapshots (venue_id, captured_at DESC)
  WHERE fetch_error IS NULL;

ALTER TABLE public.gbp_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all snapshots"
  ON public.gbp_snapshots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue users can read their snapshots"
  ON public.gbp_snapshots FOR SELECT
  USING (venue_id = ANY (public.user_venue_ids()));

CREATE POLICY "Venue owners/gms can insert manual snapshots"
  ON public.gbp_snapshots FOR INSERT
  WITH CHECK (
    venue_id = ANY (public.user_venue_ids())
    AND public.get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm')
    AND source = 'manual'
  );
