
## Goal

Bring the existing help framework current with the app as it stands today: cover the fulfillment factory (Qualifier → Inbound Leads → CRM → Project → Automation Bundle → Automation Inbox → Recovery Report), the Lead Qualifier + verticals/config model, the two scores, and the account-wide vs project-scoped distinction. Reuse the existing framework — no new system.

## Scope

Touches **content + a few empty-state additions**, nothing structural. No new components, no schema, no nav changes.

### 1. `src/config/helpKeys.ts` — add stable keys for new features

Add: `automationInbox`, `automationBundles`, `reactivation`, `recoveryReports`, `team`, `permissions`, `backup`, `fulfillmentFlow`, `approvalGate`, `accountVsProject`, `twoScores`, `captureInbox`, `growthAuditEmpty`, `marketingHub`.

(All keys are dismissible via the existing `useHelpState().dismiss()`.)

### 2. `src/config/helpArticles.ts` — add/refresh articles

**Refresh** (rewrite to match current nav + reality):
- `concepts-overview` — add Automation Inbox + Recovery Reports + Bundles to the map; add "approval gate" paragraph.
- `getting-started` — replace stale nav list (Brand Vault, etc.) with the rebuilt 6-group sidebar (WORKSPACE / CLIENTS & LEADS / GROWTH & MARKETING / BRAND & ASSETS / TOOLS / SYSTEM).
- `lead-qualifier`, `inbound-leads`, `crm` — wire in the end-to-end fulfillment flow.

**Add new articles**:
- `fulfillment-flow` — the end-to-end map: Qualifier → Inbound Leads → CRM (won deal) → Project → Venue Setup Wizard → apply Automation Bundle → Automation Inbox approvals → Recovery Report.
- `approval-gate` — nothing sends to a customer without operator approval; Automation Inbox is the QA surface.
- `automation-inbox` — what queues there (AI-drafted messages from bundles + detectors), how to approve/edit/reject, what "sent" means.
- `automation-bundles` — a bundle = a packaged set of automations applied to a client project in one action; where to apply; how to undo.
- `reactivation` — win-back campaigns to an uploaded customer list (upload list → pick offer → drafts go to Automation Inbox).
- `recovery-reports` — weekly "what we recovered" report; internal-first preview, operator reviews then sends.
- `team` — Team page shows people across the active project; vs Permissions which controls access.
- `account-wide-vs-project` — explicit list: Affiliate Programs, Products, Permissions, Backup = account-wide; everything else = active project.
- `two-scores` — Pillar Score (Weekly Review) vs Growth Score (Growth Audit); separate on purpose.

Existing articles (`brand-vault`, `crm`, `capture-inbox`, `content-pipeline`, `channel-revenue`, `marketing-hub`, `affiliate-products-libraries`, `tasks-logs-chat`, `permissions`, `growth-audit`, `backup-export`, `archive-vs-delete`, `marketing-site-inbound`, `weekly-review`, `insights`, `portfolio`, `project-types-verticals`, `config-editor`, `projects`) — keep, with light edits where wording references the old sidebar.

### 3. `src/components/help/SetupWizard.tsx` — reorder + add steps

Re-sequence to the real flow the user spec requested:

1. Welcome + the two scores
2. Create a project (Portfolio)
3. Pick the project's type / vertical (Admin → Projects)
4. Review qualifier questions for that type (Settings → Qualifier Fields)
5. *(optional)* Connect data — point at integrations panel
6. Run your first Weekly Review → produces Pillar Score
7. Try the Lead Qualifier end-to-end (`/qualify/<vertical>`)
8. Convert a lead → Inbound Leads → CRM company + deal
9. Apply an Automation Bundle to the project
10. Review the Automation Inbox (the approval gate)
11. Where to go when stuck (Help Center + Launch Checklist)

### 4. `src/config/launchChecklist.ts` — reorder + add items

Reorder to match the wizard's flow and add the missing pieces:

```
1.  setup:create-project
2.  setup:pick-project-type
3.  setup:review-pillars
4.  setup:review-qualifier-fields
5.  setup:try-qualifier
6.  setup:connect-data            (NEW — Admin → Integrations)
7.  setup:weekly-review
8.  setup:promote-lead
9.  setup:apply-automation-bundle (NEW — Admin → Automation Bundles)
10. setup:review-automation-inbox (NEW — /automation-inbox)
11. setup:brand-vault             (optional, demoted)
12. setup:growth-audit
13. setup:channel-revenue
14. setup:content-pipeline
15. setup:reactivation            (NEW — optional)
16. setup:recovery-reports        (NEW — review first report)
… launch: items preserved unchanged.
```

### 5. `src/hooks/useSuggestions.ts` — add smart suggestions for new surfaces

Append (mirroring the existing pattern, each grounded in real data):

- **Automation Inbox has pending items** — query `automation_queue` (or equivalent) where status='pending', surface "N drafts waiting for approval".
- **Automation Bundles never applied to a project** — query `automation_enrollments` per active project; suggest "Apply an automation bundle to <project>".
- **Inbound lead older than 3 days, still 'new'** — surface alongside existing ready-lead suggestion.
- **Recovery Report unread / never sent** — query `recovery_reports` per project.
- **Reactivation list uploaded but no campaign launched** — query `customer_lists` w/ no associated campaign.

(If a table doesn't exist under the exact name, fall back gracefully — `try/catch` per query so a missing table doesn't kill the panel. Use existing hooks `useAutomationQueue`, `useAutomationEnrollments`, `useRecoveryReports`, `useCustomerLists` if they already cover this.)

### 6. Empty-state `HelpTip` additions on the new pages

Add one inline `<HelpTip helpKey={HELP_KEYS.X} title="…">` block at the top of each new page (dismissible, uses existing component). Pages:

- `src/pages/AutomationInbox.tsx` — explains the approval gate.
- `src/pages/ReactivationCampaigns.tsx` — explains uploaded list → campaign → drafts in Automation Inbox.
- `src/pages/RecoveryReports.tsx` — explains internal-first preview before send.
- `src/pages/ContentPipeline.tsx` — already has a tip; rewrite copy to mention the 7 stages explicitly.
- `src/pages/Crm.tsx` — add tip pointing at fulfillment-flow article on first visit (only when no companies exist).
- `src/pages/QualifyLanding.tsx` — admin-preview hint only (visible when authenticated and `?preview=1`): "This is what your inbound visitors see; config in Settings → Qualifier Fields."

Each tip links to the matching new Help Center article (article slug in the body text).

## Out of scope

- No nav changes.
- No new tables.
- No changes to RLS, integrations, or business logic.
- Existing help components (`HelpTip`, `SuggestionsPanel`, `SetupWizard`, `LaunchChecklist`, `HelpCenter`) are reused as-is — only their content/config changes.

## Verification

1. `/help` lists every new article; search for "automation", "recovery", "bundle", "approval", "vertical", "score" returns hits.
2. Open Launch Checklist — items appear in the new order; new items are present and toggle persists.
3. Re-launch the wizard from Admin → Settings → Help & Guidance — new step sequence appears.
4. Open Automation Inbox / Reactivation / Recovery Reports as a fresh user — each shows a dismissible HelpTip explaining the page.
5. Suggestions panel surfaces new items when their conditions are met (pending automation drafts, never-applied bundle, etc.).
6. `tsc --noEmit` clean. No existing tips/articles broken.
