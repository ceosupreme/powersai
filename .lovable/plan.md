## Plan: Wire venue_contacts into deep-dive solution mode

### 1. New shared tool: `get_venue_contacts`

File: `supabase/functions/_shared/ai-tools.ts`

Append a read-only tool to `buildTools()` that queries the existing `public.venue_contacts` table:

- Scope: `venue_id = scope.venueId` (uuid).
- Filter: `is_active = true`.
- Select: `name, role_label, phone, email, note`.
- Return: `{ venue: scope.venueName, contacts: [...] }` (each contact includes all selected fields).
- On error: `{ error: error.message }`.

This tool is automatically available to `followup` mode and `ask-barpulse` because it lives in the shared registry. No changes to those surfaces.

### 2. Extend solution-mode system prompt

File: `supabase/functions/insight-deep-dive/index.ts`

In the `solution` mode system prompt (the `sys` variable inside the `if (mode === "solution")` block), append the following guidance paragraph at the end, just before the existing `Output exactly:` section:

```
You may call get_venue_contacts to see this venue's saved contacts (vendors, trades, reps, etc.). If a contact clearly fits the issue, name them and their contact method in your recommendation (e.g. "call your plumber, Mike — 555-1234"). Only name a contact that genuinely matches the problem — do not attach an unrelated contact just because one exists. If there are no contacts, or none fit, give the same recommendation without a name and do NOT mention that contacts are missing or suggest adding any. Contacts are a bonus when present, never a dependency.
```

Leave the `initial` mode and `followup` mode prompts completely untouched.

### Out of scope (not touched)
- Initial mode, followup mode
- Contacts admin UI (`EditBarDialog.tsx`)
- `venue_contacts` schema / migration
- Insight cards, scoring, sync, frontend modal

### Verification
After deployment, a "solution" deep-dive request for an insight at a venue with active contacts should include `get_venue_contacts` in the available tool set. The model can optionally surface a matching contact in its `## What To Do` bullets.
