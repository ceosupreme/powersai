// ============================================================================
// Shared AI tool registry — used by insight-deep-dive and ask-barpulse.
//
// `buildTools(supabase, scope)` returns the canonical set of read tools.
// Both surfaces import this — NEVER duplicate the registry. Scope locks the
// venue/bar identity into every query; args cannot override it.
//
// COLUMN MAP (bar_id vs venue_id) — see mem://architecture/bar-id-venue-id:
//   - daily_metrics:        bar_id (text, bar_code)
//   - weekly_core:          bar_id (uuid)
//   - weekly_scorecard:     bar_id (uuid)
//   - gm_logs/lead_logs/shift_logs: bar_id (uuid)
//   - insights:             bar_id (uuid)
//   - insight_employees:    junction
//   - time_entries:         venue_id (uuid)
//   - period_config:        bar_id (uuid)
//
// Opportunistic UPDATE GUARD (in get_insight_source_logs only):
//   The deterministic fallback may write `source_log_id` / `source_log_type`
//   ONLY when the (source_date, source_family) match returns EXACTLY ONE
//   candidate. Zero or 2+ matches → no write.
// ============================================================================

import type { AITool } from "./ai-models.ts";
import {
  buildResolveContext,
  familyForSourceType,
  resolveSourceLogId,
  type CandidateLog,
} from "./source-attribution.ts";

export interface ToolScope {
  /** uuid */
  venueId: string;
  /** text bar_code (for daily_metrics) — may be null if unknown */
  barCode: string | null;
  employeeId?: string | null;
  insightId?: string | null;
  venueName?: string;
}

type SB = any;

const compact = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null) out[k] = v;
  }
  return out as Partial<T>;
};

export function buildTools(supabase: SB, scope: ToolScope): AITool[] {
  return [
    {
      name: "get_insight_source_logs",
      description:
        "Resolve the source log (gm_log, lead_log, or shift_log) that backed an insight. Returns the raw log row, the Asana task gid (when present — gm/lead only; shift_logs have no gid coverage), and a deep link URL when constructible. Use this when the user asks 'what was the source?', 'show me the log', or 'why did this insight fire?'.",
      input_schema: {
        type: "object",
        properties: {
          insight_id: {
            type: "string",
            description: "Insight UUID. Defaults to the bound insightId from scope when omitted.",
          },
        },
      },
      execute: async ({ insight_id }) => {
        const id = insight_id || scope.insightId;
        if (!id) return { error: "no insight_id" };
        const { data: insight, error } = await supabase
          .from("insights")
          .select(
            "id, bar_id, source_log_id, source_log_type, source_date, source_type, source_metric, source_value, generated_by, evidence_ids",
          )
          .eq("id", id)
          .maybeSingle();
        if (error || !insight) return { error: error?.message || "insight not found" };

        // Direct resolution via stored source_log_id (covers ~5% of insights today).
        if (insight.source_log_id && insight.source_log_type) {
          return await fetchLogRow(supabase, insight.source_log_type, insight.source_log_id, insight);
        }

        // Fallback: source_log_id is set but source_log_type was never persisted.
        // Try each log table by id and use whichever returns a row. This restores
        // the Deep Dive "Source log" link for the ~183/638 insights in that state.
        if (insight.source_log_id) {
          for (const logType of ["gm_log", "lead_log", "shift_log"] as const) {
            const table = logType === "gm_log" ? "gm_logs" : logType === "lead_log" ? "lead_logs" : "shift_logs";
            const { data: probe } = await supabase
              .from(table)
              .select("id")
              .eq("id", insight.source_log_id)
              .maybeSingle();
            if (probe?.id) {
              return await fetchLogRow(supabase, logType, insight.source_log_id, insight);
            }
          }
        }

        // Deterministic fallback: pull same-day candidates from all 3 log tables
        // for this venue, then resolve via (source_date, source_family).
        const date = insight.source_date as string | null;
        if (!date) return { insight, candidates: [], note: "no source_date to resolve" };
        const [gm, lead, shift] = await Promise.all([
          supabase.from("gm_logs").select("id, date, asana_task_gid").eq("bar_id", insight.bar_id).eq("date", date),
          supabase.from("lead_logs").select("id, date, asana_task_gid").eq("bar_id", insight.bar_id).eq("date", date),
          supabase.from("shift_logs").select("id, date, asana_task_gid").eq("bar_id", insight.bar_id).eq("date", date),
        ]);
        const candidates: CandidateLog[] = [
          ...(gm.data || []).map((r: any) => ({ id: r.id, date: r.date, family: "barpulse" as const, _type: "gm_log", _gid: r.asana_task_gid })),
          ...(lead.data || []).map((r: any) => ({ id: r.id, date: r.date, family: "barpulse" as const, _type: "lead_log", _gid: r.asana_task_gid })),
          ...(shift.data || []).map((r: any) => ({ id: r.id, date: r.date, family: "barpulse" as const, _type: "shift_log", _gid: r.asana_task_gid })),
        ] as any;
        const fam = familyForSourceType(insight.source_type);
        // Family-scoped matches for the opportunistic UPDATE guard.
        const famMatches = fam ? candidates.filter((c) => c.date === date && c.family === fam) : [];

        const ctx = buildResolveContext(candidates as any);
        const resolvedId = resolveSourceLogId(ctx, insight, date);
        if (!resolvedId) {
          return {
            insight,
            candidates: candidates.map((c: any) => ({ id: c.id, type: c._type, asana_task_gid: c._gid })),
            note: famMatches.length === 0 ? "no_family_match" : famMatches.length > 1 ? "ambiguous_match" : "unknown",
          };
        }

        // SAFETY GUARD (exactly one candidate): only persist the link when the
        // family-scoped match resolved to a single candidate. resolveSourceLogId
        // already enforces this for non-trusted ids, but we double-check here
        // because this is the place where a wrong write would corrupt provenance.
        const matched: any = candidates.find((c: any) => c.id === resolvedId);
        if (matched && famMatches.length === 1) {
          void supabase
            .from("insights")
            .update({ source_log_id: matched.id, source_log_type: matched._type })
            .eq("id", id)
            .is("source_log_id", null)
            .then(({ error: upErr }: any) => {
              if (upErr) console.warn("[get_insight_source_logs] backfill failed:", upErr.message);
            });
        }
        return await fetchLogRow(supabase, matched._type, matched.id, insight);
      },
    },

    {
      name: "get_daily_metrics",
      description:
        "Get the Toast daily metrics row for a specific date (net sales, labor %, SPLH, tips, voids, comps, guests, turn time, etc.). Use for single-day questions like 'what were sales on May 14?'.",
      input_schema: {
        type: "object",
        properties: {
          date: { type: "string", description: "ISO YYYY-MM-DD" },
        },
        required: ["date"],
      },
      execute: async ({ date }) => {
        if (!scope.barCode) return { error: "no bar_code on scope" };
        const { data, error } = await supabase
          .from("daily_metrics")
          .select(
            "date, net_sales, gross_sales, food_sales, bev_sales, labor_pct, labor_cost, splh, tip_pct, comps_pct, void_pct, guests, avg_check, scheduled_hours, worked_hours, overtime_hours, foh_hours, boh_hours, tickets_count, voids_amount, comps_amount, refunds_amount, discounts_amount, avg_turn_time_mins",
          )
          .eq("bar_id", scope.barCode)
          .eq("date", date)
          .maybeSingle();
        if (error) return { error: error.message };
        if (!data) return { date, missing: true, venue: scope.venueName };
        return { venue: scope.venueName, ...compact(data as any) };
      },
    },

    {
      name: "get_metric_range",
      description:
        "Get a specific Toast metric across a date range. Use for trend questions like 'sales last 7 days' or 'labor % this month'. Returns one row per day.",
      input_schema: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: [
              "net_sales", "gross_sales", "food_sales", "bev_sales",
              "labor_pct", "labor_cost", "splh", "tip_pct",
              "comps_pct", "void_pct", "guests", "avg_check",
              "scheduled_hours", "worked_hours", "overtime_hours",
              "avg_turn_time_mins",
            ],
          },
          start_date: { type: "string", description: "ISO YYYY-MM-DD inclusive" },
          end_date: { type: "string", description: "ISO YYYY-MM-DD inclusive" },
        },
        required: ["metric", "start_date", "end_date"],
      },
      execute: async ({ metric, start_date, end_date }) => {
        if (!scope.barCode) return { error: "no bar_code on scope" };
        const { data, error } = await supabase
          .from("daily_metrics")
          .select(`date, ${metric}`)
          .eq("bar_id", scope.barCode)
          .gte("date", start_date)
          .lte("date", end_date)
          .order("date", { ascending: true })
          .limit(400);
        if (error) return { error: error.message };
        return { venue: scope.venueName, metric, rows: data || [] };
      },
    },

    {
      name: "get_weekly_scorecard",
      description:
        "Get the weekly scorecard + weekly_core row for a Monday-start week (overall + pillar scores, KPI totals, YOY).",
      input_schema: {
        type: "object",
        properties: {
          week_start: { type: "string", description: "Monday in ISO YYYY-MM-DD" },
        },
        required: ["week_start"],
      },
      execute: async ({ week_start }) => {
        const [sc, core] = await Promise.all([
          supabase
            .from("weekly_scorecard")
            .select("week_id, week_label, overall_score, overall_grade, sales_score, labor_score, guest_score, ops_score, drivers")
            .eq("bar_id", scope.venueId)
            .eq("week_label", week_start)
            .maybeSingle(),
          supabase
            .from("weekly_core")
            .select("week_id, net_sales, labor_pct, splh, tip_pct, void_rate, overtime_rate, weekly_guests, schedule_variance_pct, task_completion_pct, last_year_net_sales, yoy_change_pct")
            .eq("bar_id", scope.venueId)
            .eq("week_id", (sc.data as any)?.week_id ?? "00000000-0000-0000-0000-000000000000")
            .maybeSingle(),
        ]);
        return {
          venue: scope.venueName,
          week_start,
          scorecard: sc.data || null,
          core: core.data || null,
        };
      },
    },

    {
      name: "get_labor_for_day",
      description:
        "Get raw time_entries (clock-in/out, OT, breaks) for a business date. Optionally filter to a single employee. Use for 'who closed?', 'who got OT?', 'show me Maria's hours Monday'.",
      input_schema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Business date YYYY-MM-DD" },
          employee_id: { type: "string", description: "Optional employee uuid" },
        },
        required: ["date"],
      },
      execute: async ({ date, employee_id }) => {
        let q = supabase
          .from("time_entries")
          .select(
            "id, employee_id, toast_job_title, business_date, in_date, out_date, regular_hours, overtime_hours, hourly_wage, auto_clocked_out, deleted, time_entry_breaks(id, in_date, out_date, missed, waived, paid)",
          )
          .eq("venue_id", scope.venueId)
          .eq("business_date", date)
          .eq("deleted", false)
          .limit(200);
        if (employee_id) q = q.eq("employee_id", employee_id);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { venue: scope.venueName, date, employees: data?.length ?? 0, rows: data || [] };
      },
    },

    {
      name: "get_employee_prior_insights",
      description:
        "Pull the most recent insights tagged to an employee (via insight_employees junction). Use when the user asks 'has this happened before?' or 'how often does X mess up?'.",
      input_schema: {
        type: "object",
        properties: {
          employee_id: { type: "string" },
          limit: { type: "number", description: "Default 10, max 50" },
        },
        required: ["employee_id"],
      },
      execute: async ({ employee_id, limit }) => {
        const cap = Math.min(Number(limit) || 10, 50);
        const { data, error } = await supabase
          .from("insight_employees")
          .select("insight_id, role, insights!inner(id, title, summary, severity, pillar, source_date, source_type, status, bar_id)")
          .eq("employee_id", employee_id)
          .eq("insights.bar_id", scope.venueId)
          .order("insight_id", { ascending: false })
          .limit(cap);
        if (error) return { error: error.message };
        return {
          venue: scope.venueName,
          employee_id,
          rows: (data || []).map((r: any) => ({ role: r.role, ...r.insights })),
        };
      },
    },

    {
      name: "get_venue_prior_insights",
      description:
        "Pull this venue's most recent insights so you can judge from titles/summaries whether the current issue has happened before. Returns the recent set unfiltered by metric — recurrence is decided by you, not by SQL. source_metric on AI-generated rows is free-text and inconsistent, so do not expect to filter by it.",
      input_schema: {
        type: "object",
        properties: {
          exclude_insight_id: { type: "string", description: "Optional — the current insight to exclude from results." },
          limit: { type: "number", description: "Default 15, max 50" },
        },
        required: [],
      },
      execute: async ({ exclude_insight_id, limit }) => {
        const cap = Math.min(Number(limit) || 15, 50);
        let q = supabase
          .from("insights")
          .select("id, title, summary, severity, source_date, source_metric")
          .eq("bar_id", scope.venueId)
          .order("source_date", { ascending: false })
          .limit(cap);
        if (exclude_insight_id) q = q.neq("id", exclude_insight_id);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { venue: scope.venueName, rows: data || [] };
      },
    },

    {
      name: "get_venue_contacts",
      description:
        "Return this venue's saved external contacts (vendors, trades, reps, emergency lines, etc.) from venue_contacts. Read-only, scoped to the bound venue. Use when recommending who to call/email for a specific issue — match the role_label to the problem (plumber for leaks, electrician for power, HVAC for climate, etc.). May return an empty list; that's fine — give the recommendation without naming anyone.",
      input_schema: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        const { data, error } = await supabase
          .from("venue_contacts")
          .select("name, role_label, phone, email, note")
          .eq("venue_id", scope.venueId)
          .eq("is_active", true)
          .order("role_label", { ascending: true });
        if (error) return { error: error.message };
        return { venue: scope.venueName, contacts: data || [] };
      },
    },
  ];

}


// ── Internal helpers ──

async function fetchLogRow(supabase: SB, logType: string, logId: string, insight: any) {
  const table = logType === "gm_log" ? "gm_logs" : logType === "lead_log" ? "lead_logs" : "shift_logs";
  const { data, error } = await supabase.from(table).select("*").eq("id", logId).maybeSingle();
  if (error) return { error: error.message };
  const gid = data?.asana_task_gid || null;
  return {
    insight: {
      id: insight.id,
      source_date: insight.source_date,
      source_type: insight.source_type,
      source_metric: insight.source_metric,
      source_value: insight.source_value,
      generated_by: insight.generated_by,
    },
    source: {
      log_type: logType,
      log_id: logId,
      asana_task_gid: gid,
      asana_url: gid ? `https://app.asana.com/0/0/${gid}` : null,
      log: data,
    },
  };
}
