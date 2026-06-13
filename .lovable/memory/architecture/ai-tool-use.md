---
name: AI tool-use core
description: Single-turn Anthropic tool-use, shared registry, non-stream-first-pass trade-off, opportunistic-UPDATE guard
type: feature
---

# AI tool-use (Insight Deep Dive + Ask BarPulse)

## Architecture
- One shared registry: `supabase/functions/_shared/ai-tools.ts` → `buildTools(supabase, scope)`. Both `insight-deep-dive` and `ask-barpulse` import it. Never duplicate.
- One shared model layer: `supabase/functions/_shared/ai-models.ts` (`callAI`, `callAIStream`). Anthropic tool-use lives on the Anthropic branch.

## Hard rules
- **Single-turn cap:** at most ONE tool-execution turn followed by ONE final response. Second response is final even if it tries to call more tools. Enforced in both `callAnthropic` and `streamAnthropic`.
- **Scope locks venue identity:** tool args cannot override `scope.venueId` / `scope.barCode`. Tools enforce `bar_id` vs `venue_id` per `mem://architecture/bar-id-venue-id`.
- **Opportunistic UPDATE guard:** in `get_insight_source_logs`, the backfill of `insights.source_log_id` / `source_log_type` fires ONLY when the family-scoped `(source_date, source_family)` match returns EXACTLY ONE candidate. Zero or 2+ matches → no write. Guard lives in code (`famMatches.length === 1`).

## Streaming trade-off (accepted)
- When `tools` are present, `streamAnthropic` does a non-streaming first pass to detect `tool_use` cleanly, then streams the follow-up turn. Costs one extra round-trip of latency on tool-using questions. Tool-less paths stream immediately with no regression.
- Pre-resolved evidence (initial deep-dive) is emitted as a synthetic SSE event: `data: {choices:[{delta:{tool_evidence:[...]}}]}`. Clients render via `src/components/shared/ToolEvidence.tsx`; clients that don't know the key ignore the delta.

## Deep dive specifics
- `insight-deep-dive` has two modes in ONE function: `initial` (pre-resolves source via `get_insight_source_logs.execute`, then streams `## What Happened` + `## Data Used` with NO tools) and `followup` (tool-aware, same registry, same prompt with bound insight context). No separate `insight-deep-dive-followup` endpoint.
- Initial response NEVER includes "What To Do" — the ActionCard already carries the action.
- Venue/GM resolved server-side from `venues` + `venue_leadership_contacts` (matches `useVenueGM`). Client only posts `insight_id` + `bar_id` (+ optional legacy fields). "Unknown Venue" / "Unknown" must never appear.
