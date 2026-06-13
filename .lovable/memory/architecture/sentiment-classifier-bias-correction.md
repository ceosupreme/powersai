---
name: Sentiment classifier bias correction
description: classify-insight-sentiment prompt+model tuned to stop misclassifying recognition/shoutouts as neutral
type: feature
---

`supabase/functions/classify-insight-sentiment/index.ts` was originally biased toward `neutral` (1515 neutral vs 10 positive over 30 days). The model was `google/gemini-2.5-flash-lite` and the system prompt ended with "Default to 'neutral' if unsure", which swallowed unambiguous wins like Mother's Day teamwork callouts, David Lauseng / Ivette Ramos shoutouts, and other recognition logs.

**Fix applied (2026-05-12):**
- **Removed** the "Default to 'neutral' if unsure" sentence.
- **Added** an explicit positive checklist: recognition, shoutouts, kudos, praise, exceeded targets, smooth execution, guest compliments, problem-solved-well.
- **Tightened** the neutral definition: purely informational, no praise/concern hedging.
- **Strengthened** the tool enum description so the model treats positive/negative as first-class.
- **Bumped** model `google/gemini-2.5-flash-lite` → `google/gemini-2.5-flash` for nuance.
- **Kept** `tool_choice: classify_sentiment` to force structured output.

**Backfill:** Completed 2026-05-13. Final all-time distribution: **600 positive / 37 neutral / 1866 negative** (pre-fix: 10 / 1515 / ~1000). Function accepts `recent_first: true` and `since: 'YYYY-MM-DD'` body params for targeted reclassification; default mode drains oldest neutral via the 10-min cron. Verified: Mother's Day teamwork, Ivette Ramos, Vincent Pavan, KP Phillips, Maleeya/Gustavo shoutouts all classify positive; n=8 random spot-check showed no harmful overcorrection.

**Future-agent guidance:**
- Do NOT re-introduce a "default to neutral" instruction. The natural model bias already over-selects neutral.
- If false-positives surface (neutral logs being marked positive), tighten the *positive* checklist with explicit counter-examples rather than re-adding a global neutral default.
- Keep this on `gemini-2.5-flash` or stronger. `flash-lite` lacks the nuance for hospitality recognition language and Spanish/English mixed logs.
