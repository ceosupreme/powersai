import { createClient } from 'npm:@supabase/supabase-js@2';

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

  // 4) Deep-copy via a plpgsql block so it's atomic.
  const sql = `
DO $dup$
DECLARE
  next_sort int;
BEGIN
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO next_sort FROM public.project_types;

  INSERT INTO public.project_types (id, label, description, is_vertical, display_defaults, sort_order, slug)
  VALUES (${quoteLit(new_id)}, ${quoteLit(new_label)}, ${nullOr(source.description)},
          ${is_vertical ? 'true' : 'false'},
          ${jsonLit(source.display_defaults)},
          next_sort,
          ${quoteLit(new_id)});

  INSERT INTO public.pillar_templates
    (project_type, pillar_key, pillar_label, weight, sort_order, data_source)
  SELECT ${quoteLit(new_id)}, pillar_key, pillar_label, weight, sort_order, data_source
  FROM public.pillar_templates WHERE project_type = ${quoteLit(source_id)};

  INSERT INTO public.project_type_leak_vectors
    (project_type, name, detect_signal, dollarize_formula, benchmark, severity, sort_order)
  SELECT ${quoteLit(new_id)}, name, detect_signal, dollarize_formula, benchmark, severity, sort_order
  FROM public.project_type_leak_vectors WHERE project_type = ${quoteLit(source_id)};

  INSERT INTO public.project_type_qualifier_fields
    (project_type, field_key, field_label, field_type, is_shared, channel, sort_order)
  SELECT ${quoteLit(new_id)}, field_key, field_label, field_type, is_shared, channel, sort_order
  FROM public.project_type_qualifier_fields WHERE project_type = ${quoteLit(source_id)};

  INSERT INTO public.project_type_qualifier_config
    (project_type, ready_definition, primary_channel, urgency_options, operation_footprint_options)
  SELECT ${quoteLit(new_id)}, ready_definition, primary_channel, urgency_options, operation_footprint_options
  FROM public.project_type_qualifier_config WHERE project_type = ${quoteLit(source_id)};
END $dup$;
`;
  const { error: sqlErr } = await admin.rpc('exec_sql' as any, { sql }).single();
  // exec_sql may not exist — fall back to running via pg through PostgREST is impossible.
  // Instead, do sequential inserts wrapped in try/catch with manual rollback via delete.
  if (sqlErr) {
    // Fallback path: run sequential inserts, then compensate on failure.
    return await sequentialCopy(admin, source, new_id, new_label, is_vertical);
  }

  const counts = await countCopies(admin, new_id);
  return json(200, { ok: true, id: new_id, copied: counts });
});

function quoteLit(s: string) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function nullOr(v: string | null | undefined) {
  return v == null ? 'NULL' : quoteLit(v);
}
function jsonLit(v: unknown) {
  if (v == null) return 'NULL';
  return `${quoteLit(JSON.stringify(v))}::jsonb`;
}

async function countCopies(admin: ReturnType<typeof createClient>, new_id: string) {
  const [a, b, c, d] = await Promise.all([
    admin.from('pillar_templates').select('*', { count: 'exact', head: true }).eq('project_type', new_id),
    admin.from('project_type_leak_vectors').select('*', { count: 'exact', head: true }).eq('project_type', new_id),
    admin.from('project_type_qualifier_fields').select('*', { count: 'exact', head: true }).eq('project_type', new_id),
    admin.from('project_type_qualifier_config').select('*', { count: 'exact', head: true }).eq('project_type', new_id),
  ]);
  return {
    pillar_templates: a.count ?? 0,
    project_type_leak_vectors: b.count ?? 0,
    project_type_qualifier_fields: c.count ?? 0,
    project_type_qualifier_config: d.count ?? 0,
  };
}

async function sequentialCopy(
  admin: ReturnType<typeof createClient>,
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
        'name,detect_signal,dollarize_formula,benchmark,severity,sort_order',
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