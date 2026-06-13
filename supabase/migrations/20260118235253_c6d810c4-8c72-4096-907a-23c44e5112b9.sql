-- Create voice_notes table for quick voice memo capture
CREATE TABLE public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id TEXT NOT NULL,
  created_by UUID NOT NULL,
  transcript TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

-- Users can view notes for their assigned bars
CREATE POLICY "Users can view notes for their bars"
  ON public.voice_notes FOR SELECT
  USING (
    public.user_has_bar_access(auth.uid(), bar_id)
  );

-- Users can create notes for their assigned bars
CREATE POLICY "Users can create notes for their bars"
  ON public.voice_notes FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    public.user_has_bar_access(auth.uid(), bar_id)
  );

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON public.voice_notes FOR DELETE
  USING (
    auth.uid() = created_by
  );