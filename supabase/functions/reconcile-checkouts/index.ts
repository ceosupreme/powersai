import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { confirmSession, isSessionActive, serviceClient, validKey, keyMode, PRODUCT_NAMES } from '../_shared/checkoutConfirm.ts';
import { guardEdgeRequest } from '../_shared/auth-guard.ts';
import { claimWorker } from '../_shared/worker-lease.ts';
import { scanCheckoutPages, type CheckoutCheckpoint } from '../_shared/checkout-scan.ts';

const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// The shared guard verifies admins, the service key, and scoped Vault job tokens.
// It retains the existing verify_job_token fallback during the cron cutover.
Deno.serve(async (req) => {
  const denied = await guardEdgeRequest(req, 'reconcile-checkouts');
  if (denied) return denied;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!validKey(key)) return json({ error: 'Checkout unavailable' }, 503);
  const sb = serviceClient();
  let lease: Awaited<ReturnType<typeof claimWorker>> = null;
  let confirmed = 0;
  try {
    lease = await claimWorker(sb, `reconcile-checkouts:${keyMode(key)}`);
    if (!lease) return json({ ok: true, skipped: 'already_running' });
    const scan = await scanCheckoutPages<any>({
      state: lease.state as CheckoutCheckpoint, now: Math.floor(Date.now() / 1000), maxPages: 5,
      save: async (state) => { await lease!.save({ ...state }); },
      fetchPage: async ({ window_start, window_end, starting_after }) => {
        const params = new URLSearchParams({ 'created[gte]': String(window_start), 'created[lte]': String(window_end), limit: '100' });
        params.append('expand[]', 'data.payment_intent'); params.append('expand[]', 'data.subscription');
        if (starting_after) params.set('starting_after', starting_after);
        const r = await fetch(`https://api.stripe.com/v1/checkout/sessions?${params}`, {
          headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000),
        });
        if (!r.ok) throw new Error(`stripe_list_failed:${r.status}`);
        return await r.json();
      },
      process: async (s) => {
        if (!isSessionActive(s) || !Object.hasOwn(PRODUCT_NAMES, s.metadata?.product_key ?? '')) return;
        const result = await confirmSession(s);
        if (!result.confirmed) throw new Error(`confirmation_failed:${s.id}`);
        // confirmSession's public path can tolerate a lead-write error. The checkpoint cannot.
        const { data: order, error } = await sb.from('site_orders').select('lead_id').eq('stripe_session_id', s.id).single();
        if (error || !order?.lead_id) throw new Error(`confirmation_incomplete:${s.id}`);
        confirmed++;
      },
    });
    return json({ ok: true, ...scan, confirmed, resume_required: !scan.complete });
  } catch (e) {
    console.error('[reconcile] checkpoint retained for retry', String(e));
    return json({ ok: false, error: 'reconciliation_incomplete', confirmed }, 503);
  } finally {
    if (lease) await lease.release();
  }
});
