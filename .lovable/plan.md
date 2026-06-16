# Step 5 — Affiliate Programs & Products Libraries

Two global (account-wide) libraries, plus wiring real FKs from `content_items.product_id` and `channel_revenue.product_id` to the new products table.

## 1. Database (single migration)

### `affiliate_programs` (global)
- Columns: `id`, `name` (required), `niche`, `commission_type`, `commission_detail`, `link`, `status`, `notes`, `created_by`, `created_at`, `updated_at`.
- RLS: enabled. Authenticated users can SELECT/INSERT/UPDATE/DELETE. No project gate (operator-shared library).
- GRANTs: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role`. No anon.
- `handle_updated_at` trigger.

### `channel_products` (global)
- Columns: `id`, `name` (required), `price` numeric(12,2), `funnel_stage`, `lead_magnet`, `sales_page_url`, `status`, `monthly_sales` numeric (manual stored value, not auto-computed), `notes`, `created_by`, `created_at`, `updated_at`.
- Same RLS/GRANTs/trigger pattern as `affiliate_programs`.

### `channel_product_channels` (join: product ↔ channel)
- Columns: `product_id` uuid FK → `channel_products(id)` ON DELETE CASCADE, `project_id` uuid FK → `venues(id)` ON DELETE CASCADE, `created_at`. PK on `(product_id, project_id)`.
- RLS: authenticated CRUD (read membership freely; write gated by project access via existing `user_can_access_project(project_id)` for INSERT/DELETE so attribution requires channel access).
- GRANTs: authenticated + service_role.
- Index on `project_id` for reverse lookup.

### Wire real FKs
- Pre-check via `supabase--read_query`: confirm zero non-null `product_id` values in `content_items` and `channel_revenue`. If any orphans, report and stop instead of failing the migration.
- `ALTER TABLE public.content_items ADD CONSTRAINT content_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.channel_products(id) ON DELETE SET NULL;`
- Same for `channel_revenue.product_id`.

## 2. Frontend

### Hooks
- `src/hooks/useAffiliatePrograms.ts` — list/create/update/delete via React Query (no project filter).
- `src/hooks/useChannelProducts.ts` — list/create/update/delete + helpers to read/write `channel_product_channels` attribution for a given product. Includes `useProductChannels(productId)` and a setter that diffs and applies inserts/deletes.

### Pages
- `/affiliate-programs` → `src/pages/AffiliatePrograms.tsx`: table + create/edit dialog (`AffiliateProgramDialog.tsx`).
- `/products` → `src/pages/Products.tsx`: table + create/edit dialog (`ProductDialog.tsx`) with a multi-select of channels (queries `venues` where `project_type='content_channel'`) writing to `channel_product_channels`.

### Wiring product selectors
- `ContentItemDialog.tsx`: replace placeholder product field with a real `<Select>` populated from `useChannelProducts`. Nullable.
- `RevenueEntryDialog.tsx`: same — real product selector.

### Nav + permissions
- Add sidebar entries under Brand & Content: "Affiliate Programs", "Products".
- Add `affiliate_programs` and `products` keys to `PageKey` / `PAGE_CONFIG` / `ROUTE_TO_PAGE_KEY` in `src/types/permissions.ts`. Admin default true.
- Add routes in `src/App.tsx` wrapped in `ProtectedRoute`.

## 3. Out of scope (explicit)
- No auto-computed `monthly_sales` from `channel_revenue` (manual field per spec).
- No changes to pillar scoring, weekly review, or `marketing_campaigns`.
- No anon access on any new table.
- No backfill of existing `product_id` data (all currently null; will verify).

## 4. Verification
- Both tables exist; RLS enabled; GRANTs present; triggers set.
- FKs on `content_items.product_id` and `channel_revenue.product_id` reference `channel_products(id)` with ON DELETE SET NULL.
- Deleting a product nulls FK rows but preserves content/revenue records (manual spot test post-deploy).
- `/affiliate-programs` and `/products` load, CRUD works; product channel attribution multi-select saves and reloads.
- Product selector appears in Content Item dialog and Revenue Entry dialog and persists.
- `tsc` clean. `marketing_campaigns`, pillar tables untouched.
