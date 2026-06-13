// gbp-admin-upsert-mapping — admin-only edge function to upsert a venue's
// GBP place mapping. Bypasses RLS via service role after verifying the
// caller is authenticated AND has the 'admin' app role.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'Missing bearer token' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return json(401, { error: 'Invalid session' });
  }
  const userId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  if (roleErr) return json(500, { error: roleErr.message });
  if (!isAdmin) return json(403, { error: 'Admin role required' });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const venueId = typeof body.venue_id === 'string' ? body.venue_id : null;
  const placeId = body.place_id == null ? null
    : (typeof body.place_id === 'string' ? body.place_id.trim() || null : null);
  const manualOnly = !!body.manual_only;

  if (!venueId || !/^[0-9a-f-]{36}$/i.test(venueId)) {
    return json(400, { error: 'venue_id must be a uuid' });
  }

  const { data, error } = await admin
    .from('gbp_place_mappings')
    .upsert({
      venue_id: venueId,
      place_id: placeId,
      manual_only: manualOnly,
      consecutive_fetch_failures: 0,
      last_resolve_error: null,
    }, { onConflict: 'venue_id' })
    .select()
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { mapping: data });
});
