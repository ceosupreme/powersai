import test from 'node:test';
import assert from 'node:assert/strict';
import { guardEdgeRequest } from '../../supabase/functions/_shared/auth-guard.ts';

const userId = '10000000-0000-4000-8000-000000000001';
const projectId = '20000000-0000-4000-8000-000000000001';
const env = { SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-service-credential', SUPABASE_ANON_KEY: 'test-publishable-credential' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const request = (token, body = {}, headers = {}, method = 'POST') => new Request('https://example.test/functions/v1/example', {
  method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...headers },
  ...(method === 'GET' || method === 'OPTIONS' ? {} : { body: JSON.stringify(body) }),
});
function dependencies({ roles = ['admin'], projectAccess = false, validUser = true, rateAllowed = true, job = null, fail = false } = {}) {
  const calls = [];
  return { calls, env: (key) => env[key], fetch: async (url, init) => {
    calls.push({ url, init });
    if (fail) throw new Error('unavailable');
    if (url.endsWith('/auth/v1/user')) return validUser ? json({ id: userId }) : json({ error: 'Invalid token' }, 401);
    if (url.includes('/user_roles?')) return json(roles.map((role) => ({ role })));
    if (url.endsWith('/rpc/user_can_manage_project')) return json(projectAccess);
    if (url.includes('/content_automation_runs?')) return json([{ project_id: projectId }]);
    if (url.endsWith('/rpc/hq_verify_job_token')) return json(JSON.parse(init.body).p_function === job);
    if (url.endsWith('/rpc/verify_job_token')) return json(job === 'legacy-checkout');
    if (url.endsWith('/rpc/consume_public_rate_limit')) return json({ allowed: rateAllowed, retry_after: 60 });
    throw new Error(`Unexpected test dependency: ${url}`);
  }};
}

test('anonymous, publishable, and invalid human tokens cannot invoke a privileged worker', async () => {
  for (const token of [null, env.SUPABASE_ANON_KEY, 'forged-admin-jwt']) {
    const deps = dependencies({ validUser: false });
    const response = await guardEdgeRequest(request(token), 'automation-send-approved', deps);
    assert.equal(response.status, 401);
  }
});
test('an authenticated client, staff member, and role-less account cannot administer', async () => {
  for (const roles of [['client'], ['staff'], []]) {
    const response = await guardEdgeRequest(request('valid-user'), 'mine-prospects', dependencies({ roles }));
    assert.equal(response.status, 403);
  }
});
test('admin and exact service credentials can invoke internal workers', async () => {
  assert.equal(await guardEdgeRequest(request('valid-admin'), 'compute-weekly-scores', dependencies()), null);
  const deps = dependencies({ fail: true });
  assert.equal(await guardEdgeRequest(request(env.SUPABASE_SERVICE_ROLE_KEY), 'automation-queue-sweeper', deps), null);
  assert.equal(deps.calls.length, 0);
});
test('project managers must be authorized for the actual request project', async () => {
  const body = { project_id: projectId, bundle_id: 'bundle' };
  assert.equal((await guardEdgeRequest(request('manager', body), 'apply-automation-bundle', dependencies({ roles: ['gm'] }))).status, 403);
  assert.equal(await guardEdgeRequest(request('manager', body), 'apply-automation-bundle', dependencies({ roles: ['gm'], projectAccess: true })), null);
  assert.equal((await guardEdgeRequest(request('client', body), 'apply-automation-bundle', dependencies({ roles: ['client'], projectAccess: true }))).status, 403);
});
test('resource operations resolve project server-side and preserve the original request body', async () => {
  const req = request('manager', { run_id: projectId });
  const deps = dependencies({ roles: ['gm'], projectAccess: true });
  assert.equal(await guardEdgeRequest(req, 'content-publish-automation-undo', deps), null);
  assert.deepEqual(await req.json(), { run_id: projectId });
  const call = deps.calls.find((call) => call.url.endsWith('/rpc/user_can_manage_project'));
  assert.deepEqual(JSON.parse(call.init.body), { _project_id: projectId });
});
test('job credential is bound to its function and cannot be used on another worker', async () => {
  const req = request(null, {}, { 'x-job-token': 'x'.repeat(64) });
  assert.equal(await guardEdgeRequest(req, 'automation-queue-sweeper', dependencies({ job: 'automation-queue-sweeper' })), null);
  assert.equal((await guardEdgeRequest(req, 'delete-user', dependencies({ job: 'automation-queue-sweeper' }))).status, 401);
});
test('existing checkout job verifier remains supported', async () => {
  assert.equal(await guardEdgeRequest(request(null, {}, { 'x-job-token': 'x'.repeat(64) }), 'reconcile-checkouts', dependencies({ job: 'legacy-checkout' })), null);
});
test('public form uses shared durable IP, global and recipient limits', async () => {
  const deps = dependencies();
  assert.equal(await guardEdgeRequest(request(null, { email: 'Customer@Example.test' }, { 'x-forwarded-for': 'spoofed, 192.0.2.1' }), 'submit-inbound-lead', deps), null);
  const scopes = deps.calls.map((call) => JSON.parse(call.init.body).p_scope);
  assert.deepEqual(scopes, ['submit-inbound-lead', 'submit-inbound-lead:daily', 'submit-inbound-lead:recipient']);
  assert.equal(deps.calls.some((call) => call.init.body.includes('customer@example.test')), false, 'PII is hashed before the limiter');
  const response = await guardEdgeRequest(request(null), 'submit-inbound-lead', dependencies({ rateAllowed: false }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
});
test('authorization or limiter failures fail closed', async () => {
  for (const endpoint of ['mine-prospects', 'submit-inbound-lead']) {
    const response = await guardEdgeRequest(request('valid-admin'), endpoint, dependencies({ fail: true }));
    assert.equal(response.status, 503);
  }
});
test('public body limits, methods, unknown policies, and preflight are enforced', async () => {
  assert.equal((await guardEdgeRequest(request(null, { message: 'x'.repeat(140000) }), 'submit-inbound-lead', dependencies())).status, 413);
  assert.equal((await guardEdgeRequest(request(null, {}, {}, 'GET'), 'submit-inbound-lead', dependencies())).status, 405);
  assert.equal((await guardEdgeRequest(request('valid-admin'), 'forgotten-endpoint', dependencies())).status, 503);
  assert.equal((await guardEdgeRequest(request(null, {}, {}, 'OPTIONS'), 'mine-prospects', dependencies())).status, 204);
});
test('private voice uses an authenticated subprotocol instead of a URL credential', async () => {
  const req = request(null, {}, { 'sec-websocket-protocol': 'hq-realtime, hq-auth.valid-session' }, 'GET');
  assert.equal(await guardEdgeRequest(req, 'openai-realtime-proxy', dependencies({ roles: ['staff'] })), null);
});
test('signed webhook body stays untouched for its mandatory signature verifier', async () => {
  const req = request(null, { type: 'email.received' });
  const deps = dependencies({ fail: true });
  assert.equal(await guardEdgeRequest(req, 'resend-inbound-webhook', deps), null);
  assert.deepEqual(await req.json(), { type: 'email.received' });
  assert.equal(deps.calls.length, 0);
});
