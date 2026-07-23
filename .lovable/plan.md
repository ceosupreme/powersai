# Leak Stack $0 bug — revised plan (v2)

## Root cause (verified)
- `test plumber` → `project_type='client'` → 0 rows in `project_type_leak_vectors` → `compute-leak-stack` writes an empty run → page shows silent $0 with no explanation.
- `home_services` is under-seeded (2 of a planned 4 vectors) and it's what the demo runs point at.

## Fix

### 1. One migration — seed `client` (4 new) + top up `home_services` (2 new) + defaults

Uses only variable names the resolver already knows (`missed_calls`, `booking_rate`, `avg_ticket`, `open_estimates`, `close_rate`, `slow_response_leads`, `leads_unresponded`, `first_responder_advantage`) so every input resolves via signal → override → vertical_default without adding new resolver cases.

**A. `project_type_leak_vectors` — new rows**

`client` (all 4 new; sort_order 10/20/30/40):

| # | name | severity | risk_type | detect_signal | dollarize_formula | benchmark |
|---|---|---|---|---|---|---|
| 1 | Missed calls | headline | captured_revenue | inbound call without answer or callback within SLA | `missed_calls * booking_rate * avg_ticket` | < 5% missed during business hours |
| 2 | Slow first response on inbound leads | headline | captured_revenue | first_response_at > 30 min after created_at | `slow_response_leads * first_responder_advantage * avg_ticket` | 50% of buyers pick the first responder |
| 3 | Unresponded leads sitting in queue | supporting | captured_revenue | leads with automation_status NULL or 'pending' | `leads_unresponded * close_rate * avg_ticket` | Response inside 5 min converts 8× more |
| 4 | Unresponded emergency leads | headline | avoided_loss (risk_multiplier 1.0) | urgency_class='emergency' with NULL first_response_at | `unresponded_emergencies * emergency_avg_ticket` | Every emergency without a callback is a job walking to a competitor |

`home_services` (2 new; sort_order 30/40 to sit after existing 10/20):

| # | name | severity | risk_type | detect_signal | dollarize_formula | benchmark |
|---|---|---|---|---|---|---|
| 3 | Slow first response on inbound leads | supporting | captured_revenue | first_response_at > 30 min after created_at | `slow_response_leads * first_responder_advantage * avg_ticket` | 50% of buyers pick the first responder |
| 4 | Unresponded emergency jobs | headline | avoided_loss (risk_multiplier 1.0) | urgency_class='emergency' with NULL first_response_at | `unresponded_emergencies * emergency_avg_ticket` | After-hours emergencies are the highest-ticket jobs — and the biggest leak when they ring out |

**B. `project_types.display_defaults` — every default value visible**

`client` (currently `{}`) → set to:
```json
{
  "avg_ticket": 400,
  "booking_rate": 0.30,
  "close_rate": 0.35,
  "missed_calls": 12,
  "slow_response_leads": 15,
  "first_responder_advantage": 0.30,
  "leads_unresponded": 8,
  "unresponded_emergencies": 2,
  "emergency_avg_ticket": 1200
}
```

`home_services` — merge in the two new keys needed by the added vectors, leave all existing keys unchanged:
```json
{
  "slow_response_leads": 15,
  "first_responder_advantage": 0.30,
  "unresponded_emergencies": 3,
  "emergency_avg_ticket": 5500
}
```
(Existing keys — `avg_ticket 500`, `close_rate 0.55`, `booking_rate 0.35`, `missed_calls 18`, `open_estimates 12`, `avg_job_low/high`, `emergency_job_low/high`, `pain_hook_copy`, `hero_stat_headline` — untouched. `emergency_avg_ticket 5500` sits mid-range of the existing `emergency_job_low 3000` / `emergency_job_high 8000` band.)

Migration uses `ON CONFLICT (project_type, name) DO NOTHING` for vector inserts and `display_defaults || jsonb_build_object(...)` for the type update so it's idempotent and doesn't clobber future admin edits.

### 2. Empty-state on `LeakStack.tsx` — operator-worded

When `latest.results.length === 0`, replace the current silent two-$0-cards render with:

> **This project's type (`<type>`) has no money-leak checks configured yet, so nothing can be estimated.** Configure them in **Admin → Project Types**.

No "vector" jargon on-screen (kept in code/DB). Existing "No leak stack run yet" case unchanged.

## Verify
Rerun compute-leak-stack for test plumber; quote new `total_monthly_dollars`, `total_risk_exposure_dollars`, `top_leak_key`, and the top-3 result rows with per-variable `source` flags (expect `vertical_default` across the board since this venue has no signals yet).

## Guardrails
- Additive; no resolver changes, no new variable cases.
- No dollar-math in the renderer.
- Migration idempotent (`ON CONFLICT DO NOTHING` + JSONB merge).
- tsc clean.
