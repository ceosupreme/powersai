## Reality deltas found during recon (flag before building)

- **DB already shows 0 seed rows AND 0 total rows in `growth_findings`** in the current Cloud DB. So the purge is effectively a no-op today, but the cleanup statement + the "no re-seed path" verification still ship so a fresh-clone or restore doesn't reintroduce them.
- **Overview row IS real already.** `OverviewView.tsx` uses `useGrowthScores(venueId)` → `useFindings` (real `growth_findings`) → `deriveScores`. The "$18,400/mo" you saw on screen was coming from the **reports surface** (`snapshot.ts` deep-cloning `MOCK_PRIMARY`), not the Overview tiles. The earlier recon note that called the primary row mock was wrong; the recon note that called it real was right. Only one thing in the Overview is still hardcoded: `dataConfidence: 'Partial'` in `deriveScores.ts:~456`.
- **`service_offers` has NO venue/project column** (it's a global catalog of *our* offers — same object as `/offers`). There is no way to scope `offersHasCheck` to the selected venue against `service_offers`. The check needs to be re-pointed at a venue-scoped table; `venue_service_subscriptions` (Feature A — the table that links a venue to a `service_packages` row) is the correct source for "this venue has an active service offer/package." Flagging because this changes the source table, not just the filter.
- **`channel_products` also has no venue column.** Venue scope lives on `channel_product_channels.project_id`. `channelsHasCheck` becomes a join: count distinct channels for this venue via `channel_product_channels`.

---

## Part 1 — Purge seed findings + prove nothing re-seeds

1. **Data cleanup (insert tool, DELETE):**
   ```sql
   DELETE FROM public.growth_findings WHERE signal_key LIKE 'seed:%';
   ```
   Same identifier the admin "Clean up demo" action in `FindingsView.tsx:101` already uses. Report rows-affected (currently 0 in this DB).
2. **Re-seed audit (no code change expected; report findings):** Grep confirms the only seed writer is migration `20260513205029_…sql` (one-shot historical insert) — there is no trigger on `growth_findings`, no default, and `useCrm`/venue-creation paths never insert seed rows. `supabase/functions/_shared/findings.ts` `upsertFinding`/sweep paths explicitly skip `seed:%`. Nothing re-creates them. Report this in chat after build.
3. **Defensive read filter:** Add a single source-of-truth filter `signal_key NOT LIKE 'seed:%'` to `useFindings` in `src/components/growth-audit/findings/useFindings.ts` so scorer, list, and snapshot all ignore stray seed rows even if one reappears. (FindingsView's "Hide demo" toggle stays — it's an admin-only operator affordance, but the default read is now clean.)

## Part 2 — De-mock the Growth Audit display (real per-venue everywhere)

1. **Drop "Mock data" badge.** `src/pages/GrowthAudit.tsx` — remove the `<Badge variant="outline" …>Mock data</Badge>` block (~lines 50–53).
2. **Rewire `snapshot.ts` to real data.** Change `captureSnapshot` signature to `captureSnapshot(config, realData)` where `realData = { primary, categories, priorities, quickStats, findings, foundation? }` produced from `useGrowthScores(venueId)` + `useFoundationScores(venueId)` + real findings. Delete the `MOCK_PRIMARY / MOCK_CATEGORIES / MOCK_PRIORITIES / MOCK_QUICK_STATS / MOCK_FINDINGS` imports and the clone-of-mock body.
3. **Wire the call site.** In `src/components/growth-audit/reports/ReportsView.tsx`, on "Generate" pull `useApp().selectedBar.id`, call `useGrowthScores(venueId)` (already exists in the app) plus `useFindings(venueId)` for the full real list (snapshot needs more than the top-5 priorities), and pass that bundle to `captureSnapshot(cfg, realData)`. Block "Generate" when no venue is selected (toast "Select a project first").
4. **Keep the existing report types untouched.** `full / executive / category / custom` all keep rendering through `ReportRenderer` — they just receive real numbers instead of the karaoke fixtures. No Profit Leak preset, no visual changes, no new report type (per scope).
5. **Delete the displayed-path mocks.** Remove `src/components/growth-audit/mockData.ts` and `src/components/growth-audit/findings/mockFindings.ts` once references are gone. Keep their **type exports** (`PrimaryMetrics`, `CategoryScore`, `Priority`, `QuickStats`, `Finding`, `FindingCategoryKey`, `CATEGORY_LABEL`) by moving them into sibling `types.ts` files (`mockData.ts` → `growth-audit/types.ts`, `findings/mockFindings.ts` → `findings/types.ts`) and re-pointing every importer (`useFindings`, `dbAdapter`, `deriveScores`, `useGrowthScores`, `ReportRenderer`, `ReportBuilderDialog`, `FindingCard`, `FindingDetail`, `TopPrioritiesList`, `CategoryScoreCard`, `PrimaryMetricsRow`, `reports/types.ts`, …). Type-only move; runtime untouched.
6. **Real `dataConfidence`.** Replace the hardcoded `'Partial'` in `deriveScores.ts` `derivePrimaryMetrics` with a small derivation: count which of the 5 already-real data-source signals returned a snapshot (`gbpSnap`, `rep`, `web`, `mp`, `ai` — all already plumbed into `useGrowthScores`). Map `connected / 5`: `0 → 'Unavailable'`, `1–2 → 'Limited'`, `3–4 → 'Partial'`, `5 → 'Complete'`; update `dataConfidenceNote` to `"{n} of 5 data sources connected"`. Pass the same five into `derivePrimaryMetrics` (signature change, single call site in `useGrowthScores`). Small, real, no new queries.
7. **Honest empty states.**
   - `OverviewView`: when `findings.length === 0` and `lastRunAt == null`, render a clear "No audit run yet — click Refresh Now" panel above the tiles, with the tiles still showing real zeros (Growth Score `—`, Opportunity `$0 / mo` labeled "no findings", confidence from #6).
   - `ReportRenderer`: when the real snapshot has no findings or no run, show "No findings detected yet — run the audit first" in the body sections instead of an empty page; do not fabricate priorities.
   - `ReportsView`: keep the existing `DEMO_RECENTS` archive cards as-is — out of scope per your prior build note (next polish pass).

## Part 3 — Scope the two Foundation checks per-venue

In `supabase/functions/_shared/foundation-checks/offers.ts`:

1. **`offersHasCheck`** — repoint from global `service_offers` (no venue link exists) to `venue_service_subscriptions` filtered by `venue_id = venueId` and `status = 'active'`:
   ```ts
   const { count } = await supabase
     .from('venue_service_subscriptions')
     .select('id', { count: 'exact', head: true })
     .eq('venue_id', venueId)
     .eq('status', 'active');
   ```
   Drop the `_venueId` underscore. (Flagged above: this is a source-table swap because `service_offers` is genuinely global.)
2. **`channelsHasCheck`** — keep `channel_products` as the catalog but scope through `channel_product_channels.project_id`:
   ```ts
   const { count } = await supabase
     .from('channel_product_channels')
     .select('product_id', { count: 'exact', head: true })
     .eq('project_id', venueId);
   ```
   Returns `satisfied` when this venue has ≥1 product attached to any channel, else `missing`. Drop the underscore.

Both checks still register through `_shared/foundation-checks/index.ts`; no schema change, no migration.

## Not in scope (per your list)
Send adapters, capture_channel detector, followup-cadence-tick, recovery-report cron ref, marketing-site $48,210 showcase, Profit Leak Snapshot preset + visual redesign, Marketing Hub placeholders, dead-code cleanup, renames, the `growth_findings` engine itself.

## Test path before handing back
1. Pick a real venue with no findings → Overview shows empty-state, Reports → Generate renders a clean "no findings yet" report (no karaoke).
2. Pick a venue with real analyzer findings (or insert one via the existing engine) → Overview tiles + Reports both reflect the same real numbers from `growth_findings`.
3. Foundation Audit on two different venues → `has_service_offer` and `channel_coverage` give different results based on actual `venue_service_subscriptions` / `channel_product_channels` rows.
