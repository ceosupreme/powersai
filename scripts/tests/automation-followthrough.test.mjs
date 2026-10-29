import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryState, deliveryEventState, reportIsProtected, dispatchOutcome } from '../../supabase/functions/_shared/automation-state.ts';
import { checkoutWindow, scanCheckoutPages } from '../../supabase/functions/_shared/checkout-scan.ts';
import { readBoundedWebhookBody, verifySvix } from '../../supabase/functions/_shared/webhook-signature.ts';
import { deliveryLabel, isRealDelivery, canRetryDelivery } from '../../src/lib/automationSendLabel.ts';

test('provider acceptance and manual logging cannot claim delivery', () => {
  const accepted = { status: 'sent', send_result: { ok: true, provider: 'resend', provider_message_id: 'receipt-123' } };
  assert.equal(isRealDelivery(accepted), false);
  assert.match(deliveryLabel(accepted).label, /provider accepted/);
  assert.equal(deliveryLabel(accepted).providerMsgId, 'receipt-123');
  assert.equal(isRealDelivery({ ...accepted, delivery_status: 'delivered' }), true);
  assert.equal(deliveryState({ ok: true, provider: 'manual_log' }), 'logged');
  assert.equal(deliveryState({ ok: true, provider: 'resend' }), 'provider_accepted');
  assert.equal(deliveryEventState('email.delivered'), 'delivered');
  assert.equal(deliveryEventState('email.bounced'), 'bounced');
  assert.equal(deliveryEventState('email.received'), null);
});

test('uncertain outcomes and bounces require verification before retry', () => {
  for (const delivery_status of ['unconfirmed', 'bounced']) {
    assert.equal(canRetryDelivery({ status: 'failed', delivery_status, send_result: null }), false);
  }
  assert.equal(canRetryDelivery({ status: 'failed', send_result: { error: 'stranded — delivery unconfirmed' } }), false);
  assert.equal(canRetryDelivery({ status: 'failed', delivery_status: 'failed', send_result: { error: 'invalid_recipient' } }), true);
  assert.equal(canRetryDelivery({ status: 'sent', send_result: { provider: 'resend' } }), false);
});

test('HTTP 200 alone is not a successful dispatch', () => {
  assert.equal(dispatchOutcome(true, { ok: false }).ok, false);
  assert.equal(dispatchOutcome(true, { skipped: true, reason: 'paused' }).skipped, true);
  assert.equal(dispatchOutcome(false, { ok: true }).ok, false);
  assert.equal(dispatchOutcome(true, { ok: true, delivery_status: 'provider_accepted' }).ok, true);
});

test('edited, reviewed and sent reports are protected before regeneration', () => {
  assert.equal(reportIsProtected(null), false);
  assert.equal(reportIsProtected({ status: 'draft', narrative_edited: false }), false);
  assert.equal(reportIsProtected({ status: 'draft', narrative_edited: true }), true);
  assert.equal(reportIsProtected({ status: 'reviewed' }), true);
  assert.equal(reportIsProtected({ status: 'sent' }), true);
  assert.equal(reportIsProtected({ status: 'draft', reviewed_at: '2026-10-28' }), true);
});

test('signed webhook accepts authentic bytes and rejects tampering, missing and malformed timestamps', async () => {
  const keyBytes = new TextEncoder().encode('local-test-secret-not-a-production-credential');
  const secret = 'whsec_' + Buffer.from(keyBytes).toString('base64');
  const timestamp = '1793220000';
  const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'local-id' } });
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`local-event.${timestamp}.${body}`))).toString('base64');
  const request = (ts = timestamp, sig = `v1,${signature}`) => new Request('https://test.invalid/webhook', { headers: { 'svix-id': 'local-event', 'svix-timestamp': ts, 'svix-signature': sig } });
  const now = Number(timestamp) * 1000;
  assert.equal(await verifySvix(secret, request(), body, now), true);
  assert.equal(await verifySvix(secret, request(timestamp, `v1,malformed v1,${signature}`), body, now), true);
  assert.equal(await verifySvix(secret, request(), body + ' ', now), false);
  assert.equal(await verifySvix(secret, request('NaN'), body, now), false);
  assert.equal(await verifySvix(secret, request(), body, now + 301_000), false);
  assert.equal(await verifySvix(secret, new Request('https://test.invalid'), body, now), false);
});

test('bounded webhook reader preserves signed UTF-8 bytes across chunk boundaries', async () => {
  // A BOM and split multibyte characters must not be decoded/re-encoded before verification.
  const body = new TextEncoder().encode('\uFEFF{"message":"Café 🐾"}');
  const keyBytes = new TextEncoder().encode('local-test-secret-not-a-production-credential');
  const secret = 'whsec_' + Buffer.from(keyBytes).toString('base64');
  const timestamp = '1793220000';
  const prefix = new TextEncoder().encode(`local-event.${timestamp}.`);
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix); signed.set(body, prefix.length);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, signed)).toString('base64');
  let offset = 0;
  const stream = new ReadableStream({ pull(controller) {
    if (offset >= body.length) { controller.close(); return; }
    controller.enqueue(body.slice(offset, offset + 2)); offset += 2;
  } }, { highWaterMark: 0 });
  const request = new Request('https://test.invalid/webhook', {
    method: 'POST', body: stream, duplex: 'half',
    headers: { 'svix-id': 'local-event', 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` },
  });
  const bytes = await readBoundedWebhookBody(request, body.length); // Exact byte limit is accepted.
  assert.deepEqual(bytes, body);
  assert.equal(await verifySvix(secret, request, bytes, Number(timestamp) * 1000), true);
});

test('checkout reconciliation processes pages beyond 50 and advances only after a complete fixed window', async () => {
  const processed = [], saved = [], windows = [];
  const result = await scanCheckoutPages({ state: {}, now: 1_000_000, maxPages: 5,
    save: async (state) => saved.push(structuredClone(state)),
    fetchPage: async (window) => {
      windows.push({ ...window });
      return window.starting_after ? { data: [{ id: 's101' }], has_more: false }
        : { data: Array.from({ length: 100 }, (_, i) => ({ id: `s${i + 1}` })), has_more: true };
    }, process: async (s) => processed.push(s.id),
  });
  assert.equal(result.checked, 101);
  assert.equal(result.complete, true);
  assert.equal(windows[1].starting_after, 's100');
  assert.equal(windows[0].window_end, windows[1].window_end);
  assert.deepEqual(saved.at(-1), { completed_through: 1_000_000 });
});

test('confirmation failure retains the last completed page for idempotent replay', async () => {
  let checkpoint;
  await assert.rejects(scanCheckoutPages({ state: {}, now: 1_000_000, maxPages: 5,
    save: async (s) => { checkpoint = { ...s }; },
    fetchPage: async (w) => w.starting_after ? { data: [{ id: 'failed' }], has_more: false } : { data: [{ id: 'first' }], has_more: true },
    process: async (s) => { if (s.id === 'failed') throw new Error('database unavailable'); },
  }), /database unavailable/);
  assert.equal(checkpoint.starting_after, 'first');
  assert.equal(checkpoint.completed_through, undefined);
  assert.equal(checkoutWindow(checkpoint, 2_000_000).window_end, 1_000_000);
});

test('page budget persists a continuation instead of silently losing older payments', async () => {
  let checkpoint;
  const result = await scanCheckoutPages({ state: {}, now: 1_000_000, maxPages: 1,
    save: async (s) => { checkpoint = { ...s }; }, fetchPage: async () => ({ data: [{ id: 'last' }], has_more: true }), process: async () => {},
  });
  assert.equal(result.complete, false);
  assert.equal(checkpoint.starting_after, 'last');
  assert.equal(checkpoint.window_end, 1_000_000);
});

test('malformed pagination cannot advance the watermark', async () => {
  let checkpoint;
  await assert.rejects(scanCheckoutPages({ state: {}, now: 1_000_000, maxPages: 1,
    save: async (s) => { checkpoint = { ...s }; }, fetchPage: async () => ({ data: [], has_more: true }), process: async () => {},
  }), /empty_checkout_page/);
  assert.equal(checkpoint.completed_through, undefined);
});
