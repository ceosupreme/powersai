# Help & Onboarding Refresh — Plan

Goal: bring the existing help framework (it still only covers ~7 early features) up to date for every current feature, especially the new ones (Lead Qualifier, Project Types/Verticals, Config editor, Content Pipeline, Channel Revenue, Affiliate Libraries, Weekly Review, Insights, Marketing Hub, Chat, Logs). Reuse all current components — `HELP_ARTICLES`, `HELP_KEYS`, `HelpTip`, `SetupWizard`, `SuggestionsPanel` / `useSuggestions`, `LAUNCH_CHECKLIST`, `useChecklist`, `SettingsHelpTab`. No new framework. Additive only.

## 1. Help Center articles (`src/config/helpArticles.ts`)

Keep existing 9 articles. Add the following new entries (same `HelpArticle` shape, plain-language, multi-section):

- `concepts-overview` — "How this OS fits together": Portfolio → selected project → everything is project-scoped (except account-wide libraries). The two scores: Pillar Score (Weekly Review) vs Growth Score (Growth Audit). Where data comes from.
- `project-types-verticals` — Replaces light "projects" article context. Explains that a project type = a vertical. Its template controls **pillars + leak vectors + qualifier fields**. Per-project overrides REPLACE the template list. Adding a new vertical = configuring a type, not coding.
- `config-editor` — Admin → Settings → Pillars/Leak Vectors/Qualifier Fields tabs, plus per-project override panels on Edit Project. Plain explanation of each of the three concepts.
- `weekly-review` — Setting/updating pillar scores; what each pillar means; produces the Pillar Score.
- `insights` — AI observations on the active project; how to read them.
- `portfolio` — The home view; selecting a project sets active project everywhere.
- `lead-qualifier` — Voice/chat/form qualifier at `/qualify/[vertical]`; questions come from the project type's qualifier fields; qualified leads flow into Inbound Leads → CRM. Includes "how to test", "how to change the questions" (point to config editor).
- `inbound-leads` — Where web/qualifier leads land; promote to CRM company + deal.
- `content-pipeline` — Items, 7 stages, List/Kanban; usage flow.
- `channel-revenue` — Logging revenue by channel/month; feeds Monetization pillar.
- `marketing-hub` — Campaigns overview.
- `affiliate-products-libraries` — Account-wide libraries (vs project-scoped data).
- `tasks-logs-chat` — Single short tool article covering all three.
- `permissions` — Role basics, who sees what.

Existing `projects`, `crm`, `capture-inbox`, `growth-audit`, `brand-vault`, `backup-export`, `archive-vs-delete`, `marketing-site-inbound`, `getting-started` articles: updated where stale (e.g. mention Pillar Score vs Growth Score, mention qualifier in CRM flow), but not removed.

## 2. HelpTip keys (`src/config/helpKeys.ts`) + placements

Extend `HELP_KEYS` with new dismissible inline tips, and drop a `<HelpTip>` at the top of each major page (where the pattern is already used). New keys + page mounting:

- `portfolio` → `src/pages/PortfolioOverview.tsx`
- `weeklyReview` → `src/pages/WeeklyReview.tsx`
- `insights` → `src/pages/Insights.tsx`
- `qualifierPublic` → `src/pages/QualifyLanding.tsx` (only when admin previewing? — actually only when no fields configured; otherwise hidden by `helpEnabled`)
- `inboundLeads` → `src/components/crm/InboundLeadsPanel.tsx`
- `contentPipeline` → `src/pages/ContentPipeline.tsx`
- `channelRevenue` → `src/pages/ChannelRevenue.tsx`
- `marketingHub` → `src/pages/MarketingHub.tsx`
- `affiliatePrograms`, `products` → respective pages
- `tasks`, `logs`, `chat` → respective pages
- `configEditor` → `SettingsPillarsTab` header (one tip explaining pillars/leak vectors/qualifier fields)
- `projectOverrides` → top of overrides stack in `EditBarDialog`

All existing keys (`crmPipeline`, `crmInbound`, `brandVault`, `captureSuggest`, `pillarsByType`, `backupBeforeChanges`) preserved.

## 3. SetupWizard (`src/components/help/SetupWizard.tsx`)

Replace the 7-step legacy flow with an updated sensible getting-started order, same component, same `useHelpState` plumbing:

1. Welcome — what the OS is (operator, CRM, qualifier, weekly review).
2. Create or pick a project (Portfolio).
3. Pick its **project type / vertical** (Edit Project → Type).
4. Configure / review the **qualifier fields** for that type (Settings → Qualifier Fields).
5. Try the **Lead Qualifier** at `/qualify/<vertical>` and watch a lead land in **Inbound Leads**.
6. Set up the **Brand Vault** (optional).
7. Run your first **Weekly Review** → see the Pillar Score.
8. Check the **Growth Audit** → understand Growth Score (vs Pillar Score).
9. Capture Inbox + CRM tour (condensed from current steps).
10. Where to get help — Help Center, Launch Checklist.

## 4. Launch Checklist (`src/config/launchChecklist.ts`)

Rewrite the list to reflect real current getting-started flow (keep launch-prep items at the bottom). New ordered keys:

1. `setup:create-project` — Create your first project (link `/portfolio`).
2. `setup:pick-project-type` — Set its type/vertical (link `/admin?tab=projects`).
3. `setup:review-pillars` — Review pillars for this type (link Settings → Pillars).
4. `setup:review-qualifier-fields` — Review/seed qualifier fields (link Settings → Qualifier Fields).
5. `setup:try-qualifier` — Run the qualifier (link `/qualify/<slug>`), see a lead land in Inbound Leads.
6. `setup:promote-lead` — Promote a lead to CRM.
7. `setup:brand-vault` — Set up brand kit.
8. `setup:weekly-review` — Submit a Weekly Review → Pillar Score.
9. `setup:growth-audit` — Open Growth Audit → Growth Score.
10. `setup:channel-revenue` — Log one Channel Revenue entry.
11. `setup:content-pipeline` — Add one Content item.
12. `setup:capture-verify` — (existing) inbox 5-step verification.
13. `launch:rls-audit`, `launch:full-backup`, `launch:marketing-review`, `launch:ai-routing-sanity`, `launch:archive-protection`, `launch:domain-dns`, `launch:help-content-recheck` — kept from existing list, demoted to the end as launch-prep.

`useChecklist` schema is key-based — existing completed rows for kept keys keep working; new keys start unchecked. No migration needed.

## 5. Smart suggestions (`src/hooks/useSuggestions.ts`)

Add new grounded suggestion sources, alongside the 7 existing ones:

- **No project type set** — projects whose `project_type` is null (or default `general` when others exist). CTA: open Edit Project.
- **Project type missing qualifier fields** — for any project whose type has zero rows in `project_type_qualifier_fields` AND no per-project overrides. CTA: Settings → Qualifier Fields.
- **Qualifier has captured leads not yet promoted** — `inbound_leads` rows with `is_ready=true` and `status='new'`. CTA: Inbound Leads.
- **Project has no Weekly Review this week** — projects without a `project_pillar_scores` row for the current ISO week. CTA: Weekly Review.
- **Project has open Growth findings** — count from `growth_findings` where status='open'. CTA: Growth Audit.
- **Content Pipeline empty** — project with zero `content_items`. CTA: Content Pipeline.
- **Channel Revenue not logged this month** — project with no `channel_revenue` row for current month. CTA: Channel Revenue.

All wrapped in `try/catch`-style optional resolution so a missing table never breaks the panel; gated by `helpEnabled` and dismiss keys identical to existing pattern.

## 6. Empty-state copy

Add a one-time empty-state explainer (existing card pattern, not a new component) to each NEW page when its primary table is empty:

- `QualifyLanding` (admin preview only — public visitor view unchanged)
- `ContentPipeline`
- `ChannelRevenue`
- `AffiliatePrograms`, `Products`
- `Insights` (when no insights yet)
- `WeeklyReview` (when no scores submitted)
- `InboundLeadsPanel` (when zero leads)

Each uses the same `Card` + icon + short copy + CTA pattern already in use elsewhere; honors `helpEnabled` via reading from `useHelpState` for the explanation block.

## 7. Out of scope (non-changes)

- No new DB tables; reuse `user_help_state` + `user_checklist_progress`.
- No edits to scoring, dashboard branching, RLS, or integrations.
- No new help framework; only data + small placements in existing components.

## Files changed

- `src/config/helpArticles.ts` — add ~13 articles, update existing.
- `src/config/helpKeys.ts` — add new keys.
- `src/config/launchChecklist.ts` — re-ordered + extended.
- `src/components/help/SetupWizard.tsx` — updated steps.
- `src/hooks/useSuggestions.ts` — added suggestion sources.
- Page files for `<HelpTip>` + empty-state inserts: `PortfolioOverview`, `WeeklyReview`, `Insights`, `QualifyLanding`, `ContentPipeline`, `ChannelRevenue`, `MarketingHub`, `AffiliatePrograms`, `Products`, `Tasks`, `Logs`, `Chat`, `crm/InboundLeadsPanel`, `admin/SettingsPillarsTab`, `admin/EditBarDialog` (overrides section header).

## Verify

- Help Center lists every feature/concept above; existing articles still work.
- Checklist items appear in the new getting-started order; progress persists.
- Each new page shows a dismissible tip / empty-state explainer on first open.
- Suggestions panel surfaces qualifier/weekly-review/content/revenue prompts when conditions are true.
- `tsc` clean.
