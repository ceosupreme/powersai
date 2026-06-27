# Profit Leak Snapshot — Prospect-Ready Report

## Verify-first findings (flagged before building)

- **`growth_findings.diagnosis` / `recommended_action`:** Confirmed both columns exist (text). They're populated by analyzers via `upsertFinding()` using `FINDING_TYPE_TEMPLATES`, and `dbAdapter.ts` already falls back to `''` if missing. The DB currently has 0 non-seed findings in this environment, so all real-data verification is by code path, not row data. Report MUST degrade honestly when either string is empty — render a muted "No diagnosis available yet" / "No recommended action yet" line, never fabricate.
- **`captureSnapshot(config, data)` shape:** Carries everything needed — `primary.growthScore`, `primary.opportunityDollars` (already a formatted string — we render verbatim), `primary.opportunityLevel`, full `findings[]` array including `diagnosis`, `recommendedAction`, `severity`, `priorityScore`, `revenueUpside` (1–5), `category`, and `foundation` (`FoundationScoreResult` with `overall`, `totals.satisfied`/`missing`, `recommendedActions[]`). **No snapshot/captureSnapshot signature change needed.**
- **Dollar-per-leak gap (flag):** Real findings carry `revenueUpside` as a 1–5 scale, NOT a per-leak dollar figure. The brief asks each leak card to show "$ upside." We'll render the 1–5 scale as a labeled "Upside" indicator (e.g. `$$$ · High upside` derived from the scale) and keep the single big dollar figure as the headline `primary.opportunityDollars`. We will NOT invent per-leak dollar numbers. Confirming this is the intended interpretation in the plan; if you want literal per-leak dollars we'd need to extend the analyzer contract (out of scope per guardrails).

---

## PART 1 — "Profit Leak Snapshot" report preset

**Types & builder**
- `reports/types.ts`: add `'profit_leak'` to `ReportType` union.
- `ReportBuilderDialog.tsx`:
  - Add `{ value: 'profit_leak', label: 'Profit Leak Snapshot', desc: 'One-page snapshot for a live prospect walkthrough.' }` as the **first** option, and change `useState<ReportType>('full')` → `'profit_leak'` so it's the default.
  - When `type === 'profit_leak'`, hide the category-grid (`custom`) and single-category (`category`) selectors. Keep venue name, prepared-for, date range.
  - In `submit()`, route `profit_leak` to `categories: []` (renderer ignores).

**Renderer branch (ReportRenderer.tsx)**
- Add a new top-level branch at the top of `ReportRenderer`:
  ```
  if (snap.config.type === 'profit_leak') return <ProfitLeakReport snap={snap} />;
  ```
- New `ProfitLeakReport` composes, in order, ONLY:
  1. **Cover** — reuse existing `<Cover>`. Override `ReportTypeLabel['profit_leak'] = 'Profit Leak Audit'`. Brand line "Supreme Team Media · Profit Leak Audit".
  2. **Headline tiles** — two-tile row: Growth Score /100 with `getScoreBand` color, and Revenue Opportunity (`snap.primary.opportunityDollars` + `opportunityLevel` subline). Built large (display type, see Part 2).
  3. **Top 5 Leaks** — `[...snap.findings].sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,5)`. Each card renders: severity marker, title, **`diagnosis`** paragraph (honest empty state if blank), **`recommendedAction`** paragraph (honest empty state if blank), upside indicator (1–5 scale shown as labeled dots). Honest empty state for the whole section when 0 findings.
  4. **Foundation Readiness tile** — `snap.foundation`: `overall` /100, `totals.satisfied`/`totals.missing`, and top 3 `recommendedActions` (title + category). Honest empty state when `foundation == null`.
- Skip Categories / Top 10 Actions / 30-60-90 / Appendix for this preset.
- Every section uses `report-page-break` / `report-avoid-break` so the existing `print.css` produces a clean PDF. "Download as PDF" (existing `window.print()`) keeps working.

---

## PART 2 — Visual pass (premium client deliverable look)

**Scope of styling:** the `ProfitLeakReport` body **and** the shared `<Cover>` + headline-tile markup (since the brief says "shared report shell"). Other report types inherit the upgraded Cover + headline tiles automatically. We will NOT redesign CategorySection / TopActions / TimelinePlan / Appendix.

**Token & palette resolution (will report which path resolves in the build):**
- Read `src/index.css` + `tailwind.config.ts` first. If a "deep jewel green / warm bone / near-black ink / rust alert" palette is already encoded as tokens (e.g. `--brand-jewel`, `--brand-bone`, `--brand-ink`, `--brand-rust`), lean into those for the report surface.
- If not present, **add a small, additive token set scoped to the report surface only** (no global theme change): `--report-bg` (warm bone), `--report-ink` (near-black), `--report-accent` (jewel green), `--report-alert` (rust). Wire via Tailwind extend so utility classes resolve cleanly. This stays within the existing HSL semantic-token system.
- The plan will report back which path was taken.

**Design moves (bounded, no animation theater):**
- Apply a `.report-surface` wrapper on `report-print-root` for Profit Leak: warm bone background, near-black ink, generous side padding, max-width column for editorial reading rhythm.
- Typography hierarchy: keep existing font stack but introduce a `display` size step for the Revenue Opportunity figure (~text-6xl, tight tracking, accent color) and the Growth Score numeral. Strong section eyebrow labels (uppercase, tracked, muted ink). Body at comfortable measure.
- Leak cards: structured grid — left rail = severity marker bar (color from `severityTone`) + rank number; main column = title (display weight) → "The leak" label + diagnosis → "The fix" label + recommendedAction; right rail = upside indicator + dollar glyph treatment from the resolved palette.
- Foundation tile: progress meter using accent palette + satisfied/missing pill counts + clean 3-row recommended-fix list.
- Headline tiles get the same warm-bone surface, accent-color numerals, subtle hairline borders (no heavy shadows).
- Print parity: all custom colors use `print-color-adjust: exact` (already set in `print.css`). Verify the bone/ink palette holds in PDF; if any utility resolves to a non-printing value we'll add explicit `@media print` overrides in `print.css`.

---

## PART 3 — Strip prospect-visible operator/demo chrome

All three are **visibility / dead-control removals only — zero operator functionality lost**:

1. **`ReportsView.tsx` `DEMO_RECENTS`:** delete the constant + the 3-card grid + the "Demo entries — not real archives" badge. Replace with a single muted empty-state card: "Saved reports will appear here once archiving ships." Keep the existing `<FileBarChart>` footnote line. **No persistence built.**
2. **`OnboardingChecklist` on `OverviewView.tsx`:** wrap the `<OnboardingChecklist venueId={venueId} />` render with `useAuth().isAdmin` gate (component already imports admin auth elsewhere — verify in build; if not, import from `@/context/AuthContext`). Prospects/non-admin viewers never see it; admins/operators still get the full setup nudge.
3. **`TopPrioritiesList.tsx` lines ~105-110:** remove the disabled `<Button>View Action</Button>` + its `<TooltipContent>Action Center ships in a later phase.</TooltipContent>` wrapper entirely. Drop unused `Tooltip`/`ArrowRight` imports if they become orphaned. The card still shows the finding row — just no dead CTA.

---

## Out of scope (confirmed)

Analyzer engine, `growth_findings`, `deriveScores`, `useGrowthScores`, `useFoundationScores`, real `captureSnapshot(config, data)` shape, `service_offers`/`Offers.tsx`, report persistence/archive, public share URL, marketing-site $48,210 showcase, Marketing Hub placeholders, send adapters, dead-code cleanup, renames.
