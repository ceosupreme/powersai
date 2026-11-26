import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
await mkdir(resolve('node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(resolve('node_modules/.cache/agent-desk-'));
await build({ entryPoints: ['src/lib/agentDesk.ts', 'src/lib/brandPulse.ts'], outdir: dir, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm' });
const a = await import(pathToFileURL(join(dir, 'agentDesk.mjs')).href);
const p = await import(pathToFileURL(join(dir, 'brandPulse.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));
const now = new Date('2026-11-26T16:39:00Z');
const ago = d => new Date(now.getTime() - d * 86400_000).toISOString();
const row = (x = {}) => ({ id:'task', created_at:ago(1), updated_at:ago(1), completed_at:null, claimed_at:null, due_at:null, last_run_at:null,
  studio_lease_expires_at:null, from_agent:'claude', to_agent:'muse', kind:'task', status:'new', title:'Task', schedule:null,
  parent_id:null, venue_id:'brand', brand_ids:['brand'], owner_question:null, notes:null, spec:{}, result:{}, result_links:[], action_item_id:null, content_item_id:null, ...x });
const post = (x = {}) => row({ status:'done', completed_at:ago(10), spec:{type:'social_post',post_date:'2026-11-25'}, ...x });

test('mailbox states have plain status meanings, including made versus posted', () => {
  for (const [status, label] of Object.entries({new:'Waiting to start', claimed:'Working on it', needs_owner:'Needs you', failed:'Failed', done:'Finished', cancelled:'Cancelled', active:'Active'})) assert.equal(a.statusLabel(row({status})), label);
  assert.equal(a.statusLabel(row({kind:'standing_task',status:'active'})), 'Repeating');
  assert.equal(a.statusLabel(post()), 'Made, not posted');
  assert.equal(a.statusLabel(post({result:{published:[{url:'https://example.test/post',platform:'Facebook'}]}})), 'Posted');
  assert.equal(a.socialPostState(post({result:{published:[{url:'not-a-live-link'}]}})), 'made_not_posted');
});
test('claimed over 24 hours or expired lease is stuck, not a fresh claim or completed task', () => {
  assert.equal(a.isStuck(row({status:'claimed',claimed_at:ago(1.01)}),now),true);
  assert.equal(a.isStuck(row({status:'claimed',claimed_at:ago(1)}),now),false);
  assert.equal(a.isStuck(row({status:'claimed',claimed_at:ago(.1),studio_lease_expires_at:ago(.01)}),now),true);
  assert.equal(a.isStuck(row({status:'done',claimed_at:ago(2)}),now),false);
});
test('failed, overdue and unstarted over 48 hours are stuck; history is never stuck', () => {
  assert.equal(a.isStuck(row({status:'failed'}),now),true);
  assert.equal(a.isStuck(row({due_at:ago(.01)}),now),true);
  assert.equal(a.isStuck(row({created_at:ago(2.01)}),now),true);
  assert.equal(a.isStuck(row({created_at:ago(2)}),now),false);
  assert.equal(a.isStuck(row({kind:'reply',status:'failed',spec:{history_only:true}}),now),false);
});
test('made posts become late only after their Pacific post date, posted pieces are not late', () => {
  assert.equal(a.isPostLate(post(),'2026-11-26'),true);
  assert.equal(a.isPostLate(post(),'2026-11-25'),false);
  assert.equal(a.isPostLate(post({result:{published:[{url:'https://example.test/post'}]}}),'2026-11-26'),false);
});
test('first Monday of every month wins over Monday, including first run now', () => {
  const monthly = row({kind:'standing_task',status:'active',schedule:'First run now, then the first Monday of every month',last_run_at:ago(20)});
  assert.equal(a.isStandingMissed(monthly,now),false);
  assert.equal(a.isStandingMissed({...monthly,last_run_at:ago(36)},now),true);
});
test('daily and weekly repeating jobs use their own allowances, unknown cadence is not guessed', () => {
  assert.equal(a.isStandingMissed(row({kind:'standing_task',status:'active',schedule:'Daily',last_run_at:ago(2)}),now),true);
  assert.equal(a.isStandingMissed(row({kind:'standing_task',status:'active',schedule:'Every Monday',last_run_at:ago(9)}),now),true);
  assert.equal(a.isStandingMissed(row({kind:'standing_task',status:'active',schedule:'As needed',created_at:ago(90)}),now),false);
});
test('failure grouping preserves each task once under the same reason', () => {
  const groups=a.groupFailures([row({id:'1',result:{error:'Drive upload failed'}}),row({id:'2',result:{error:'drive upload failed'}}),row({id:'3',result:{error:'Network unavailable'}})]);
  assert.deepEqual(groups[0].ids,['1','2']); assert.equal(groups.length,2);
});
test('needs-you merges question with task, answers question, and suppresses both linked to-dos', () => {
  const task=row({id:'parent',status:'needs_owner',action_item_id:'todo-parent'});
  const question=row({id:'question',kind:'question',to_agent:'owner',status:'needs_owner',parent_id:'parent',action_item_id:'todo-question',owner_question:'Can you approve the folder?',brand_ids:[]});
  const items=a.buildNeedsYou([task,question]);
  assert.equal(items.length,1); assert.equal(items[0].answerRowId,'question');
  assert.deepEqual(items[0].brandIds,['brand']); assert.equal(items[0].parentRow.id,'parent');
  assert.deepEqual([...a.needsYouActionIds(items)].sort(),['todo-parent','todo-question']);
});
test('agent-addressed needs_owner and owner-addressed open asks both appear, history does not', () => {
  const items=a.buildNeedsYou([row({id:'agent',status:'needs_owner'}),row({id:'owner',to_agent:'owner'}),row({id:'history',kind:'reply',status:'needs_owner',spec:{history_only:true}})]);
  assert.deepEqual(items.map(i=>i.id),['agent','owner']);
});
test('no actual question uses agent summary, otherwise latest note, never standing owner instructions', () => {
  const item=a.buildNeedsYou([row({status:'needs_owner',spec:{owner_part:'None.',needs:'his signed-in Chrome'},notes:'First\nLast note',result:{summary:'Cannot reach the folder'}})])[0];
  assert.equal(item.question,null); assert.equal(item.whatHappened,'Cannot reach the folder');
  assert.equal(a.buildNeedsYou([row({status:'needs_owner',notes:'First\nLast note'})])[0].whatHappened,'Last note');
  assert.equal(a.whatHappenedOf(row({result:{error:'Old error'},notes:'First\nLatest words'})),'Latest words');
});
test('finished work excludes history and made-not-posted files but includes finished tasks and posted pieces', () => {
  assert.equal(a.isFinishedWork(row({status:'done'})),true);
  assert.equal(a.isFinishedWork(post()),false);
  assert.equal(a.isFinishedWork(row({kind:'reply',status:'done',spec:{history_only:true}})),false);
  assert.equal(a.isFinishedWork(post({result:{published:[{url:'https://example.test/post',posted_at:ago(1)}]}})),true);
});
test('Done this week is Monday–Sunday Pacific and posted time wins over made time', () => {
  assert.equal(a.isFinishedThisWeek(row({status:'done',completed_at:'2026-11-23T08:00:00Z'}),now),true);
  assert.equal(a.isFinishedThisWeek(row({status:'done',completed_at:'2026-11-23T07:59:59Z'}),now),false);
  assert.equal(a.isFinishedThisWeek(post({result:{published:[{url:'https://example.test/post',posted_at:ago(1)}]}}),now),true);
});
test('every open status and unposted files remain eligible however old; recent closed only and no history', () => {
  const since=ago(60);
  for(const status of a.OPEN_AGENT_STATUSES) assert.equal(a.belongsOnDesk(row({status,created_at:ago(200),updated_at:ago(200)}),since),true);
  assert.equal(a.belongsOnDesk(post({updated_at:ago(200),completed_at:ago(200)}),since),true);
  assert.equal(a.belongsOnDesk(row({status:'done',completed_at:ago(61),updated_at:ago(61)}),since),false);
  assert.equal(a.belongsOnDesk(row({status:'cancelled',updated_at:ago(1)}),since),true);
  assert.equal(a.belongsOnDesk(row({kind:'reply',status:'done',spec:{history_only:true},completed_at:ago(1)}),since),false);
});
test('mailbox publishing counts once per piece, not platform, using posting date and matching placements', () => {
  const posted=post({content_item_id:'content',result:{published:[{url:'https://example.test/fb',platform:'Facebook',posted_at:ago(1)},{url:'https://example.test/ig',platform:'Instagram',posted_at:ago(.5)}]}});
  const pieces=p.publishedPieces([],[],[posted,post()]);
  assert.equal(pieces.length,1); assert.equal(pieces[0].at,ago(1)); assert.equal(p.publishedInLast7(pieces,now.getTime()),1);
  assert.equal(p.publishedPieces([{id:'placement',content_item_id:'content',live_url:'https://example.test/fb',updated_at:ago(1)}],[],[posted]).length,1);
  assert.equal(p.mailboxWorkInLast7([posted,row({status:'done',completed_at:ago(1)}),post()],now.getTime()),2);
  assert.equal(p.pulseStatus({published7:1,done7:2,setupPct:90}).status,'green');
});
test('mailbox latest work excludes history and unposted files and carries actual proof', () => {
  const feed=p.mailboxFeedRows([post(),row({status:'done',completed_at:ago(1),result_links:[{url:'https://drive.google.com/folder',label:'Drive folder'}]}),row({kind:'reply',status:'done',spec:{history_only:true}})],now.getTime());
  assert.equal(feed.length,1); assert.equal(feed[0].who,'Muse'); assert.equal(feed[0].proofLinks[0].url,'https://drive.google.com/folder');
  assert.equal(p.mailboxFeedRows([row({status:'done',completed_at:ago(61)})],now.getTime()).length,0);
});