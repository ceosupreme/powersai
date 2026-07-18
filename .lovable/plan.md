## Stranded-Send Sweeper

### Diagnosis (verified)
- `automation-send-approved` claims via `UPDATE ... status='sending', send_attempted_at=now() WHERE id=? AND status='approved'` (verified line 30 of `automation-send-approved/index.ts`).
- If the function dies after that claim, the row stays `status='sending'` with no result write.
- `automation-queue-sweeper` (verified) only picks `status='approved'` rows — stranded `sending` rows are never revisited.
- **`send_attempted_at` is stamped at claim time** and is the reliable age column. **No schema change needed.**

### Sweeper being extended
`supabase/functions/automation-queue-sweeper/index.ts` — same function, one added pass before the existing approved-dispatch loop.

### Age column
`send_attempted_at` (stamped at atomic claim). Threshold: **10 minutes**.

### Reap logic (atomic, race-safe)
Mirror the existing claim discipline — a single conditional UPDATE with `RETURNING`, so a live send finishing at the same instant cannot be overwritten:

```sql
UPDATE automation_message_queue
SET status = 'failed',
    send_result = jsonb_build_object(
      'ok', false,
      'provider', 'unknown',
      'error', 'stranded — delivery unconfirmed; verify before retry'
    )
WHERE status = 'sending'
  AND send_attempted_at IS NOT NULL
  AND send_attempted_at < now() - interval '10 minutes'
RETURNING id, project_id, channel;
```

For each returned row, insert into `automation_send_log`:
```
{ queue_id, project_id, channel, provider: 'unknown', ok: false, error: 'stranded' }
```

Because the WHERE clause is guarded by `status='sending'` and the age condition, a concurrent successful write (which flips `status` to `sent` or `failed`) removes the row from the reap set atomically — no double-write.

### Double-send honesty
Error text stored on the row: **`"stranded — delivery unconfirmed; verify before retry"`**. Surfaces in the existing Inbox failed view via the existing Retry action — no new UI. Retry stays manual.

### Cron cadence
`automation-queue-sweeper` already runs periodically. **Keep its existing cadence** (every ~5 min) — the new reap pass just runs in the same invocation before the approved-dispatch loop. No new cron job.

### Guardrails
- Additive: claim path, status vocabulary, adapter, and Inbox UI untouched.
- One file edited: `supabase/functions/automation-queue-sweeper/index.ts`.
- No schema change (`send_attempted_at` suffices).
- tsc clean.
