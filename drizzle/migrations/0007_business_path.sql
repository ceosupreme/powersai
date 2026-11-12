-- Business Path: the stages and steps every brand moves through, plus each brand's progress.
-- Content is loaded separately. Do not insert rows here.

create table public.business_path_stages (
  key text primary key,
  sort_order integer not null,
  name text not null,
  done_when text not null,
  summary text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_path_stages TO authenticated;
GRANT ALL ON public.business_path_stages TO service_role;

create table public.business_path_steps (
  key text primary key,
  stage_key text not null references public.business_path_stages(key) on update cascade,
  sort_order integer not null,
  title text not null,
  instructions text not null,
  proof text,
  business_types text[] not null default array['all']::text[],
  guide_key text,
  auto_check text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_path_steps_types_check
    check (cardinality(business_types) > 0
           and business_types <@ array['all','service','local','creator_product','app']::text[])
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_path_steps TO authenticated;
GRANT ALL ON public.business_path_steps TO service_role;
create index business_path_steps_stage_idx on public.business_path_steps (stage_key, sort_order);

create table public.brand_path_settings (
  venue_id uuid primary key references public.venues(id) on delete cascade,
  business_types text[] not null default array[]::text[],
  visible_to_managers boolean not null default false,
  money_goal text,
  hours_per_week numeric,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_path_settings_types_check
    check (business_types <@ array['service','local','creator_product','app']::text[])
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_path_settings TO authenticated;
GRANT ALL ON public.brand_path_settings TO service_role;

create table public.brand_path_step_status (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  step_key text not null references public.business_path_steps(key) on update cascade on delete cascade,
  status text not null default 'not_started',
  note text,
  evidence_url text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_path_step_status_unique unique (venue_id, step_key),
  constraint brand_path_step_status_status_check
    check (status in ('not_started','in_progress','waiting','done','not_needed')),
  constraint brand_path_step_status_done_needs_proof
    check (status <> 'done' or nullif(btrim(evidence_url), '') is not null)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_path_step_status TO authenticated;
GRANT ALL ON public.brand_path_step_status TO service_role;
create index brand_path_step_status_venue_idx on public.brand_path_step_status (venue_id);

create trigger business_path_stages_updated_at before update on public.business_path_stages
  for each row execute function public.handle_updated_at();
create trigger business_path_steps_updated_at before update on public.business_path_steps
  for each row execute function public.handle_updated_at();
create trigger brand_path_settings_updated_at before update on public.brand_path_settings
  for each row execute function public.handle_updated_at();
create trigger brand_path_step_status_updated_at before update on public.brand_path_step_status
  for each row execute function public.handle_updated_at();

alter table public.business_path_stages enable row level security;
alter table public.business_path_steps enable row level security;
alter table public.brand_path_settings enable row level security;
alter table public.brand_path_step_status enable row level security;

-- Stages and steps: anyone signed in can read; only admins change them.
create policy "Signed-in users read path stages" on public.business_path_stages
  for select to authenticated using (true);
create policy "Admins manage path stages" on public.business_path_stages
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));
create policy "Signed-in users read path steps" on public.business_path_steps
  for select to authenticated using (true);
create policy "Admins manage path steps" on public.business_path_steps
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- Brand settings: admins and that brand's managers can read; only admins change them.
create policy "Admins and brand managers read path settings" on public.brand_path_settings
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or public.user_can_manage_brand(venue_id));
create policy "Admins manage path settings" on public.brand_path_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- Step progress: admins and that brand's managers can read, add and update; only admins delete.
create policy "Admins and brand managers read step status" on public.brand_path_step_status
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or public.user_can_manage_brand(venue_id));
create policy "Admins and brand managers add step status" on public.brand_path_step_status
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'::app_role) or public.user_can_manage_brand(venue_id));
create policy "Admins and brand managers update step status" on public.brand_path_step_status
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or public.user_can_manage_brand(venue_id))
  with check (public.has_role(auth.uid(), 'admin'::app_role) or public.user_can_manage_brand(venue_id));
create policy "Admins delete step status" on public.brand_path_step_status
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));