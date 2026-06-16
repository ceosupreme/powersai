# Step 6 — Long-Form Publish Automation (one hardcoded rule)

When a long-form content item first reaches `stage='published'`, auto-create 8 follow-up tasks linked to that video, exactly once, with a visible log and undo.

## 1. Schema changes (single migration)

### `content_items` — fire-once column
- Add `automation_fired_at timestamptz NULL` (nullable; never set means "has not fired"). No default.

### `content_automation_runs` (new — log table, NOT a rule engine)
- `id uuid pk default gen_random_uuid()`
- `content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE`
- `project_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE`
- `rule_key text NOT NULL` (hardcoded value `'long_form_published_v1'` — single value today; lets us namespace if a future rule is added without a generic engine)
- `task_ids uuid[] NOT NULL DEFAULT '{}'` (the exact tasks this run created → drives undo)
- `tasks_created int NOT NULL DEFAULT 0`
- `status text NOT NULL DEFAULT 'completed'` (`completed` / `undone` / `failed`)
- `error text NULL`
- `triggered_by uuid NULL` (the content item's `created_by` snapshot)
- `created_at timestamptz NOT NULL DEFAULT now()`
- `undone_at timestamptz NULL`
- Index: `(content_item_id, created_at DESC)`.
- RLS + GRANTs: `user_can_access_project(project_id)` for SELECT/INSERT/UPDATE/DELETE (matches how `content_items`/`channel_revenue` are scoped). Plus `service_role` ALL for the edge function.

## 2. Postgres trigger + pg_net dispatch (pattern reused)

Model: identical shape to `cron.schedule(... net.http_post ...)` blocks in migration `20260315094951` (Monday-briefing/sync-google-ratings) and the `public.net_http_post` helper already in `db-functions`. We use a row-level AFTER UPDATE trigger that fires the same `net.http_post` to a new edge function.

```sql
CREATE OR REPLACE FUNCTION public.fn_content_long_form_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage = 'published'
     AND (OLD.stage IS DISTINCT FROM 'published')
     AND NEW.format = 'long_form'
     AND NEW.automation_fired_at IS NULL THEN
    PERFORM net.http_post(
      url := 'https://<project>.supabase.co/functions/v1/content-publish-automation',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon-jwt>"}'::jsonb,
      body := jsonb_build_object('content_item_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER content_items_long_form_published
AFTER UPDATE OF stage ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.fn_content_long_form_published();
```

The trigger is a best-effort dispatch; the edge function is the source of truth for fire-once.

## 3. Fire-once: the atomic check-and-set (the load-bearing detail)

The edge function `content-publish-automation` runs with the **service role** and does this as its FIRST DB op:

```sql
UPDATE public.content_items
   SET automation_fired_at = now()
 WHERE id = :content_item_id
   AND stage = 'published'
   AND format = 'long_form'
   AND automation_fired_at IS NULL
RETURNING id, project_id, title, created_by;
```

Why this is bulletproof against double-fire:
- `UPDATE ... WHERE automation_fired_at IS NULL` takes a row-level lock on that single row. Postgres serializes concurrent updates to the same row.
- The first invocation flips `automation_fired_at` from NULL → now() and RETURNs one row. Any second concurrent invocation waits on the row lock; when it proceeds, the `WHERE automation_fired_at IS NULL` predicate is FALSE so 0 rows are returned and the function exits early without creating tasks.
- It is a single statement, so check + set are one atomic step — no TOCTOU window.
- Because the flag is set permanently and the predicate only matches when NULL, re-saves, stage flip-flops (published → draft → published), and any future trigger re-fire all hit "0 rows returned" and no-op.

Only if 1 row is returned does the function proceed to create the 8 tasks and write a `content_automation_runs` log row containing the new task ids.

If task insert fails after the flag has been set, we update the log row to `status='failed'` and reset `automation_fired_at = NULL` on that content item so the rule can re-fire next time the user transitions to published. (This is the only path that clears the flag automatically.)

## 4. Edge function `content-publish-automation`

`supabase/functions/content-publish-automation/index.ts`

- POST handler. CORS via `npm:@supabase/supabase-js@2/cors`.
- Zod-validate body `{ content_item_id: uuid }`. 400 on bad input.
- Service-role Supabase client.
- Step A: atomic check-and-set query above. If 0 rows → return `{ skipped: true, reason: 'already_fired_or_not_eligible' }` (200).
- Step B: build 8 task payloads (titles below), each:
  - `bar_id = project_id` (cast to text per existing `tasks` schema — same convention `ContentItemLinkedTasks` already uses)
  - `content_item_id = content_item_id`
  - `created_by = item.created_by` (snapshot; null-safe — task creator stays the human who owns the video; if null, falls back to null and the row is still valid since tasks.created_by is nullable per existing inserts)
  - `priority = 'Medium'` (existing enum value)
  - `status = 'Todo'` (existing enum value)
  - `title` per spec; no new enum/columns
- Step C: insert all 8 in one `.insert([...]).select('id')`. Collect ids.
- Step D: insert `content_automation_runs` row with `task_ids`, `tasks_created=8`, `rule_key='long_form_published_v1'`, `status='completed'`, `triggered_by=item.created_by`, `project_id=item.project_id`.
- Step E: return `{ run_id, task_ids }`.
- On failure between B and D: best-effort rollback — delete any inserted tasks, then `UPDATE content_items SET automation_fired_at = NULL` to allow retry, and write `content_automation_runs` row with `status='failed'`, `error=...`.

Task titles (8 total, exactly):
1. `Create Short #1 from "{title}"`
2. `Create Short #2 from "{title}"`
3. `Create Short #3 from "{title}"`
4. `Create Short #4 from "{title}"`
5. `Create Short #5 from "{title}"`
6. `Write blog post from "{title}"`
7. `Write email featuring "{title}"`
8. `Review/add affiliate CTA for "{title}"`

## 5. Undo (edge function `content-publish-automation-undo`)

Single POST `{ run_id: uuid }`.
- Load run row; reject if `status != 'completed'`.
- `DELETE FROM tasks WHERE id = ANY(run.task_ids) AND content_item_id = run.content_item_id` — the `content_item_id` predicate guarantees we never touch unrelated tasks even if a UUID collision were somehow forced.
- `UPDATE content_automation_runs SET status='undone', undone_at=now() WHERE id=run_id`.
- `UPDATE content_items SET automation_fired_at = NULL WHERE id = run.content_item_id` so the user can re-run if they want to.
- Returns `{ deleted: <count> }`.

RLS gate: caller must have project access — the edge function uses the user's JWT to call `user_can_access_project(run.project_id)` before deleting (verified server-side; service-role used only for the actual writes after the check).

## 6. UI: visible log + undo button

New component `src/components/content/ContentAutomationRuns.tsx`, rendered inside `ContentItemDialog` directly below `ContentItemLinkedTasks`. Shows for the current `item.id`:

- One line per run: timestamp, rule label ("Long-form publish kit"), task count, status badge (completed / undone / failed), an "Undo" button when `status='completed'`, and a "View task" link list (8 chips) that route to `/tasks` filtered by id (or just show the task title with status).
- Above the list, a small badge on the dialog header when `item.automation_fired_at` is set: "Automation fired {timeAgo}".

New hook `src/hooks/useContentAutomationRuns.ts`:
- `useContentAutomationRuns(contentItemId)` — query runs by `content_item_id` with their linked tasks (title/status) via a second query.
- `useUndoAutomationRun()` — calls `supabase.functions.invoke('content-publish-automation-undo', { body: { run_id }})`, invalidates the runs query + the `['content-item-tasks', itemId]` query already used by the linked-tasks panel + `['tasks']`.

No nav entry needed — the log lives on the content item where the user already manages the video.

## 7. Out of scope (explicit)
- No `content_automations` rule table. Single hardcoded rule, namespaced by `rule_key='long_form_published_v1'` for future-proofing only.
- No new task enum values. No parallel task system.
- No changes to `marketing_campaigns`, pillar scoring, weekly review, Step 5 libraries, or any cron schedules.
- Trigger only fires on `stage` column updates; INSERTs that arrive already at `published` are NOT auto-fired (matches "transitions to published"; if user wants insert-at-published to also fire, that's a one-line change later).

## 8. Verification
1. Create a long-form item, move to `published` → exactly 8 tasks appear in linked-tasks panel, all with `content_item_id` set and `bar_id` = the channel.
2. Non-long-form item → published: trigger fires but edge function exits at the predicate (format mismatch), 0 tasks created, 0 log rows.
3. Re-save the published item / flip stage to `idea` and back to `published`: trigger fires repeatedly, but the atomic UPDATE returns 0 rows each time → no extra tasks; `automation_fired_at` remains the original timestamp.
4. The dialog shows the run with timestamp + 8 task chips. Undo button deletes exactly those 8 task ids (verified by id predicate + content_item_id predicate), marks run `undone`, and resets `automation_fired_at` to NULL.
5. Pattern matches existing pg_net dispatch (migration `20260315094951` + `public.net_http_post` helper). No new task enums; no rule-engine table; tasks reuse Step 3's `content_item_id` FK.
6. `tsc` clean. `marketing_campaigns`, pillar tables, cron jobs untouched.
