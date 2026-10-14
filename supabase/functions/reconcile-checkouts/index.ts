import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { confirmSession, isSessionActive, serviceClient, validKey } from '../_shared/checkoutConfirm.ts';

const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * Who may run the payment backup check: the hourly database schedule (cron job reconcile-checkouts-hourly),
 * which sends the job token kept in the database vault, or anyone holding the service key for a manual run.
 * The token is checked in the database (verify_job_token), so its value never has to live in this function.
 */
async function allowed(req: Request) {
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!service) return false;
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (bearer === service) return true;
  const token = req.headers.get('x-job-token') ?? '';
  if (token.length < 32) return false;
  const { data, error } = await serviceClient().rpc('verify_job_token', { p_job: 'reconcile-checkouts', p_token: token });
  if (error) console.error('[reconcile] token check', error.message);
  return data === true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!(await allowed(req))) return json({ error: 'Unauthorized' }, 401);
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!validKey(key)) return json({ error: 'Checkout unavailable' }, 503);
  const since = Math.floor(Date.now() / 1000) - 48 * 3600;
  const url = `https://api.stripe.com/v1/checkout/sessions?created[gte]=${since}&limit=50&expand[]=data.payment_intent&expand[]=data.subscription`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) { console.error('[reconcile] stripe', r.status); return json({ error: 'Stripe list failed' }, 502); }
  const list = await r.json();
  let checked = 0, confirmed = 0;
  for (const s of list.data ?? []) {
    checked++;
    if (!isSessionActive(s)) continue;
    try { if ((await confirmSession(s)).confirmed) confirmed++; } catch (e) { console.error('[reconcile]', s.id, e); }
  }
  return json({ ok: true, checked, confirmed });
});
