import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileAvailable, FOLDER, READY, APPROVAL, ADMIN_ROOTS, normalizeName } from '../../supabase/functions/brand-drive/safety';
const files: Record<string, any> = {
 a: {id:'a',name:'Alpha',mimeType:FOLDER}, b:{id:'b',name:'Beta',mimeType:FOLDER},
 other:{id:'other',name:'Other',mimeType:FOLDER}, secret:{id:'secret',name:'file',parents:['b']},
 outside:{id:'outside',name:'file',parents:['other']}, one:{id:'one',name:'Social',parents:['a'],mimeType:FOLDER},
 two:{id:'two',name:'2026-11-27',parents:['one'],mimeType:FOLDER}, deep:{id:'deep',name:'image',parents:['two']},
 [READY]:{id:READY,name:'READY TO POST',mimeType:FOLDER},day:{id:'day',name:'2026-11-27 Friday',mimeType:FOLDER,parents:[READY]},
 slice:{id:'slice',name:'A Squared Media',mimeType:FOLDER,parents:['day']},image:{id:'image',name:'image',parents:['slice']},
 [APPROVAL]:{id:APPROVAL,name:'FOR YOUR APPROVAL',mimeType:FOLDER},doc:{id:'doc',name:'A Squared Media - approval',parents:[APPROVAL]},
 [ADMIN_ROOTS[4]]:{id:ADMIN_ROOTS[4],name:'Generation Library',mimeType:FOLDER},
 shortcut:{id:'shortcut',name:'shortcut',mimeType:'application/vnd.google-apps.shortcut',parents:['a']},
};
const get = async (id:string) => files[id] ?? {id,name:id};
const helper = {admin:false,brands:[{projectId:'alpha',name:'A Squared Studios',roots:[files.a],aliases:['A Squared Studios','A Squared Media']}]};
describe('Drive per-file safety', () => {
 it('refuses a helper a file in another brand root',async()=>assert.equal(await fileAvailable('secret',helper,get),false));
 it('refuses files outside every allowed root, even to an admin',async()=>assert.equal(await fileAvailable('outside',{...helper,admin:true},get),false));
 it('refuses the Generation Library to helpers',async()=>assert.equal(await fileAvailable(ADMIN_ROOTS[4],helper,get),false));
 it('allows the Generation Library to admins',async()=>assert.equal(await fileAvailable(ADMIN_ROOTS[4],{...helper,admin:true},get),true));
 it('allows a file deep inside the assigned brand root',async()=>assert.equal(await fileAvailable('deep',helper,get),true));
 it('allows the saved-folder alias in ready day slices',async()=>assert.equal(await fileAvailable('image',helper,get),true));
 it('refuses helpers the whole shared ready folder',async()=>assert.equal(await fileAvailable(READY,helper,get),false));
 it('allows only matching approval titles',async()=>assert.equal(await fileAvailable('doc',helper,get),true));
 it('refuses shortcuts rather than following an unchecked target',async()=>assert.equal(await fileAvailable('shortcut',helper,get),false));
 it('normalizes case, ampersands and parentheses',()=>assert.equal(normalizeName('VINE & Pulse (winery services)'),normalizeName('vine and pulse')));
});
