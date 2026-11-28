import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(resolve('node_modules/.cache/leads-'));
await build({ entryPoints: ['src/lib/leads.ts'], outdir: dir, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm' });
const L = await import(pathToFileURL(join(dir, 'leads.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));
const lead = (o = {}) => ({ id: 'x', status: 'new', source: 'places', business_name: 'A', created_at: '2026-11-01T00:00:00Z', ...o });

test('new, checked and queued all show as New; promoted shows as Meeting booked', () => {
  for (const s of ['new', 'checked', 'queued']) assert.equal(L.stageOf(s), 'new');
  assert.equal(L.stageOf('promoted'), 'meeting');
  assert.equal(L.stageOf('replied'), 'replied');
});
test('source badges come from source plus platform', () => {
  assert.equal(L.sourceLabel('places'), 'Google');
  assert.equal(L.sourceLabel('social', 'facebook'), 'Facebook');
  assert.equal(L.sourceLabel('social', 'Instagram'), 'Instagram');
  assert.equal(L.sourceLabel('manual'), 'Manual');
});
test('list sorts by fit score, then leak, then newest', () => {
  const rows = [lead({ id: 'old', created_at: '2026-01-01T00:00:00Z' }), lead({ id: 'leak', leak_total: 500 }), lead({ id: 'fit', fit_score: 80 }), lead({ id: 'new', created_at: '2026-11-10T00:00:00Z' })];
  assert.deepEqual(L.sortLeads(rows).map((r) => r.id), ['fit', 'leak', 'new', 'old']);
});
test('Mine and Unassigned filters', () => {
  const rows = [lead({ id: 'a', assigned_to: 'me' }), lead({ id: 'b', assigned_to: 'you' }), lead({ id: 'c' })];
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, assigned: 'mine' }, 'me').map((r) => r.id), ['a']);
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, assigned: 'unassigned' }, 'me').map((r) => r.id), ['c']);
});
test('search covers name, contact, city and their words', () => {
  const rows = [lead({ id: 'w', their_words: 'Need a new website ASAP' }), lead({ id: 'c', contact_name: 'Maria' }), lead({ id: 'n' })];
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, search: 'website' }, null).map((r) => r.id), ['w']);
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, search: 'maria' }, null).map((r) => r.id), ['c']);
});
test('logging contact moves only New leads to Contacted', () => {
  assert.equal(L.stageAfterContact('new'), 'contacted');
  assert.equal(L.stageAfterContact('checked'), 'contacted');
  assert.equal(L.stageAfterContact('replied'), null);
  assert.equal(L.stageAfterContact('promoted'), null);
});
test('follow-up is overdue only before today', () => {
  assert.equal(L.isOverdue('2026-11-15', '2026-11-16'), true);
  assert.equal(L.isOverdue('2026-11-16', '2026-11-16'), false);
});
test('CSV escapes commas, quotes and line breaks', () => {
  assert.equal(L.csvCell('a, "b"\nc'), '"a, ""b""\nc"');
});
test('website form leads carry the Website source label', () => {
  assert.equal(L.sourceLabel('website'), 'Website');
});
test('shared queue: unanswered inbound, preview, callbacks, assigned due, then open fit score', () => {
  const today = '2026-11-16';
  const rows = [
    lead({ id: 'contacted', status: 'contacted' }),
    lead({ id: 'new-fit', fit_score: 90 }),
    lead({ id: 'new-plain' }),
    lead({ id: 'due', status: 'contacted', next_follow_up: '2026-11-16' }),
    lead({ id: 'overdue', status: 'contacted', next_follow_up: '2026-11-10', fit_score: 50 }),
    lead({ id: 'inbound', source:'website', status: 'new' }),
    lead({ id: 'preview',preview_by:'me',preview_link:'https://preview.example',next_try_at:'2026-11-16T15:00:00Z' }),
  ];
  const top = L.topLeads(rows, today, { limit: 10,now:new Date('2026-11-16T19:00:00Z') });
  assert.deepEqual(top.map((t) => t.lead.id), ['inbound', 'preview', 'overdue', 'due', 'new-fit', 'contacted', 'new-plain']);
  assert.deepEqual(top.map((t) => t.reason), ['replied', 'preview', 'due', 'due', 'new', 'contacted', 'new']);
  assert.equal(L.topLeads(rows, today).length, 5);
});
test('top leads leave out do-not-contact, booked, won, dead and not-yet-due leads', () => {
  const today = '2026-11-16';
  const rows = [
    lead({ id: 'dnc', do_not_contact: true }),
    lead({ id: 'later', next_follow_up: '2026-11-20' }),
    lead({ id: 'meeting', status: 'meeting' }),
    lead({ id: 'promoted', status: 'promoted' }),
    lead({ id: 'won', status: 'won' }),
    lead({ id: 'dead', status: 'dead' }),
    lead({ id: 'ok' }),
  ];
  assert.deepEqual(L.topLeads(rows, today).map((t) => t.lead.id), ['ok']);
});
test('any team member can see and work shared leads; own assignments are prioritized', () => {
  const rows = [lead({ id: 'mine', assigned_to: 'me' }), lead({ id: 'theirs', assigned_to: 'you' }), lead({ id: 'open' })];
  const ids = (o) => L.topLeads(rows, '2026-11-16', o).map((t) => t.lead.id).sort();
  assert.deepEqual(ids({ me: 'me', isAdmin: false }), ['mine', 'open', 'theirs']);
  assert.deepEqual(ids({ me: 'me', isAdmin: true }), ['mine', 'open', 'theirs']);
});

const settings={cadence:{max_tries:4,window_days:14,voicemail_try:2,rest_days:60,hold_minutes:30,preview_retry_business_days:2,stale_overdue_business_days:2,stale_untouched_days:5,quiet_start:'21:00',quiet_end:'08:00'},pay:{rep_alone:35,rep_with_owner:25,rep_handed_over:15,owner_deal:0,months:12},mailing_address:''};
const now=new Date('2026-11-16T17:00:00Z');
test('held by another person and precise future callbacks are excluded',()=>{
  const rows=[lead({id:'held',working_by:'other',working_until:'2026-11-16T17:30:00Z'}),lead({id:'later',next_try_at:'2026-11-16T17:01:00Z'}),lead({id:'mine',working_by:'me',working_until:'2026-11-16T17:30:00Z'})];
  assert.deepEqual(L.topLeads(rows,'2026-11-16',{me:'me',now}).map(r=>r.lead.id),['mine']);
});
test('cadence spaces four tries inside fourteen days and rotates day parts',()=>{
  const r1=L.nextFailedTry(lead({attempt_count:0}),settings.cadence,now);
  assert.equal(r1.next_day,'2026-11-21');assert.equal(r1.part,'midday');
  const r2=L.nextFailedTry(lead({attempt_count:1}),settings.cadence,new Date('2026-11-21T20:00:00Z'));
  assert.equal(r2.next_day,'2026-11-26');assert.equal(r2.part,'late_afternoon');
  const r3=L.nextFailedTry(lead({attempt_count:2}),settings.cadence,new Date('2026-11-27T00:00:00Z'));
  assert.equal(r3.next_day,'2026-11-30');assert.equal(r3.part,'morning');
});
test('voicemail is offered only on try two',()=>{
  assert.equal(L.voicemailAllowed(0,settings.cadence),false);assert.equal(L.voicemailAllowed(1,settings.cadence),true);assert.equal(L.voicemailAllowed(2,settings.cadence),false);assert.equal(L.voicemailAllowed(3,settings.cadence),false);
});
test('fourth failed try resets attempts and rests sixty days without a stage',()=>{
  const r=L.nextFailedTry(lead({attempt_count:3}),settings.cadence,now);assert.equal(r.attempt_count,0);assert.equal(r.next_day,'2027-01-15');assert.equal(r.rested,true);assert.equal(r.status,undefined);
});
test('preview leads never rest even beyond four tries; next try is two business days',()=>{
  const r=L.nextFailedTry(lead({attempt_count:9,preview_by:'me'}),settings.cadence,new Date('2026-11-20T17:00:00Z'));assert.equal(r.rested,false);assert.equal(r.attempt_count,10);assert.equal(r.next_day,'2026-11-24');
});
test('quiet hours use the lead time zone and include 21:00 but not 08:00',()=>{
  assert.equal(L.quietHours(lead({time_zone:'America/New_York'}),settings.cadence,new Date('2026-11-17T02:00:00Z')),true);
  assert.equal(L.quietHours(lead({time_zone:'America/Los_Angeles'}),settings.cadence,new Date('2026-11-17T02:00:00Z')),false);
  assert.equal(L.quietHours(lead({time_zone:'America/Los_Angeles'}),settings.cadence,now),false);
});
test('texts need call consent or a person who reached out first, never merely a replied stage',()=>{
  const p=lead({phone:'5555550100',status:'replied'});assert.match(L.contactGate(p,'text',settings,now),/not said yes/);
  assert.equal(L.contactGate({...p,text_ok:true},'text',settings,now),null);assert.equal(L.contactGate({...p,inbound_lead_id:'inbound'},'text',settings,now),null);
});
test('email is blocked until a real mailing address and valid email are present',()=>{
  assert.match(L.contactGate(lead({email:'a@example.com'}),'email',settings,now),/mailing address/);
  assert.equal(L.contactGate(lead({email:'a@example.com'}),'email',{...settings,mailing_address:'123 Business St'},now),null);
});
test('do not contact blocks all channels regardless of consent',()=>{
  for(const c of ['call','text','email'])assert.match(L.contactGate(lead({do_not_contact:true,text_ok:true} ),c,settings,now),/Do not contact/);
});
test('stale callback needs more than two business days and no activity since',()=>{
  const p=lead({assigned_to:'me',next_try_at:'2026-11-19T17:00:00Z'});
  assert.equal(L.staleReason(p,null,settings.cadence,new Date('2026-11-23T17:00:00Z')),null);
  assert.equal(L.staleReason(p,null,settings.cadence,new Date('2026-11-24T17:00:00Z')),'Overdue callback');
  assert.equal(L.staleReason(p,'2026-11-20T17:00:00Z',settings.cadence,new Date('2026-11-24T17:00:00Z')),null);
});
test('untouched assigned lead with no next try is stale after five days',()=>{
  const p=lead({assigned_to:'me',created_at:'2026-11-10T17:00:00Z'});assert.equal(L.staleReason(p,null,settings.cadence,new Date('2026-11-15T17:00:00Z')),null);assert.equal(L.staleReason(p,null,settings.cadence,now),'Untouched with no next try');
});
test('pay rates apply to setup and monthly client payments only in the first twelve months',()=>{
  for(const [level,rate] of [['rep_alone',.35],['rep_with_owner',.25],['rep_handed_over',.15],['owner_deal',0]]){
    const r=L.salesPay(799,300,level,settings,'2026-01-01T00:00:00Z',null,0,new Date('2027-03-01T00:00:00Z'));assert.equal(r.expected,(799+300*12)*rate);assert.equal(r.months,12);
  }
});
test('cancellation stops pay months and refunds reduce the commission base',()=>{
  const r=L.salesPay(0,300,'rep_alone',settings,'2026-01-01T00:00:00Z','2026-03-10T00:00:00Z',100,new Date('2026-11-01T00:00:00Z'));assert.equal(r.months,3);assert.equal(r.accrued,280);
});
test('skipped lead goes to the back of the shared queue order',()=>{
  assert.deepEqual(L.topLeads([lead({id:'first',source:'website'}),lead({id:'second'})],'2026-11-16',{now,skipped:new Set(['first'])}).map(x=>x.lead.id),['second','first']);
});
test('scripts use lead type then any and omit legacy untagged rows',()=>{
  const rows=[{id:'old',lead_type:null,step:null},{id:'any',lead_type:'any',step:'opener'},{id:'type',lead_type:'hvac',step:'opener'}];assert.deepEqual(L.scriptFor(rows,'hvac','opener').map(r=>r.id),['type']);assert.deepEqual(L.scriptFor(rows,'plumbing','opener').map(r=>r.id),['any']);
});
test('own due assignment follows the due callback lanes and is oldest first',()=>{
  const rows=[lead({id:'mine-new',assigned_to:'me',next_try_at:'2026-11-16T16:00:00Z'}),lead({id:'mine-old',assigned_to:'me',next_try_at:'2026-11-15T16:00:00Z'}),lead({id:'callback',next_try_at:'2026-11-16T16:30:00Z'})];
  assert.deepEqual(L.topLeads(rows,'2026-11-16',{me:'me',now,limit:10}).map(r=>r.lead.id),['callback','mine-old','mine-new']);
});
test('preview follow-ups never offer another voicemail',()=>{assert.equal(L.voicemailAllowed(1,settings.cadence,true),false);});
test('only failed tries with no prior conversation enter sixty-day rest',()=>{
  const r=L.nextFailedTry(lead({attempt_count:3,last_contacted_at:'2026-11-10T17:00:00Z'}),settings.cadence,now);assert.equal(r.rested,false);assert.equal(r.attempt_count,4);
});
for(const [level,expected] of [['rep_alone',1260],['rep_with_owner',900],['rep_handed_over',540],['owner_deal',0]]){
  test(`${level} pays the packet rate on twelve $300 payments`,()=>{assert.equal(L.salesPay(0,300,level,settings).expected,expected);});
}
test('local callback conversion uses the lead time zone across daylight saving',()=>{
  assert.equal(L.zonedInputToIso('2026-07-01T14:00','America/Los_Angeles'),'2026-07-01T21:00:00.000Z');
  assert.equal(L.zonedInputToIso('2026-12-01T14:00','America/Los_Angeles'),'2026-12-01T22:00:00.000Z');
});
test('do-not-contact reason says who set it and how', () => {
  assert.equal(L.doNotContactReason({ do_not_contact: false }), null);
  assert.match(L.doNotContactReason({ do_not_contact: true, opt_out_channel: 'manual', opted_out_at: '2026-11-16T10:00:00Z' }), /^Marked by your team on /);
  assert.match(L.doNotContactReason({ do_not_contact: true, opt_out_channel: 'sms' }), /asked by text to stop/);
  assert.equal(L.optedOutThemselves({ do_not_contact: true, opt_out_channel: 'manual' }), false);
  assert.equal(L.optedOutThemselves({ do_not_contact: true, opt_out_channel: 'email' }), true);
});
test('export has a do-not-contact column', () => {
  assert.equal(L.EXPORT_COLUMNS.at(-1), 'Do not contact');
});
