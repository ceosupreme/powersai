ALTER TABLE public.crm_companies
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archive_reason text;
CREATE INDEX crm_companies_active_idx ON public.crm_companies (created_by) WHERE archived = false;

ALTER TABLE public.crm_contacts
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archive_reason text;
CREATE INDEX crm_contacts_active_idx ON public.crm_contacts (created_by) WHERE archived = false;

ALTER TABLE public.crm_deals
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archive_reason text;
CREATE INDEX crm_deals_active_idx ON public.crm_deals (created_by) WHERE archived = false;

ALTER TABLE public.brand_kits
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archive_reason text;
CREATE INDEX brand_kits_active_idx ON public.brand_kits (project_id) WHERE archived = false;