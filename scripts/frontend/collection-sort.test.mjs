import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const dir = await mkdtemp(join(tmpdir(), 'hq-sort-'));
const file = join(dir, 'sort.mjs');
await build({entryPoints:[resolve('src/lib/collectionSort.ts')],outfile:file,bundle:true,platform:'node',format:'esm'});
const {sortCollection} = await import(pathToFileURL(file).href);
after(() => rm(dir,{recursive:true,force:true}));
const ids = rows => rows.map(r=>r.id);
test('due dates put overdue work first and missing or invalid dates last',()=>{
 const rows=[{id:'c',title:'C',due_date:null},{id:'b',title:'B',due_date:'2026-11-08'},{id:'a',title:'A',due_date:'2026-10-01'},{id:'d',title:'D',due_date:'invalid'}];
 const before=structuredClone(rows);
 assert.deepEqual(ids(sortCollection(rows,'due')),['a','b','c','d']);
 assert.deepEqual(rows,before,'sorting must not mutate the shared query cache');
});
test('zero is a real price or score, unknown values remain last',()=>{
 const rows=[{id:'u',title:'Unknown',value:null,quality_score:null},{id:'z',title:'Zero',value:0,quality_score:0},{id:'h',title:'High',value:200,quality_score:90}];
 for(const key of ['value','quality']) assert.deepEqual(ids(sortCollection(rows,key)),['h','z','u']);
});
test('oldest and newest reverse known dates, never unknown dates',()=>{
 const rows=[{id:'b',title:'B',created_at:'2026-11-01T10:00:00Z'},{id:'a',title:'A',created_at:'2026-10-01T10:00:00Z'},{id:'u',title:'Unknown',created_at:null}];
 assert.deepEqual(ids(sortCollection(rows,'oldest')),['a','b','u']);
 assert.deepEqual(ids(sortCollection(rows,'newest')),['b','a','u']);
});
test('natural title order and stable IDs resolve equal values',()=>{
 const rows=[{id:'z',title:'Episode 10'},{id:'b',title:'episode 2'},{id:'a',title:'Episode 2'}];
 assert.deepEqual(ids(sortCollection(rows,'name')),['a','b','z']);
 assert.deepEqual(ids(sortCollection(rows,'quality')),['a','b','z']);
});
