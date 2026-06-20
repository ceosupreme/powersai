
# Mobile Optimization Pass

Goal: make every major surface usable and polished on phones (≤428px wide), matching the quality of desktop. Additive CSS/layout work only — no business logic, scoring, RLS, or integration changes.

## Scope (audit + fix)

Working through the app in this order, verifying each at 375px and 428px widths:

1. **Global shells & navigation**
   - `layout/` components (AppLayout, sidebar, top bar, bottom nav)
   - Confirm bottom nav clearance (`pb-24`) on every scroll container
   - Hamburger/drawer behavior, safe-area insets, sticky headers not overlapping content
   - `StaffLayout`, owner layout, public layout (QualifyLanding)

2. **Tables → mobile cards**
   Many tables overflow on phones. Convert or wrap with horizontal scroll + sticky first column where a card view isn't appropriate:
   - `employees/EmployeeListTable`
   - `portfolio/VenueComparisonTable`, `DailyFlashTable`
   - `revenue/RevenueTable`
   - `social/WeeklyPerformanceTable`
   - `crm/PipelineBoard` (horizontal swipe lanes)
   - `content/ContentKanbanView` (swipeable columns) / fallback to `ContentListView` on mobile
   - CRM `InboundLeadsPanel`, `CompanyDetail`

3. **Dashboards & charts**
   - `Dashboard`, `PortfolioOverview`, `WeeklyReview`, `Insights`, `GrowthAudit`, `Sales`, `Labor`, `GuestExperience`, `Operations`, `Marketing`, `SocialMedia`, `ChannelRevenue`, `ContentPipeline`
   - Stack grid columns to 1 col under `md`, shrink chart heights, ensure `ResponsiveContainer` parents have explicit height, truncate long legends, wrap KPI rows

4. **Dialogs / sheets**
   - Audit all shadcn `Dialog` usages that are form-heavy (`RevenueEntryDialog`, `ContentItemDialog`, `ProductDialog`, `ServiceOfferDialog`, `AffiliateProgramDialog`, `CreateChannelDialog`, `StartDMDialog`, EditBar dialogs, admin override panels)
   - Switch to bottom `Sheet` on mobile OR add `max-h-[90vh] overflow-y-auto`, full-width buttons, larger tap targets

5. **Lead Qualifier (Build 1)** — critical, it's the public-facing demo
   - `QualifyLanding` hero + tabs stack cleanly
   - `VoiceQualifier` mic button ≥56px, transcript scrolls, mute/end buttons reachable one-handed
   - `ChatQualifier` input docked above keyboard (`pb-[env(safe-area-inset-bottom)]`), messages scroll
   - `FormQualifier` single column, large inputs (`h-12`), submit sticky

6. **Chat & Inbox**
   - `ChatLayout`: hide channel list behind sheet on mobile, show single-pane
   - `MessageInput` keyboard avoidance
   - `QuickCaptureButton` FAB position above bottom nav

7. **Admin & Settings**
   - `Admin` page tab list horizontal scroll
   - Settings tabs (Pillars, LeakVectors, QualifierFields, Help) — tab triggers wrap, panels single-column, table-like rows become cards

8. **Help/Onboarding**
   - `SetupWizard` modal fits viewport, step nav buttons full-width on mobile
   - `HelpCenter` article list/detail single-column
   - `SuggestionsPanel` cards stack
   - `LaunchChecklist` page comfortable on mobile

9. **Tap targets & typography**
   - Icon-only buttons → `min-h-11 min-w-11`
   - Reduce hero/H1 sizes on mobile (`text-3xl md:text-5xl`)
   - Ensure no horizontal page scroll (audit `min-w-*`, fixed widths, long unbroken strings → `break-words`)

## Approach

- Reuse `use-mobile` hook for branching where layout fundamentally differs (table↔card, dialog↔sheet, multi-pane↔single-pane).
- Prefer pure Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) for everything else — no new abstractions.
- No new dependencies. No design-token changes beyond what's already in `index.css` / `tailwind.config.ts`.
- Verify by driving Playwright at 390×844 against `/`, `/portfolio`, `/weekly-review`, `/insights`, `/crm`, `/qualify/home-services`, `/content-pipeline`, `/channel-revenue`, `/chat`, `/admin`, `/help` — screenshot each, fix issues found, re-screenshot.

## Out of scope

- Scoring engine, RLS, edge functions, integrations, DB schema
- Desktop redesign — only mobile parity adjustments
- New features

## Deliverable

Each page above renders without horizontal scroll, with reachable controls, readable type, and working primary flows on a 390px viewport. `tsc` clean.
