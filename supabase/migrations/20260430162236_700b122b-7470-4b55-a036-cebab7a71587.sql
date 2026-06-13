CREATE TABLE IF NOT EXISTS public.insights_sentiment_backup_2026_04 (
  insight_id uuid PRIMARY KEY,
  sentiment text,
  snapshotted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insights_sentiment_backup_2026_04 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sentiment backup"
ON public.insights_sentiment_backup_2026_04
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.insights_sentiment_backup_2026_04 (insight_id, sentiment)
SELECT id, sentiment FROM public.insights
ON CONFLICT (insight_id) DO NOTHING;