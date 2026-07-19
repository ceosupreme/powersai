// Reports which server-side send adapters have credentials configured.
// Read-only, no user data. Used by the client to disable Live-mode toggles
// when the corresponding provider key is missing.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const body = {
    hasResendKey: Boolean(Deno.env.get('RESEND_API_KEY')),
    hasTwilio: false, // reserved; SMS is manual_log until Twilio adapter ships
  };
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});