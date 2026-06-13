---
name: Employee hire_date mapping
description: 7shifts users.created is PRIMARY source of employee_profiles.hire_date; Toast createdDate is FALLBACK
type: feature
---
**hire_date population rules** (employee_profiles):
- **PRIMARY:** 7shifts `users.created` → mapped in `sync-seven-shifts` (always overwrites)
- **FALLBACK:** Toast `employees.createdDate` → mapped in `sync-toast-employees`, but only writes when:
  - existing `hire_date` is null, OR
  - Toast's `createdDate` is earlier than the existing value (rare protection against forward-shift)

**Caveat (accepted imprecision):** Both fields are account-creation timestamps, NOT actual hire dates. Long-tenured employees whose accounts were created after their physical start date will display slightly short tenure. Acceptable trade-off vs prior 0% coverage. Manual override capability is intentionally NOT built — defer until specific employees are flagged with obviously wrong dates.

**UI rendering** (`src/components/employees/tabs/OverviewTab.tsx`):
- `hire_date` present → render tenure via `tenureLabel(tenure_days)` (days/months/years bands)
- `hire_date` null but first-shift exists → "since first shift" label
- Both null → "—"

**Idempotency:** Both syncs are idempotent; `last_synced_at` updates every run. Re-running sync-toast-employees never regresses a 7shifts-set hire_date.
