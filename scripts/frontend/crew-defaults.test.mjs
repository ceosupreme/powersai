import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
after(() => db.close());
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
  CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  CREATE TABLE public.venues(id uuid PRIMARY KEY);
  CREATE TABLE public.crews(key text PRIMARY KEY, updated_at timestamptz);
  CREATE TABLE public.crew_runs(id serial PRIMARY KEY,crew_key text, details jsonb);
  INSERT INTO public.crews(key) VALUES ('coastal_blog'),('coastal_city_fill'),('local_news_brief'),('weekly_hq_run'),('backlog_builder'),('setup_crew'),('muse_social_posts'),('threads_sweep'),('life_pulse_collector');
`);
await db.exec(await readFile('drizzle/migrations/0008_crew_default_brand_attribution.sql', 'utf8'));
test('approved defaults contain exactly the named brands; multi-brand crews remain unset', async () => {
  const { rows } = await db.query('SELECT key,default_brand_ids FROM crews');
  const defaults = new Map(rows.map((r) => [r.key, r.default_brand_ids]));
  for (const key of ['coastal_blog','coastal_city_fill']) assert.deepEqual(defaults.get(key), ['fa710cf6-09fc-45ad-97da-fa50dceec37d']);
  assert.deepEqual(defaults.get('local_news_brief'), ['624a963f-f27a-4c12-a643-55b204acfde9','40666050-63c0-4928-9063-b664b1e61089']);
  for (const key of ['weekly_hq_run','backlog_builder','setup_crew','muse_social_posts','threads_sweep']) assert.equal(defaults.get(key), null);
});
test('insert fills only a missing brands key, preserving details and explicit arrays including empty', async () => {
  const { rows } = await db.query(`INSERT INTO crew_runs(crew_key,details) VALUES
    ('coastal_blog',null),('coastal_blog','{"note":"keep"}'),
    ('coastal_blog','{"brands":[]}'),('coastal_blog','{"brands":["custom"]}'),
    ('life_pulse_collector','{"note":"personal"}') RETURNING details`);
  assert.deepEqual(rows[0].details, { brands: ['fa710cf6-09fc-45ad-97da-fa50dceec37d'] });
  assert.deepEqual(rows[1].details, { note: 'keep', brands: ['fa710cf6-09fc-45ad-97da-fa50dceec37d'] });
  assert.deepEqual(rows[2].details, { brands: [] });
  assert.deepEqual(rows[3].details, { brands: ['custom'] });
  assert.deepEqual(rows[4].details, { note: 'personal' });
});
test('default editor RPC rejects non-admin callers', async () => {
  await assert.rejects(db.query("SELECT hq_set_crew_default_brands('coastal_blog',null)"), /Admin access required/);
});