# Restore admin login for ceosupreme@gmail.com

## What's happening

The login page and backend auth are working. Between 19:06 and 19:08 UTC today there were five sign-in attempts from supremeteammedia.com, and every one came back as "invalid login credentials" — the email/password pair didn't match. Your account itself is healthy:

- `ceosupreme@gmail.com` exists, is confirmed, has the `admin` role, and last signed in successfully on July 24.

So this is a forgotten/mistyped password, not a broken feature. Nothing in the app needs a code change.

Side note on two lookalike accounts that exist but were never confirmed and have never signed in: `ceosupreme@live.com` and `mightysupremeteam@gmail.ciom` (typo'd domain). If you were typing one of those by mistake, that alone would explain the failures. They can be cleaned up separately — not part of this fix.

## The fix

1. Set a new password directly on the `ceosupreme@gmail.com` account in the backend, and give it to you in chat.
2. You sign in at the login page with that password.
3. Immediately change it to something only you know (via the login page's Forgot password flow, or the account settings if you prefer).

No emails involved, so nothing can get stuck in a spam folder or hit a send limit.

## Technical detail

- Single data update against the auth user record for `ceosupreme@gmail.com`, setting `encrypted_password` to a bcrypt hash of the new password via `crypt(..., gen_salt('bf'))`. Nothing else on the row changes — the confirmed timestamp, id, and role assignment stay as they are.
- No schema migration, no RLS change, no source file edits.
- After the update I'll verify the account still reads as confirmed with the `admin` role.

## Not in scope

- Deleting the unconfirmed lookalike accounts.
- Any change to the login page, `AuthContext`, or the password-reset page.
