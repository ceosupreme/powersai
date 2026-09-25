import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { keyMode, serviceClient, validKey } from '../_shared/checkoutConfirm.ts';

const Body = z.object({
  product_key: z.enum(['launch_site_deposit', 'launch_site_monthly', 'care_seat']),
  src: z.string().max(80).optional().nullable(),
  biz: z.string().max(200).optional().nullable(),
  source_vertical: z.string().max(40).optional().nullable(),
  origin_path: z.string().max(200).optional().nullable(),
});
const P = {
  launch_site_deposit: { mode: 'payment', amount: 125000, name: 'Launch Site: deposit to start (balance $1,250 at launch)' },
  launch_site_monthly: { mode: 'subscription', amount: 29700, name: 'Launch Site: monthly plan ($0 down, 12-month minimum)' },
  care_seat: { mode: 'subscription', amount: 14900, name: 'Care Seat: founding rate (first 10 seats)' },
} as const;
const hits = new Map<string, { n: number; reset: number }>();
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown', now = Date.now(), h = hits.get(ip);
  if (h && h.reset > now && ++h.n > 12) return json({ error: 'Too many requests' }, 429);
  if (!h || h.reset <= now) hits.set(ip, { n: 1, reset: now + 60000 });
  let raw; try { raw = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: 'Invalid input' }, 400);
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!validKey(key)) return json({ error: 'Checkout unavailable' }, 503);

  let { mode, amount, name } = P[p.data.product_key] as { mode: string; amount: number; name: string };
  if (p.data.product_key === 'care_seat') {
    const { count, error } = await serviceClient().from('site_orders').select('id', { count: 'exact', head: true }).eq('product_key', 'care_seat').in('status', ['active', 'paid']);
    if (error) { console.error('[checkout] care count', error.message); return json({ error: 'Could not start checkout' }, 502); }
    if ((count ?? 0) >= 10) { amount = 19900; name = 'Care Seat: standard rate'; }
  }

  const origin = new URL(req.headers.get('origin') || 'https://supremeteammedia.com').origin;
  const live = origin === 'https://supremeteammedia.com' || origin === 'https://www.supremeteammedia.com';
  const base = live ? 'https://supremeteammedia.com' : origin;
  const originPath = p.data.origin_path && /^\/for\/[a-z0-9-]{2,40}\/?$/.test(p.data.origin_path) ? p.data.origin_path.replace(/\/$/, '') : null;
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][unit_amount]', String(amount));
  params.set('line_items[0][price_data][product_data][name]', name);
  params.set('line_items[0][quantity]', '1');
  if (mode === 'subscription') params.set('line_items[0][price_data][recurring][interval]', 'month'); else params.set('customer_creation', 'always');
  params.set('billing_address_collection', 'auto');
  params.set('custom_fields[0][key]', 'business_name');
  params.set('custom_fields[0][label][type]', 'custom');
  params.set('custom_fields[0][label][custom]', 'Business name');
  params.set('custom_fields[0][type]', 'text');
  params.set('custom_fields[0][optional]', 'false');
  for (const [k, v] of Object.entries({ product_key: p.data.product_key, src: p.data.src ?? '', source_vertical: p.data.source_vertical ?? '', biz: p.data.biz ?? '', origin_path: originPath ?? '', key_mode: keyMode(key) })) params.set(`metadata[${k}]`, v);
  const thanks = new URL('/thank-you', base);
  if (p.data.src) thanks.searchParams.set('src', p.data.src);
  if (originPath) thanks.searchParams.set('from', originPath);
  params.set('success_url', `${thanks.toString()}${thanks.search ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`);
  const cancel = new URL(originPath ?? '/services/websites', base);
  if (p.data.src) cancel.searchParams.set('src', p.data.src);
  cancel.hash = originPath ? 'pricing' : 'website-options';
  params.set('cancel_url', cancel.toString());
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
  const out = await r.json();
  if (!r.ok) { console.error('[checkout]', r.status, out?.error?.message); return json({ error: 'Could not start checkout' }, 502); }
  return json({ url: out.url });
});
