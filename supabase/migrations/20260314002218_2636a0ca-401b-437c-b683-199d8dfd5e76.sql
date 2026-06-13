-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a wrapper function callable from edge functions via supabase.rpc()
CREATE OR REPLACE FUNCTION public.net_http_post(
  url text,
  headers_json text DEFAULT '{}',
  body_json text DEFAULT '{}'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
    url := net_http_post.url,
    headers := net_http_post.headers_json::jsonb,
    body := net_http_post.body_json::jsonb
  ) INTO request_id;
  RETURN request_id;
END;
$$;