## Step 1 — Foundation Prep (additive only)

### 1. Pillar template — CONFIRM ONLY (no seed needed)
`pillar_templates` already has the four `content_channel` rows. No insert required.

| pillar_key | pillar_label | weight | sort_order | data_source |
|---|---|---|---|---|
| output | Output | 25 | 0 | null |
| audience | Audience | 25 | 1 | null |
| engagement | Engagement | 25 | 2 | null |
| monetization | Monetization | 25 | 3 | null |

Convention matches other project types (even 25% weights, null `data_source` for non-client templates — only `client` has wired data sources). Nothing to change.

### 2. Add 7 nullable columns to `venues` (additive ALTER, no defaults, no NOT NULL, no rewrite)

```sql
ALTER TABLE public.venues
  ADD COLUMN youtube_channel_url    text,
  ADD COLUMN youtube_channel_id     text,
  ADD COLUMN niche                  text,
  ADD COLUMN subscriber_count       bigint,
  ADD COLUMN monetization_model     text,
  ADD COLUMN weekly_production_goal integer,
  ADD COLUMN content_status         text;
```

Decisions:
- `subscriber_count` → **bigint** (YouTube subs can exceed 2.1B integer ceiling at the network/aggregate level; cheap insurance).
- `content_status` → **text**, not a new enum. Reason: values are still soft (active/dormant/launching/paused TBD) and a project-wide enum is harder to evolve. Easy to migrate to an enum later once values stabilize.
- All nullable, no defaults → existing 8 venue rows untouched, columns simply become `NULL`.
- No RLS / policy / grant changes needed (column-level additions; existing table policies cover them).

### 3. Out of scope (explicitly NOT in this step)
- No new tables (`content_items`, `channel_revenue`, `affiliate_programs`, `channel_products` deferred).
- No UI, no edge functions, no automations.
- No channel-creation flow; no seeding of an actual `content_channel` venue row.
- No changes to other project types' pillar templates.
- No changes to existing venues columns (bar-era columns left as-is, nullable).

### Verification after migration
1. `SELECT column_name FROM information_schema.columns WHERE table_name='venues' AND column_name IN (...)` returns all 7.
2. `SELECT count(*) FROM venues` unchanged; spot-check one existing row → 7 new columns are NULL, all prior fields intact.
3. `pillar_templates` unchanged (still 19 rows; content_channel still 4).
4. Supabase types regenerate; `tsc` clean.
