-- Repair two explicitly approved 2026-11-11 audit findings without deleting history.
-- Only exact records and original preconditions are eligible. Reruns are no-ops.
-- Do not change the broader overdue task list without a separate approval.

-- The mistaken 26-step journal plan created destinations the product never chose.
-- Preserve the job and all 26 original action items for the audit trail.
UPDATE public.production_jobs AS job
SET status = 'parked', updated_at = now()
WHERE job.id = '42525503-2b20-4d36-b076-699aec198d07'::uuid
  AND job.project_id = (SELECT id FROM public.venues WHERE name = 'Big Paws Club' LIMIT 1)
  AND job.title = 'Big Dog Energy: A Guided Journal'
  AND job.kind = 'product' AND job.status = 'running'
  AND (SELECT count(*) FROM public.action_items a WHERE a.job_id = job.id) = 26
  AND NOT EXISTS (SELECT 1 FROM public.action_items a WHERE a.job_id = job.id AND a.status = 'Done');

-- Short B had a "scheduled" stage with no scheduled_at and no external confirmation.
-- Return it to the last pre-scheduling stage for short video, keeping its existing
-- quality score, approval and the draft TikTok placement untouched.
-- A real external schedule must be recorded via the guided workflow.
UPDATE public.content_items AS item
SET stage = 'thumbnail'
WHERE item.id = '2fe85c98-a043-4a4c-bd25-90e3ab9e24c0'::uuid
  AND item.project_id = (SELECT id FROM public.venues WHERE name = 'Big Paws Club' LIMIT 1)
  AND item.title = 'Short B: the one-inch problem, hypothetical (20 sec)'
  AND item.format = 'short' AND item.stage = 'scheduled'
  AND item.scheduled_at IS NULL AND item.published_at IS NULL
  AND item.approved_at IS NOT NULL AND item.quality_score = 82
  AND NOT EXISTS (
    SELECT 1 FROM public.content_placements p
    WHERE p.content_item_id = item.id
      AND p.status IN ('scheduled','published')
  );
