## Backup & Export — Final Plan (approved scope)

Legacy log row-count check ran: `gm_logs`, `lead_logs`, `shift_logs`, `manager_logs`, `log_entries`, `log_entry_values` — **all 0 rows**. Excluded as agreed.

Additive only. New UI in Settings, client-side CSV/JSON generation through the **authenticated** Supabase client so RLS scopes every export. No schema changes, no new secrets, no edge function, no cron.

### Tables included (live-inventoried columns)

**CRM** — `crm_companies`, `crm_contacts`, `crm_deals`, `crm_interactions`
**Brand Vault** — `brand_kits`, `brand_kit_colors`, `brand_kit_taglines`, `brand_kit_hashtags`, `brand_kit_links`, `brand_kit_assets` *(metadata only: `storage_path`, `file_name`, `asset_type`, `mime_type`, `file_size`, etc. — no binaries)*
**Capture** — `capture_items`
**Inbound Leads** — `inbound_leads`
**Projects** — `venues`, `pillar_templates`, `project_pillar_overrides`, `project_pillar_scores`
**Tasks** — `tasks`, `task_comments`, `task_activity`
**Authored content** — `knowledge_base`, `voice_notes`, `user_preferences`
**Marketing** — `marketing_campaigns`, `marketing_events`, `promotions`

Columns are read live via `select('*')` — CSV headers reflect actual schema at export time, no hardcoded field lists.

### Excluded (and why)
- Derived/generated: `weekly_briefings`, `weekly_core`, `weekly_scorecard` — system regenerates.
- Legacy logs (above) — confirmed empty.
- Asset binaries — metadata + `storage_path` only, per spec.

### UI

New `src/components/admin/SettingsBackupTab.tsx` registered as a new tab in `src/components/admin/SettingsTab.tsx` ("Backup & Export", `Download` icon, `subtab=backup`). Zero existing tabs renamed or moved.

Contents:
- Header + reminder: *"Back up your data regularly, especially before major changes."*
- Brief instructions: choose export → download → save somewhere safe.
- **Per-entity CSV** — grouped list with row count + Download CSV button per table. Per-button loading spinner.
- **Full JSON Backup** — single button, downloads `supreme-team-backup-YYYY-MM-DD.json`:
  ```json
  { "exported_at": "...", "exported_by": "<uid>", "version": 1,
    "tables": { "crm_companies": [...], ... } }
  ```
- Empty tables → valid empty CSV (header row only if known, otherwise empty file) and `[]` in JSON. No crash.

### Implementation

- `src/lib/backupExport.ts` — `BACKUP_TABLES` registry, `fetchTable(name)` via authenticated client, `toCSV(rows)` (RFC 4180 escaping, JSON-stringified objects, alphabetical headers with `id` pinned front and `created_at`/`updated_at` pinned back), `downloadBlob(filename, mime, content)` anchor-tag pattern.
- `src/hooks/useBackupExport.ts` — per-table loading state + toast errors; `exportCsv(name)` and `exportFullJson()`.
- `src/components/admin/SettingsBackupTab.tsx` — UI.
- `src/components/admin/SettingsTab.tsx` — add one `TabsTrigger` + `TabsContent` for `backup`.

### Verification (after build)

1. As admin, export each CSV → headers match `information_schema.columns` for that table; row count matches `select count(*)` under that user's JWT.
2. As a non-admin user, export same CSVs → only their own RLS-permitted rows present; first user's data absent. Cross-checked via psql `count(*) group by created_by`.
3. Empty table case (e.g. fresh user with no `voice_notes`) → header-only CSV, no error, JSON has `[]`.
4. Full JSON parses; every listed table is a key; per-table row counts match individual CSVs.
5. **RLS / network proof**: Open browser Network tab during an export → confirm each PostgREST request carries `Authorization: Bearer <user-jwt>` (NOT the service-role JWT) and `apikey: <publishable>`. Confirm no edge function call exists. State this explicitly in the verification summary.

### Out of scope (explicit)
- No schema/migration changes.
- No edge function (volumes are small; if any future table grows beyond client-side practical limits I'll propose an RLS-respecting edge function then).
- No storage binary export.
- No scheduling/cron.

Ready to build on approval.