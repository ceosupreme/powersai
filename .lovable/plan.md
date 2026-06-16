## Step 3: Link tasks to content items

Additive only. One nullable FK + index on `tasks`, plus a minimal "Linked Tasks" surface inside the existing content item dialog. No enum changes, no new tables, no Tasks-page redesign.

### 1. Migration (schema only)

```sql
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS content_item_id uuid NULL
    REFERENCES public.content_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_content_item_id
  ON public.tasks(content_item_id)
  WHERE content_item_id IS NOT NULL;
```

- Nullable → all existing rows stay null, no rewrite.
- `ON DELETE SET NULL` per your call: deleting a content item leaves its tasks intact, link is cleared.
- No touch to `task_status`, `task_priority`, `tasks.*` columns, RLS, or grants. Existing tasks RLS already governs row access (channel = venue = project, same access path).

### 2. Type updates (non-schema)

- `src/types/tasks.ts`: add `content_item_id?: string | null` to `Task` and `CreateTaskInput`.
- `src/integrations/supabase/types.ts` regenerates automatically post-migration.

### 3. Minimal UI in the content item dialog

Surface lives only on the content-item side (per spec). Only shown when editing an existing item (need an `id` to link against).

- New small component `src/components/content/ContentItemLinkedTasks.tsx`:
  - Query: `tasks` where `content_item_id = item.id`, select `id, title, status, due_date, assignee:profiles(...)`. Read-only list (title + status badge + due date).
  - "New Task" inline form (title + priority + due_date) → calls existing `useCreateTask()` with:
    - `bar_id: String(projectId)` (channels are venues; `tasks.bar_id` is text)
    - `content_item_id: item.id` (passed through the existing insert path — extending `CreateTaskInput` is enough; no new mutation)
    - Defaults: `priority: 'Medium'`, `status: 'Todo'`
  - On success: invalidate `['tasks']` and a new `['content-item-tasks', item.id]` query key.
- `ContentItemDialog.tsx`: when `item` is present, render `<ContentItemLinkedTasks itemId={item.id} projectId={projectId} />` as a new section below the form. New items (pre-save) show a "Save first to add linked tasks" hint.

### 4. Tasks-page indicator — SKIP

Per spec ("if cheap, else skip"), skipping. Tasks page columns are dense and adding a join + cell is more than trivial. Noted as a future enhancement; the content-item-side surface is the contract.

### Out of scope
- Enum changes, new tables, Tasks-page redesign.
- Automation that auto-spawns tasks on stage transition (Step 6).
- Bidirectional UI on individual TaskCard/TaskDetailDrawer.

### Verification
1. `\d public.tasks` shows `content_item_id uuid` nullable, FK → `content_items(id)` `ON DELETE SET NULL`; index present. `task_status`/`task_priority`/other columns unchanged. Existing rows all null.
2. From a content item dialog: linked tasks list renders; creating a task writes a row with correct `content_item_id` + `bar_id` (channel id) via existing `useCreateTask`.
3. Manual delete of a `content_items` row leaves matching `tasks` rows intact with `content_item_id` flipped to null.
4. `tsc` clean. No new tables, no enum changes, no parallel task hook/mutation — `useCreateTask` is the single write path.
