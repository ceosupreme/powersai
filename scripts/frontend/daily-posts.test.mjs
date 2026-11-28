import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDailyPostPackage, parseDailyPostPlacement, parseBoardPostPackage, mergeDrivePosts, countDailyPostsByStatus, resolveDailyPostStatus, mixPurpose } from '../../src/lib/dailyPosts.ts';
import { socialPostState, finishedAt } from '../../src/lib/agentDesk.ts';
import { publishedPieces } from '../../src/lib/brandPulse.ts';
import { postingCaptions } from '../../supabase/functions/brand-drive/captions.ts';
const packageFor=(id,piece='main',folder=null)=>parseDailyPostPackage({id,project_id:'brand',title:id,due_date:'2026-11-28',quality_score:87,brief:{daily_post:{piece,drive_folder_url:folder,post_status:'ready'}}},[],'Brand');
test('two pieces for one brand and date both show',()=>{const ps=[packageFor('a'),packageFor('b','graphic')];assert.equal(mergeDrivePosts(ps,[]).length,2);assert.equal(countDailyPostsByStatus(ps).ready,2);});
test('a record hides only its matching Drive folder; main without a folder uses brand/date',()=>{
 const a=packageFor('saved','main','https://drive.google.com/drive/folders/folder-a');
 const same=packageFor('drive-a','main','https://drive.google.com/drive/folders/folder-a');const other=packageFor('drive-b','main','https://drive.google.com/drive/folders/folder-b');
 assert.deepEqual(mergeDrivePosts([a],[same,other]).map(p=>p.id),['saved','drive-b']);
 assert.equal(mergeDrivePosts([packageFor('legacy')],[same,other]).length,1);
 assert.equal(mergeDrivePosts([packageFor('extra','graphic')],[same,other]).length,3);
});
test('one-tap no-link receipts count as posted; removing the receipt restores the previous count',()=>{
 const p=parseDailyPostPlacement({id:'pl',status:'planned',receipt:{posted_no_link_at:'2026-11-28T09:00:00Z'}});
 assert.equal(resolveDailyPostStatus('ready',[p]),'posted');
 assert.equal(resolveDailyPostStatus('ready',[{...p,posted_no_link_at:null}]),'ready');
 assert.equal(resolveDailyPostStatus('ready',[p,{...p,id:'other',posted_no_link_at:null}]),'ready');
});
test('daily purpose counts in the mix; daily posts without a purpose stay out',()=>{
 assert.equal(mixPurpose({purpose_type:'daily_post',brief:{daily_post:{purpose:'teach'}}}),'teach');assert.equal(mixPurpose({purpose_type:'daily_post'}),null);assert.equal(mixPurpose({purpose_type:'offer'}),'offer');
});
test('finished Board pieces join the correct counts; ideas and unfinished drafts do not',()=>{
 const raw={id:'board',project_id:'brand',title:'Board graphic',format:'post',stage:'design',due_date:'2026-11-28',brief:{asset_urls:['https://example.com/finished.jpg'],cta_not_needed:true},approved_at:null};
 assert.equal(parseBoardPostPackage(raw,[],'Brand').post_status,'waiting_on_owner');
 assert.equal(parseBoardPostPackage({...raw,approved_at:'2026-11-27'},[],'Brand').post_status,'ready');
 assert.equal(parseBoardPostPackage({...raw,approved_at:'2026-11-27',stage:'scheduled'},[],'Brand').post_status,'scheduled');
 assert.equal(parseBoardPostPackage({...raw,stage:'idea'},[],'Brand'),null);assert.equal(parseBoardPostPackage({...raw,brief:{}},[],'Brand'),null);
});
test('published Board pieces use the Pacific publication date in the Posts window',()=>{
 const p=parseBoardPostPackage({id:'x',project_id:'brand',title:'Posted Board piece',stage:'published',due_date:'2026-11-20',published_at:'2026-11-29T02:00:00Z'},[],'Brand');assert.equal(p.post_status,'posted');assert.equal(p.post_date,'2026-11-28');
});
test('Agent Desk and brand output count a human no-link confirmation without inventing a URL',()=>{
 const row={id:'mail',title:'Post',status:'done',spec:{type:'social_post'},result:{posted_no_link:[{platform:'facebook',posted_at:'2026-11-28T09:00:00Z'}]},updated_at:'2026-11-28T10:00:00Z'};
 assert.equal(socialPostState(row),'posted');assert.equal(finishedAt(row),'2026-11-28T09:00:00Z');
 const ps=publishedPieces([{id:'pl',content_item_id:'item',live_url:null,verified_at:null,updated_at:null,receipt:{posted_no_link_at:'2026-11-28T09:00:00Z'}}],[]);assert.equal(ps.length,1);assert.equal(ps[0].url,null);
});
test('Threads caption headings are recognized independently of other channels',()=>{assert.deepEqual(postingCaptions('THREADS\nCaption: Threads copy\nFACEBOOK\nCaption: Facebook copy'),[{channel:'threads',caption:'Threads copy'},{channel:'facebook',caption:'Facebook copy'}]);});
test('first comment, account notes, topic title and quality fails are retained',()=>{
 const p=parseDailyPostPlacement({id:'p',receipt:{first_comment:'Comment',notes:'@brand'}});assert.equal(p.first_comment,'Comment');assert.equal(p.notes,'@brand');
 const c=parseDailyPostPackage({id:'c',title:'Bernese Mountain Dog breed spotlight (3 slides)',quality_fails:['Logo missing'],brief:{}},[],'Brand');assert.equal(c.title,'Bernese Mountain Dog breed spotlight (3 slides)');assert.deepEqual(c.quality_fails,['Logo missing']);
});