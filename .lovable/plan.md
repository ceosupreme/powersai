## Audit deliverable — Supreme Team Media OS conversion

No code or schema is changed in this step. Sections 1–4 below are the requested deliverables.

---

## Task 1 — Conversion Map

Domain mapping (used throughout):

| BarPulse concept | Supreme Team Media OS concept |
|---|---|
| Venue / Bar | **Project** (clients, internal brands, campaigns, products, service offers, app builds) |
| Employee / Staff | **Person / Contact** |
| Shift Lead / FOH / BOH | **Project Roles** (Lead / Producer / Contributor — same RBAC mechanics) |
| Toast/7shifts daily ops | **Project Activity & Time Logs** |
| Asana GM/Lead logs | **Project Status Updates** |
| Insights / Briefings | **Growth Insights / Weekly Briefings** (kept, repurposed) |
| Marketing Hub | **Marketing Hub** (kept, repurposed for client + internal campaigns) |
| Growth Audit | **Growth Audit** (kept; works for any client web/GBP/AI presence) |

### Routes

| Route → Page | Current purpose | STM OS version | Action | Notes |
|---|---|---|---|---|
| `/login`, `/auth` → Login/Auth | Sign-in | STM OS sign-in | **Keep** | Add public marketing routes alongside (`/`, `/services`, `/work`, `/contact`); these become the agency website. |
| `/` (root) → redirect `/portfolio` | Owner landing | Public marketing home (signed-out) → Portfolio (signed-in) | **Repurpose** | Split: public agency homepage vs. authed portfolio. |
| `/portfolio` → PortfolioOverview | Multi-venue owner dashboard | **All-Projects Portfolio** | **Rename** | Daily Flash table becomes Project Pulse; OwnerBarDetail becomes Project Drill-Down. |
| `/dashboard` → Dashboard | Single-venue weekly scorecard | **Project Dashboard** | **Rename** | Hero score, pillar cards, alerts block all reusable. |
| `/workspace` → Workspace | Generic command center | **Today / My Workspace** | **Keep** | Personal todo + briefing landing. |
| `/weekly-review` → WeeklyReview | GM weekly review | **Project Weekly Review** | **Rename** | Wins/Watchouts / Actions / Meeting mode all reusable. |
| `/sales` → Sales | Revenue pillar | **Revenue** (per project) | **Repurpose** | For client/service projects: client revenue, MRR, deal value. For internal brands: product revenue. Toast charts hidden when no POS source. |
| `/labor` → Labor | FOH/BOH labor costs | **Resourcing / Time Allocation** | **Repurpose** | Replace FOH/BOH with role buckets; time tracking sourced from manual entry or future integration. |
| `/operations` → Operations | KDS, inventory variance, drink mix | **Delivery / Production** | **Repurpose** | KDS / Drink Mix cards hide when no Sculpture/Toast source. Inventory variance → "Scope variance / Burn rate." |
| `/guest-experience` → GuestExperience | Reviews + secret shop | **Client Experience** | **Repurpose** | Online reviews still apply for any client w/ a GBP. Secret shop becomes "QA audits." |
| `/insights` → Insights | AI insight feed | **Growth Insights** | **Rename** | Pillar filters stay; feed-visibility logic stays. |
| `/insights/audit` → InsightsAudit | Suppressed-insight diagnostics | Same | **Keep** | Admin-only diagnostic — bar-agnostic. |
| `/marketing` → Marketing | Marketing pillar view | **Marketing Campaigns** | **Rename** | Events/Promotions/Social cards reusable for any project. |
| `/marketing-hub` → MarketingHub | Campaign hub w/ Asana sync | **Campaign Hub** | **Keep** | Adapters (Asana / mock) still apply; expand for internal projects. |
| `/social-media` → SocialMedia | Social analytics | **Social Performance** | **Keep** | Reusable for any client/brand. |
| `/growth-audit` → GrowthAudit | SEO/GBP/AI-presence audit | **Growth Audit** | **Keep** | Already client-agnostic and a flagship STM service. |
| `/admin` → Admin (tabs: Users / Permissions / Settings / Growth Audit / Marketing Hub) | Admin console | **Admin Console** | **Keep** | All tabs reusable; UI labels swap venue→project. |
| `/admin/sync-health` → AdminSyncHealth | Pipeline diagnostics | Same | **Keep** | Hide rows for disabled integrations in Phase 1. |
| `/employees` → Employees | Roster | **People / Team / Contacts** | **Rename** | KPI tiles & preset chips reusable; rebrand "No Clockout"/"Needs Attention" to engagement-agnostic flags. |
| `/employees/:id` → EmployeeDetail | Per-employee profile | **Person Detail** | **Rename** | Tabs (Overview, Compliance, Performance, Activity) all reusable; Compliance tab demoted to "Compliance & Notes." |
| `/tasks` → Tasks | Mgmt task board | **Tasks** | **Keep** | Filters, batch actions, drawer all reusable across projects. |
| `/logs` → Logs | Shift/GM log list | **Project Status Updates** | **Rename** | Daily reports per the brief; bar-only types (shift_lead_log) renamed; structure reused. |
| `/logs/new`, `/logs/:id`, `/logs/:id/edit` → LogNew/LogDetail | Create/edit/view logs | **Update Composer / Detail** | **Keep** | Dynamic form (`form_fields`, `log_type_fields`) lets us add STM update types without schema change. |
| `/logs/interview/:id` → LogInterview | Voice interview capture | **Voice Update** | **Keep** | Powered by OpenAI Realtime — gate behind Phase-2 toggle (see Task 2). |
| `/chat` → Chat | Team chat | **Project Chat** | **Keep** | Channel = project. |
| `/staff/*` (My Shift, Lead Shift Dashboard, Tasks, Chat, Logs) | Shift execution shell for FOH/BOH/Lead | **Contributor / Producer Workspace** | **Repurpose** | Strip clock-in/clock-out & meal-break gating from `ClockOutModal`; keep task list + log composer + chat. Department toggle becomes role-toggle (Lead/Producer/Contributor). |
| `/preview/:role` → RolePreview | Owner impersonation | Same | **Keep** | Role enum gets new STM labels. |

### Component modules (grouped)

| Directory | STM OS treatment | Action |
|---|---|---|
| `components/admin/` (Bars/Users/Settings/Permissions/Adapters/GBP/Map Pack/AI Search/Website mappings) | Whole tab system stays. `BarsTab`/`EditBarDialog`/`SettingsBarsTab` rename to `ProjectsTab`/`EditProjectDialog`. Toast/7shifts venue config cards hidden behind "POS source" feature flag. | **Rename + Repurpose** |
| `components/auth/` | RBAC unchanged. | Keep |
| `components/charts/` (SalesCharts, LaborCharts, OperationsCharts, GuestExperienceCharts, MarketingCharts) | All metric inputs go null-safe; bar-specific titles ("FOH Labor", "BOH Labor") swap to "Producer Hours / Contributor Hours". | Repurpose |
| `components/chat/` | Unchanged. | Keep |
| `components/competitive/` (Toast peer comparison, Sales Mix, Menu Performance, Top Sellers, Top Categories) | All hard-coupled to Toast. Hide entirely in Phase 1; revive only for projects with explicit POS source. | Repurpose (hidden by default) |
| `components/dashboard/` (Score hero, pillar cards, Monday briefing, trend charts) | Reusable; relabel "Venue" → "Project." | Rename |
| `components/employees/` (List, KPI tiles, preset chips, wins/concerns, charts, tabs) | Reusable. "No Clockout" preset becomes "Inactive" preset; compliance constants moved behind feature flag. | Rename + Repurpose |
| `components/growth-audit/` (overview, findings, action packs, context calendar, data sources, reports, history, onboarding) | Already STM-ready; flagship module. | Keep |
| `components/guest-experience/` (OnlineReviews, SecretShop) | OnlineReviews kept; SecretShop demoted to "QA audits" panel. | Rename |
| `components/insights/`, `components/insights-v2/` | Reusable end-to-end. | Keep |
| `components/layout/` (PortfolioLayout, VenueLeadershipLayout, ShiftExecutionLayout, GlobalHeader, bottom navs) | Three shells repurposed: Agency Portfolio / Project Workspace / Contributor. Brand string "Bar Pulse" → "Supreme Team OS." | Rename |
| `components/marketing/`, `components/marketing-hub/` (Asana + mock adapters) | Whole module reused. | Keep |
| `components/operations/` (DrinkMixCard, InventoryVarianceCard) | Bar-specific cards. Hide by default; show only on projects flagged "hospitality." | Repurpose |
| `components/pillar/` | Reusable scaffold. | Keep |
| `components/portfolio/` (DailyFlashTable, VenueComparison, OwnerBarDetail) | Rename to Project Pulse / Project Comparison / Project Drill-Down. Columns stay. | Rename |
| `components/shared/` (AskBarPulseWidget, FloatingAskButton, MetricCard, LogForm, ToolEvidence, voice components, ToastLiveWidget, SecretShopCard, etc.) | Mostly reusable. `AskBarPulseWidget` → `AskSupremeWidget`. `ToastLiveWidget` hidden when POS not configured. | Rename + Repurpose |
| `components/social/` | Reusable for any project with a social presence. | Keep |
| `components/staff/` (StaffLayout, StaffShiftBar, ClockOutModal, StaffTopBar, NotificationPanel, tabs) | Clock-in/out + department concepts dropped; tasks/chat/logs tabs kept as Contributor workspace. | Repurpose |
| `components/tasks/` | Reusable. | Keep |
| `components/weekly-review/` (Score hero, Pillar KPI snapshot, Briefing, Wins/Watchouts, Actions, Meeting mode, Employee performance) | Reusable; "Employee Performance / Violations" cards labeled "Team Performance / Risks." | Rename |
| **NEW** `components/public/` | Public agency site (home, services, work, contact, lead form). | New |

### Risks (highlighted)
- **Brand string sweep:** "Bar Pulse", "BarPulse", and "venue/bar" appear in many places (`LoginBrandPanel`, sidebars, AskBarPulseWidget, FloatingAskButton, copy in WeeklyReview/MeetingMode, growth-audit mocks). Sweep needs a single mapping pass — risky if half-done.
- **`bar_id` vs `venue_id` duality** in tables and components: do NOT rename columns now (frozen — see Task 3); only relabel UI strings. Any "venue/bar/project" string change must respect the data layer staying `venue_id`/`bar_id`.
- **Owner-mode flags** (`src/config/ownerMode.ts`) hide tools/marketing/pillar sections. Admin bypass already lands; non-admin STM roles need their own opening of these flags.

---

## Task 2 — External integrations to disable in Phase 1

All edge functions calling external APIs are listed below with disable strategy and the UI element that would break.

### Disable plan
- **Cron jobs:** unschedule via `cron.unschedule(jobname)` migration (additive — does not change schema).
- **Edge functions:** keep deployed, but each one wraps its entry in a `INTEGRATIONS_DISABLED` feature-flag check (read from `app_config`) that returns `{ disabled: true }` quickly. Calling UI handles `disabled: true` by hiding the panel or showing a "Coming soon" empty-state.
- **`AskBarPulse` (now `AskSupreme`):** keeps working — it uses Lovable AI Gateway (no external secret). Same for `insight-deep-dive`, `generate-monday-briefing`, `generate-daily-insights`, `metric-interpretation`, `growth-audit-refresh` (AI-only, no third-party).
- **OpenAI Realtime / Whisper:** disable in Phase 1 (voice features hidden); re-enable when STM owner re-authorizes.

### Toast (sales + labor + KDS + employees)
| Function | Disable | UI that breaks |
|---|---|---|
| `sync-toast-metrics`, `sync-toast-employees`, `sync-toast-time-entries` | Yes (cron + buttons) | **SettingsSyncTab** Toast buttons → hide; **Dashboard** Toast widgets → empty state |
| `parse-toast-zip`, `parse-toast-csv`, `parse-kds-csv` | Yes (manual uploads) | **ManualDataUploadTab** Toast/KDS tabs → hide |
| `toast-data` (cached proxy) | Disable cron; let it return empty arrays | **`useToastData.ts`** consumers (Dashboard, ToastLiveWidget, CompetitiveAnalysis) — must render null safely |
| `discover-toast-restaurants`, `backfill-bev-sales`, `test-toast-*` | Yes | Admin-only; no UI impact |

### 7shifts
| Function | Disable | UI that breaks |
|---|---|---|
| `seven-shifts-proxy` | Yes | **`useShiftDashboardData`**, **`useStaffMyShiftData`** → Lead Shift Dashboard and Staff My Shift go empty (those pages are repurposed/hidden in Phase 1 anyway) |
| `sync-seven-shifts` | Yes (button) | SettingsSyncTab "7shifts Roster" → hide |
| `parse-labor-zip` | Yes (button) | ManualDataUploadTab "Labor ZIP" → hide |
| `compute-weekly-scores` | **Partial** — keep computing scores from `weekly_core`/`daily_metrics` but skip the 7shifts `hours_and_wages` step | Scorecard still renders; labor pillar score appears as `—` when no labor source |
| `test-engage-dump` | Yes | None |

### Asana
| Function | Disable | UI that breaks |
|---|---|---|
| `asana-proxy`, `sync-asana-logs`, `sync-asana-gm-tasks`, `sync-asana-task-status`, `alert-sync-failures`, `test-asana-connection` | Yes (cron + buttons) | Admin BarsTab connection test → hide; GM/Lead log feed dries up (logs become app-entered only) |
| `marketing-asana-push`, `marketing-asana-pull`, `marketing-asana-comment`, `marketing-asana-setup`, `cron-marketing-asana-pull` | Yes | **Marketing Hub adapter dropdown** falls back to `mockAdapter`. Setup button hidden. |

### Sculpture Hospitality (inventory)
| Function | Disable | UI that breaks |
|---|---|---|
| `detect-sculpture-report`, `parse-inventory-csv`, `parse-inventory-csv-v2`, `parse-drink-mix-csv`, `parse-summary-variance-csv`, `parse-cost-fluctuation-csv`, `parse-intelipar-csv` | Yes | **SculptureUploadTab** entirely → hide tab in admin; Operations DrinkMix/InventoryVariance cards → hide |

### Google Places / GBP / Website / Map Pack / PageSpeed
| Function | Disable | UI that breaks |
|---|---|---|
| `gbp-sync-daily`, `gbp-sync-weekly`, `gbp-resolve-place`, `gbp-admin-upsert-mapping`, `sync-google-ratings`, `search-google-place` | **Optional disable** — these power the Growth Audit which is an STM service. Recommend **KEEP ENABLED** once `GOOGLE_PLACES_API_KEY` is set (already a secret). | If disabled: GbpLiveExtras / GoogleRatingOverrideCard / EditBarDialog Google search → hide |
| `map-pack-run`, `map-pack-cron`, `map-pack-keywords-upsert`, `map-pack-suggest-keywords` | Same — recommend **KEEP** | If disabled: MapPackKeywordsPanel, MapPackLiveExtras → hide |
| `website-resolve-url`, `website-crawl-weekly`, `website-crawl-dispatcher`, `website-pagespeed-daily` | Recommend **KEEP** (no third-party key needed beyond the crawl target itself) | If disabled: WebsiteMappingPanel, WebsiteLiveExtras → hide |

### AI (Lovable Gateway / Anthropic / OpenAI / Perplexity)
| Function | Disable | UI that breaks |
|---|---|---|
| `ask-barpulse`, `insight-deep-dive`, `generate-daily-insights`, `generate-monday-briefing`, `generate-employee-performance-brief`, `generate-task-performance-brief`, `metric-interpretation`, `classify-insight-sentiment`, `extract-review-themes`, `parse-logs`, `context-programming-suggest`, `context-sources-pull`, `growth-audit-action-pack`, `growth-audit-refresh`, `growth-audit-cron`, `marketing-campaign-analyze`, `marketing-auto-analyze`, `growth-score-snapshot` | **KEEP** — Lovable AI Gateway only, no external paid key | None |
| `ai-search-run`, `ai-search-cron`, `ai-search-suggest-queries` | Uses Anthropic + Perplexity in addition. **Disable Perplexity + Anthropic legs**; Gemini + GPT legs via Lovable Gateway stay. | AISearchQueriesPanel still works but with fewer engines |
| `openai-realtime-proxy`, `transcribe-audio` | **Disable** Phase 1 (consumes OpenAI quota) | VoiceInputButton, VoiceNoteCapture, VoiceInterviewMode → hide; LogInterview route → hide |

### Compliance + Admin user management
| Function | Disable | UI that breaks |
|---|---|---|
| `compliance-sweep`, `compliance-audit` | **Disable** (compliance is bar-specific) | SettingsComplianceTab → hide |
| `create-user`, `delete-user`, `invite-user` | **KEEP** (no external API) | Admin UsersTab continues to work |
| `reap-sync-runs` | **KEEP** (internal hygiene) | None |

### Implementation pattern for disabling
Single `app_config` row `integrations_disabled = ['toast','seven_shifts','asana','sculpture','openai_voice','google_places']`. Each edge function early-exits when its integration is in the list; each UI panel reads the same list (already query-cached) and hides itself.

---

## Task 3 — Suggested Schema Cleanup (frozen, awaiting approval one-by-one)

Per policy: nothing is renamed/dropped/restructured now. All UI relabeling is at the interface layer; data layer stays `venue_id`/`bar_id`/`employee_*`. Below is the queue of changes I'd recommend in a later cleanup pass.

| # | Change | Why | Code that would need updating | Risk |
|---|---|---|---|---|
| 1 | Rename `venues` → `projects`, add `project_type` enum (`client`, `internal_brand`, `campaign`, `product`, `service_offer`, `app_build`) | True STM model; lets dashboards/filters key off project type | Every `from('venues')`, every `*_venue_id` FK in queries, `useVenues` hook, Admin BarsTab, RLS helper `user_venue_ids()` | **HIGH** — touches ~80% of the app |
| 2 | Drop legacy `bars` table (predecessor to `venues`) | Dead table; FK `bar_id` already shadowed by `venue_id` on most modern tables | `config/noKdsVenues.ts`, AdminSyncHealth columns, anything still reading `bar_id` text | Medium — needs full audit of `bar_id` reads (memory note: many legacy log/metric/score tables still READ via `bar_id`) |
| 3 | Drop / re-purpose `user_bar_assignments` (superseded by `venue_assignments`) | Duplicate concept | Anywhere the old assignment table is read | Low if migrated cleanly |
| 4 | Rename `employee_*` tables → `person_*` (or `contact_*`); rename `employee_profiles.role` → `engagement_type` | Matches People/Contacts domain | Employees pages, EmployeeDetail tabs, compliance constants, `insight_employees` junction | High — touches employee feature module |
| 5 | Rename `gm_logs` / `lead_logs` / `shift_logs` / `manager_logs` → a single `project_updates` table with a `update_type` enum | Eliminates bar role hard-coding in schema | All log pages, parse-logs edge function, AI generators that read these tables | High |
| 6 | Rename `promotions` / `promo_redemptions` → `marketing_campaigns_promos` (or fold into `marketing_campaigns`) | Promo concept overlaps with campaigns in STM model | Marketing module | Medium |
| 7 | Add `project_type`-aware enums for `pillar` (`revenue` / `delivery` / `team` / `client_experience`) parallel to existing bar pillars | Lets one Insights pipeline support both domains | Pillar config, insight visibility filters | Medium |
| 8 | Replace `shift_logs.foh_section` / `boh_section` columns with `role_segment` | Removes FOH/BOH semantics | Shift log forms (low active use in STM) | Low |
| 9 | Drop Sculpture/Toast/7shifts-only tables (`drink_mix_items`, `inventory_*`, `top_items`, `toast_*`, `weekly_sales_mix`) once corresponding projects are gone | Cleanup after hospitality clients ramp down | Operations pillar, Competitive Analysis | Defer indefinitely — keep until last bar client offboards |
| 10 | Rename `growth_*` → keep as-is (already client-agnostic) | No change | — | n/a |

Until approved item-by-item, every conversion uses interface-layer renaming only.

---

## Task 4 — Phased implementation plan

Each phase is independently verifiable (build runs, app loads, no console errors).

### Phase 0 — Audit & brand inventory (this prompt)
Deliverable: this document. No code change. ✅

### Phase 1 — Quiet the integrations (safe baseline)
**Goal:** zero external-API traffic; app loads cleanly with no errors.
- Add `app_config.integrations_disabled` flag list.
- Unschedule every cron in the disable list (single migration: only `cron.unschedule(...)` calls).
- Add early-exit guard in every disabled edge function.
- Add `useIntegrationDisabled(name)` hook in frontend; gate all panels listed in Task 2 with it (hide or "Coming soon").
- Hide ManualDataUploadTab tabs whose parser is disabled.
- Verification: open every page, no failed fetches in network tab; `sync_runs` stops accumulating new rows; cron list shows only AI + housekeeping jobs.

### Phase 2 — Brand & terminology sweep (interface-only)
**Goal:** the product *looks* like Supreme Team Media OS while the schema stays identical.
- Brand string sweep: "Bar Pulse"/"BarPulse" → "Supreme Team OS"; AskBarPulse → AskSupreme; LoginBrandPanel; sidebars; floating ask button.
- Venue → Project: every visible label across PortfolioLayout / VenueLeadershipLayout / Admin tabs / sidebars / page titles / breadcrumbs / page H1s. (No file renames yet.)
- Employee → Person/Contact: page titles + tab labels + KPI tile copy + preset chip labels. Keep DB column names.
- FOH/BOH labels in charts → "Producer Hours / Contributor Hours" (or hide when integration disabled).
- Pillar relabel where applicable: Operations → Delivery, Guest Experience → Client Experience, Sales → Revenue.
- Verification: visual diff on each route; admin/owner sees the new vocabulary end-to-end.

### Phase 3 — Public agency site
**Goal:** signed-out visitors get a real website.
- Add `/`, `/services`, `/work`, `/contact` (public routes outside `<ProtectedRoute>`).
- New `components/public/` module with hero, services grid, case studies, contact form.
- Lead form writes to `marketing_events` or a new additive `inbound_leads` table (additive — allowed).
- Verification: signed-out visitor lands on marketing site; signed-in user still routed to `/portfolio`.

### Phase 4 — Project-type awareness (additive only)
**Goal:** one project can be a client, another can be a campaign, another can be an app build — and the UI adapts.
- Add `venues.project_type` column (additive; default `client`).
- Add `venues.is_hospitality` boolean (drives whether Toast/Sculpture-style cards even appear).
- Update Project Settings UI to set these.
- Adapt pillar cards to render `—` / hide when the relevant data source isn't applicable for that project type.
- Verification: create one of each project type; each renders sensibly without the operator turning anything off.

### Phase 5 — Marketing Hub for STM use
**Goal:** Campaign Hub usable for STM agency work without Asana.
- Make `mockAdapter` the default execution adapter.
- Add lightweight in-app campaign workflow (status board, assets, results) so it stands alone without Asana.
- Verification: create a campaign, attach assets, mark complete — all without any external call.

### Phase 6 — Growth Audit as a productized STM service
**Goal:** Growth Audit fully re-enabled per project, gated by Google Places key.
- Re-enable GBP/Map Pack/Website/AI Search functions for projects with `is_hospitality=false` and a configured site URL.
- Public-site "Run a Free Growth Audit" CTA captures a lead and provisions a stub project.
- Verification: run a fresh audit on a real client URL; report renders end-to-end.

### Phase 7 — Schema cleanup pass (item-by-item)
**Goal:** retire the bar-domain naming after the app is stable in production.
- Work through the Task 3 cleanup list with one approved migration at a time.
- Highest-leverage first (#1 `venues → projects`); destructive renames done with `ALTER TABLE … RENAME` + temporary compatibility views.
- Verification: each item ships with a code sweep + build check + smoke test on dependent pages.

### Phase 8 — Re-enable integrations on demand
**Goal:** any future client with Toast/7shifts/Asana/Sculpture can be flipped back on per-project.
- Move integration flags from global `integrations_disabled` to per-project `venues.integrations_enabled[]`.
- Per-project Toast/7shifts credentials already exist in VenueAdapterConfig; just rewire the disable-gate to be project-scoped.
- Verification: enable Toast on a hospitality project — only that project's dashboard surfaces Toast cards.

---

When you're ready, the smallest next step is **Phase 1** (zero external API traffic). That's a safe, fully reversible base for everything else.
