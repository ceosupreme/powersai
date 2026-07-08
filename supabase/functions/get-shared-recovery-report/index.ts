import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const BodySchema = z.object({
  token: z.string().min(32).max(256),
});

function notFound() {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return notFound();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: report, error } = await supabase
    .from('recovery_reports')
    .select(
      'project_id, period_start, period_end, metrics, estimated_dollars, estimate_basis, narrative, status, share_referral_footer',
    )
    .eq('share_token', parsed.data.token)
    .maybeSingle();

  if (error || !report) return notFound();

  // HARD GUARD: draft (or anything else) can never reach the client via share.
  if (report.status !== 'reviewed' && report.status !== 'sent') return notFound();

  // Fetch venue display name so the public page never queries the DB itself.
  let displayName = 'your business';
  if (report.project_id) {
    const { data: venue } = await supabase
      .from('venues')
      .select('name')
      .eq('id', report.project_id)
      .maybeSingle();
    if (venue?.name) displayName = venue.name;
  }

  const curated = {
    display_name: displayName,
    period_start: report.period_start,
    period_end: report.period_end,
    metrics: report.metrics,
    estimated_dollars: report.estimated_dollars,
    estimate_basis: report.estimate_basis,
    narrative: report.narrative,
    share_referral_footer: report.share_referral_footer,
  };

  return new Response(JSON.stringify(curated), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
});