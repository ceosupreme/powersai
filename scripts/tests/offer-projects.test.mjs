import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const visible='10000000-0000-4000-8000-000000000001',hidden='10000000-0000-4000-8000-000000000002';
await db.exec(`CREATE ROLE offer_user; CREATE TABLE venues(id uuid PRIMARY KEY); CREATE TABLE service_offers(id int PRIMARY KEY,name text); INSERT INTO venues VALUES('${visible}'),('${hidden}'); INSERT INTO service_offers VALUES(1,'Existing offer');`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261102020000_hq_offer_projects.sql',import.meta.url),'utf8'));
test.after(()=>db.close());
test('existing offers survive as unassigned; assignments can change without copying the offer',async()=>{
 assert.equal((await db.query('SELECT project_id FROM service_offers WHERE id=1')).rows[0].project_id,null);
 await db.query('UPDATE service_offers SET project_id=$1 WHERE id=1',[visible]);
 assert.equal((await db.query('SELECT project_id FROM service_offers WHERE id=1')).rows[0].project_id,visible);
 assert.equal((await db.query('SELECT count(*)::int n FROM service_offers')).rows[0].n,1);
});
test('assignment respects project RLS for insert and update',async()=>{
 await db.exec(`ALTER TABLE venues ENABLE ROW LEVEL SECURITY; CREATE POLICY visible_project ON venues FOR SELECT TO offer_user USING (id='${visible}'); GRANT USAGE ON SCHEMA public TO offer_user; GRANT SELECT ON venues TO offer_user; GRANT SELECT,INSERT,UPDATE ON service_offers TO offer_user; SET ROLE offer_user;`);
 try {
  await db.query('INSERT INTO service_offers(id,name,project_id) VALUES(2,$1,$2)',['Allowed',visible]);
  await assert.rejects(db.query('INSERT INTO service_offers(id,name,project_id) VALUES(3,$1,$2)',['Hidden',hidden]),/not available/);
  await assert.rejects(db.query('UPDATE service_offers SET project_id=$1 WHERE id=2',[hidden]),/not available/);
  assert.equal((await db.query('SELECT project_id FROM service_offers WHERE id=2')).rows[0].project_id,visible);
 } finally {await db.exec('RESET ROLE');}
});
test('removing a project preserves its offer in the unassigned library',async()=>{
 await db.query('DELETE FROM venues WHERE id=$1',[visible]);
 const rows=(await db.query('SELECT project_id FROM service_offers')).rows;
 assert.equal(rows.length,2);assert.ok(rows.every(r=>r.project_id===null));
});
