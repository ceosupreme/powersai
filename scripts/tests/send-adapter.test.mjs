// Uses the installed SDK with a fully mocked transport. No provider/network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const sdk = import.meta.resolve('@supabase/supabase-js');
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'npm:@supabase/supabase-js@2/cors') return next('data:text/javascript,export const corsHeaders = {};', context);
  return next(specifier === 'npm:@supabase/supabase-js@2' ? sdk : specifier, context);
} });
const env = { SUPABASE_URL: 'https://db.example.test', SUPABASE_ANON_KEY: 'local-public-placeholder', SUPABASE_SERVICE_ROLE_KEY: 'local-test-placeholder', RESEND_API_KEY: 'local-test-placeholder' };
let handler;
globalThis.Deno = { env: { get: (name) => env[name] }, serve: (fn) => { handler = fn; } };
let sends, captured, scenario;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url.startsWith('https://db.example.test/rest/v1/rpc/hq_verify_job_token')) return Response.json(true);
  if (url.startsWith('https://db.example.test/rest/v1/rpc/verify_job_token')) return Response.json(false);
  if (url.startsWith('https://db.example.test/rest/v1/rpc/hq_is_email_suppressed')) {
    return new Response(JSON.stringify(scenario === 'suppression-unavailable' ? { message: 'unavailable' } : scenario === 'suppressed'), { status: scenario === 'suppression-unavailable' ? 503 : 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (url.startsWith('https://db.example.test/rest/v1/venues')) return Response.json({ name: 'Synthetic Project', city: 'Test City' });
  if (url.startsWith('https://api.resend.com/emails')) {
    sends++; captured = init;
    if (scenario === 'network-unknown') throw new Error('synthetic connection loss');
    return Response.json(scenario === 'missing-receipt' ? {} : { id: 'synthetic-receipt' });
  }
  throw new Error(`Unexpected mock request (network disabled): ${url}`);
};
const { resendEmailAdapter, manualLogAdapter } = await import('../../supabase/functions/_shared/send-adapters.ts');
await import('../../supabase/functions/reconcile-checkouts/index.ts');
const reconcileHandler = handler;
await import('../../supabase/functions/resend-inbound-webhook/index.ts');
const webhookHandler = handler;
const input = { channel: 'email', to: 'customer@example.test', project_id: '11111111-1111-4111-8111-111111111111', queue_id: 'local-queue-1', body: 'Synthetic test message' };
test.beforeEach(() => { sends = 0; captured = null; scenario = ''; });

test('failed suppression lookup prevents any external send', async () => {
  scenario = 'suppression-unavailable';
  const result = await resendEmailAdapter.send(input);
  assert.equal(result.ok, false); assert.equal(result.error, 'suppression_check_failed'); assert.equal(sends, 0);
});
test('suppressed recipient and paused final gate cannot reach the provider', async () => {
  scenario = 'suppressed';
  assert.equal((await resendEmailAdapter.send(input)).error, 'suppressed'); assert.equal(sends, 0);
  scenario = '';
  assert.equal((await resendEmailAdapter.send({ ...input, beforeSend: async () => false })).delivery_status, 'queued'); assert.equal(sends, 0);
  assert.equal((await manualLogAdapter.send({ ...input, beforeSend: async () => false })).ok, false);
});
test('provider acceptance persists its receipt and stable idempotency key without claiming delivery', async () => {
  const result = await resendEmailAdapter.send(input);
  assert.equal(result.delivery_status, 'provider_accepted'); assert.equal(result.provider_message_id, 'synthetic-receipt');
  assert.equal(new Headers(captured.headers).get('Idempotency-Key'), 'hq:local-queue-1'); assert.equal(sends, 1);
});
test('network ambiguity and missing receipts are unconfirmed instead of safely retryable failures', async () => {
  scenario = 'network-unknown'; assert.equal((await resendEmailAdapter.send(input)).delivery_status, 'unconfirmed');
  scenario = 'missing-receipt'; assert.equal((await resendEmailAdapter.send(input)).delivery_status, 'unconfirmed');
});
test('new scoped cron token reaches checkout worker without a second legacy-auth rejection', async () => {
  const response = await reconcileHandler(new Request('https://test.invalid/reconcile', {
    method: 'POST', headers: { 'x-job-token': 'synthetic-scoped-job-token-with-more-than-thirty-two-characters' }, body: '{}',
  }));
  assert.equal(response.status, 503); // Expected: test does not configure any Stripe credential.
  assert.equal((await response.json()).error, 'Checkout unavailable');
  assert.equal(sends, 0);
});
test('service credential cannot bypass missing webhook signature configuration', async () => {
  const response = await webhookHandler(new Request('https://test.invalid/webhook', {
    method: 'POST', headers: { Authorization: 'Bearer local-test-placeholder' }, body: '{}',
  }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'webhook_verification_not_configured');
  assert.equal(sends, 0);
});

test('webhook stops an oversized chunked body despite missing or understated Content-Length', async () => {
  env.RESEND_WEBHOOK_SECRET = 'whsec_' + Buffer.from('local-webhook-test-secret').toString('base64');
  try {
    for (const headers of [{}, { 'content-length': '8' }]) {
      let reads = 0, cancelled = false;
      const stream = new ReadableStream({
        pull(controller) {
          reads++;
          if (reads > 5) { controller.close(); return; }
          controller.enqueue(new Uint8Array(65_536));
        },
        cancel() { cancelled = true; },
      }, { highWaterMark: 0 });
      const response = await webhookHandler(new Request('https://test.invalid/webhook', {
        method: 'POST', headers, body: stream, duplex: 'half',
      }));
      assert.equal(response.status, 413);
      assert.equal((await response.json()).error, 'payload_too_large');
      assert.equal(reads, 3, 'reject on the first chunk above128KiB without consuming the rest');
      assert.equal(cancelled, true);
      assert.equal(sends, 0);
    }
  } finally { delete env.RESEND_WEBHOOK_SECRET; }
});
