## GAUNTLET FIX — GBP snapshot insert + map-pack public_audit trigger

### Confirmed root causes (from direct DB + code reads this pass)

**Fix 1 — CHECK constraint, not a stringification-only issue.**
- `gbp_snapshots_scope_check` currently allows only `('daily_basics','weekly_full','manual')` — plain CHECK, not a Postgres enum.
- `run-public-audit` invokes `gbp-sync-weekly` with `scope_override: 'public_lean'` (line 289).
- `gbp-sync-weekly` writes `scope: 'public_lean'` directly into `gbp_snapshots` (lines 89, 117), and `_shared/gbp-fetch.ts` already declares `FetchScope = 'daily_basics' | 'weekly_full' | 'public_lean'` with a real field mask for `public_lean`.
- Result: every public-audit GBP snapshot insert throws `23514 new row for relation "gbp_snapshots" violates check constraint "gbp_snapshots_scope_check"`. The `throw insErr` in gbp-sync-weekly catches that PostgrestError and the catch's `String(e)` renders it as `"[object Object]"` in `sync_runs.error_message`.
- `source_check` allows `('automated','manual')` — writer sends `'automated'`, so that CHECK is fine.
- `source_kind` has no CHECK — free text, fine.

**Fix 2 — trigger_source coercion.**
- `run-public-audit` invokes `map-pack-run` with `trigger_source: 'public_audit'`.
- `map-pack-run` line 144 coerces anything not in `('cron','admin')` to `'manual'`, then requires a user bearer with a valid `sub`. The service-role JWT has no `sub` → 401 → "Map-pack ranking check degraded" and zero rows in `map_pack_run_log` / `map_pack_snapshots`.
- Explicit single-venue path (line 195-197): when `venue_id` is passed, the query is `venues.eq('id', venueId)` with NO `is_prospect_shell` filter — so single-venue `public_audit` calls against a prospect shell will fetch the venue correctly once auth passes.

### Changes

**A. Migration — extend `gbp_snapshots_scope_check`**

Drop and recreate the CHECK to add `'public_lean'` (plain text CHECK, single migration):

```sql
ALTER TABLE public.gbp_snapshots DROP CONSTRAINT gbp_snapshots_scope_check;
ALTER TABLE public.gbp_snapshots ADD CONSTRAINT gbp_snapshots_scope_check
  CHECK (scope = ANY (ARRAY['daily_basics','weekly_full','manual','public_lean']));
```

Values added: `'public_lean'` (matches `FetchScope` union already used in code). No other CHECKs need touching.

**B. `supabase/functions/gbp-sync-weekly/index.ts` — permanent error hygiene**

Line 140-141 catch: replace `msg = e instanceof Error ? e.message : String(e)` with a richer serializer so PostgrestError / plain objects render usefully:

```ts
const msg = e instanceof Error
  ? e.message
  : (e as any)?.message ?? (typeof e === 'object' ? JSON.stringify(e) : String(e));
```

Kept as permanent hygiene, not just a debugging aid. Applied only in this one catch — no other behavior changes in the file.

**C. `supabase/functions/map-pack-run/index.ts` — first-class `public_audit` trigger source**

- Line 144 replace the two-way ternary with an explicit allow-list:
  ```ts
  const rawTrigger = typeof body.trigger_source === 'string' ? body.trigger_source : 'manual';
  const triggerSource: string = ['cron','admin','manual','public_audit'].includes(rawTrigger)
    ? rawTrigger : 'manual';
  ```
- Auth branch (line 148): treat `public_audit` like `cron` — no user bearer required, service-role only. Explicitly verify the incoming `Authorization: Bearer <SERVICE_ROLE>` matches `SUPABASE_SERVICE_ROLE_KEY` to prevent anon callers from spoofing the flag. If it doesn't match, return 401.
- Rate limit (line 168): `public_audit` is exempt (same as `cron`). Manual admin retries stay rate-limited.
- Provenance: rows in `map_pack_run_log` and `map_pack_snapshots.trigger_source` (via run log) will record the truthful value `'public_audit'` — we're not masquerading as `cron`.
- Shell handling: single-venue path is unchanged and never applies the shell filter, so the prospect shell created by `run-public-audit` will resolve.

**No other files changed.** No schema changes beyond the one CHECK. No RLS changes. `pageKey` unaffected. Client display copy unaffected.

### Verification (I run these after build)

1. Create a NEW business via `/free-audit` — not "harbor town pub" (its recent request would serve the cached degraded state inside the 7-day dedupe window). I'll use a distinct name + website so `run-public-audit` opens a fresh `public_audit_requests` row and prospect shell.
2. Poll `public_audit_requests.status_detail` until `status='complete'`; then query:
   - `sync_runs` for the new shell venue — expect the GBP row `status='completed'` with a real `records_created=1` (not `[object Object]`).
   - `gbp_snapshots` for the shell — expect one row with `scope='public_lean'` and a populated `primary_category` / `raw`.
   - `map_pack_run_log` for `trigger_source='public_audit'` and `map_pack_snapshots` for at least one keyword row (the one-shot keyword inserted by `run-public-audit`).
3. Report back with the exact `sync_runs.status` + `error_message`, the snapshot row's `primary_category`, and the map-pack row count. If any stage still degrades, quote the real error surfaced by the hygiene fix and stop — no further speculative patches.

### Guardrails (restated)

- Additive; no route or pageKey changes; no fake trigger provenance; theater flow / redaction / unlock unchanged; tsc clean.
