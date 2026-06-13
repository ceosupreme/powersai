---
name: Monday Briefing Dashboard Rendering
description: Dashboard must filter weekly_scorecard by exact week_start; never silently fall back to most recent week
type: feature
---
The Dashboard "This Week's Briefing" card (`DashboardBriefing`) reads `scorecard.monday_briefing` from `useSupabaseWeeks(supabaseBarId)`.

Rule: when matching `selectedWeek.week_start` to `supabaseWeeks`, do NOT fall back to `supabaseWeeks[0]`. A silent fallback masks real mismatches and renders the in-progress current week (which has no briefing yet) instead of the user's selected completed week. Return `null` and log a `[Dashboard]` warning with `selectedWeekStart`, `availableWeekStarts`, and `supabaseBarId` so future bar-id / week_start mismatches surface in the console.
