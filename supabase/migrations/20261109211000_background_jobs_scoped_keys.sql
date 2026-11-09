-- Background jobs: scoped job keys, and the crew log records what each function answers.
--
-- Since the function sign-in check went live (Oct 29 security work), three scheduled jobs were
-- turned away with "Sign in required" on every run while the job history said "succeeded":
-- the automation sender, the follow-up stopper and the weekly recovery reports. Their key setup
-- was written in 20261029011000_phase2_deployment_cutover.sql but never applied. This applies
-- only that script's job-key part, for those three functions (approved by the owner Nov 9 2026).
-- The column drops in that script are NOT applied here.
--
-- 1. A random key per function, kept encrypted in Vault; only its hash is used to check it
--    (same naming and method as the cutover script).
-- 2. public.hq_dispatch_edge_function(function, body) calls a function with its own key
--    (as in the cutover script, but it waits up to 60 seconds for the answer, like the
--    checkout job, so the crew log can see the result).
-- 3. The four jobs that call a function are wrapped with public.crew_track_request so the crew
--    log keeps each answer. The checkout double-check keeps its own working key; only the
--    wrapper is added to it.
--
-- Each new job command is planned (not run) before it replaces the old one; a job whose new
-- command does not plan is left as it was. Safe to re-run.

begin;

do $do$
declare
  fn text;
  token text;
  sid uuid;
begin
  foreach fn in array array['automation-queue-sweeper', 'automation-stop-condition-sweep', 'generate-recovery-report'] loop
    if not exists (select 1 from public.hq_edge_job_tokens where function_name = fn) then
      token := gen_random_uuid()::text || gen_random_uuid()::text;
      select vault.create_secret(token, 'hq-edge-job:' || fn, 'Function-scoped HQ job credential') into sid;
      insert into public.hq_edge_job_tokens (function_name, token_hash, secret_id)
      values (fn, sha256(convert_to(token, 'UTF8')), sid);
    end if;
  end loop;
end
$do$;

create or replace function public.hq_dispatch_edge_function(p_function text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
declare
  token text;
  request_id bigint;
begin
  select s.decrypted_secret into token
    from public.hq_edge_job_tokens j
    join vault.decrypted_secrets s on s.id = j.secret_id
   where j.function_name = p_function;
  if token is null then
    raise exception 'Unknown or unconfigured job handler' using errcode = '42501';
  end if;
  select net.http_post(
    url := 'https://llanezccussjtzzrbrtq.supabase.co/functions/v1/' || p_function,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-token', token),
    body := coalesce(p_body, '{}'::jsonb),
    timeout_milliseconds := 60000
  ) into request_id;
  return request_id;
end
$fn$;
revoke all on function public.hq_dispatch_edge_function(text, jsonb) from public, anon, authenticated;
grant execute on function public.hq_dispatch_edge_function(text, jsonb) to service_role;

do $do$
declare
  r record;
  new_command text;
  call_text text;
begin
  for r in
    select j.jobid, j.jobname, j.command, c.key as crew, c.calls_function as fn
      from cron.job j
      join public.crews c on c.cron_jobname = j.jobname
     where c.calls_function is not null
       and j.command not ilike '%crew_track_request%'
  loop
    if r.fn in ('automation-queue-sweeper', 'automation-stop-condition-sweep') then
      new_command := format('select public.crew_track_request(%L, (public.hq_dispatch_edge_function(%L, %L::jsonb)))',
                            r.crew, r.fn, '{"trigger":"cron"}');
    elsif r.fn = 'generate-recovery-report' then
      new_command := format('select public.crew_track_request(%L, (public.hq_dispatch_edge_function(%L, %L::jsonb)))',
                            r.crew, r.fn, '{}');
    else
      -- Any other function job keeps its own call; only the wrapper is added.
      call_text := regexp_replace(regexp_replace(r.command, '[[:space:];]+$', ''), '^[[:space:]]*select[[:space:]]+', '', 'i');
      if call_text !~* '^(public\.net_http_post|net\.http_post)[[:space:]]*\(' or call_text ~ ';' then
        raise notice 'Left job % as it is: its command is not a single function call', r.jobname;
        continue;
      end if;
      new_command := format('select public.crew_track_request(%L, (%s))', r.crew, call_text);
    end if;
    begin
      execute 'explain (costs off) ' || new_command;
    exception when others then
      raise notice 'Left job % as it is: the new command did not plan (%)', r.jobname, sqlerrm;
      continue;
    end;
    perform cron.alter_job(r.jobid, command := new_command || ';');
  end loop;
end
$do$;

commit;
