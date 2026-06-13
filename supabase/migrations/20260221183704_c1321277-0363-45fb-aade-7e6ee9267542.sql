
-- Add snoozed_until column to insight_cards for snooze functionality
ALTER TABLE public.insight_cards
ADD COLUMN IF NOT EXISTS snoozed_until timestamptz DEFAULT NULL;

-- Add snoozed_until column to action_items as well (for Supabase-source cards)
ALTER TABLE public.action_items
ADD COLUMN IF NOT EXISTS snoozed_until timestamptz DEFAULT NULL;
