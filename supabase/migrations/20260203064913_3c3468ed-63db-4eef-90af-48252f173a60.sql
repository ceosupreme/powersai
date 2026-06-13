-- Add mentions JSONB column to task_comments table
ALTER TABLE public.task_comments 
ADD COLUMN mentions jsonb DEFAULT '[]'::jsonb;