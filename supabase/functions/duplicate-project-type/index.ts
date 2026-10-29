import { guardEdgeRequest } from '../_shared/auth-guard.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface Body {
  source_id?: string;
  new_id?: string;
  new_label?: string;
  is_vertical?: boolean;
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const __authDenied = await guardEdgeRequest(req, 'duplicate-project-type');
  if (__authDenied) return __authDenied;

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 1) Caller resolution — hard-fail if we can't identify the user.
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

  // 2) Admin gate — service client for the has_role RPC.
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await admin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  if (!isAdmin) return json(403, { error: 'forbidden' });

  // 3) Validate body.
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const source_id = (body.source_id ?? '').trim();
  const new_id = (body.new_id ?? '').trim();
  const new_label = (body.new_label ?? '').trim();
  const is_vertical = Boolean(body.is_vertical);

  if (!source_id) return json(400, { error: 'missing_source_id' });
  if (!new_label) return json(400, { error: 'missing_label' });
  if (!/^[a-z][a-z0-9_]*$/.test(new_id)) return json(400, { error: 'invalid_id_format' });

  // Reject duplicate ids up front (FK+unique will also stop it).
  const { data: existing } = await admin
    .from('project_types')
    .select('id')
    .eq('id', new_id)
    .maybeSingle();
  if (existing) return json(409, { error: 'id_already_exists' });

  const { data: source } = await admin
    .from('project_types')
    .select('id,label,description,is_vertical,display_defaults,sort_order')
    .eq('id', source_id)
    .maybeSingle();
  if (!source) return json(404, { error: 'source_not_found' });

  // Copy through the typed table APIs. There is deliberately no arbitrary-SQL RPC.
  return await sequentialCopy(admin, source, new_id, new_label, is_vertical);
});

async function sequentialCopy(
  admin: SupabaseClient,
  source: any,
  new_id: string,
  new_label: string,
  is_vertical: boolean,
) {
  // Compute next sort order.
  const { data: maxRow } = await admin
    .from('project_types')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const next_sort = (maxRow?.sort_order ?? 0) + 1;

  const { error: rowErr } = await admin.from('project_types').insert({
    id: new_id,
    label: new_label,
    description: source.description,
    is_vertical,
    display_defaults: source.display_defaults,
    sort_order: next_sort,
    slug: new_id,
  });
  if (rowErr) return json(500, { error: 'insert_type_failed', detail: rowErr.message });

  try {
    const copyTable = async (table: string, cols: string) => {
      const { data: rows, error } = await admin
        .from(table)
        .select(cols)
        .eq('project_type', source.id);
      if (error) throw error;
      if (!rows || rows.length === 0) return 0;
      const insertRows = rows.map((r: any) => ({ ...r, project_type: new_id }));
      const { error: insErr } = await admin.from(table).insert(insertRows);
      if (insErr) throw insErr;
      return rows.length;
    };

    const copied = {
      pillar_templates: await copyTable(
        'pillar_templates',
        'pillar_key,pillar_label,weight,sort_order,data_source',
      ),
      project_type_leak_vectors: await copyTable(
        'project_type_leak_vectors',
        'name,detect_signal,dollarize_formula,benchmark,severity,sort_order,risk_type,risk_multiplier',
      ),
      project_type_qualifier_fields: await copyTable(
        'project_type_qualifier_fields',
        'field_key,field_label,field_type,is_shared,channel,sort_order',
      ),
      project_type_qualifier_config: await copyTable(
        'project_type_qualifier_config',
        'ready_definition,primary_channel,urgency_options,operation_footprint_options',
      ),
    };
    return json(200, { ok: true, id: new_id, copied });
  } catch (e: any) {
    // Compensating cleanup.
    await admin.from('pillar_templates').delete().eq('project_type', new_id);
    await admin.from('project_type_leak_vectors').delete().eq('project_type', new_id);
    await admin.from('project_type_qualifier_fields').delete().eq('project_type', new_id);
    await admin.from('project_type_qualifier_config').delete().eq('project_type', new_id);
    await admin.from('project_types').delete().eq('id', new_id);
    return json(500, { error: 'copy_failed', detail: e?.message ?? String(e) });
  }
}