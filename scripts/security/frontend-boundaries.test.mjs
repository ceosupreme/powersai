// Production realtime subscription + real QueryClient; fixture SDK, no network.
import test,{after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {QueryClient} from '@tanstack/react-query';
const root=resolve(import.meta.dirname,'../..');
const listeners=new Map();let resolveMessage,signal,lookups=0;
globalThis.__hqBoundarySupabase={
 channel(name){const channel={on(_type,_filter,callback){listeners.set(name,callback);return channel;},subscribe(){return channel;}};return channel;},
 removeChannel(){return Promise.resolve('ok');},
 from(){lookups++;const query={select(){return query;},eq(){return query;},abortSignal(value){signal=value;return query;},single(){return new Promise(resolve=>{resolveMessage=resolve;});}};return query;},
};
await mkdir(join(root,'node_modules/.cache'),{recursive:true});
const temp=await mkdtemp(join(root,'node_modules/.cache/hq-boundary-'));
const output=join(temp,'messages.mjs');
await build({stdin:{contents:"export {subscribeToMessages,messageQueryKey} from './src/hooks/useMessages'; export {integrationIsDisabled} from './src/hooks/useIntegrationDisabled';",resolveDir:root,loader:'ts'},outfile:output,bundle:true,
 platform:'node',format:'esm',packages:'external',tsconfig:join(root,'tsconfig.app.json'),plugins:[{name:'fixtures',setup(builder){
 builder.onResolve({filter:/integrations\/supabase\/client$/},()=>({path:'supabase',namespace:'fixture'}));
 builder.onResolve({filter:/context\/AuthContext$/},()=>({path:'auth',namespace:'fixture'}));
 builder.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='supabase'?'export const supabase=globalThis.__hqBoundarySupabase;':'export const useAuth=()=>({user:null});',loader:'js'}));
 }}]});
const {subscribeToMessages,messageQueryKey,integrationIsDisabled}=await import(pathToFileURL(output).href);
const qc=new QueryClient();
beforeEach(()=>{qc.clear();listeners.clear();resolveMessage=null;signal=null;lookups=0;});
after(async()=>{qc.clear();delete globalThis.__hqBoundarySupabase;await rm(temp,{recursive:true,force:true});});
test('an old realtime lookup cannot repopulate the session cache after cleanup',async()=>{
 const stop=subscribeToMessages(qc,'private-channel','old-user');
 const callback=listeners.get('messages:old-user:private-channel');
 const pending=callback({eventType:'INSERT',new:{id:'old-private-message'}});
 assert.equal(lookups,1);
 qc.clear();stop();
 assert.equal(signal.aborted,true);
 // Simulate a transport that still resolves after cancellation.
 resolveMessage({data:{id:'old-private-message',content:'Old private content'}});await pending;
 assert.equal(qc.getQueryCache().getAll().length,0);
});
test('a new user of the same channel has a separate cache and old UPDATE/DELETE callbacks are inert',async()=>{
 const oldKey=messageQueryKey('shared-channel','old-user'),newKey=messageQueryKey('shared-channel','new-user');
 assert.notDeepEqual(oldKey,newKey);
 const stop=subscribeToMessages(qc,'shared-channel','old-user');
 const old=listeners.get('messages:old-user:shared-channel');stop();
 qc.setQueryData(newKey,[{id:'message',content:'Current user copy'}]);
 await old({eventType:'UPDATE',new:{id:'message',content:'Old callback'}});
 await old({eventType:'DELETE',old:{id:'message'}});
 assert.deepEqual(qc.getQueryData(newKey),[{id:'message',content:'Current user copy'}]);
 assert.equal(qc.getQueryData(oldKey),undefined);
});
test('active realtime INSERT/UPDATE/DELETE still updates its identity-scoped cache',async()=>{
 const stop=subscribeToMessages(qc,'channel','user');const callback=listeners.get('messages:user:channel');
 const pending=callback({eventType:'INSERT',new:{id:'message'}});resolveMessage({data:{id:'message',content:'New'}});await pending;
 const key=messageQueryKey('channel','user');assert.equal(qc.getQueryData(key)[0].content,'New');
 await callback({eventType:'UPDATE',new:{id:'message',content:'Edited'}});assert.equal(qc.getQueryData(key)[0].content,'Edited');
 await callback({eventType:'DELETE',old:{id:'message'}});assert.deepEqual(qc.getQueryData(key),[]);stop();
});

test('existing integration flags remain closed while loading or unavailable, including stale enabled cache',()=>{
 assert.equal(integrationIsDisabled('openai_voice',undefined),true);
 assert.equal(integrationIsDisabled('openai_voice',[],true),true);
 assert.equal(integrationIsDisabled('openai_voice',['openai_voice']),true);
 assert.equal(integrationIsDisabled('openai_voice',[]),false);
});
