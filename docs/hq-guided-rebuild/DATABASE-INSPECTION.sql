-- STM HQ guided brand rebuild
-- READ-ONLY review only. Run from an authorized SQL console *after*
-- confirming that it connects to the intended HQ database.
-- Never run this as part of a public-site request or expose output to clients.
-- This does NOT create a backup and does NOT validate user-specific access.
BEGIN TRANSACTION READ ONLY;

-- 1. Record exact schema, RLS state and policies for affected tables.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
  AND c.relname IN (
    'user_roles','user_bar_assignments','user_venue_roles','venue_assignments',
    'venues','production_jobs','action_items','tasks','channel_products',
    'channel_product_channels','product_listings','content_items','content_placements',
    'venue_foundation_item_status','channel_revenue','brand_channels','brand_kits',
    'brand_kit_assets','knowledge_base'
  )
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public','storage')
  AND tablename IN (
    'user_roles','user_bar_assignments','user_venue_roles','venue_assignments',
    'venues','production_jobs','action_items','tasks','channel_products',
    'channel_product_channels','product_listings','content_items','content_placements',
    'venue_foundation_item_status','channel_revenue','brand_channels','brand_kits',
    'brand_kit_assets','knowledge_base','objects'
  )
ORDER BY tablename, policyname;

-- 2. Verify column names/types before adding a brand-manager write policy.
SELECT table_name, column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'action_items','production_jobs','tasks','content_items','content_placements',
    'channel_products','channel_product_channels','knowledge_base','brand_channels',
    'venue_assignments','user_roles','user_bar_assignments'
  )
ORDER BY table_name, ordinal_position;

-- 3. Record all triggers and helper functions that could be affected.
SELECT event_object_table, trigger_name, action_timing, event_manipulation,
       action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN (
    'action_items','production_jobs','content_items','content_placements',
    'channel_products','knowledge_base'
  )
ORDER BY event_object_table, trigger_name;

SELECT p.proname AS function_name, pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer, pg_get_function_result(p.oid) AS returns
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'hq_create_pipeline','hq_pause_pipeline','user_can_access_project',
    'user_can_manage_project','has_role'
  )
ORDER BY p.proname;

-- 4. Capture accepted persisted status values; do not rename statuses
-- that current scheduled agents/automations depend on.
SELECT t.typname AS enum_type, e.enumlabel AS stored_value
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;
ROLLBACK;

-- FOLLOW-UP WORK (not performed by this query):
-- Independently recoverable production snapshot of touched tables/schema/RLS/functions.
-- Verify backup restore, then authenticate as a designated brand manager and
-- exercise SELECT, INSERT, UPDATE and DELETE against own-brand and foreign-brand
-- test records in a safe staging clone/transaction. Never infer RLS success from a
-- browser role-preview switch.
