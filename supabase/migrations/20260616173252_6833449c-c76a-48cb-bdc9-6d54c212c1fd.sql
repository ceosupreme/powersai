ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS youtube_channel_url    text,
  ADD COLUMN IF NOT EXISTS youtube_channel_id     text,
  ADD COLUMN IF NOT EXISTS niche                  text,
  ADD COLUMN IF NOT EXISTS subscriber_count       bigint,
  ADD COLUMN IF NOT EXISTS monetization_model     text,
  ADD COLUMN IF NOT EXISTS weekly_production_goal integer,
  ADD COLUMN IF NOT EXISTS content_status         text;