# Seed the HVAC vertical — plan

Additive only. No changes to the five existing landers, /free-audit, run-public-audit, or compute-leak-stack.

## Part A — restore risk classification

`home_services` and `hvac`/`plumbing` have the same four vector names (Missed calls, Unsold estimates, Slow first response on inbound leads, Unresponded emergency jobs), so every row matches by name — no orphans expected.

- Migration: `UPDATE project_type_leak_vectors t SET risk_type = h.risk_type, risk_multiplier = h.risk_multiplier FROM ... WHERE t.project_type IN ('hvac','plumbing') AND t.name = h.name AND h.project_type = 'home_services'`.
- Net effect: "Unresponded emergency jobs" flips to `avoided_loss` on both types; the other three stay `captured_revenue`. Report counts and names after the run.
- Patch `supabase/functions/duplicate-project-type/index.ts` in both copy paths — the SQL block (line 102-105 column list) and the `copyTable` fallback (line 202-205) — to include `risk_type, risk_multiplier`. Redeploy the function explicitly and confirm it responds (not 404).

## Part B — HVAC qualifier questions

DEVIATION to confirm: `hvac` has no free-text issue-description field. Its fields are contact, location, urgency, budget_signal, timeline, trade, job_type (select), service_area, emergency_vs_scheduled, property_type, operation_footprint. The nearest issue-describing field is `job_type`, a select.

Proposed: insert `system_age` ("How old is the system?") and `system_status` ("Is it cooling or heating at all right now?") as `field_type: 'text'`, `channel: 'phone'`, `is_shared: false`, sorted directly after `job_type` (sort_order 71 and 72). Report the final ordered list.

## Part C — family row

Insert `vertical_landing_families` row `escalating_damage` / "Escalating-damage trades" with the six `tour_features` (all `image_url: null`), the eight `included_features`, three `how_it_works` steps, `live_in_line`, `proof_line`, `guarantee_line`, and the five `faq_base` entries exactly as specified. `math_config: null`.

## Part D — HVAC page row

Insert `vertical_landing_pages` row: slug `hvac`, display_name `HVAC`, status `published`, sort_order 5, `project_type_id: 'hvac'`, `family_key: 'escalating_damage'`, `accent_color: 'rust'` (copied from plumbing-hvac).

CTA URLs: primary `/free-audit` as specified; secondary `/qualify/home-services` — the URL the plumbing-hvac row uses for its secondary CTA. The same URL is used for the founding-tier pricing CTA.

Headline/subline/stat/leaks_heading/leaks, math_config (two blocks: open_quotes, unanswered), free_check_line, price_block (two tiers + footnote), page-level faq (two entries), meta_title, meta_description as written. `video_url`, `tour_features`, `included_features`, `how_it_works`, `live_in_line`, `proof_line`, `guarantee_line`, `og_image_url` all null so they inherit the family.

Leak card shape note: existing rows use `{ title, line, dollar_note }`. The three HVAC leaks are written as title + body; they will be stored as `line` (the body text) with `dollar_note` omitted-as-empty is not possible in the current renderer, which always prints the note. To avoid fabricating dollar figures, `dollar_note` will be set to `"—"` on each HVAC leak card. Say the word if you'd rather supply notes.

## Part E — component tweak

`src/components/marketing/vertical/ProductTour.tsx`: the image element is already conditional on `f.image_url`, but an empty string would pass. Tighten to `f.image_url?.trim()` so null/empty renders text-only with no placeholder box.

## Verification

`/for/hvac` at desktop and 390px: video section hidden, tour cards text-only, family-inherited sections present, calculator totals labeled Estimated. Confirm the five existing landers show no new sections. tsgo clean.

## Build summary will report

Part A rows updated per type with vector names; duplicate-project-type redeploy confirmation; final hvac qualifier field order; family key; hvac slug/status/project_type_id as stored; exact CTA URLs; and the /for/hvac render confirmation.
