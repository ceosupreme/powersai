
# Copy pass ×2 — plan

The full recon from my previous message is still in context, so I'll execute it exactly as inventoried. No logic, schema, routes, or identifiers change.

---

## PART 1 — internal "venue" → "project" (display text only)

Executed in the recon's sequence. Every edit is a string literal inside JSX text, `label`/`title`/`description`/`placeholder` props, toast/error messages, table headers, help-article bodies, or a UI-rendered CSV header. All hooks, types, table/column names, component names, prop names, layout keys, route anchors, and `src/integrations/supabase/types.ts` stay untouched.

### Group A — Portfolio Get Started card
- `src/components/portfolio/PortfolioGetStartedCard.tsx` — lines 31, 45, 69.

### Group B — Onboarding wizard shell + live badge display strings
- `src/components/onboarding/VenueOnboardingWizard.tsx` — audit dialog title/subtitle/step headers/CTA copy; rewrite venue→project in visible strings only. Component/hook/prop names (`VenueOnboardingWizard`, `venueId`, `VenueLiveBadge`, `useVenueOnboardingDetectors`, etc.) unchanged.
- `src/components/onboarding/VenueLiveBadge.tsx` — badge text `"go-live"` currently contains no "venue" word; verify and leave.

### Group C — Portfolio overview
- `src/pages/PortfolioOverview.tsx` — lines 289, 303, 462, 522, 537, 583, 609, 636. `#venue-scorecards` anchor id stays.

### Group D — Workspace / empty states
- `src/pages/Workspace.tsx` — 76, 77. Line 149 KEEP (per §4.1 "client venue" as type name).
- `src/pages/Logs.tsx` — 100, 102.
- `src/pages/Employees.tsx` — 147.
- `src/pages/EmployeeDetail.tsx` — 120.

### Group E — Weekly Review copy
- `src/pages/WeeklyReview.tsx` — 262.
- `src/components/weekly-review/TaskPerformanceCard.tsx` — 97.
- `src/components/weekly-review/EmployeePerformanceCard.tsx` — 129.
- `src/components/weekly-review/MetricDetailContent.tsx` — 98.

### Group F — Insights
- `src/pages/InsightsAudit.tsx` — 363 placeholder, 381 sort header label.
- `src/pages/Insights.tsx` — 357 subhead string.

### Group G — Growth Audit
- `src/components/growth-audit/action-packs/ActionCenterView.tsx` — 76, 77.
- `src/components/growth-audit/history/HistoryView.tsx` — 24, 25, 58.
- `src/components/growth-audit/data-sources/DataSourcesView.tsx` — 96, 107.
- `src/components/growth-audit/onboarding/OnboardingChecklist.tsx` — 30.
- `src/components/growth-audit/reports/ReportBuilderDialog.tsx` — 78.
- `src/components/growth-audit/findings/FindingDetail.tsx` — 273 (per §4.2, rewrite example to `"intentional trade-off"`).

### Group H — EditBarDialog display strings
- `src/components/admin/EditBarDialog.tsx` — 336, 470, 473, 554, 559, 676, 723, 796, 854, 866, 871, 967, 1045 ("Venue ID" → "Project ID" per §4.4), 1082, 1084. Underlying values/IDs/table `venues` unchanged.

### Group I — Admin settings, uploads, panels
- `src/components/admin/SettingsBarsTab.tsx` — 108, 131.
- `src/components/admin/ManualDataUploadTab.tsx` — 312, 602, 647, 649, 802, 804, 947, 952, 957, 1015, 1092, 1103, 1114, 1144.
- `src/components/admin/WebsiteMappingPanel.tsx` — 250, 254, 266.
- `src/components/admin/MapPackKeywordsPanel.tsx` — 138, 423, 427.
- `src/components/admin/GbpPlaceMappingPanel.tsx` — 220, 224, 236.
- `src/components/admin/AISearchQueriesPanel.tsx` — 110, 360.
- `src/components/admin/SculptureSiteMappingPanel.tsx` — 117, 120.
- `src/components/admin/AsanaLogSourcesEditor.tsx` — 71.
- `src/components/admin/BarsTab.tsx` — 433, 452.
- `src/components/admin/AutoApproveSettingsCard.tsx` — 64, 65, 150.
- `src/components/admin/SettingsSyncTab.tsx` — 167, 203, 239, 289, 463, 515, 559.
- `src/components/admin/SettingsComplianceTab.tsx` — 93 (CSV header, user-facing), 125, 158.
- `src/components/admin/DataAuditTab.tsx` — 258, 576, 577.
- Also `src/components/admin/SettingsBarsTab.tsx` toast at line 89 (`'Failed to load projects'` — already says projects; verify no change needed).

### Group J — Portfolio detail tables
- `src/components/portfolio/DailyFlashTable.tsx` — 57.
- `src/components/portfolio/VenueComparisonTable.tsx` — 18 column label (component name stays).

### Group L — Help articles
- `src/config/helpArticles.ts` — rewrite venue→project in bodies at lines 22, 78, 286, 322, 326, 666 where "venue" is generic (KEEP the four "client venue" type-name references per §4.1). Line 317 `tags` array: replace `"venues"` with `"projects"`.

### Group M — Onboarding step titles/descriptions
- `src/config/venueOnboardingSteps.ts` — audit every step entry's `title` and `description` display strings; rewrite venue→project. The `VENUE_ONBOARDING_STEPS` constant name, `venueId` field, `href` builders, and detector table names stay.

### §4 hand cases (final)
1. Workspace.tsx:149 & helpArticles.ts 22/286/322/326 — "client venue" KEPT.
2. FindingDetail.tsx:273 — placeholder rewritten to use "intentional trade-off".
3. `src/components/marketing/**` — OUT OF SCOPE (public copy + ProofBand regex preserved).
4. EditBarDialog.tsx:1045 — "Venue ID" → "Project ID".

### Post-change verification
Run `rg -n "[Vv]enue" src -g '*.tsx'` and confirm every surviving hit is one of:
- A code identifier (component/hook/type/var/prop/table/column name)
- Under `src/components/marketing/`
- A kept "client venue" type reference

Any other survivor is listed in the summary, not silently edited.

---

## PART 2 — homepage install language (three edits)

Only marketing changes permitted this turn. All other `src/components/marketing/**` files untouched.

1. `src/components/marketing/sections/WhatIBuild.tsx` — eyebrow `"WHAT I BUILD"` → `"WHAT GETS INSTALLED"`; H2 → `"The systems I install."`; intro sentence ends `"…or stack them into a full operating system — installed, running, and proven in week one."`.

2. `src/components/marketing/sections/FAQ.tsx` — append one item to the `faqs` array:
   - Q: `"How fast is this really?"`
   - A: `"Live in 48 hours or the setup fee comes back. You'll typically see the first caught lead inside week one."`

3. No other marketing files change. `Proof.tsx`, `ProofBand.tsx`, and the `\d+-venue` regex remain intact.

---

## Guardrails
- Display strings only; zero behavior/logic/schema/route/identifier changes.
- No edits to `src/integrations/supabase/types.ts`.
- `tsgo --noEmit` must pass.
- Post-run rg survivor list reported.

Awaiting go/no-go.
