import { createClient } from 'npm:@supabase/supabase-js@2';

export const PRODUCT_NAMES = { launch_site_deposit: 'Launch Site deposit', launch_site_monthly: 'Launch Site monthly plan', care_seat: 'Care Seat' } as const;
export type ProductKey = keyof typeof PRODUCT_NAMES;

export const keyMode = (key: string) => (key.startsWith('sk_live_') || key.startsWith('rk_live_') ? 'live' : 'test');
export const validKey = (key: string | undefined | null): key is string => !!key && /^(sk|rk)_(test|live)_/.test(key);

export function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

export async function retrieveSession(key: string, id: string) {
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent&expand[]=subscription&expand[]=customer`, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) { console.error('[checkoutConfirm] stripe', r.status); return null; }
  return await r.json();
}

export function isSessionActive(s: any) {
  if (s?.status && s.status !== 'complete') return false;
  return s.mode === 'payment' ? s.payment_status === 'paid' : ['active', 'trialing'].includes(s.subscription?.status) || s.payment_status === 'paid';
}

/** Idempotent by stripe_session_id: upserts the order, creates the lead once, dispatches alerts once. */
export async function confirmSession(s: any): Promise<{ confirmed: boolean; product_key?: ProductKey; product_name?: string; amount_cents?: number; currency?: string }> {
  if (!isSessionActive(s)) return { confirmed: false };
  const product = s.metadata?.product_key as ProductKey;
  if (!PRODUCT_NAMES[product]) return { confirmed: false };
  const sb = serviceClient();
  const biz = s.custom_fields?.find((f: any) => f.key === 'business_name')?.text?.value || s.metadata?.biz || null;
  const status = s.mode === 'payment' ? 'paid' : 'active';
  const safe = { ...s,
    payment_intent: typeof s.payment_intent === 'object' && s.payment_intent ? { id: s.payment_intent.id, status: s.payment_intent.status } : s.payment_intent,
    customer: typeof s.customer === 'object' && s.customer ? { id: s.customer.id, email: s.customer.email, name: s.customer.name } : s.customer,
    subscription: typeof s.subscription === 'object' && s.subscription ? { id: s.subscription.id, status: s.subscription.status } : s.subscription };
  const orderIn = {
    stripe_session_id: s.id,
    stripe_customer_id: s.customer?.id ?? s.customer ?? null,
    stripe_subscription_id: s.subscription?.id ?? s.subscription ?? null,
    stripe_payment_intent_id: s.payment_intent?.id ?? s.payment_intent ?? null,
    mode: s.mode, product_key: product, amount_cents: s.amount_total ?? 0, currency: s.currency ?? 'usd',
    email: s.customer_details?.email ?? s.customer?.email ?? null,
    name: s.customer_details?.name ?? s.customer?.name ?? null,
    business_name: biz, status,
    source_vertical: s.metadata?.source_vertical || null, src: s.metadata?.src || null, raw: safe,
  };
  const { data: order, error } = await sb.from('site_orders').upsert(orderIn, { onConflict: 'stripe_session_id' }).select('id,lead_id').single();
  if (error || !order) { console.error('[checkoutConfirm] order', error?.message); return { confirmed: false }; }
  if (!order.lead_id) {
    const { data: lead, error: le } = await sb.from('inbound_leads').insert({
      name: orderIn.name || biz || 'Website customer', business_name: biz, email: orderIn.email,
      message: `Paid on the website: ${PRODUCT_NAMES[product]}`, project_type: 'website',
      qualifier_data: { site_section: 'checkout', product_key: product, order_id: order.id, src: orderIn.src, source_vertical: orderIn.source_vertical, origin_path: s.metadata?.origin_path || null, key_mode: s.metadata?.key_mode || null, purchase: true },
      conversation_channel: 'form', route_to: 'self', source: 'public_site',
    }).select('id').single();
    if (!le && lead) {
      const { data: claimed } = await sb.from('site_orders').update({ lead_id: lead.id }).eq('id', order.id).is('lead_id', null).select('id');
      if (claimed?.length) {
        for (const fn of ['notify-owner-inquiry', 'send-prospect-acknowledgment'])
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${fn}`, { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id }) }).catch((e) => console.error(fn, e));
      } else {
        await sb.from('inbound_leads').delete().eq('id', lead.id);
      }
    } else if (le) console.error('[checkoutConfirm] lead', le.message);
  }
  return { confirmed: true, product_key: product, product_name: PRODUCT_NAMES[product], amount_cents: s.amount_total ?? 0, currency: s.currency ?? 'usd' };
}
