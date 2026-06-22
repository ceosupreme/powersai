# Nav Rebuild Plan

Navigation/routing only. No feature page logic, RLS, integrations, or Build 0–E behavior changes.

## 1. Make AppSidebar the single source of truth

`AppSidebar.tsx` already has the data-driven `navGroups: NavGroup[]` array + `canAccessPage(pageKey)` filtering. We replace the inline `<aside>` blocks in `PortfolioLayout.tsx` and `VenueLeadershipLayout.tsx` with `AppSidebar` while preserving each layout's non-sidebar chrome (`GlobalHeader`, `FloatingAskButton`, mobile bottom navs, preview banner).

Approach (cleanest): keep `PortfolioLayout` and `VenueLeadershipLayout` as the layout shells (they still own header + mobile bottom nav + role-specific behaviors), but swap their desktop `<aside>` for a shared `<AppShellSidebar>` that wraps `SidebarProvider` + `AppSidebar`. Mobile bottom navs and `ShiftExecutionLayout` are untouched.

- `PortfolioLayout.tsx`: delete the inline `<aside>` + Preview Role dropdown + profile dropdown (AppSidebar already renders both); wrap return in `<SidebarProvider>`; render `<AppSidebar />` for desktop.
- `VenueLeadershipLayout.tsx`: same swap. Keep the `+ Daily Log` quick action and "Back to Portfolio" affordance by either (a) adding them as a small extra footer slot in `AppSidebar` gated by role/flag, or (b) keeping them as a floating element inside `VenueLeadershipLayout`'s main. Pick (b) — minimal change to AppSidebar, keeps GM-specific UI scoped.
- `MainLayout.tsx`: delete (unused; only existed to host AppSidebar). Confirm no imports remain via rg before removal.
- `ShiftExecutionLayout.tsx`: unchanged.

## 2. New `navGroups` structure (data-driven)

Rewrite the `navGroups` array in `AppSidebar.tsx` to:

| Group | Items (label → path, pageKey, icon) |
|---|---|
| WORKSPACE | Portfolio→`/portfolio` (dashboard, LayoutDashboard); Weekly Review→`/weekly-review` (weekly_review, CalendarCheck); Insights→`/insights` (insights, Lightbulb); Team→`/employees` (employees, Users) |
| CLIENTS & LEADS | CRM→`/crm` (crm, Briefcase); Inbound Leads→`/crm?tab=inbound` (crm, InboxIcon); Capture Inbox→`/inbox` (capture_inbox, InboxIcon); Automation Inbox→`/automations/inbox` (automation_inbox, InboxIcon); Reactivation→`/automations/reactivation` (reactivation, Megaphone); Recovery Reports→`/automations/recovery-reports` (recovery_reports, FileText) |
| GROWTH & MARKETING | Growth Audit→`/growth-audit` (growth_audit, Activity); Marketing Hub→`/marketing-hub` (marketing_hub, Megaphone); Content→`/content` (content_pipeline, Film); Channel Revenue→`/revenue` (revenue, DollarSign) |
| BRAND & ASSETS | Brand Kit→`/brand-kit` (brand_kit, Palette); Offers→`/offers` (offers, Tag); Products→`/products` (products, Package); Affiliate Programs→`/affiliate-programs` (affiliate_programs, Link2) |
| TOOLS | Tasks→`/tasks` (tasks, CheckSquare, badge); Logs→`/logs` (logs, ClipboardList); Chat→`/chat` (chat, MessageCircle, badge) |
| SYSTEM (bottom) | Help→`/help` (dashboard, HelpCircle); Launch Checklist→`/launch` (dashboard, Rocket); Admin Panel→`/admin` (admin-gated, Settings) |

Notes:
- Social Media: drop from nav (route is a redirect to `/marketing-hub`; redundant). The redirect itself stays in `App.tsx`.
- Inbound Leads stays as `/crm?tab=inbound` (cleanest: no new route needed; `Crm.tsx` already supports the tab param).
- Admin link: gated by `isAdmin` (not just pageKey) inside the SYSTEM group's render — mirrors current Admin-only behavior.
- New `PageKey` values (`automation_inbox`, `reactivation`, `recovery_reports`) — verify whether these already exist in `src/types/permissions.ts`. If missing, add them and map their routes in `ROUTE_TO_PAGE_KEY`. For any pageKey that doesn't have a per-role default yet, fall back to `'dashboard'` so admin/owner see them but we don't accidentally widen access for gm. (Will check during implementation; if defaults must be expanded for owner+gm we'll add minimal entries — no role widening for other roles.)

## 3. Retire stale PILLARS global nav

- Remove the PILLARS group (`/sales`, `/labor`, `/operations`, `/guest-experience`) from rendered nav. Achieved automatically since the new `navGroups` doesn't include them.
- Pages and routes remain (per-project pillars + deep links continue to work).
- Leave `showPillarNav` in `ownerMode.ts` as-is (route-level visibility helper still consumed elsewhere); the global pillar nav simply isn't rendered anymore.

## 4. Promote Growth Audit + Marketing Hub out of Admin

In `src/pages/Admin.tsx`:
- Remove the `growth-audit` and `marketing-hub` `TabsTrigger` + `TabsContent` entries.
- Remove the now-unused `GrowthAuditLaunchTab` and `MarketingHubLaunchTab` imports from `Admin.tsx`. Keep the component files (they may be reused by the main pages or admins). Quick rg to confirm no other behavior is lost; if either tab contains setup-only framing not in the page version, port any unique setup blocks into the main page or note the gap.
- Keep `users`, `permissions`, `settings`, `pillars` tabs.

## 5. Cleanup

- Delete `src/components/layout/MainLayout.tsx` (unused after AppSidebar adoption — verify with rg).
- Inline sidebar JSX removed from `PortfolioLayout` and `VenueLeadershipLayout`.
- `SidebarLink` / `SidebarSection` components: keep if still used by `ShiftExecutionLayout` or staff layouts; otherwise leave in place (no harm, may be used later). Don't delete unless rg shows zero references.

## Files touched

- `src/components/layout/AppSidebar.tsx` — rewrite `navGroups`; add bottom-pinned SYSTEM group with admin-gated Admin link.
- `src/components/layout/PortfolioLayout.tsx` — replace inline sidebar with `SidebarProvider` + `AppSidebar`.
- `src/components/layout/VenueLeadershipLayout.tsx` — same swap; keep GM quick actions in the main column.
- `src/pages/Admin.tsx` — remove growth-audit + marketing-hub tabs.
- `src/types/permissions.ts` + `ROUTE_TO_PAGE_KEY` — add any missing pageKeys for new nav items (if not already present).
- `src/components/layout/MainLayout.tsx` — delete (if rg confirms unused).

## Verification

1. tsc clean; preview boots.
2. As admin/owner: one sidebar with the 6 groups in order; every listed feature reachable from nav. No PILLARS group.
3. As gm: WORKSPACE (Portfolio hidden by route gate is fine — `/portfolio` is owner-only; gm sees Weekly Review, Insights, Team), TOOLS, plus any items their pageKey grants. No PILLARS group. GM quick "+ Daily Log" still present.
4. As staff/shift: `ShiftExecutionLayout` unchanged.
5. `/admin` no longer shows Growth Audit / Marketing Hub tabs; `/growth-audit` and `/marketing-hub` pages still render normally; `/marketing` and `/social-media` redirects still resolve to `/marketing-hub`.
6. Deep links to all listed routes still work; role gates on `ProtectedRoute` unchanged.
