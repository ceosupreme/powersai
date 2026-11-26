import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE agent_handoffs(id int,status text,completed_at timestamptz,updated_at timestamptz);`);
await db.exec(await readFile('drizzle/migrations/0013_agent_handoff_completion_stamp.sql','utf8'));
after(()=>db.close());
test('direct done insert stamps completion; explicit completion stays unchanged and open insert stays null',async()=>{
  const rows=(await db.query(`INSERT INTO agent_handoffs VALUES(1,'done',null,now()),(2,'done','2026-11-25T00:00:00Z',now()),(3,'new',null,now()) RETURNING *`)).rows;
  assert.ok(rows[0].completed_at); assert.equal(new Date(rows[1].completed_at).toISOString(),'2026-11-25T00:00:00.000Z'); assert.equal(rows[2].completed_at,null);
});
test('backfill retains historical updated time as completion and later updates do not restamp',async()=>{
  await db.exec(`ALTER TABLE agent_handoffs DISABLE TRIGGER agent_handoffs_b_completion_stamp; INSERT INTO agent_handoffs VALUES(4,'done',null,'2026-10-01T00:00:00Z'); ALTER TABLE agent_handoffs ENABLE TRIGGER agent_handoffs_b_completion_stamp; UPDATE agent_handoffs SET completed_at=updated_at WHERE status='done' AND completed_at IS NULL; UPDATE agent_handoffs SET status='done' WHERE id=4;`);
  const {rows}=await db.query('SELECT completed_at FROM agent_handoffs WHERE id=4');
  assert.equal(new Date(rows[0].completed_at).toISOString(),'2026-10-01T00:00:00.000Z');
});