ALTER TABLE public.lead_logs
  ADD COLUMN IF NOT EXISTS lead_rating              smallint,
  ADD COLUMN IF NOT EXISTS bartender_rating         smallint,
  ADD COLUMN IF NOT EXISTS service_bartender_rating smallint,
  ADD COLUMN IF NOT EXISTS window_rating            smallint,
  ADD COLUMN IF NOT EXISTS float_rating             smallint,
  ADD COLUMN IF NOT EXISTS vibe_rating              smallint;

ALTER TABLE public.lead_logs
  DROP CONSTRAINT IF EXISTS lead_logs_ratings_range;

ALTER TABLE public.lead_logs
  ADD CONSTRAINT lead_logs_ratings_range CHECK (
    (lead_rating              IS NULL OR lead_rating              BETWEEN 1 AND 5) AND
    (bartender_rating         IS NULL OR bartender_rating         BETWEEN 1 AND 5) AND
    (service_bartender_rating IS NULL OR service_bartender_rating BETWEEN 1 AND 5) AND
    (window_rating            IS NULL OR window_rating            BETWEEN 1 AND 5) AND
    (float_rating             IS NULL OR float_rating             BETWEEN 1 AND 5) AND
    (vibe_rating              IS NULL OR vibe_rating              BETWEEN 1 AND 5)
  );

ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS mention_gids text[] NOT NULL DEFAULT '{}'::text[];