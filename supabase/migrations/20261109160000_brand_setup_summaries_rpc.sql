-- Portfolio setup chips: read the setup summary for many brands in one fast call.
--
-- v_brand_setup_summary is a security_invoker view, so a signed-in read runs every row of its
-- brand x asset grid through the row-level policies of nine tables. For the Portfolio's 26 brand
-- cards that took about 28 seconds, past the 8-second limit for signed-in reads, so the query failed
-- and was retried on every visit and window focus. This function computes the same rows without
-- per-row policy checks (about 1 second) and returns only brands the caller may already open:
-- the same rule as the venues read policy, plus the shared project-access rule.
create or replace function public.brand_setup_summaries(p_venue_ids uuid[])
returns setof public.v_brand_setup_summary
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.v_brand_setup_summary s
  where s.venue_id = any(p_venue_ids)
    and (public.has_role(auth.uid(), 'admin') or s.venue_id = any(public.user_venue_ids()))
    and public.user_can_access_project(s.venue_id);
$$;

revoke all on function public.brand_setup_summaries(uuid[]) from public, anon;
grant execute on function public.brand_setup_summaries(uuid[]) to authenticated;
