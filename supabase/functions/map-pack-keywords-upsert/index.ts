// map-pack-keywords-upsert — admin-only CRUD for map_pack_keywords.
// Body: { venue_id, keywords: [{ id?, keyword, priority, is_active? }], delete_ids?: [...] }
// Replaces nothing; adds/updates supplied rows and soft-removes any in delete_ids.

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
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Missing bearer token' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json(401, { error: 'Invalid session' });
  const userId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
    _user_id: userId, _role: 'admin',
  });
  if (roleErr) return json(500, { error: roleErr.message });
  if (!isAdmin) return json(403, { error: 'Admin role required' });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const venueId = typeof body.venue_id === 'string' ? body.venue_id : null;
  if (!venueId || !/^[0-9a-f-]{36}$/i.test(venueId)) {
    return json(400, { error: 'venue_id must be a uuid' });
  }
  const keywords = Array.isArray(body.keywords) ? body.keywords : [];
  const deleteIds: string[] = Array.isArray(body.delete_ids) ? body.delete_ids.filter((s: any) => typeof s === 'string') : [];

  // Delete first
  if (deleteIds.length) {
    const { error: delErr } = await admin
      .from('map_pack_keywords')
      .delete()
      .eq('venue_id', venueId)
      .in('id', deleteIds);
    if (delErr) return json(500, { error: delErr.message });
  }

  // Upsert each row
  const rows = keywords
    .filter((k: any) => typeof k?.keyword === 'string' && k.keyword.trim().length > 0)
    .map((k: any) => ({
      id: typeof k.id === 'string' ? k.id : undefined,
      venue_id: venueId,
      keyword: String(k.keyword).trim(),
      priority: ['high', 'medium', 'low'].includes(k.priority) ? k.priority : 'medium',
      is_active: k.is_active === false ? false : true,
      created_by: userId,
    }));

  if (rows.length) {
    // Two-step: rows with id => update, rows without id => insert
    const inserts = rows.filter((r: any) => !r.id).map(({ id: _id, ...rest }: any) => rest);
    const updates = rows.filter((r: any) => r.id);

    if (inserts.length) {
      const { error: insErr } = await admin.from('map_pack_keywords').insert(inserts);
      if (insErr) return json(500, { error: insErr.message });
    }
    for (const u of updates) {
      const { error: upErr } = await admin
        .from('map_pack_keywords')
        .update({
          keyword: u.keyword,
          priority: u.priority,
          is_active: u.is_active,
        })
        .eq('id', u.id)
        .eq('venue_id', venueId);
      if (upErr) return json(500, { error: upErr.message });
    }
  }

  const { data: list, error: listErr } = await admin
    .from('map_pack_keywords')
    .select('*')
    .eq('venue_id', venueId)
    .order('priority', { ascending: true })
    .order('keyword', { ascending: true });
  if (listErr) return json(500, { error: listErr.message });

  return json(200, { keywords: list });
});
