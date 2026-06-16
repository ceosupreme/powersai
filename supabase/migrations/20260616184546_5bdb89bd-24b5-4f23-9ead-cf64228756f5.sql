ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS content_item_id uuid NULL
    REFERENCES public.content_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_content_item_id
  ON public.tasks(content_item_id)
  WHERE content_item_id IS NOT NULL;