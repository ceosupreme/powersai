import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const dir=await mkdtemp(resolve('node_modules/.cache/brand-scope-'));
let rows=[],queryData=[],failure=null;
globalThis.__scopeData=()=>queryData;
globalThis.__scopeDb={from:()=>{let filters=[];const q={select:()=>q,order:()=>q,eq:(k,v)=>{filters.push(r=>r[k]===v);return q},is:(k,v)=>{filters.push(r=>(r[k]??null)===v);return q},then:(a,b)=>Promise.resolve({data:rows.filter(r=>filters.every(f=>f(r))),error:failure}).then(a,b)};return q}};
await build({stdin:{contents:`export {useServiceOffers} from './src/hooks/useServiceOffers';export {useCampaignStore} from './src/components/marketing-hub/useCampaignStore';export {brandIdentity} from './src/lib/brandIdentity';export {getRoleHome} from './src/types/roles';`,resolveDir:process.cwd(),loader:'ts'},outfile:join(dir,'app.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/^(?:@tanstack\/react-query|@\/context\/AuthContext|@\/integrations\/supabase\/client)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path.includes('react-query')?`export const useQuery=o=>({...o,data:globalThis.__scopeData(),isLoading:false,error:null});export const useMutation=o=>({mutateAsync:o.mutationFn});export const useQueryClient=()=>({getQueryData:()=>globalThis.__scopeData()});`:a.path.includes('AuthContext')?`export const useAuth=()=>({user:{id:'u1'}});`:`export const supabase=globalThis.__scopeDb;`}))}}]});
const app=await import(pathToFileURL(join(dir,'app.mjs')).href);
after(async()=>{delete globalThis.__scopeData;delete globalThis.__scopeDb;await rm(dir,{recursive:true,force:true})});
test('offers scope all, shared, and each brand independently with separate caches',async()=>{
 rows=[{id:'shared',project_id:null},{id:'a',project_id:'brand-a'},{id:'b',project_id:'brand-b'}];
 for(const [scope,ids] of [[undefined,['shared','a','b']],['shared',['shared']],['brand-a',['a']],['brand-b',['b']]]){
  const q=app.useServiceOffers(scope);assert.deepEqual((await q.queryFn()).map(r=>r.id),ids);assert.equal(q.queryKey[1],scope??'all');
 }
 failure=new Error('Read denied');await assert.rejects(app.useServiceOffers('brand-a').queryFn(),/Read denied/);failure=null;
});
test('campaign selection changes immediately and never mutates the account cache',()=>{
 queryData=[{id:'one',venueId:'brand-a'},{id:'two',venueId:'brand-b'}];
 assert.deepEqual(app.useCampaignStore('brand-a').campaigns.map(c=>c.id),['one']);
 assert.deepEqual(app.useCampaignStore('brand-b').campaigns.map(c=>c.id),['two']);
 assert.equal(app.useCampaignStore(null).campaigns.length,2);assert.equal(queryData.length,2);
});
test('brand initials handle punctuation and Unicode; colors stay fixed after renaming',()=>{
 assert.equal(app.brandIdentity('id1','Temecula & Murrieta News').initials,'TMN');
 assert.equal(app.brandIdentity('id1','So San Diego').initials,'SSD');
 assert.equal(app.brandIdentity('id1','Árbol Café').initials,'ÁC');
 assert.equal(app.brandIdentity('id1','---').initials,'?');
 assert.equal(app.brandIdentity('id1','New name').color,app.brandIdentity('id1','Old name').color);
 const colors=new Set(Array.from({length:100},(_,i)=>app.brandIdentity(String(i),'Brand').color));
 assert.equal(colors.size,6);
 for(const color of colors){const rgb=color.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);const l=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;assert.ok(1.05/(l+.05)>=4.5,`${color} must have readable white text`)}
});
test('owner login opens dashboard while client and staff destinations remain role appropriate',()=>{
 assert.equal(app.getRoleHome('owner'),'/workspace');assert.equal(app.getRoleHome('client'),'/approvals');assert.equal(app.getRoleHome('foh'),'/staff/my-shift');assert.equal(app.getRoleHome(null),'/auth');
});
