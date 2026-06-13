CREATE TABLE public.ai_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  venue_id uuid NULL,
  provider text NOT NULL,
  model_id text NOT NULL,
  prompt_version text NOT NULL DEFAULT 'v1',
  input_tokens integer NULL,
  output_tokens integer NULL,
  cost_usd numeric(10,6) NULL,
  latency_ms integer NULL,
  error_state text NOT NULL DEFAULT 'success',
  error_message text NULL
);

CREATE INDEX idx_ai_call_log_created_at ON public.ai_call_log (created_at DESC);
CREATE INDEX idx_ai_call_log_fn_created ON public.ai_call_log (function_name, created_at DESC);

ALTER TABLE public.ai_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_call_log"
  ON public.ai_call_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
