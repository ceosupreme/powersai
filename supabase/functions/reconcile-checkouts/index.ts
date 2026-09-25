import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { confirmSession, isSessionActive, validKey } from '../_shared/checkoutConfirm.ts';

const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!service || bearer !== service) return json({ error: 'Unauthorized' }, 401);
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
