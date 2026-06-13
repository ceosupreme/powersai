---
name: PostgREST NOT IN NULL gotcha
description: Avoid .not(col,'in',...) on nullable columns; SQL NOT IN drops NULL rows. Use .or('col.is.null,and(col.neq.a,col.neq.b)') instead.
type: constraint
---

PostgREST `.not('col', 'in', '(a,b)')` compiles to SQL `NOT IN`, which evaluates to **NULL** (treated as false / filtered out) for any row where `col IS NULL`. On a nullable column this silently drops every NULL row.

**Always** exclude values from a nullable column with a NULL-safe `.or(...)`:

```ts
query.or('col.is.null,and(col.neq.a,col.neq.b)')
```

**Why:** On 2026-05-05, `fetchInsightCardsFromSupabase` used `.not('source_metric','in','(missed_meal,late_meal)')`. All `daily_insights_v2` rows have `source_metric IS NULL`, so every log-driven insight disappeared from the /insights feed across all 8 venues. Fixed by switching to the `.or()` form above.
