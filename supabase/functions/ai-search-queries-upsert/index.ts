// ai-search-queries-upsert — admin-only CRUD for ai_search_queries.
// Body: { venue_id, queries: [{ id?, query, priority, source_keyword_id?, is_active? }], delete_ids?: [...] }

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (!isAdmin) return json(403, { error: 'Admin role required' });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const venueId = typeof body.venue_id === 'string' ? body.venue_id : null;
  if (!venueId || !/^[0-9a-f-]{36}$/i.test(venueId)) return json(400, { error: 'venue_id must be a uuid' });

  const queries = Array.isArray(body.queries) ? body.queries : [];
  const deleteIds: string[] = Array.isArray(body.delete_ids)
    ? body.delete_ids.filter((s: any) => typeof s === 'string') : [];

  if (deleteIds.length) {
    const { error } = await admin.from('ai_search_queries')
      .delete().eq('venue_id', venueId).in('id', deleteIds);
    if (error) return json(500, { error: error.message });
  }

  const rows = queries
    .filter((k: any) => typeof k?.query === 'string' && k.query.trim().length > 0)
    .map((k: any) => ({
      id: typeof k.id === 'string' ? k.id : undefined,
      venue_id: venueId,
      query: String(k.query).trim(),
      priority: ['high', 'medium', 'low'].includes(k.priority) ? k.priority : 'medium',
      source_keyword_id: typeof k.source_keyword_id === 'string' ? k.source_keyword_id : null,
      is_active: k.is_active === false ? false : true,
      created_by: userId,
    }));

  if (rows.length) {
    const inserts = rows.filter((r: any) => !r.id).map(({ id: _id, ...rest }: any) => rest);
    const updates = rows.filter((r: any) => r.id);
    if (inserts.length) {
      const { error } = await admin.from('ai_search_queries').insert(inserts);
      if (error) return json(500, { error: error.message });
    }
    for (const u of updates) {
      const { error } = await admin.from('ai_search_queries')
        .update({
          query: u.query, priority: u.priority,
          source_keyword_id: u.source_keyword_id, is_active: u.is_active,
        })
        .eq('id', u.id).eq('venue_id', venueId);
      if (error) return json(500, { error: error.message });
    }
  }

  const { data: list, error: listErr } = await admin
    .from('ai_search_queries').select('*')
    .eq('venue_id', venueId)
    .order('priority').order('query');
  if (listErr) return json(500, { error: listErr.message });

  return json(200, { queries: list });
});
