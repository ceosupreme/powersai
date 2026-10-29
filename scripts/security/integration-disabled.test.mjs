// Real Supabase SDK with a mocked transport: no provider/network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const sdk=import.meta.resolve('@supabase/supabase-js');
registerHooks({resolve(specifier,context,next){return next(specifier==='https://esm.sh/@supabase/supabase-js@2'?sdk:specifier,context);}});
globalThis.Deno={env:{get:name=>({SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-value'})[name]}};
let scenario,clock,reads,moduleId=0;
const originalNow=Date.now;
globalThis.fetch=async(input)=>{
 if(!String(input).startsWith('https://db.example.test/rest/v1/app_config'))throw new Error('Unexpected mock request; network disabled');
 reads++;
 if(scenario==='error')return Response.json({message:'synthetic query failure'},{status:503});
 if(scenario==='missing')return Response.json(null);
 if(scenario==='malformed')return Response.json({value:['toast',42]});
 return Response.json({value:scenario==='enabled'?[]:['toast']});
};
const fresh=()=>import(`../../supabase/functions/_shared/integration-disabled.ts?fixture=${++moduleId}`);
test.beforeEach(()=>{scenario='error';clock=1_900_000_000_000;reads=0;Date.now=()=>clock;});
test.afterEach(()=>{Date.now=originalNow;});
test('query failure with no cache stops provider work with an explicit retryable503',async()=>{
 const gate=await fresh();const result=await gate.guardIntegration('toast',{});
 assert.equal(result.status,503);assert.equal((await result.json()).error,'integration_configuration_unavailable');assert.equal(reads,1);
 await assert.rejects(()=>gate.isDisabled('asana'),{name:'IntegrationConfigUnavailable'});
});
test('missing or malformed kill-switch configuration never means all integrations enabled',async()=>{
 for(const value of ['missing','malformed']){scenario=value;const gate=await fresh();assert.equal((await gate.guardIntegration('asana',{})).status,503);}
});
test('previously disabled cached provider remains off when the refresh fails',async()=>{
 scenario='disabled';const gate=await fresh();assert.equal((await gate.guardIntegration('toast',{})).status,200);
 scenario='error';clock+=60_001;const result=await gate.guardIntegration('toast',{});
 assert.equal(result.status,200);assert.equal((await result.json()).disabled,true);assert.equal(reads,2);
});
test('stale previously enabled state cannot reopen a provider during a refresh failure',async()=>{
 scenario='enabled';const gate=await fresh();assert.equal(await gate.guardIntegration('asana',{}),null);
 scenario='error';clock+=60_001;assert.equal((await gate.guardIntegration('asana',{})).status,503);
});
test('fresh successful configuration preserves enabled providers and uses a short cache',async()=>{
 scenario='disabled';const gate=await fresh();assert.equal(await gate.guardIntegration('asana',{}),null);
 assert.equal((await gate.guardIntegration('toast',{})).status,200);assert.equal(reads,1);
});
