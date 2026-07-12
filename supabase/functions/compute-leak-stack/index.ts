// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const FALLBACK_AVG_TICKET = 40;
const FALLBACK_CLOSE_RATE = 0.15;
const SEVERITY_WEIGHT: Record<string, number> = { headline: 2, supporting: 1 };
const DEFAULT_TZ = 'America/Los_Angeles';

type Source = 'signal' | 'override' | 'vertical_default' | 'fallback';
interface Resolved { value: number; source: Source; caveat?: string }

// --- Safe formula evaluator ---------------------------------------------------
// Grammar: expr = term (('+'|'-') term)* ; term = factor (('*'|'/') factor)* ;
// factor = number | ident | '(' expr ')' ; ident = [a-z_][a-z0-9_]*
function evalFormula(src: string, vars: Record<string, number>): number {
  let i = 0;
  const s = src;
  const skip = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const peek = () => { skip(); return s[i]; };
  const parseIdent = () => {
    skip();
    const m = /^[a-z_][a-z0-9_]*/i.exec(s.slice(i));
    if (!m) throw new Error(`ident expected at ${i}`);
    i += m[0].length;
    return m[0];
  };
  const parseNumber = () => {
    skip();
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error(`number expected at ${i}`);
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const parseFactor = (): number => {
    const c = peek();
    if (c === '(') { i++; const v = parseExpr(); skip(); if (s[i] !== ')') throw new Error('missing )'); i++; return v; }
    if (/[0-9.]/.test(c)) return parseNumber();
    if (/[a-z_]/i.test(c)) {
      const name = parseIdent();
      if (!(name in vars)) throw new Error(`unresolved:${name}`);
      return vars[name];
    }
    throw new Error(`unexpected '${c}' at ${i}`);
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (true) { skip(); const c = s[i]; if (c === '*' || c === '/') { i++; const r = parseFactor(); v = c === '*' ? v * r : v / r; } else break; }
    return v;
  };
  const parseExpr = (): number => {
    let v = parseTerm();
    while (true) { skip(); const c = s[i]; if (c === '+' || c === '-') { i++; const r = parseTerm(); v = c === '+' ? v + r : v - r; } else break; }
    return v;
  };
  const out = parseExpr();
  skip();
  if (i !== s.length) throw new Error(`trailing input at ${i}`);
  return out;
}

// --- Extract identifiers referenced by a formula ------------------------------
function extractVars(src: string): string[] {
  const out = new Set<string>();
  const re = /[a-z_][a-z0-9_]*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.add(m[0]);
  return [...out];
}

// --- Hour-in-timezone helper --------------------------------------------------
function hourInTz(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: '2-digit' }).formatToParts(new Date(iso));
  const h = parts.find(p => p.type === 'hour')?.value ?? '0';
  return parseInt(h, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const bearer = authHeader.slice('Bearer '.length).trim();

    // Server-to-server bypass: trusted callers (edge functions) may present the
    // project service-role key. End users cannot obtain this value. Do NOT log it.
    const isServiceRole = SERVICE_ROLE.length > 0 && bearer === SERVICE_ROLE;

    let userId: string | null = null;
    if (!isServiceRole) {
      const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
      userId = userData.user.id;
    }

    const { venue_id } = await req.json();
    if (!venue_id || typeof venue_id !== 'string') return json({ error: 'venue_id required' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!isServiceRole) {
      // Access check for real users only. Service-role callers are pre-trusted.
      const { data: accessRow, error: accessErr } = await admin.rpc('user_can_access_project', { _project_id: venue_id });
      if (accessErr) throw accessErr;
      const canAccess = accessRow === true
        || (userId ? await hasVenueAccess(admin, userId, venue_id) : false);
      if (!canAccess) return json({ error: 'forbidden' }, 403);
    }

    // Load venue (for timezone + per-venue overrides)
    const { data: venue } = await admin.from('venues').select('*').eq('id', venue_id).maybeSingle();
    if (!venue) return json({ error: 'project not found' }, 404);
    const tz = (venue as any).timezone || DEFAULT_TZ;
    const tzCaveat = (venue as any).timezone ? undefined : 'assumes PT';

    // Resolve project_type
    const projectType = (venue as any).project_type || 'home_services';
    const { data: typeRow } = await admin.from('project_types').select('display_defaults').eq('id', projectType).maybeSingle();
    const verticalDefaults: Record<string, number> = ((typeRow as any)?.display_defaults ?? {}) as any;

    // Effective leak vectors (override REPLACE else template)
    const { data: overrides } = await admin
      .from('project_leak_vector_overrides')
      .select('name,detect_signal,dollarize_formula,benchmark,severity,sort_order,risk_type,risk_multiplier')
      .eq('project_id', venue_id)
      .order('sort_order', { ascending: true });
    let vectors: any[] = overrides ?? [];
    if (vectors.length === 0) {
      const { data: templates } = await admin
        .from('project_type_leak_vectors')
        .select('name,detect_signal,dollarize_formula,benchmark,severity,sort_order,risk_type,risk_multiplier')
        .eq('project_type', projectType)
        .order('sort_order', { ascending: true });
      vectors = templates ?? [];
    }

    // --- Signal loaders (lazy) ------------------------------------------------
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    let leadsRows: any[] | null = null;
    const loadLeads = async () => {
      if (leadsRows) return leadsRows;
      const { data } = await admin
        .from('inbound_leads')
        .select('id,created_at,automation_status,qualifier_data')
        .eq('captured_for_project_id', venue_id)
        .gte('created_at', since30);
      leadsRows = data ?? [];
      return leadsRows;
    };
    const loadLatestReview = async () => {
      const { data } = await admin
        .from('review_snapshots')
        .select('google_rating,google_review_count,snapshot_date')
        .eq('bar_id', venue_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    };
    const loadOpenFindings = async () => {
      const { count } = await admin
        .from('growth_findings')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venue_id)
        .eq('status', 'open');
      return count ?? 0;
    };

    // --- Variable resolver ----------------------------------------------------
    const resolveVar = async (name: string): Promise<Resolved | null> => {
      switch (name) {
        case 'leads_captured': {
          const rows = await loadLeads();
          return { value: rows.length, source: 'signal' };
        }
        case 'after_hours_leads': {
          const rows = await loadLeads();
          const v = rows.filter(r => {
            const flagged = (r.qualifier_data as any)?.after_hours === true || (r.qualifier_data as any)?.after_hours === 'true';
            if (flagged) return true;
            const h = hourInTz(r.created_at, tz);
            return h < 8 || h >= 18;
          }).length;
          return { value: v, source: 'signal', caveat: tzCaveat };
        }
        case 'leads_unresponded': {
          // FIX: OR (IS NULL OR = 'pending') — IN-lists never match NULL
          const rows = await loadLeads();
          const v = rows.filter(r => r.automation_status == null || r.automation_status === 'pending').length;
          return { value: v, source: 'signal' };
        }
        case 'google_rating': {
          const r = await loadLatestReview();
          if (r?.google_rating != null) return { value: Number(r.google_rating), source: 'signal' };
          break;
        }
        case 'google_review_count': {
          const r = await loadLatestReview();
          if (r?.google_review_count != null) return { value: Number(r.google_review_count), source: 'signal' };
          break;
        }
        case 'rating_gap_to_benchmark': {
          const r = await loadLatestReview();
          if (r?.google_rating != null) return { value: Math.max(0, 4.6 - Number(r.google_rating)), source: 'signal' };
          break;
        }
        case 'open_findings_count': {
          const c = await loadOpenFindings();
          return { value: c, source: 'signal' };
        }
        case 'avg_ticket': {
          const v = (venue as any).avg_ticket ?? (venue as any).average_ticket;
          if (v != null) return { value: Number(v), source: 'override' };
          if (verticalDefaults.avg_ticket != null) return { value: Number(verticalDefaults.avg_ticket), source: 'vertical_default' };
          return { value: FALLBACK_AVG_TICKET, source: 'fallback' };
        }
        case 'close_rate': {
          const v = (venue as any).close_rate ?? (venue as any).lead_close_rate;
          if (v != null) return { value: Number(v), source: 'override' };
          if (verticalDefaults.close_rate != null) return { value: Number(verticalDefaults.close_rate), source: 'vertical_default' };
          return { value: FALLBACK_CLOSE_RATE, source: 'fallback' };
        }
      }
      // Generic fall-through: vertical → unresolved
      if (verticalDefaults[name] != null) return { value: Number(verticalDefaults[name]), source: 'vertical_default' };
      return null;
    };

    // --- Compute each vector --------------------------------------------------
    const results: any[] = [];
    const inputsBasis: Record<string, Resolved | { unresolved: true }> = {};
    let totalCaptured = 0;
    let totalRisk = 0;
    let topKey: string | null = null;
    let topScore = -Infinity;

    for (const v of vectors) {
      if (!v.dollarize_formula) {
        results.push({ name: v.name, severity: v.severity, benchmark: v.benchmark, risk_type: v.risk_type, monthly_dollars: null, reason: 'no formula', inputs: [] });
        continue;
      }
      const varNames = extractVars(v.dollarize_formula);
      const varMap: Record<string, number> = {};
      const inputList: any[] = [];
      let unresolvedVar: string | null = null;
      for (const name of varNames) {
        const r = await resolveVar(name);
        if (!r) { unresolvedVar = name; inputsBasis[name] = { unresolved: true }; inputList.push({ name, unresolved: true }); continue; }
        varMap[name] = r.value;
        inputsBasis[name] = r;
        inputList.push({ name, ...r });
      }
      if (unresolvedVar) {
        results.push({ name: v.name, severity: v.severity, benchmark: v.benchmark, risk_type: v.risk_type, monthly_dollars: null, reason: `unresolved:${unresolvedVar}`, render_state: 'priced_with_your_numbers', inputs: inputList });
        continue;
      }
      let raw: number;
      try { raw = evalFormula(v.dollarize_formula, varMap); }
      catch (e) {
        results.push({ name: v.name, severity: v.severity, benchmark: v.benchmark, risk_type: v.risk_type, monthly_dollars: null, reason: `parse:${(e as Error).message}`, render_state: 'priced_with_your_numbers', inputs: inputList });
        continue;
      }
      const risk_type = v.risk_type || 'captured_revenue';
      const multiplier = risk_type === 'avoided_loss' ? Number(v.risk_multiplier ?? 1) : 1;
      const dollars = Math.max(0, Math.round(raw * multiplier));
      if (risk_type === 'avoided_loss') totalRisk += dollars; else totalCaptured += dollars;
      const score = (SEVERITY_WEIGHT[v.severity] ?? 1) * dollars;
      if (risk_type === 'captured_revenue' && score > topScore) { topScore = score; topKey = v.name; }
      results.push({
        name: v.name,
        severity: v.severity,
        benchmark: v.benchmark,
        risk_type,
        risk_multiplier: multiplier,
        monthly_dollars: dollars,
        render_state: 'estimated',
        inputs: inputList,
      });
    }

    // Rank: captured first by score desc, then avoided-loss
    results.sort((a, b) => {
      const aRisk = a.risk_type === 'avoided_loss' ? 1 : 0;
      const bRisk = b.risk_type === 'avoided_loss' ? 1 : 0;
      if (aRisk !== bRisk) return aRisk - bRisk;
      const as = (SEVERITY_WEIGHT[a.severity] ?? 1) * (a.monthly_dollars ?? 0);
      const bs = (SEVERITY_WEIGHT[b.severity] ?? 1) * (b.monthly_dollars ?? 0);
      return bs - as;
    });

    // Persist run (RLS-scoped via service role but we still write the row honestly)
    const { data: runRow, error: insErr } = await admin.from('leak_stack_runs').insert({
      venue_id,
      triggered_by: userId,
      total_monthly_dollars: totalCaptured,
      total_risk_exposure_dollars: totalRisk,
      top_leak_key: topKey,
      results,
      inputs_basis: inputsBasis,
    }).select().single();
    if (insErr) throw insErr;

    return json({ run: runRow });
  } catch (e) {
    console.error('[compute-leak-stack]', e);
    return json({ error: (e as Error).message ?? 'error' }, 500);
  }
});

async function hasVenueAccess(admin: any, userId: string, venueId: string): Promise<boolean> {
  const { data: adminRole } = await admin.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (adminRole) return true;
  const { data: va } = await admin.from('venue_assignments').select('venue_id').eq('user_id', userId).eq('venue_id', venueId).maybeSingle();
  if (va) return true;
  const { data: uvr } = await admin.from('user_venue_roles').select('venue_id').eq('user_id', userId).eq('venue_id', venueId).maybeSingle();
  return !!uvr;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}