## Diagnosis (confirmed by reading the files)

`supabase/config.toml` sets `verify_jwt = true` for both `duplicate-project-type` and `delete-project-type`. That makes the gateway reject the browser's `OPTIONS` preflight (sent without an `Authorization` header), so the fetch fails before the function runs — surfacing as "Failed to send".

Already true in code, so no change needed for step 2:
- `delete-project-type/index.ts` line 17 returns `200 ok` with CORS headers on `OPTIONS`, before any auth logic.
- `duplicate-project-type/index.ts` line 24 does the same.
- Both use the project-standard header set: `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`.

The in-code auth chain is also already in place in both: missing/malformed bearer → 401 `missing_auth`; `getClaims` failure or no `sub` → 401 `unauthorized`; `has_role(admin)` false → 403 `forbidden`. `delete-project-type` additionally refuses `id === 'client'` with 400 `system_default_type`, and the `trg_protect_client_project_type` trigger blocks it at the database level regardless.

## Change

**`supabase/config.toml`** — flip both blocks to `verify_jwt = false`, matching the project standard for functions that validate the JWT in code:

```toml
[functions.duplicate-project-type]
verify_jwt = false

[functions.delete-project-type]
verify_jwt = false
```

No other project-level settings touched. No changes to either function body — the CORS preflight handling and the auth chain stay exactly as built.

## Verification (through the deployed functions, not SQL)

1. Confirm preflight: `OPTIONS` to both function URLs returns 200 with the CORS headers.
2. Confirm the auth chain still fires on `POST`:
   - no `Authorization` header → 401
   - garbage bearer token → 401
   - valid non-admin token → 403
3. Round trip as admin:
   - `POST duplicate-project-type` with `{ source_id: 'home_services', new_id: 'dupe_test', new_label: 'Dupe Test', is_vertical: true }` → quote the raw response and its four copied counts (`pillar_templates`, `project_type_leak_vectors`, `project_type_qualifier_fields`, `project_type_qualifier_config`).
   - Confirm `dupe_test` appears in the live project-type select.
   - `POST delete-project-type` with `{ id: 'dupe_test' }` → quote the raw response, then confirm zero residue across `project_types` and the four config tables.
4. Also call `delete-project-type` with `{ id: 'client' }` once to prove the permanent refusal path returns `system_default_type` rather than deleting.

Both raw responses go in the build summary, closing the untested-deployed-path deviation from the last build. `tsgo` clean.

## Notes

- Security posture is unchanged: gateway verification was redundant, and removing it does not widen access because every path past `OPTIONS` still requires a resolvable admin caller.
- No schema, RLS, or UI changes.
