import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'missing_auth' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authed = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsErr } = await authed.auth.getClaims(token);
  const userId = claimsData?.claims?.sub as string | undefined;
  if (claimsErr || !userId) return json(401, { error: 'unauthorized' });

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await admin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  if (!isAdmin) return json(403, { error: 'forbidden' });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const id = (body.id ?? '').trim();
  if (!id) return json(400, { error: 'missing_id' });

  // Permanent guard: 'client' is the system-wide fallback.
  if (id === 'client') {
    return json(400, { error: 'system_default_type', hint: 'system default type' });
  }

  // Guard: refuse if any project uses this type. FK RESTRICT is the true lock;
  // this check gives a clean error message.
  const { count: inUse } = await admin
    .from('venues')
    .select('*', { count: 'exact', head: true })
    .eq('project_type', id);
  if ((inUse ?? 0) > 0) {
    return json(409, { error: 'in_use', count: inUse });
  }

  // Cascade delete dependent template rows, then the type row.
  const errors: string[] = [];
  for (const t of [
    'pillar_templates',
    'project_type_leak_vectors',
    'project_type_qualifier_fields',
    'project_type_qualifier_config',
  ]) {
    const { error } = await admin.from(t).delete().eq('project_type', id);
    if (error) errors.push(`${t}: ${error.message}`);
  }
  if (errors.length) return json(500, { error: 'cleanup_failed', detail: errors });

  const { error: delErr } = await admin.from('project_types').delete().eq('id', id);
  if (delErr) return json(500, { error: 'delete_failed', detail: delErr.message });

  return json(200, { ok: true, id });
});