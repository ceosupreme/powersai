## Step 2: Content Pipeline

### 1. Database — new `content_items` table (migration)

Project-scoped, mirrors conventions used by `tasks` / `crm_deals` / `marketing_campaigns` (FK to `venues.id`, RLS via `user_can_access_project`, `updated_at` trigger via `handle_updated_at`).

```sql
CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  format text,                       -- soft values: long_form | short | livestream | community
  stage text NOT NULL DEFAULT 'idea',-- soft values: idea|script|record|edit|thumbnail|scheduled|published
  hook text,
  cta text,
  primary_keyword text,
  affiliate_link text,
  product_id uuid,                   -- plain nullable uuid; NO FK (channel_products doesn't exist yet)
  due_date date,
  scheduled_at timestamptz,
  published_at timestamptz,
  is_repurposed boolean NOT NULL DEFAULT false,
  is_monetized  boolean NOT NULL DEFAULT false,
  performance jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view content_items for accessible projects"
  ON public.content_items FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));
CREATE POLICY "insert content_items for accessible projects"
  ON public.content_items FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_project(project_id) AND created_by = auth.uid());
CREATE POLICY "update content_items for accessible projects"
  ON public.content_items FOR UPDATE TO authenticated
  USING (public.user_can_access_project(project_id));
CREATE POLICY "delete content_items for accessible projects"
  ON public.content_items FOR DELETE TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE INDEX content_items_project_stage_idx ON public.content_items(project_id, stage);
CREATE TRIGGER trg_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

No FK on `product_id` (channel_products doesn't exist yet — added in a later step). `format`/`stage` left as text (matches Step 1 decision for `content_status`).

### 2. Frontend — pipeline page

**New files:**
- `src/hooks/useContentItems.ts` — list/create/update/delete via supabase client, filtered by `selectedBar.id`; React Query keys `['content-items', projectId]`.
- `src/components/content/contentStages.ts` — `STAGES` const + label map + format label map (single source of truth).
- `src/components/content/ContentItemDialog.tsx` — create/edit modal with all fields. Product field is a disabled input with helper text "Linked products coming soon".
- `src/components/content/ContentListView.tsx` — table: title / format / stage (inline `Select` dropdown to change) / due date / repurposed+monetized badges / row click → edit. Filter chips by stage.
- `src/components/content/ContentKanbanView.tsx` — 7 columns, cards with "next stage" arrow button (matches existing `PipelineBoard.tsx` pattern — no dnd library is installed; CRM/Marketing-Hub boards use the same click-to-advance pattern). Each card shows title, format pill, due date, repurposed/monetized badges.
- `src/pages/ContentPipeline.tsx` — page shell: header with channel name, `Tabs` toggle (List default / Kanban), "New Content Item" button. Empty-state when selected project isn't a `content_channel`.

**Route:** `/content` in `src/App.tsx`, wrapped in `ProtectedRoute` with `pageKey="content_pipeline"`.

**Nav:** add a "Content Pipeline" link in the sidebar (`src/components/layout/Sidebar*.tsx`) under the BRAND & CONTENT section (next to Brand Vault) — only the placement file gets edited.

### 3. Permission key

In `src/types/permissions.ts`:
- add `'content_pipeline'` to `PageKey`
- add `{ key:'content_pipeline', label:'Content Pipeline', canDisable:true }` to `PAGE_CONFIG`
- add `'/content': 'content_pipeline'` to `ROUTE_TO_PAGE_KEY`

Admin sees by default (`user_can_access_page` falls through to admin bypass; `role_page_defaults` rows can be seeded later if desired — not in scope for this step).

### 4. Scoping behavior

- Page reads `selectedBar` from `AppContext`; queries `content_items` where `project_id = selectedBar.id`.
- RLS guarantees a user only sees items for channels they can access regardless of which project is selected.
- New items written with `project_id = selectedBar.id`, `created_by = auth.uid()`.

### Out of scope (deferred)
- `channel_products`, `channel_revenue`, `affiliate_programs` tables.
- Automation engine / triggers on stage transitions.
- Editor for `performance` jsonb.
- Channel creation flow.
- Any change to `marketing_campaigns`, `tasks`, or other existing tables.

### Verification
1. Migration applied; `content_items` exists with RLS + 4 policies + GRANTs + updated_at trigger.
2. `/content` loads for selected channel; List view default; inline stage dropdown updates the row.
3. Kanban toggle shows 7 stage columns sharing the same data; advancing a card updates `stage`; reflects back in List on switch.
4. Create/edit dialog saves all fields; product field is the placeholder; repurposed/monetized are checkbox flags (not stages).
5. Nav link visible; `content_pipeline` permission key gatable; admin sees by default.
6. `tsc` clean. `marketing_campaigns` untouched; no `channel_products`/`channel_revenue`/`affiliate_programs` tables; `product_id` is a plain nullable uuid with no FK.