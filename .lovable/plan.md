# Public Work Showcase + Admin Editor

A data-driven `portfolio_items` table powers a public `/work` gallery on the marketing site and an admin CRUD editor inside the app. Adding a piece = filling a form, never code.

## Collision guards (locked in)

- **Routes:** internal `/portfolio` (owner overview) is untouched. Public showcase lives at `/work` and `/work/:slug`.
- **Access:** `portfolio_items` rows with `status='published'` are readable by anon (public site). Only `admin` (via `has_role`) can insert/update/delete. Mirrors the existing public-read pattern used for qualifier/inbound flows.

## Data model — `portfolio_items`

Single migration creating the table + grants + RLS + policies + storage bucket:

```text
id              uuid pk
title           text not null
slug            text unique not null         -- used by /work/:slug
description     text
client_or_vertical text
category        text not null                -- filter tab key
media_type      text not null check in
                ('image','video','link','embed','case_study')
image_url       text
video_url       text
external_url    text
thumbnail_url   text
case_study_body text                          -- markdown
featured        boolean not null default false
sort_order      int not null default 0
status          text not null default 'draft' check in ('draft','published')
created_at / updated_at  timestamptz, updated_at trigger
```

Grants + RLS (follows project rule — GRANT in same migration):

- `GRANT SELECT ON public.portfolio_items TO anon, authenticated;`
- `GRANT INSERT,UPDATE,DELETE ON public.portfolio_items TO authenticated;`
- `GRANT ALL ON public.portfolio_items TO service_role;`
- Policy `portfolio_public_read`: `FOR SELECT TO anon, authenticated USING (status = 'published' OR public.has_role(auth.uid(),'admin'))`
- Policy `portfolio_admin_write`: `FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'))`

**Storage:** create public bucket `portfolio-media` via `supabase--storage_create_bucket` (public=true) for images/thumbnails/uploaded video. RLS on `storage.objects`: public read for bucket; admin-only write. (Falls back to `brand-assets`-style signed flow only if workspace blocks public buckets.)

## Public surface (`/work`)

New files under `src/components/marketing/work/` reusing existing marketing-site brand tokens (bone/forest) and `Nav` + `Footer`:

- `src/pages/Work.tsx` — fetches published items via supabase, groups by category, renders filter tabs (All + distinct categories), featured items shown first/larger in a bento grid.
- `src/pages/WorkCaseStudy.tsx` — `/work/:slug`, fetches the single item where `media_type='case_study'` and renders `case_study_body` via markdown (reuse any existing markdown renderer; otherwise a minimal `react-markdown`-style component — check what's already imported before adding deps).
- `src/components/marketing/work/PortfolioCard.tsx` — switches on `media_type`:
  - `image` → thumbnail card, click opens lightbox (simple Dialog).
  - `video` → inline `<video>` for direct URLs or iframe for YouTube/Vimeo embed URLs.
  - `link` → card opens `external_url` in new tab.
  - `embed` → iframe live preview of `external_url` with sandbox attrs.
  - `case_study` → card links to `/work/${slug}`.
- `src/components/marketing/work/CategoryTabs.tsx` — pill filter.

Routes added in `src/App.tsx` (public, no `ProtectedRoute`): `/work`, `/work/:slug`.

Nav + Footer get a "Work" link (`src/components/marketing/site/Nav.tsx`, `src/components/marketing/sections/Footer.tsx`).

`MarketingSite.tsx` keeps its existing signed-in redirect to `/portfolio` — `/work` is its own page so signed-in users hitting `/work` directly still see it (public).

## Admin editor

Mirrors `SettingsAutomationBundlesTab` pattern (list + dialog editor + reorder buttons).

- `src/hooks/usePortfolioItems.ts` — `useQuery` list (admin sees all, public hook filters published) + mutations (create/update/delete/reorder) with toast feedback.
- `src/components/admin/PortfolioItemsTab.tsx` — table of items with featured/published toggles, up/down reorder, edit/delete.
- `src/components/admin/PortfolioItemDialog.tsx` — form: title, slug (auto-from-title, editable), description, client_or_vertical, category (combobox of existing + free text), media_type select that conditionally shows the relevant fields, thumbnail upload, image/video upload (reusing the same `supabase.storage` pattern from `useBrandKit.ts`), markdown body for case studies, featured + status toggles, sort_order.
- Wired into `src/pages/Admin.tsx` as a new "Work / Portfolio" tab (admin-only — uses existing role gating already on the page).

Upload helper: a small `uploadPortfolioMedia(file)` that mirrors `useBrandKit`'s upload (path = `${user.id}/${crypto.randomUUID()}-${filename}`), returns public URL from the `portfolio-media` bucket.

## Files

**New**
- `supabase/migrations/<ts>_portfolio_items.sql`
- `src/hooks/usePortfolioItems.ts`
- `src/pages/Work.tsx`, `src/pages/WorkCaseStudy.tsx`
- `src/components/marketing/work/{PortfolioCard,CategoryTabs,Lightbox}.tsx`
- `src/components/admin/{PortfolioItemsTab,PortfolioItemDialog}.tsx`

**Edited (additive)**
- `src/App.tsx` — add `/work` + `/work/:slug` routes
- `src/components/marketing/site/Nav.tsx`, `src/components/marketing/sections/Footer.tsx` — Work link
- `src/pages/Admin.tsx` — add Portfolio tab

## Verification

1. Migration applies; admin tab can CRUD + upload + reorder + toggle featured/published.
2. Logged-out visit to `/work` shows only published items, category filters work, each `media_type` renders correctly, featured items prominent.
3. `/work/:slug` renders the case study body.
4. Unauthenticated supabase select on `portfolio_items` returns only published rows; insert/update/delete denied unless admin.
5. Internal `/portfolio` route untouched; no existing routes/RLS/features changed; `tsgo` clean.
