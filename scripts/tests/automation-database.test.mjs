// Run with HQ_PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
// All data is synthetic and stays in an in-memory PostgreSQL instance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.HQ_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TYPE automation_key AS ENUM('followup_sequence','reactivation','review_request');
CREATE TYPE automation_queue_status AS ENUM('pending_review','approved','sending','sent','rejected','failed','canceled');
CREATE TYPE automation_channel AS ENUM('email','sms','linkedin_dm','instagram_dm','review_reply');
CREATE TABLE venues(id uuid PRIMARY KEY,is_active boolean);
CREATE TABLE user_roles(user_id uuid,role text);
CREATE TABLE venue_assignments(user_id uuid,venue_id uuid,role_at_venue text);
CREATE TABLE user_venue_roles(user_id uuid,venue_id uuid,role text);
CREATE TABLE inbound_leads(id uuid PRIMARY KEY,email text,automation_status text,opted_out_at timestamptz);
CREATE TABLE followup_sequence_runs(id uuid PRIMARY KEY,project_id uuid,lead_id uuid,status text,stop_reason text,ended_at timestamptz);
CREATE TABLE reactivation_campaign_runs(id uuid PRIMARY KEY,project_id uuid,status text);
CREATE TABLE review_request_runs(id uuid PRIMARY KEY,project_id uuid,status text);
CREATE TABLE email_suppressions(id uuid DEFAULT gen_random_uuid(),project_id uuid,email text,reason text,UNIQUE(project_id,email));
CREATE TABLE automation_message_queue(id uuid PRIMARY KEY,project_id uuid,automation_key automation_key,source_run_id uuid,
 recipient_snapshot jsonb,channel automation_channel,subject text,body text,edited_body text,status automation_queue_status,
 approved_by uuid,approved_at timestamptz,scheduled_for timestamptz,send_attempted_at timestamptz,send_result jsonb);
CREATE TABLE project_automation_enrollments(project_id uuid,automation_key automation_key,enabled boolean,config jsonb,approval_mode text);
CREATE TABLE automation_send_log(id uuid DEFAULT gen_random_uuid(),project_id uuid,queue_id uuid,automation_key automation_key,
 channel automation_channel,adapter text,to_address text,subject text,body text,ok boolean,provider_message_id text,error text,raw jsonb);
CREATE TABLE inbound_emails(id uuid PRIMARY KEY,lead_id uuid,from_email text,forwarded_at timestamptz,forwarded_error text);
CREATE TABLE recovery_reports(id uuid DEFAULT gen_random_uuid(),project_id uuid,period_start date,period_end date,metrics jsonb,
 estimated_dollars numeric,estimate_basis jsonb,narrative text,narrative_edited boolean,status text,generated_at timestamptz,
 reviewed_at timestamptz,sent_at timestamptz,UNIQUE(project_id,period_start));
`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261029020000_phase2b_automation.sql', import.meta.url), 'utf8'));
const project = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const lead = '33333333-3333-4333-8333-333333333333';
const run = '44444444-4444-4444-8444-444444444444';
const queue = '55555555-5555-4555-8555-555555555555';
const inbound = '66666666-6666-4666-8666-666666666666';
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.value;
const claim = async (attempt = null) => scalar('SELECT hq_claim_automation_send($1::uuid,$2::timestamptz) AS value', [queue, attempt]);
async function seed() {
  await db.exec(`TRUNCATE venues,user_roles,venue_assignments,user_venue_roles,inbound_leads,followup_sequence_runs,reactivation_campaign_runs,
    review_request_runs,email_suppressions,automation_message_queue,project_automation_enrollments,automation_send_log,inbound_emails,recovery_reports,
    hq_worker_checkpoints,automation_delivery_events;
    INSERT INTO venues VALUES('${project}',true);
    INSERT INTO user_roles VALUES('${user}','admin');
    INSERT INTO inbound_leads VALUES('${lead}','customer@example.test','enrolled',NULL);
    INSERT INTO followup_sequence_runs VALUES('${run}','${project}','${lead}','active',NULL,NULL);
    INSERT INTO project_automation_enrollments VALUES('${project}','followup_sequence',true,'{}','operator');
    INSERT INTO automation_message_queue(id,project_id,automation_key,source_run_id,recipient_snapshot,channel,body,status,approved_by,approved_at)
      VALUES('${queue}','${project}','followup_sequence','${run}','{"email":"Customer@Example.test"}','email','Approved text','approved','${user}',now());
    INSERT INTO inbound_emails(id,lead_id,from_email) VALUES('${inbound}','${lead}','customer@example.test');`);
}
test.beforeEach(seed);
test.after(async () => db.close());

test('only one worker claims an approved message; the final gate checks a paused enrollment', async () => {
  const first = await claim();
  assert.equal(first.claimed, true);
  assert.equal((await claim()).claimed, false);
  assert.equal((await claim(first.queue.send_attempted_at)).claimed, true);
  await db.exec('UPDATE project_automation_enrollments SET enabled=false');
  assert.equal((await claim(first.queue.send_attempted_at)).reason, 'enrollment_paused_or_missing');
});

test('future schedules, inactive projects and missing approval fail closed', async () => {
  await db.exec("UPDATE automation_message_queue SET scheduled_for=now()+interval '1 hour'");
  assert.equal((await claim()).reason, 'scheduled_in_future');
  await db.exec('UPDATE automation_message_queue SET scheduled_for=NULL; UPDATE venues SET is_active=false');
  assert.equal((await claim()).reason, 'project_inactive');
  await db.exec('UPDATE venues SET is_active=true; UPDATE automation_message_queue SET approved_by=NULL');
  assert.equal((await claim()).reason, 'approval_required');
});

test('revoked approval and unassigned client cannot send; a current designated client can', async () => {
  await db.exec("UPDATE user_roles SET role='client'");
  assert.equal((await claim()).reason, 'approver_access_revoked');
  await db.exec("UPDATE project_automation_enrollments SET approval_mode='client'");
  assert.equal((await claim()).reason, 'approver_access_revoked');
  await db.exec(`INSERT INTO venue_assignments VALUES('${user}','${project}','client')`);
  assert.equal((await claim()).claimed, true);
});

test('case-insensitive suppression cancels delivery before claim', async () => {
  await db.exec(`INSERT INTO email_suppressions(project_id,email,reason) VALUES('${project}',' CUSTOMER@EXAMPLE.TEST ','test')`);
  assert.equal((await claim()).reason, 'suppressed');
  assert.equal(await scalar('SELECT status::text AS value FROM automation_message_queue'), 'canceled');
});

test('legacy project membership gives the same scoped client approval rights', async () => {
  await db.exec(`UPDATE user_roles SET role='client'; UPDATE project_automation_enrollments SET approval_mode='client';
    INSERT INTO user_venue_roles VALUES('${user}','${project}','client')`);
  assert.equal((await claim()).claimed, true);
});

test('inbound reply marks the lead and atomically cancels queued follow-ups', async () => {
  assert.equal(await scalar('SELECT hq_apply_inbound_reply($1::uuid) AS value', [inbound]), 1);
  assert.equal(await scalar('SELECT automation_status AS value FROM inbound_leads'), 'replied');
  assert.equal(await scalar('SELECT status AS value FROM followup_sequence_runs'), 'halted');
  assert.equal(await scalar('SELECT delivery_status AS value FROM automation_message_queue'), 'cancelled');
  assert.equal(await scalar('SELECT hq_apply_inbound_reply($1::uuid) AS value', [inbound]), 0);
  assert.equal((await claim()).claimed, false);
});

test('reply never clears an opt-out, and a stopped lead blocks the final send gate', async () => {
  const first = await claim();
  await db.exec("UPDATE inbound_leads SET automation_status='opted_out', opted_out_at=now()");
  await scalar('SELECT hq_apply_inbound_reply($1::uuid) AS value', [inbound]);
  assert.equal(await scalar('SELECT automation_status AS value FROM inbound_leads'), 'opted_out');
  assert.equal((await claim(first.queue.send_attempted_at)).claimed, false);
});

test('provider receipt arriving before outcome persistence is retained; late accepted event cannot downgrade it', async () => {
  const first = await claim();
  await scalar("SELECT hq_record_delivery_event('event-delivered','receipt-1','delivered','email.delivered',now()) AS value");
  const result = await scalar('SELECT hq_finish_automation_send($1,$2,$3,$4) AS value', [queue, first.queue.send_attempted_at,
    { ok: true, provider: 'resend', provider_message_id: 'receipt-1', delivery_status: 'provider_accepted' }, 'customer@example.test']);
  assert.equal(result.delivery_status, 'delivered');
  await scalar("SELECT hq_record_delivery_event('event-sent','receipt-1','provider_accepted','email.sent',now()) AS value");
  assert.equal(await scalar('SELECT delivery_status AS value FROM automation_message_queue'), 'delivered');
  assert.equal(await scalar('SELECT count(*)::int AS value FROM automation_send_log'), 1);
  await scalar("SELECT hq_record_delivery_event('event-bounced','receipt-1','bounced','email.bounced',now()) AS value");
  assert.equal(await scalar('SELECT delivery_status AS value FROM automation_message_queue'), 'bounced');
  assert.equal(await scalar('SELECT count(*)::int AS value FROM email_suppressions'), 1);
});

test('manual log is persisted atomically without claiming external delivery', async () => {
  const first = await claim();
  const result = await scalar('SELECT hq_finish_automation_send($1,$2,$3,$4) AS value', [queue, first.queue.send_attempted_at,
    { ok: true, provider: 'manual_log', delivery_status: 'logged' }, 'customer@example.test']);
  assert.equal(result.delivery_status, 'logged');
  assert.equal(await scalar('SELECT count(*)::int AS value FROM automation_send_log'), 1);
  assert.equal(await scalar('SELECT delivery_status AS value FROM automation_message_queue'), 'logged');
});

test('atomic recovery upsert preserves an edit made after generator started', async () => {
  const sql = 'SELECT hq_save_recovery_draft($1,$2,$3,$4,$5,$6,$7) AS value';
  const args = [project,'2026-10-19','2026-10-25',{},0,{},'Generated draft'];
  assert.ok(await scalar(sql,args));
  await db.exec("UPDATE recovery_reports SET narrative='Owner-approved words', narrative_edited=true, status='reviewed', reviewed_at=now()");
  assert.equal(await scalar(sql,[...args.slice(0,-1),'Replacement']), null);
  assert.equal(await scalar('SELECT narrative AS value FROM recovery_reports'), 'Owner-approved words');
  assert.equal(await scalar('SELECT status AS value FROM recovery_reports'), 'reviewed');
});

test('worker checkpoint is exclusive and retains its cursor after releasing the lease', async () => {
  const first = await scalar("SELECT hq_claim_worker('local-test',300) AS value");
  assert.ok(first.lease_token);
  assert.equal(await scalar("SELECT hq_claim_worker('local-test',300) AS value"), null);
  assert.equal(await scalar('SELECT hq_save_worker($1,$2,$3,true) AS value', ['local-test',first.lease_token,{ starting_after:'s100' }]), true);
  const next = await scalar("SELECT hq_claim_worker('local-test',300) AS value");
  assert.equal(next.state.starting_after,'s100');
  assert.notEqual(next.lease_token,first.lease_token);
  assert.equal(await scalar('SELECT hq_save_worker($1,$2,$3,true) AS value',['local-test',first.lease_token,{}]), false);
});

test('anonymous and authenticated callers cannot invoke service-only gates or read worker state', async () => {
  for (const role of ['anon','authenticated']) {
    assert.equal(await scalar(`SELECT has_function_privilege('${role}','hq_claim_automation_send(uuid,timestamptz)','EXECUTE') AS value`), false);
    assert.equal(await scalar(`SELECT has_function_privilege('${role}','hq_apply_inbound_reply(uuid)','EXECUTE') AS value`), false);
    assert.equal(await scalar(`SELECT has_table_privilege('${role}','hq_worker_checkpoints','SELECT') AS value`), false);
  }
  assert.equal(await scalar("SELECT has_function_privilege('service_role','hq_claim_automation_send(uuid,timestamptz)','EXECUTE') AS value"), true);
});
