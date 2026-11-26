import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
await mkdir(resolve('node_modules/.cache'), {recursive:true});
const dir = await mkdtemp(resolve('node_modules/.cache/agent-data-'));
const mock = `
let rows=[]; export const requests=[]; export function setRows(r){rows=r;requests.length=0;}
export const supabase={from(){let filtered=rows;return {
 select(){return this}, or(){return this}, order(){return this},
 overlaps(k,ids){filtered=filtered.filter(r=>r[k]?.some(id=>ids.includes(id)));return this},
 eq(k,v){filtered=filtered.filter(r=>r[k]===v);return this},
 in(k,ids){filtered=filtered.filter(r=>ids.includes(r[k]));return this},
 range(from,to){requests.push([from,to]);return Promise.resolve({data:filtered.slice(from,to+1),count:filtered.length,error:null})}
}}};`;
await build({stdin:{contents:`export * from './src/lib/agentDeskData'; export {setRows,requests} from '@/integrations/supabase/client';`,resolveDir:process.cwd(),loader:'ts'},outfile:join(dir,'data.mjs'),bundle:true,platform:'node',format:'esm',alias:{'@':resolve('src')},plugins:[{name:'fake-data-client',setup(b){b.onResolve({filter:/integrations\/supabase\/client$/},()=>({path:'client',namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},()=>({contents:mock,loader:'js'}));}}]});
const d=await import(pathToFileURL(join(dir,'data.mjs')).href);
after(()=>rm(dir,{recursive:true,force:true}));
const old='2026-01-01T00:00:00Z', now=Date.parse('2026-11-26T16:39:00Z');
const row=(id,x={})=>({id,status:'new',kind:'task',spec:{},result:{},brand_ids:['a'],parent_id:null,created_at:old,updated_at:old,completed_at:null,...x});
test('paginated loader retains more than 1000 ancient open rows and all made-but-unposted files',async()=>{
 d.setRows([...Array.from({length:1205},(_,i)=>row(String(i))),row('files',{status:'done',completed_at:old,spec:{type:'social_post'}}),row('old-closed',{status:'done',completed_at:old}),row('recent-closed',{status:'done',completed_at:'2026-11-25T00:00:00Z'})]);
 const rows=await d.fetchAgentDeskRows(undefined,now);
 assert.equal(rows.length,1207); assert.ok(rows.some(r=>r.id==='1204')); assert.ok(rows.some(r=>r.id==='files')); assert.ok(!rows.some(r=>r.id==='old-closed'));
 assert.ok(d.requests.some(([from])=>from===1000));
});
test('brand filtering keeps only matching work; task history fetch includes old replies beyond a page',async()=>{
 d.setRows([row('a'),row('b',{brand_ids:['b']})]);
 assert.deepEqual((await d.fetchAgentDeskRows(['a'],now)).map(r=>r.id),['a']);
 d.setRows([...Array.from({length:1005},(_,i)=>row(String(i),{kind:'reply',status:'done',spec:{history_only:true},parent_id:'task'})),row('other',{parent_id:'else'})]);
 const history=await d.fetchAgentHistory('task'); assert.equal(history.length,1005); assert.ok(history.every(r=>r.parent_id==='task'));
});
test('a question loads an older closed parent for merging even outside the recent window',async()=>{
 d.setRows([row('q',{kind:'question',status:'needs_owner',parent_id:'parent'}),row('parent',{status:'done',completed_at:old})]);
 assert.deepEqual((await d.fetchAgentDeskRows(undefined,now)).map(r=>r.id),['q','parent']);
});