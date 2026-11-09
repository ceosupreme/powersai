-- Crew activity log.
--
-- Every scheduled Claude crew writes one line here when it finishes: what it tried, what it got
-- done and what it flagged (public.log_crew_run). HQ's own background jobs (pg_cron) are read
-- from the job history. For the jobs that start a backend function, the job history only says
-- the call was handed off (on Nov 9 2026 three of them had been refused with "Sign in required"
-- since Nov 5 while the history said "succeeded"), so public.crew_track_request can wrap their
-- call and keep the function's answer. Wrapping the live jobs is a separate step
-- (20261109211000_background_jobs_scoped_keys.sql), applied the same day.
--
-- The Admin "Crews" tab and the morning brief read public.crew_status(): one row per crew, red
-- (failed or missed) when the last run failed or no run came in within the crew's window.
--
-- Applied Nov 9 2026 through the database tool. Safe to re-run: tables and policies are created
-- only when missing and the crew list is never overwritten.

begin;

-- 1. The crew list ---------------------------------------------------------------------------

create table if not exists public.crews (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  kind text not null check (kind in ('claude_task', 'db_job')),
  schedule_text text not null,
  max_gap interval not null,
  what_it_does text,
  report_to text,
  trigger_id text,
  cron_jobname text,
  calls_function text,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.crews is 'Scheduled crews and background jobs that HQ watches. max_gap: longer than this since the last run means it missed its schedule.';

-- 2. One line per Claude crew run -----------------------------------------------------------

create table if not exists public.crew_runs (
  id uuid primary key default gen_random_uuid(),
  crew_key text not null references public.crews (key) on update cascade on delete cascade,
  started_at timestamptz,
  finished_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'partial', 'failed', 'nothing_to_do')),
  tried text,
  done text,
  flagged text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists crew_runs_crew_finished_idx on public.crew_runs (crew_key, finished_at desc);
comment on table public.crew_runs is 'One line per finished Claude crew run, written with public.log_crew_run().';

-- 3. The answer each backend function gave a background job ---------------------------------

create table if not exists public.crew_http_calls (
  request_id bigint primary key,
  crew_key text not null references public.crews (key) on update cascade on delete cascade,
  requested_at timestamptz not null default now(),
  status_code integer,
  timed_out boolean,
  error text,
  resolved_at timestamptz
);
create index if not exists crew_http_calls_crew_requested_idx on public.crew_http_calls (crew_key, requested_at desc);
comment on table public.crew_http_calls is 'Calls background jobs made to backend functions, with the answer copied from pg_net before it expires (6 hours). Kept 14 days.';

-- 4. Only the admin can read them; writes go through the functions below ------------------

alter table public.crews enable row level security;
alter table public.crew_runs enable row level security;
alter table public.crew_http_calls enable row level security;

revoke all on public.crews, public.crew_runs, public.crew_http_calls from anon;
revoke insert, update, delete, truncate, references, trigger on public.crews, public.crew_runs, public.crew_http_calls from authenticated;
grant select on public.crews, public.crew_runs, public.crew_http_calls to authenticated;

drop policy if exists "Admins read crews" on public.crews;
create policy "Admins read crews" on public.crews for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
drop policy if exists "Admins read crew runs" on public.crew_runs;
create policy "Admins read crew runs" on public.crew_runs for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
drop policy if exists "Admins read crew calls" on public.crew_http_calls;
create policy "Admins read crew calls" on public.crew_http_calls for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

-- 5. A crew logs its run --------------------------------------------------------------------
-- Called by the crews through the database tool:
--   select public.log_crew_run(p_crew => 'weekly_hq_run', p_status => 'ok', p_tried => $$...$$,
--     p_done => $$...$$, p_flagged => $$...$$, p_started_at => '2026-11-13T02:17:00-08:00');
-- An unknown crew name is added to the list instead of being lost, and an unknown status word
-- is kept as 'partial' with the word saved in details.

create or replace function public.log_crew_run(
  p_crew text,
  p_status text,
  p_tried text default null,
  p_done text default null,
  p_flagged text default null,
  p_started_at timestamptz default null,
  p_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  k text := trim(both '_' from lower(regexp_replace(trim(coalesce(p_crew, '')), '[^a-zA-Z0-9]+', '_', 'g')));
  s text := lower(trim(coalesce(p_status, '')));
  st text;
  new_id uuid;
begin
  if k = '' then
    raise exception 'log_crew_run needs the crew name (p_crew)';
  end if;
  st := case
    when s in ('ok', 'success', 'succeeded', 'done', 'complete', 'completed') then 'ok'
    when s in ('nothing_to_do', 'nothing to do', 'nothing', 'idle', 'skipped', 'no_work') then 'nothing_to_do'
    when s in ('failed', 'fail', 'failure', 'error', 'errored') then 'failed'
    else 'partial'
  end;
  insert into public.crews (key, name, kind, schedule_text, max_gap, what_it_does)
  values (k, initcap(replace(k, '_', ' ')), 'claude_task', 'Not on the crew list yet', interval '8 days',
          'Logged a run before it was added to the crew list.')
  on conflict (key) do nothing;
  insert into public.crew_runs (crew_key, started_at, finished_at, status, tried, done, flagged, details)
  values (
    k, p_started_at, now(), st,
    left(nullif(trim(p_tried), ''), 2000),
    left(nullif(trim(p_done), ''), 2000),
    left(nullif(trim(p_flagged), ''), 2000),
    coalesce(p_details, '{}'::jsonb)
      || case when s not in ('ok', 'partial', 'failed', 'nothing_to_do') then jsonb_build_object('status_given', p_status) else '{}'::jsonb end
  )
  returning id into new_id;
  return new_id;
end
$fn$;

revoke all on function public.log_crew_run(text, text, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.log_crew_run(text, text, text, text, text, timestamptz, jsonb) to service_role;

-- 6. Background jobs keep the backend function's answer -------------------------------------

create or replace function public.crew_http_harvest()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n integer := 0;
begin
  update public.crew_http_calls c
     set status_code = r.status_code,
         timed_out = coalesce(r.timed_out, false),
         error = case
           when r.error_msg is not null then left(r.error_msg, 300)
           when r.status_code >= 400 then left(coalesce(r.content::text, ''), 300)
         end,
         resolved_at = now()
    from net._http_response r
   where r.id = c.request_id
     and c.resolved_at is null;
  get diagnostics n = row_count;
  update public.crew_http_calls
     set error = 'No answer was recorded within 6 hours', resolved_at = now()
   where resolved_at is null
     and requested_at < now() - interval '6 hours';
  delete from public.crew_http_calls where requested_at < now() - interval '14 days';
  return n;
end
$fn$;

-- Wraps the call a background job makes: select public.crew_track_request('<crew>', (<the call>));
-- It never lets the job fail: anything that goes wrong here is only a warning.
create or replace function public.crew_track_request(p_crew text, p_request_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
begin
  begin
    if p_request_id is not null then
      insert into public.crew_http_calls (request_id, crew_key)
      values (p_request_id, p_crew)
      on conflict (request_id) do nothing;
    end if;
    perform public.crew_http_harvest();
  exception when others then
    raise warning 'crew_track_request could not record request % for %: %', p_request_id, p_crew, sqlerrm;
  end;
  return p_request_id;
end
$fn$;

revoke all on function public.crew_http_harvest() from public, anon, authenticated;
revoke all on function public.crew_track_request(text, bigint) from public, anon, authenticated;
grant execute on function public.crew_http_harvest() to service_role;
grant execute on function public.crew_track_request(text, bigint) to service_role;

-- 7. One row per crew: its last run and whether it needs a look --------------------------------
-- state: ok, partial, failed, missed, waiting (no run yet, still inside its first window), paused,
-- unknown (a background job whose backend function's answer HQ does not record yet).
-- Admins call it from HQ; the morning brief calls it through the database tool (no signed-in
-- user). Everyone else is refused.

create or replace function public.crew_status()
returns table (
  crew_key text,
  crew_name text,
  crew_kind text,
  schedule text,
  what_it_does text,
  report_to text,
  sort_order integer,
  state text,
  problem text,
  last_status text,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_tried text,
  last_done text,
  last_flagged text,
  runs_7d integer,
  failures_7d integer,
  due_by timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $fn$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  c record;
  v_jobid bigint;
  v_job_active boolean;
  v_cron_status text;
  v_cron_start timestamptz;
  v_cron_end timestamptz;
  v_cron_msg text;
  v_code integer;
  v_timed_out boolean;
  v_error text;
  v_call_at timestamptz;
  v_calls integer;
  v_last_ok timestamptz;
  v_has_call boolean;
  v_tracked boolean;
  tz constant text := 'America/Los_Angeles';
begin
  if uid is not null then
    if not coalesce(public.has_role(uid, 'admin'::public.app_role), false) then
      raise exception 'Only the admin can see crew activity' using errcode = '42501';
    end if;
  elsif coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'Only the admin can see crew activity' using errcode = '42501';
  end if;

  perform public.crew_http_harvest();

  for c in select * from public.crews cr where cr.active order by cr.sort_order, cr.name loop
    crew_key := c.key;
    crew_name := c.name;
    crew_kind := c.kind;
    schedule := c.schedule_text;
    what_it_does := c.what_it_does;
    report_to := c.report_to;
    sort_order := c.sort_order;
    state := null;
    problem := null;
    last_status := null;
    last_started_at := null;
    last_finished_at := null;
    last_tried := null;
    last_done := null;
    last_flagged := null;
    runs_7d := 0;
    failures_7d := 0;

    if c.kind = 'claude_task' then
      select r.status, r.started_at, r.finished_at, r.tried, r.done, r.flagged
        into last_status, last_started_at, last_finished_at, last_tried, last_done, last_flagged
        from public.crew_runs r
       where r.crew_key = c.key
       order by r.finished_at desc
       limit 1;
      select count(*)::int, (count(*) filter (where r.status = 'failed'))::int
        into runs_7d, failures_7d
        from public.crew_runs r
       where r.crew_key = c.key and r.finished_at > now() - interval '7 days';
      if last_status = 'failed' then
        problem := 'Its last run failed: ' || coalesce(last_flagged, last_done, last_tried, 'it gave no reason') ;
      end if;
    else
      v_jobid := null; v_job_active := null; v_tracked := null;
      v_cron_status := null; v_cron_start := null; v_cron_end := null; v_cron_msg := null;
      select j.jobid, j.active, j.command ilike '%crew_track_request%'
        into v_jobid, v_job_active, v_tracked
        from cron.job j where j.jobname = c.cron_jobname limit 1;
      if v_jobid is null then
        state := 'missed';
        problem := 'This job is no longer scheduled in the database.';
      else
        if not v_job_active then
          state := 'paused';
        end if;
        select d.status, d.start_time, d.end_time, d.return_message
          into v_cron_status, v_cron_start, v_cron_end, v_cron_msg
          from cron.job_run_details d
         where d.jobid = v_jobid
         order by d.start_time desc
         limit 1;
        last_started_at := v_cron_start;
        last_finished_at := coalesce(v_cron_end, v_cron_start);

        if c.calls_function is null then
          select count(*)::int, (count(*) filter (where d.status = 'failed'))::int
            into runs_7d, failures_7d
            from cron.job_run_details d
           where d.jobid = v_jobid and d.start_time > now() - interval '7 days';
          last_status := case v_cron_status
            when 'succeeded' then 'ok'
            when 'running' then 'ok'
            when 'starting' then 'ok'
            when 'failed' then 'failed'
            else null
          end;
          if last_status = 'failed' then
            problem := 'The job stopped with an error: ' || left(coalesce(v_cron_msg, 'no message'), 200);
          end if;
        else
          v_code := null; v_timed_out := null; v_error := null; v_call_at := null;
          select h.status_code, h.timed_out, h.error, h.requested_at
            into v_code, v_timed_out, v_error, v_call_at
            from public.crew_http_calls h
           where h.crew_key = c.key and h.resolved_at is not null
           order by h.requested_at desc
           limit 1;
          v_has_call := v_call_at is not null;
          select count(*)::int,
                 (count(*) filter (where h.resolved_at is not null and not coalesce(h.timed_out, false)
                                     and (h.status_code is null or h.status_code >= 400)))::int
            into v_calls, failures_7d
            from public.crew_http_calls h
           where h.crew_key = c.key and h.requested_at > now() - interval '7 days';
          select max(h.requested_at) into v_last_ok
            from public.crew_http_calls h
           where h.crew_key = c.key and h.status_code between 200 and 299;
          runs_7d := v_calls;
          if v_cron_status = 'failed' then
            last_status := 'failed';
            problem := 'The job stopped with an error before calling ' || c.calls_function || ': '
              || left(coalesce(v_cron_msg, 'no message'), 200);
          elsif not v_has_call and v_tracked then
            last_status := null;
          elsif not v_has_call then
            last_status := 'unknown';
            problem := 'It starts on schedule, but HQ does not record what ' || c.calls_function
              || ' answers yet, so whether it worked is not known.';
          elsif v_code between 200 and 299 then
            last_status := 'ok';
          elsif coalesce(v_timed_out, false) then
            last_status := 'partial';
            problem := 'It started on time, but ' || c.calls_function
              || ' did not answer within the wait, so the result is not known.';
          else
            last_status := 'failed';
            problem := 'The ' || c.calls_function || ' function turned the job away'
              || coalesce(' (' || v_code || ')', '') || ': '
              || left(coalesce(nullif(regexp_replace(coalesce(v_error, ''), '^\{"error":"(.*)"\}$', '\1'), ''), 'no reason given'), 160)
              || '. ' || failures_7d || ' of its ' || v_calls || ' calls in the last 7 days failed; '
              || coalesce('last good answer ' || to_char(v_last_ok at time zone tz, 'Dy Mon FMDD, FMHH12:MI AM') || '.',
                          'no good answer on record.');
          end if;
        end if;
      end if;
    end if;

    due_by := coalesce(last_finished_at, c.created_at) + c.max_gap;

    if state is null then
      if now() > due_by then
        state := 'missed';
        problem := case
          when last_finished_at is null then
            'No run recorded since it was added to this list on '
            || to_char(c.created_at at time zone tz, 'Dy Mon FMDD') || '. It runs ' || c.schedule_text || '.'
          else
            'No run since ' || to_char(last_finished_at at time zone tz, 'Dy Mon FMDD, FMHH12:MI AM')
            || '. It runs ' || c.schedule_text || '.'
        end;
      elsif last_status = 'failed' then
        state := 'failed';
      elsif last_status = 'partial' then
        state := 'partial';
      elsif last_status = 'unknown' then
        state := 'unknown';
      elsif last_status in ('ok', 'nothing_to_do') then
        state := 'ok';
      else
        state := 'waiting';
      end if;
    end if;

    return next;
  end loop;
end
$fn$;

revoke all on function public.crew_status() from public, anon;
grant execute on function public.crew_status() to authenticated, service_role;

-- 8. The crew list as of Nov 9 2026 -----------------------------------------------------------
-- Claude crews are scheduled tasks in the owner's Claude account (trigger ids below). Database
-- jobs are pg_cron jobs in this project. Times in Pacific; the database jobs run on UTC, so their
-- Pacific time moves an hour with daylight saving time.

insert into public.crews (key, name, kind, schedule_text, max_gap, what_it_does, report_to, trigger_id, cron_jobname, calls_function, sort_order) values
  ('life_pulse_collector', 'Morning brief (Life Pulse collector)', 'claude_task', 'every day at 5:56 AM Pacific', interval '26 hours',
   'Files job-search mail and new jobs into Life Pulse, then sends the morning brief with the day''s business moves and anyone waiting on you.',
   'Push "Morning brief"', 'trig_01KEC4o9eavxQ75rBtjrJVKx', null, null, 10),
  ('weekly_hq_run', 'Weekly HQ run', 'claude_task', 'Fridays at 2:17 AM Pacific', interval '7 days 3 hours',
   'Checks the Agent Desk, files the playbooks you finish, does Claude''s ready pipeline steps, and files channel numbers and Muse reports.',
   'Email "Weekly HQ run: what got done"', 'trig_01R9sNJytn5XtgbLZhxahUDQ', null, null, 20),
  ('backlog_builder', 'Weekly backlog builder', 'claude_task', 'Tuesdays at 3:41 AM Pacific', interval '7 days 3 hours',
   'Researches and files vetted ideas for up to three brands a week until every brand''s backlog is full.',
   'Email "Backlog builder: ..."', 'trig_01KPC6AayRXKrvi6jXvpC1Di', null, null, 30),
  ('muse_social_posts', 'Weekly social posts for Muse', 'claude_task', 'Saturdays at 1:35 PM Pacific', interval '7 days 3 hours',
   'Records what Muse posted, makes next week''s posts and emails you the message to paste into Muse.',
   'Email "Muse posts ready: ..."', 'trig_01S2bK98d1XQAf1rGbkZkMM7', null, null, 40),
  ('coastal_blog', 'Coastal Beauties blog crew', 'claude_task', 'Mondays and Thursdays at 5 AM Pacific (6 AM in summer)', interval '4 days 3 hours',
   'Publishes one new article, or one real update, on the Coastal Beauties blog.',
   'Push only when something needs you', 'trig_015xinbonvY1Ggkvu2WywYv5', null, null, 50),
  ('coastal_city_fill', 'Coastal Beauties City Fill', 'claude_task', 'Mondays at 6:33 AM Pacific', interval '7 days 3 hours',
   'Adds verified local businesses to the Coastal Beauties directory.',
   'Email "Coastal Beauties directory: weekly fill"', 'trig_012TyTVi2vqaqfgHYABbNjiG', null, null, 60),
  ('life_pulse_checkin_reminder', 'Life Pulse check-in reminder', 'claude_task', 'every day at 10 PM Pacific', interval '26 hours',
   'Sends the nightly push for your Life Pulse check-in, unless you already did it.',
   'Push "Tonight''s check-in"', 'trig_01FKM7x79H4C51aTGaMMFovi', null, null, 70),
  ('automation_queue_sweeper', 'Automation sender', 'db_job', 'every 5 minutes', interval '20 minutes',
   'Sends approved automation messages when their send time comes.',
   null, null, 'automation-queue-sweeper', 'automation-queue-sweeper', 110),
  ('reconcile_checkouts', 'Checkout double-check', 'db_job', 'every hour at :23', interval '2 hours 30 minutes',
   'Checks Stripe for completed online checkouts and records any that were missed.',
   null, null, 'reconcile-checkouts-hourly', 'reconcile-checkouts', 120),
  ('automation_stop_condition', 'Follow-up stopper', 'db_job', 'every day at 5 AM Pacific (6 AM in summer)', interval '26 hours',
   'Cancels pending follow-ups for leads who replied, booked, opted out or were halted.',
   null, null, 'automation-stop-condition', 'automation-stop-condition-sweep', 130),
  ('setup_scores_daily', 'Setup scores', 'db_job', 'every day at 2:05 AM Pacific (3:05 AM in summer)', interval '26 hours',
   'Recomputes every brand''s Setup score from its setup map.',
   null, null, 'setup-scores-daily', null, 140),
  ('trend_watch_collect', 'Trend feeds: fetch', 'db_job', 'every day at 5:07 AM Pacific (6:07 AM in summer)', interval '26 hours',
   'Asks Google for the Trending Now feeds, and on Mondays the autocomplete for every brief keyword.',
   null, null, 'trend-watch-collect', null, 150),
  ('trend_watch_ingest', 'Trend feeds: file', 'db_job', 'every day at 5:22 AM Pacific (6:22 AM in summer)', interval '26 hours',
   'Files the fetched trend feeds into Trend Watch.',
   null, null, 'trend-watch-ingest', null, 160),
  ('recovery_report_weekly', 'Weekly recovery reports', 'db_job', 'Mondays at 8 AM Pacific (9 AM in summer)', interval '7 days 3 hours',
   'Drafts a recovery report for each active project. Drafts are never sent on their own.',
   null, null, 'recovery-report-weekly', 'generate-recovery-report', 170),
  ('job_history_cleanup', 'Job history cleanup', 'db_job', 'every day at 1:17 AM Pacific (2:17 AM in summer)', interval '26 hours',
   'Deletes background-job history older than 7 days.',
   null, null, 'job-run-details-cleanup', null, 180)
on conflict (key) do nothing;

commit;
