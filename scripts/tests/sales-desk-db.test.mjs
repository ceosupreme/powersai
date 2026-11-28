import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const rep='10000000-0000-4000-8000-000000000001';
const other='10000000-0000-4000-8000-000000000002';
const admin='10000000-0000-4000-8000-000000000003';
const client='10000000-0000-4000-8000-000000000004';
const pkg='20000000-0000-4000-8000-000000000001';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA cron;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('test.role',true)$$;
CREATE FUNCTION cron.schedule(text,text,text) RETURNS int LANGUAGE sql AS $$SELECT 1$$;
CREATE TABLE user_roles(user_id uuid,role text);
CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=u AND role=r)$$;
CREATE TABLE starter_packages(id uuid PRIMARY KEY,slug text,name text);
CREATE TABLE prospects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),source text DEFAULT 'manual',business_name text,status text DEFAULT 'new',phone text,email text,their_words text,contact_name text,assigned_to uuid,next_follow_up date,last_contacted_at timestamptz,last_contact_channel text,inbound_lead_id uuid,promoted_company_id uuid,do_not_contact boolean DEFAULT false,created_at timestamptz DEFAULT now());
CREATE TABLE contact_points(id uuid DEFAULT gen_random_uuid(),prospect_id uuid,kind text,value text,opted_out boolean,opted_out_at timestamptz,opt_out_channel text);
CREATE TABLE outreach_templates(id uuid);
CREATE TABLE prospect_activity(id uuid DEFAULT gen_random_uuid(),prospect_id uuid,kind text,summary text,created_by uuid,created_at timestamptz DEFAULT now());
CREATE TABLE agent_handoffs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),from_agent text,to_agent text,kind text,status text,title text,owner_question text,spec jsonb,due_at timestamptz,result jsonb,result_links jsonb);
CREATE TABLE crm_deals(id uuid PRIMARY KEY,company_id uuid,stage text,archived boolean DEFAULT false,package_id uuid,value numeric,won_at timestamptz,notes text);
CREATE FUNCTION hq_halt_person_sequences(uuid,uuid,text) RETURNS void LANGUAGE sql AS $$SELECT$$;
CREATE FUNCTION hq_normalize_phone(t text) RETURNS text LANGUAGE sql AS $$SELECT '+1'||regexp_replace(t,'\\D','','g')$$;
CREATE FUNCTION hq_normalize_email(t text) RETURNS text LANGUAGE sql AS $$SELECT CASE WHEN t ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' THEN lower(t) END$$;
CREATE FUNCTION hq_lead_stage_rank(s text) RETURNS int LANGUAGE sql IMMUTABLE AS $$SELECT CASE s WHEN 'new' THEN 0 WHEN 'contacted' THEN 1 WHEN 'replied' THEN 2 WHEN 'meeting' THEN 3 END$$;
CREATE FUNCTION hq_lead_stage_event(p uuid,e text,c text,s text,a uuid) RETURNS jsonb LANGUAGE plpgsql AS $$DECLARE t text:=CASE e WHEN 'first_contact' THEN 'contacted' WHEN 'reply' THEN 'replied' WHEN 'booking' THEN 'meeting' END;BEGIN UPDATE prospects SET status=t WHERE id=p AND hq_lead_stage_rank(status)<hq_lead_stage_rank(t);RETURN '{}';END$$;
CREATE FUNCTION hq_contact_opt_out(c text,v text,p uuid,s text,a uuid) RETURNS jsonb LANGUAGE plpgsql AS $$BEGIN UPDATE prospects SET do_not_contact=true WHERE id=p;RETURN '{}';END$$;
INSERT INTO user_roles VALUES('${rep}','staff'),('${other}','manager'),('${admin}','admin'),('${client}','client');
INSERT INTO starter_packages VALUES('${pkg}','local-growth','Local Growth Package');
GRANT USAGE ON SCHEMA public,auth TO authenticated;GRANT SELECT ON user_roles TO authenticated;GRANT SELECT,INSERT,UPDATE ON prospects TO authenticated;`);
await db.exec(await readFile('drizzle/migrations/0018_leads_sales_desk.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0019_leads_sales_desk_validation_repairs.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0020_sales_result_email_repair.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0021_sales_desk_final_validation.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0022_sales_desk_null_input_guards.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0023_sales_owner_deal_pay_guard.sql','utf8'));
await db.exec(await readFile('scripts/sql/0001_sales_desk_review_fixes.sql','utf8'));
const row=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
const asUser=async(id,role='authenticated')=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('test.uid',$1,false),set_config('test.role',$2,false)",[id,role]);};
const fresh=async(extra='')=>(await row(`INSERT INTO prospects(business_name,phone,email${extra?',created_at':''}) VALUES('Test lead','5555550100','a@example.test'${extra?",now()-interval '10 days'":''}) RETURNING id`)).id;
const result=async(id,r,d={})=>(await row('SELECT hq_lead_log_result($1,$2,$3) r',[id,r,JSON.stringify(d)])).r;
after(()=>db.close());
test.beforeEach(()=>asUser(rep));
test('all non-client team can claim any lead; second person receives holder, only holder releases',async()=>{
  const id=await fresh();const claim=await row('SELECT hq_lead_claim($1) r',[id]);assert.equal(claim.r.claimed,true);
  assert.equal(Math.round((Date.parse(claim.r.working_until)-Date.now())/60000),30);
  await asUser(other);assert.equal((await row('SELECT hq_lead_claim($1) r',[id])).r.working_by,rep);
  await db.query('SELECT hq_lead_release($1)',[id]);assert.equal((await row('SELECT working_by FROM prospects WHERE id=$1',[id])).working_by,rep);
  await assert.rejects(result(id,'no_answer'),/Someone else/);await asUser(rep);await db.query('SELECT hq_lead_release($1)',[id]);
});
test('clients cannot read settings or claim/log leads',async()=>{
  const id=await fresh();await asUser(client);await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT * FROM sales_settings')).rows.length,0);await assert.rejects(db.query('SELECT hq_lead_claim($1)',[id]),/Team permission/);await db.exec('RESET ROLE');
});
test('failed cadence rotates parts and uses 5,5,4 day intervals within fourteen days, moved off weekends',async()=>{
  const id=await fresh();const local=(await row("SELECT (now() AT TIME ZONE 'America/Los_Angeles')::date d")).d;
  for(const [attempt,gap] of [[0,5],[1,5],[2,4]]){await db.query('UPDATE prospects SET attempt_count=$2 WHERE id=$1',[id,attempt]);const r=await result(id,'no_answer');
    const diff=(await row("SELECT (($1::timestamptz AT TIME ZONE 'America/Los_Angeles')::date-$2::date) d, (hq_sales_weekday($2::date+$3::int)-$2::date) want",[r.next_try_at,local,gap]));assert.equal(diff.d,diff.want);}
});
test('voicemail only on second try and fourth failed try resets with sixty-day rest, no stage change',async()=>{
  const id=await fresh();await assert.rejects(result(id,'voicemail'),/only offered/);await result(id,'no_answer');await result(id,'voicemail');await result(id,'no_answer');const r=await result(id,'no_answer');assert.equal(r.attempt_count,0);
  const p=await row('SELECT status,out_of_tries_at,next_try_at FROM prospects WHERE id=$1',[id]);assert.equal(p.status,'new');assert.ok(p.out_of_tries_at);
  const rest=await row("SELECT ((next_try_at AT TIME ZONE time_zone)::date-(now() AT TIME ZONE time_zone)::date) d, (hq_sales_weekday((now() AT TIME ZONE time_zone)::date+60)-(now() AT TIME ZONE time_zone)::date) want FROM prospects WHERE id=$1",[id]);assert.equal(rest.d,rest.want);assert.ok(rest.d>=60&&rest.d<=62);
});
test('preview yes creates an owner-addressed filled job, then assigned job link returns lead to preview rep',async()=>{
  const id=await fresh();const future=(await row("SELECT ((now() AT TIME ZONE 'America/Los_Angeles')::date+3+time '12:00') AT TIME ZONE 'America/Los_Angeles' t")).t;
  const r=await result(id,'preview_yes',{owner_name:'Pat',owner_cell:'5555550100',services:'Plumbing',areas:'Carlsbad',photos:'from Google',google_link:'https://maps.google.com',text_ok:true,promised_at:future});
  const h=await row('SELECT * FROM agent_handoffs WHERE id=$1',[r.owner_job_id]);assert.equal(h.to_agent,'owner');assert.equal(h.title,'Preview: Test lead');assert.equal(h.spec.services,'Plumbing');assert.equal(Date.parse(future)-Date.parse(h.due_at),7200000);
  await db.query("UPDATE agent_handoffs SET status='done',result_links='[{\"url\":\"https://example.test/preview\"}]' WHERE id=$1",[h.id]);
  const p=await row('SELECT * FROM prospects WHERE id=$1',[id]);assert.equal(p.preview_link,'https://example.test/preview');assert.equal(p.assigned_to,rep);assert.equal(p.text_ok,true);
  await db.query('UPDATE prospects SET attempt_count=9 WHERE id=$1',[id]);const failed=await result(id,'no_answer');assert.equal(failed.attempt_count,10);assert.equal((await row('SELECT out_of_tries_at FROM prospects WHERE id=$1',[id])).out_of_tries_at,null);
});
test('follow-up requires note and future precise time; sync preserves Pacific date and forward-only stage',async()=>{
  const id=await fresh();await assert.rejects(result(id,'follow_up',{}),/day, time and note/);
  const t=(await row("SELECT ((now() AT TIME ZONE 'America/Los_Angeles')::date+2+time '12:00') AT TIME ZONE 'America/Los_Angeles' t")).t;
  await db.query("UPDATE prospects SET status='replied' WHERE id=$1",[id]);await result(id,'follow_up',{next_try_at:t,note:'Send info then call'});
  const p=await row('SELECT status,attempt_count,next_follow_up::text,next_try_at FROM prospects WHERE id=$1',[id]);assert.equal(p.status,'replied');assert.equal(p.attempt_count,0);assert.equal(p.next_follow_up,new Date(t).toISOString().slice(0,10));
});
test('stop applies do-not-contact to every contact point and blocks further results',async()=>{
  const id=await fresh();await db.query("INSERT INTO contact_points(prospect_id,kind,value) VALUES($1,'phone','+15555550100'),($1,'email','a@example.test')",[id]);await result(id,'stop');
  assert.equal((await row('SELECT count(*)::int n FROM contact_points WHERE prospect_id=$1 AND opted_out',[id])).n,2);await assert.rejects(result(id,'no_answer'),/Do not contact/);
});
test('wrong number marks the phone, not an opt-out; email next try is one business day',async()=>{
  const id=await fresh();await db.query("INSERT INTO contact_points(prospect_id,kind,value) VALUES($1,'phone','+15555550100')",[id]);await result(id,'wrong_number');
  assert.equal((await row('SELECT is_wrong FROM contact_points WHERE prospect_id=$1',[id])).is_wrong,true);
  assert.equal((await row('SELECT do_not_contact FROM prospects WHERE id=$1',[id])).do_not_contact,false);
});
test('intro booking asks for offered times and creates a Waiting-on-me owner task',async()=>{
  const id=await fresh();await assert.rejects(result(id,'intro_booked',{}),/intro call details/);
  const r=await result(id,'intro_booked',{contact_name:'Pat',role:'Owner',phone:'5555550100',email:'pat@example.test',their_words:'Need help',fix:'Website',spending_approver:'Pat',times:'Monday 11 or Tuesday 2'});
  assert.equal((await row('SELECT to_agent FROM agent_handoffs WHERE id=$1',[r.owner_job_id])).to_agent,'owner');assert.equal((await row('SELECT booked_by FROM prospects WHERE id=$1',[id])).booked_by,rep);
});
test('rep close stays pending and owner confirmation alone makes Won with correct amounts',async()=>{
  const id=await fresh();await db.query('UPDATE prospects SET preview_by=$2 WHERE id=$1',[id,rep]);await result(id,'pending_close',{package_id:pkg,client_email:'client@example.test'});
  assert.equal((await row('SELECT status FROM prospects WHERE id=$1',[id])).status,'new');
  await assert.rejects(db.query('SELECT hq_lead_confirm_won($1,$2,0,300,\'rep_alone\',$3)',[id,pkg,rep]),/Team permission/);
  await asUser(admin);await db.query('SELECT hq_lead_confirm_won($1,$2,0,300,\'rep_alone\',$3)',[id,pkg,rep]);
  const p=await row('SELECT * FROM prospects WHERE id=$1',[id]);assert.equal(p.status,'won');assert.equal(Number(p.won_monthly_amount),300);assert.equal(p.pending_close,null);
});
test('only admin can cancel/refund, and notes and dates are required',async()=>{
  const id=await fresh();await db.query('UPDATE prospects SET won_confirmed_at=now()-interval \'2 days\' WHERE id=$1',[id]);await assert.rejects(db.query('SELECT hq_lead_record_refund($1,100,\'Returned\')',[id]),/Team permission/);
  await asUser(admin);await assert.rejects(db.query('SELECT hq_lead_record_refund($1,100,\'\')',[id]),/note/);await db.query('SELECT hq_lead_record_refund($1,100,\'Returned\')',[id]);assert.equal(Number((await row('SELECT refund_amount FROM prospects WHERE id=$1',[id])).refund_amount),100);
});
test('daily stale sweep unassigns untouched leads, logs previous assignee, and is idempotent',async()=>{
  const id=await fresh('old');await db.query('UPDATE prospects SET assigned_to=$2 WHERE id=$1',[id,rep]);await asUser(admin);const r=await row('SELECT hq_lead_stale_sweep() r');assert.ok(r.r.released>=1);
  assert.equal((await row('SELECT assigned_to FROM prospects WHERE id=$1',[id])).assigned_to,null);assert.match((await row('SELECT summary FROM prospect_activity WHERE prospect_id=$1',[id])).summary,/Stale assignment released/);
  assert.equal((await row('SELECT hq_lead_stale_sweep() r')).r.released,0);
});
test('sensitive direct edits and inserts cannot bypass checked actions',async()=>{
  const id=await fresh();await db.exec('SET ROLE authenticated');
  await assert.rejects(db.query("UPDATE prospects SET status='won' WHERE id=$1",[id]),/confirmation/);
  await assert.rejects(db.query("UPDATE prospects SET text_ok=true WHERE id=$1",[id]),/checked sales/);
  await assert.rejects(db.query("INSERT INTO prospects(business_name,status) VALUES('Bypass','won')"),/checked sales/);
  await db.exec('RESET ROLE');
});
test('null Dead reason, preview link and pay level are refused',async()=>{
  const id=await fresh();await assert.rejects(result(id,'not_interested',{confirmed:true}),/reason/);
  await asUser(admin);await assert.rejects(db.query('SELECT hq_lead_set_preview_link($1,null)',[id]),/HTTPS/);
  await assert.rejects(db.query('SELECT hq_lead_confirm_won($1,$2,0,300,null,$3)',[id,pkg,rep]),/pay level/);
});
test('settings retain the exact packet defaults',async()=>{
  const c=(await row("SELECT value FROM sales_settings WHERE key='cadence'")).value;
  assert.deepEqual(c,{max_tries:4,window_days:14,voicemail_try:2,rest_days:60,hold_minutes:30,preview_retry_business_days:2,stale_overdue_business_days:2,stale_untouched_days:5,quiet_start:'21:00',quiet_end:'08:00'});
  const p=(await row("SELECT value FROM sales_settings WHERE key='pay'")).value;
  assert.deepEqual(p,{rep_alone:35,rep_with_owner:25,rep_handed_over:15,owner_deal:0,months:12});
});
test('owner closes always have zero pay even if another pay level was submitted',async()=>{
  const id=await fresh();await asUser(admin);await db.query('SELECT hq_lead_confirm_won($1,$2,799,0,\'rep_alone\',$3)',[id,pkg,admin]);
  assert.equal((await row('SELECT pay_level FROM prospects WHERE id=$1',[id])).pay_level,'owner_deal');
});
test('next tries never land on a weekend',async()=>{
  assert.equal((await row("SELECT hq_sales_weekday('2026-11-28')::text d")).d,'2026-11-30');
  assert.equal((await row("SELECT hq_sales_weekday('2026-11-29')::text d")).d,'2026-11-30');
  assert.equal((await row("SELECT hq_sales_weekday('2026-11-25')::text d")).d,'2026-11-25');
});
test('four failed tries rest the lead even if it talked before; preview leads still never rest',async()=>{
  const id=await fresh();await db.query("UPDATE prospects SET last_contacted_at=now()-interval '3 days',attempt_count=3 WHERE id=$1",[id]);
  const r=await result(id,'no_answer');assert.equal(r.attempt_count,0);assert.ok((await row('SELECT out_of_tries_at FROM prospects WHERE id=$1',[id])).out_of_tries_at);
});
test('intro call needs a valid phone or email, not both',async()=>{
  const base={contact_name:'Pat',role:'Owner',their_words:'Need help',fix:'Website',spending_approver:'Pat',times:'Monday 11 or Tuesday 2'};
  const a=await fresh();await assert.rejects(result(a,'intro_booked',base),/phone or email/);
  const b=await fresh();const r=await result(b,'intro_booked',{...base,phone:'5555550100'});assert.ok(r.owner_job_id);
  const c=await fresh();const r2=await result(c,'intro_booked',{...base,email:'pat@example.test'});assert.ok(r2.owner_job_id);
});
test('stale sweep leaves parked leads alone',async()=>{
  const ids=[];for(let i=0;i<4;i++)ids.push(await fresh('old'));
  await db.query("UPDATE prospects SET assigned_to=$2,pending_close='{\"package_id\":\"x\"}' WHERE id=$1",[ids[0],rep]);
  await db.query("UPDATE prospects SET assigned_to=$2,pay_level='rep_handed_over' WHERE id=$1",[ids[1],rep]);
  await db.query("UPDATE prospects SET assigned_to=$2,status='meeting' WHERE id=$1",[ids[2],rep]);
  await db.query("UPDATE prospects SET assigned_to=$2,preview_by=$2 WHERE id=$1",[ids[3],rep]);
  await asUser(admin);await row('SELECT hq_lead_stale_sweep() r');
  for(const id of ids)assert.equal((await row('SELECT assigned_to FROM prospects WHERE id=$1',[id])).assigned_to,rep);
});
