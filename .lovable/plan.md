## Sidebar IA rebuild — nav config only

### Route reality check (all confirmed in `src/App.tsx`)

| Nav item | Route | Exists? |
|---|---|---|
| Portfolio | `/portfolio` | ✅ |
| Weekly Review | `/weekly-review` | ✅ |
| Insights | `/insights` | ✅ |
| CRM | `/crm` | ✅ |
| Inbound Leads | `/crm?tab=inbound` | ⚠️ Tab inside `/crm` (already wired with a `TabsTrigger value="inbound"`). Will link to `/crm?tab=inbound` — requires a tiny read of the `tab` query param inside `Crm.tsx` to honor it. **One-line read** of `useSearchParams` to set the default `Tabs` value. This is the only file outside nav-config that gets touched, and it adds no new behavior beyond honoring an existing tab. If you'd rather keep this pass purely nav-only, I'll link to `/crm` and add a memory item to revisit. **Default plan: do the one-line tab-honoring change.** |
| Capture Inbox | `/inbox` | ✅ |
| Brand Vault | `/brand-kit` | ✅ |
| Growth Audit | `/growth-audit` | ✅ |
| Tasks | `/tasks` | ✅ |
| Logs | `/logs` | ✅ |
| Chat | `/chat` | ✅ |
| Help | `/help` | ✅ |
| Launch Checklist | `/launch` | ✅ |
| Settings | `/admin` | ✅ (Settings is the Admin page's primary tab) |

### What changes

**`src/components/layout/AppSidebar.tsx`** — replace the three nav-item arrays (`mainNavItems`, `pillarNavItems`, `toolNavItems`) and the `helpNavItems` array with five labeled groups, rendered with the existing `SidebarGroup` + `SidebarMenu` machinery (Tasks/Chat keep their existing badge wiring):

- **Workspace** — Today (`/workspace`), Portfolio, Weekly Review, Insights
  - (Kept "Today" because `/workspace` is the agency-OS home; not in the user's enumerated list, but removing it would orphan a key page. Flag in plan: if you want it removed, say so.)
- **CRM & Sales** — CRM, Inbound Leads, Capture Inbox
- **Brand & Content** — Brand Vault, Growth Audit
- **Tools** — Tasks, Logs, Chat
- **System** — Help, Launch Checklist, Settings

Removed from sidebar (routes untouched): `/sales` Revenue, `/labor` Labor, `/operations` Delivery, `/guest-experience` Client Experience, `/employees` Team, `/social-media` Social Media, `/marketing` Marketing. Direct URL visits still render their pages.

**`src/components/layout/BottomNav.tsx`** (mobile drawer) — mirror the same 5 groups in the "More" sheet; keep the 4 primary tabs at the bottom but swap the pillar-era ones for: Home (`/workspace`), Weekly, Inbox (`/inbox`), Chat. The "More" drawer holds the rest of the new groups.

**`src/components/layout/PortfolioBottomNav.tsx`** (owner portfolio shell) — same overhaul: Portfolio + Insights primary; the "More" sheet's admin-only block replaced with the new 5-group set.

**`src/pages/Crm.tsx`** — read `?tab=` from `useSearchParams`, pass as `defaultValue` to the existing `<Tabs>` so `/crm?tab=inbound` lands on the Inbound Leads tab. No other behavior changes.

**Not touched:** `ShiftExecutionBottomNav` and `VenueLeadershipBottomNav` are scoped to shift workers / venue leadership (lead/foh/boh) — they're operational, not the agency OS, and don't surface CRM/Brand Vault concepts. Out of scope per "all RELEVANT shells."

### Constraints honored

- Zero route deletions, zero page-component changes (besides the one-line tab read in `Crm.tsx`), zero database changes.
- Page-permission filtering (`canAccessPage`) retained for every entry using the same `pageKey` values currently in use, mapped sensibly (`/crm`, `/inbox`, `/brand-kit`, `/help`, `/launch` already use `pageKey: 'dashboard'` — keep as-is; `/portfolio` uses `'dashboard'`; `/growth-audit` uses `'dashboard'`).
- Help system unaffected: Help / Launch are nav destinations (always-visible), not help affordances; they don't read `helpEnabled`.
- Pre-existing CSS / collapsed-mode styling reused verbatim.

### Verification

1. Sidebar visual inspection — five labeled groups appear in order; Revenue/Labor/Operations/Guest Experience/Marketing/Social Media gone.
2. Click each of the 14 nav links → route mounts (no 404).
3. CRM, Brand Vault, Capture Inbox, Growth Audit, Help, Launch Checklist all reachable from sidebar.
4. Direct-visit `/sales`, `/labor`, `/operations`, `/guest-experience`, `/marketing`, `/social-media` → pages still render.
5. Mobile bottom-nav "More" sheet shows the same 5 groups.
6. `tsc --noEmit` clean. `git diff --name-only` lists only `AppSidebar.tsx`, `BottomNav.tsx`, `PortfolioBottomNav.tsx`, `Crm.tsx`.

### Two decisions to confirm

- **Keep `/workspace` ("Today") in Workspace group?** It's the natural agency-OS home; you didn't name it, but dropping it leaves it orphan-only-via-URL. Default: keep.
- **`/crm?tab=inbound` requires a one-line `useSearchParams` read in `Crm.tsx`.** Default: do it (purely additive, no behavior change for `/crm` visitors). Otherwise link Inbound Leads to plain `/crm`.
