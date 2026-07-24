## Diagnosis

**Handler flow in `src/pages/ResetPassword.tsx` (`handleSubmit` + companion `useEffect`):**

```ts
const { error: updErr } = await supabase.auth.updateUser({ password });
if (updErr) { setSubmitting(false); setError(...); return; }
toast.success('Password set. Welcome in.');
try { await refreshRoles(); } catch {}
pendingNavRef.current = true;    // <-- ref, not state
// then a separate useEffect is supposed to navigate when currentRole settles
```

The companion effect is keyed on `[currentRole, roleLoading, navigate]`. It only fires when one of those changes. But by the time the user submits the form on the reset screen, `RoleContext.loadRoles` has already run once for this session (the recovery link established the session on mount, and `RoleProvider`'s effect already resolved `currentRole` and set `isLoading=false`). So after `refreshRoles()`:

- `currentRole` is the same value it already was → no change.
- `roleLoading` goes true→false→true→false during `loadRoles`, but only if the state values actually differ per set call; in practice both start and end at `false` for an already-loaded role, so React bails on identical values.
- Setting `pendingNavRef.current = true` does NOT trigger a re-render, so the effect never re-evaluates.

Result: `submitting` stays `true` forever, the 2s fallback timer inside the effect is never scheduled, and no navigation fires. The password update itself resolved successfully (why sign-in with the new password works, and why "Back to sign in" lands them in-app — the recovery session is fully valid).

**Auth event sequence actually observed:** recovery link → GoTrue exchanges the token, `onAuthStateChange` fires `SIGNED_IN` on mount (before submit), `getSession()` returns a valid session, `RoleProvider` loads role. On `updateUser`, GoTrue fires `USER_UPDATED` (and often another `TOKEN_REFRESHED`) — neither changes `currentRole`, so the gated effect is a dead-end.

No console errors during repro; the promise resolves, nothing throws.

## Fix

Rewrite the post-save path in `ResetPassword.tsx` to navigate imperatively instead of via a ref-gated effect:

1. On `updateUser` success:
   - `setSubmitting(false)` and flip a small local `saved` flag so the button briefly shows "Password set" (checkmark) instead of the spinner.
   - Kick off `refreshRoles()` but do NOT await it as a gate. Use `Promise.race([refreshRoles(), timeout(1500)])` so a slow/no-op refresh can't stall UX.
   - Read the freshest role from context (`currentRole` closure) OR re-read once via `supabase.from('user_venue_roles')…` fallback if `currentRole` is still null, then call `navigate(getRoleHome(role), { replace: true })`.
   - Hard timeout guard: a `setTimeout(..., 5000)` scheduled the moment `updateUser` resolves that force-navigates to `getRoleHome(currentRole)` (client → `/approvals`, unknown → `/auth`) if we somehow haven't navigated yet. Cleared on unmount.

2. On `updateUser` error: existing path — `setSubmitting(false)`, show `error`. No change.

3. Delete `pendingNavRef` and the companion `useEffect` that waited on `currentRole`/`roleLoading` — replaced by the imperative path above.

4. Keep `toast.success('Password set. Welcome in.')` for user feedback.

No changes outside `src/pages/ResetPassword.tsx`. `getRoleHome` (shared helper) and `RoleContext.refreshRoles` untouched.

## Verify

Full flow, phone-width viewport:
1. `/auth` → "Forgot password" → enter email → toast confirms email sent.
2. Click link in email → lands on `/reset-password` → "Verifying your link…" → password form.
3. Enter new password + confirm → click Update → button shows brief "Password set" state → auto-redirect to role home (owner → `/portfolio`, gm → `/weekly-review`, client → `/approvals`, etc.) within 1-2s.
4. Sign out, sign back in with new password → succeeds. Report each step's observed behavior with a screenshot.
5. Error case: submit mismatched passwords → error text visible, spinner stopped, no navigation.

## Guardrails

- Additive; no schema, no auth config, no shared context changes.
- No infinite state in either branch (success or error).
- 5s hard timeout ensures worst case is a redirect, never a stuck spinner.
- tsc clean.
