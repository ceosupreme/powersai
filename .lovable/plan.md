## Problem
The profit leak audit website input rejects plain domain names because it uses `type="url"`. Users must type the full `https://…` prefix. The placeholder also implies a full URL is required.

## Root cause (confirmed by exploration)
- `src/pages/FreeAudit.tsx` line 126: `<input type="url" …>` blocks browser submission for values like `acmeplumbing.com`.
- `supabase/functions/run-public-audit/index.ts` line 48: Zod schema is `z.string().trim().max(500).optional().nullable()` — no protocol requirement.
- `supabase/functions/website-resolve-url/index.ts` line 46: backend already auto-prepends `https://` when missing.

## Fix
1. **Frontend input** — change `type="url"` to `type="text"` in `FreeAudit.tsx`.
2. **Placeholder** — change from `https://acmeplumbing.com` to `acmeplumbing.com`.
3. **Light normalization** — in `usePublicAudit.ts` `run()`, strip leading/trailing whitespace and auto-prepend `https://` if no protocol is present before sending to the edge function. This makes the intent explicit and matches what the backend already does defensively.
4. **Optional hint text** — add a small `text-xs` line under the input: "Just the domain is fine — we’ll resolve the rest."

## Files changed
- `src/pages/FreeAudit.tsx`
- `src/hooks/usePublicAudit.ts`

## Out of scope
- No edge function changes needed (backend already normalizes).
- No new dependencies.
- No validation logic changes beyond the frontend normalization.