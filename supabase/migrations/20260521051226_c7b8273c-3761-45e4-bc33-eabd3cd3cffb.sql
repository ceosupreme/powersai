create or replace view public.v_ai_call_log_rollup_7d
with (security_invoker = true) as
select
  function_name,
  provider,
  count(*)::int                              as calls,
  coalesce(sum(input_tokens), 0)::bigint     as input_tokens,
  coalesce(sum(output_tokens), 0)::bigint    as output_tokens,
  coalesce(sum(cost_usd), 0)::numeric(12,4)  as cost_usd,
  coalesce(avg(latency_ms), 0)::int          as avg_latency_ms,
  count(*) filter (
    where error_state is not null and error_state <> 'ok'
  )::int                                     as errors
from public.ai_call_log
where created_at >= now() - interval '7 days'
group by function_name, provider
order by cost_usd desc;

create or replace view public.v_ai_call_log_totals_7d
with (security_invoker = true) as
select
  count(*)::int                              as calls,
  coalesce(sum(cost_usd), 0)::numeric(12,4)  as cost_usd,
  case when count(*) = 0 then 0
       else round(
         100.0 * count(*) filter (where error_state is not null and error_state <> 'ok')::numeric
              / count(*)::numeric, 2)
  end                                        as error_rate_pct
from public.ai_call_log
where created_at >= now() - interval '7 days';