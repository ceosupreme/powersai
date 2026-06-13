## Problem

The Admin page (`/admin`) already renders a Settings tab (`SettingsTab`). The reason you can't reach it is the sidebar user menu only shows the **Settings** link when `role === 'admin'`:

```tsx
// src/components/layout/AppSidebar.tsx
{role === 'admin' && (
  <DropdownMenuItem asChild>
    <Link to="/admin">Settings</Link>
  </DropdownMenuItem>
)}
```

The remix seed gave your account the `owner` role only — not `admin` — so that menu item (and the whole `/admin` entry point) is hidden. The session replay confirms the dropdown shows just **Notifications** and **Sign out**.

## Fix

Add an `admin` row in `user_roles` for `ceosupreme@gmail.com` (keeping the existing `owner` row). That's all that's needed — the Settings menu item will appear, `/admin` will open, and the Settings tab is already wired up inside it.

### Migration (idempotent)

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'ceosupreme@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

No frontend code changes. After the migration, reload the app and open the user menu in the sidebar — **Settings** will be visible and route to the Admin panel's Settings tab.
