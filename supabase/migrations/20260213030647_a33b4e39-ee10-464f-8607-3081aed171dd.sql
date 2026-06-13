ALTER TABLE public.bars ADD COLUMN seven_shifts_location_id text;

UPDATE public.bars SET seven_shifts_location_id = '280312'
WHERE id = 'b7bcb3b8-4b47-4b39-aa42-eed9287d20d4';