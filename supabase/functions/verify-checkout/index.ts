import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { confirmSession, retrieveSession, validKey } from '../_shared/checkoutConfirm.ts';

const Body = z.object({ session_id: z.string().regex(/^cs_(test_|live_)?[A-Za-z0-9_]+$/).max(255) });
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let raw; try { raw = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: 'Invalid session' }, 400);
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!validKey(key)) return json({ error: 'Checkout unavailable' }, 503);
  const s = await retrieveSession(key, p.data.session_id);
  if (!s) return json({ confirmed: false });
  return json(await confirmSession(s));
});
