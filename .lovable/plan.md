# Client Acquisition Layer (on top of existing CRM)

Reuses `crm_companies` / `crm_deals` — no parallel lead system. Adds an account-wide offers library, AI lead analysis tied to a CRM company, and AI outreach drafting tied to that analysis. Drafting only; nothing is sent.

## 1. Schema (one migration)

### `service_offers` — account-wide library (mirrors `affiliate_programs` RLS)
Columns: `id`, `name`, `description`, `who_its_for`, `problem_solved`, `deliverables` (text), `timeline`, `starter_price` (numeric), `premium_price` (numeric), `best_target`, `status` ('active'|'draft'), `created_by`, `created_at`, `updated_at`.
- GRANT to `authenticated` + `service_role`. RLS: any authenticated user can SELECT/INSERT/UPDATE/DELETE (matches `affiliate_programs`).
- `updated_at` trigger.

### `crm_lead_analyses` — persisted AI analysis on a CRM company
Columns: `id`, `company_id` uuid FK → `crm_companies(id)` ON DELETE CASCADE, `deal_id` uuid NULL FK → `crm_deals(id)` ON DELETE SET NULL, `source_kind` ('url'|'text'), `source_url`, `source_text`, `fetched_content` text NULL (raw page text snapshot), `summary` text, `recommended_offer_id` uuid NULL FK → `service_offers(id)` ON DELETE SET NULL, `recommendation_reason` text, `priority` ('high'|'medium'|'low'), `model` text, `created_by`, `created_at`.
- RLS: reuse CRM scoping — same `using/with check` pattern as `crm_companies` (admin OR has access). Latest row per company surfaces in UI; full history preserved.

### `crm_outreach_drafts` — persisted AI outreach attached to an analysis
Columns: `id`, `analysis_id` uuid FK → `crm_lead_analyses(id)` ON DELETE CASCADE, `company_id` uuid FK → `crm_companies(id)` ON DELETE CASCADE, `offer_id` uuid NULL FK → `service_offers(id)` ON DELETE SET NULL, `channel` ('cold_email'|'linkedin_dm'|'instagram_dm'|'sms'), `tone` text, `opener` text, `sequence` jsonb (`[{day:1,label,body}, ...]`), `model`, `created_by`, `created_at`, `updated_at`.
- RLS: same CRM scoping as analyses. UPDATE allowed so user can edit drafted copy.
- `updated_at` trigger.

Seed `service_offers` with the 7 named offers (active, `created_by = NULL` so a deleted user doesn't orphan, but every row stays editable/deletable per RLS).

## 2. Edge functions (Lovable AI Gateway, capture-classify pattern)

Both use `LOVABLE_API_KEY` → `https://ai.gateway.lovable.dev/v1/chat/completions`, model `google/gemini-2.5-flash`, service-role client for writes, JWT verified in code, CORS headers.

### `crm-analyze-lead`
Body: `{ company_id, deal_id?, source_kind: 'url'|'text', source_url?, source_text? }`.
- If `url`: `fetch(url)` with 8s timeout + browser-ish UA, strip HTML to text (~15k chars). On any failure (non-200, timeout, blocked) return `{ ok:false, code:'fetch_failed', message:'Couldn't read the URL — paste details instead' }` — UI shows that hint and switches to text mode. **No throw.**
- Loads all `service_offers` where `status='active'`, passes name + who_its_for + problem_solved + best_target to the prompt.
- Prompt asks for strict JSON: `{ summary, recommended_offer_id, recommendation_reason, priority }`.
- Inserts row into `crm_lead_analyses`; returns it.

### `crm-generate-outreach`
Body: `{ analysis_id, channel, tone?, sequence_days?: number[] (default [1,3,7,14,30]) }`.
- Loads analysis + recommended offer + company. Prompt asks for `{ opener, sequence: [{day,label,body}] }` written TO the matched offer in the chosen channel/tone.
- Inserts row into `crm_outreach_drafts`; returns it. No send.

Register both in `supabase/config.toml` with `verify_jwt = true` (CRM data; users must be authed).

## 3. Frontend

### Offers library — `/offers`
- `src/pages/Offers.tsx` + `src/components/offers/ServiceOfferDialog.tsx` + `src/hooks/useServiceOffers.ts` (mirror `useAffiliatePrograms`).
- Table list with status badge, edit/delete, "+ New Offer" dialog.
- Permissions: add `'offers'` to `PageKey`, `PAGE_CONFIG`, `ROUTE_TO_PAGE_KEY` in `src/types/permissions.ts`. Add nav entry in `AppSidebar.tsx` (Briefcase icon, in same group as Products/Affiliate Programs).
- Route added in `src/App.tsx` behind `ProtectedRoute`.

### CRM Company detail — Client Acquisition panel
- New `src/components/crm/LeadAnalysisPanel.tsx` mounted inside `CompanyDetail.tsx`.
  - Shows latest analysis (summary, matched offer badge w/ link to `/offers`, reason, priority chip, timestamp).
  - "Analyze Lead" button opens dialog: radio URL/Text → input → calls `crm-analyze-lead`. URL-fetch-fail surfaces the inline fallback message and pre-selects Text.
  - "History" disclosure lists prior analyses.
- New `src/components/crm/OutreachDraftPanel.tsx` (below analysis panel).
  - "Generate Outreach" button (disabled until an analysis exists): pick channel (cold_email/linkedin_dm/instagram_dm/sms), tone (free text), sequence day chips (default 1/3/7/14/30, add/remove).
  - Renders opener + each step in editable textareas; Save (UPDATE) and Copy buttons per block. Lists prior drafts.
- Hooks: `src/hooks/useLeadAnalyses.ts`, `src/hooks/useOutreachDrafts.ts` (TanStack Query, invoke edge functions + direct table reads/updates).

## 4. Verification checklist
1. `/offers` lists the 7 seeded rows; create/edit/delete works; nav + permission key in place.
2. From a CRM company: Analyze Lead with URL → on block, inline "couldn't read URL, paste details" appears and Text mode is pre-selected; analysis row persists in `crm_lead_analyses` and renders.
3. Generate Outreach against latest analysis → row in `crm_outreach_drafts`; opener + sequence editable + saved; Copy works; no send path exists.
4. No new tables shadow `crm_companies`/`crm_deals`; service_offers RLS = authenticated CRUD; both edge functions use Lovable AI Gateway with `google/gemini-2.5-flash`; `tsc` clean.

## Out of scope
No sending integrations, no campaign scheduler, no email-template engine, no changes to existing CRM tables (only new FKs pointing at them), no changes to capture-classify, products, affiliate programs, pillar scoring, or marketing_campaigns.