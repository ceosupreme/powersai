alter table public.inventory_reports
  add column if not exists raw_header_hash text;