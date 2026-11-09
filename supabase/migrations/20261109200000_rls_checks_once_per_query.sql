-- Access rules: run "who is this person" checks once per request instead of once per row.
--
-- 505 of the 540 public-schema rules called has_role(auth.uid(), ...), auth.uid(), auth.role() or
-- user_venue_ids() in a form Postgres evaluated on every row (about 1.1 s per 5,000 rows; one
-- brand's setup map 1.7 s, all brands' setup summaries 27.6 s). Supabase's RLS performance guide:
-- wrap checks that do not depend on the row in (SELECT ...) so they run once per statement. Row
-- checks that are always true for an admin (user_can_access_project, user_has_bar_access) get the
-- once-per-statement admin check in front of them. Same meaning, same rows for every account.
--
-- Applied Nov 9 2026 through the connector inside one transaction that fingerprinted all 206
-- affected tables as the owner, a client and a signed-out visitor before and after on the same
-- snapshot (618 checks, all identical) and would have rolled back on any difference. Measured
-- after: Setup tab setup map 1,712 -> 109 ms, setup summary ~1,500 -> 50 ms, all brands' setup
-- summaries 27.6 s -> 1.1 s, all lane statuses 738 -> 25 ms, site visit log 1,912 -> 1 ms.
-- Backup of every rule before the change: ops_backup.policies_20261109 (restore_sql column).
--
-- Safe to re-run: rules already in the once-per-query form are skipped.

create function pg_temp.rls_rewrite(x text) returns text language plpgsql immutable as $fn$
begin
  if x is null then return null; end if;
  x := replace(x, '( SELECT auth.uid() AS uid)', '§U§');
  x := replace(x, '( SELECT user_venue_ids() AS user_venue_ids)::uuid[]', '§V§');
  x := replace(x, '( SELECT auth.role() AS role)', '§R§');
  x := regexp_replace(x, 'has_role\(auth\.uid\(\), (''[a-z_]+''::app_role)\)', '(SELECT has_role(§U§, \1))', 'g');
  x := regexp_replace(x, 'user_has_position\(auth\.uid\(\), (''[a-z_]+''::log_position)\)', '(SELECT user_has_position(§U§, \1))', 'g');
  x := regexp_replace(x, '(?<!AS has_role\) OR )user_can_access_project\(([a-z_]+(\.[a-z_]+)?)\)', '(§A§ OR user_can_access_project(\1))', 'g');
  x := regexp_replace(x, '(?<!AS has_role\) OR )user_has_bar_access\(auth\.uid\(\), ([a-z_]+(\.[a-z_]+)?)\)', '(§A§ OR user_has_bar_access(§U§, \1))', 'g');
  x := replace(x, 'user_venue_ids()', '§V§');
  x := replace(x, 'auth.role()', '§R§');
  x := replace(x, 'auth.uid()', '§U§');
  x := replace(x, '§A§', '(SELECT has_role(§U§, ''admin''::app_role))');
  x := replace(x, '§U§', '(SELECT auth.uid())');
  x := replace(x, '§V§', '(SELECT user_venue_ids())::uuid[]');
  x := replace(x, '§R§', '(SELECT auth.role())');
  return x;
end $fn$;

create function pg_temp.rls_needs_work(x text) returns boolean language sql immutable as $fn$
  select x is not null and (
    replace(replace(replace(x, '( SELECT auth.uid() AS uid)', ''), '( SELECT user_venue_ids() AS user_venue_ids)::uuid[]', ''), '( SELECT auth.role() AS role)', '')
      ~ '(auth\.uid\(\)|user_venue_ids\(\)|auth\.role\(\))'
    or x ~ '(?<!AS has_role\) OR )(user_can_access_project|user_has_bar_access)\('
  )
$fn$;

do $$
declare r record; nq text; nc text;
begin
  for r in select * from pg_policies where schemaname = 'public' loop
    if not (pg_temp.rls_needs_work(r.qual) or pg_temp.rls_needs_work(r.with_check)) then continue; end if;
    nq := pg_temp.rls_rewrite(r.qual);
    nc := pg_temp.rls_rewrite(r.with_check);
    execute format('alter policy %I on public.%I', r.policyname, r.tablename)
      || case when nq is not null then format(' using (%s)', nq) else '' end
      || case when nc is not null then format(' with check (%s)', nc) else '' end;
  end loop;
end $$;
