import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEVEN_SHIFTS_BASE = "https://api.7shifts.com/v2";

async function sevenShiftsFetch(path: string, token: string) {
  const res = await fetch(`${SEVEN_SHIFTS_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`7shifts API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function getCompanyId(token: string): Promise<number> {
  const data = await sevenShiftsFetch("/whoami", token);
  const activeUser = data.data?.users?.find((u: { active: boolean }) => u.active);
  if (activeUser) return activeUser.company_id;
  return data.data?.company_id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('seven_shifts', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const token = Deno.env.get("SEVEN_SHIFTS_ACCESS_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "7shifts token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, params } = await req.json();
    const companyId = await getCompanyId(token);

    let result: unknown;

    switch (action) {
      case "whoami": {
        result = await sevenShiftsFetch("/whoami", token);
        break;
      }
      case "shifts": {
        const qs = new URLSearchParams();
        if (params?.start) qs.set("start[gte]", params.start);
        if (params?.end) qs.set("start[lte]", params.end);
        if (params?.location_id) qs.set("location_id", params.location_id);
        if (params?.department_id) qs.set("department_id", params.department_id);
        if (params?.user_id) qs.set("user_id", String(params.user_id));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/shifts${query}`, token);
        break;
      }
      case "time_punches": {
        const qs = new URLSearchParams();
        if (params?.clocked_in_gte) qs.set("clocked_in[gte]", params.clocked_in_gte);
        if (params?.clocked_in_lte) qs.set("clocked_in[lte]", params.clocked_in_lte);
        if (params?.location_id) qs.set("location_id", params.location_id);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/time_punches${query}`, token);
        break;
      }
      case "users": {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.location_id) qs.set("location_id", params.location_id);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/users${query}`, token);
        break;
      }
      case "departments": {
        result = await sevenShiftsFetch(`/company/${companyId}/departments`, token);
        break;
      }
      case "log_book_posts": {
        const qs = new URLSearchParams();
        if (params?.location_id) qs.set("location_id", params.location_id);
        if (params?.from) qs.set("from", params.from);
        if (params?.to) qs.set("to", params.to);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/log_book_posts${query}`, token);
        break;
      }
      case "task_lists": {
        const qs = new URLSearchParams();
        if (params?.location_id) qs.set("location_id", params.location_id);
        if (params?.status) qs.set("status", params.status);
        if (params?.naive_date) qs.set("naive_date", params.naive_date);
        if (params?.location_timezone) qs.set("location_timezone", params.location_timezone);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/task_lists${query}`, token);
        break;
      }
      case "log_book_categories": {
        result = await sevenShiftsFetch(`/company/${companyId}/log_book_categories`, token);
        break;
      }
      case "log_book_posts_raw": {
        // Debug action: returns raw log book posts for field name discovery
        const qs = new URLSearchParams();
        if (params?.location_id) qs.set("location_id", params.location_id);
        if (params?.from) qs.set("from", params.from);
        if (params?.to) qs.set("to", params.to);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/log_book_posts${query}`, token);
        break;
      }
      case "task_list_daily_summary": {
        // Returns daily task completion summary
        const qs = new URLSearchParams();
        if (params?.location_id) qs.set("location_id", params.location_id);
        if (params?.date) qs.set("date", params.date);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/task_list_daily_summary${query}`, token);
        break;
      }
      case "task_list_detail": {
        // Returns a specific task list with individual tasks
        if (!params?.list_id) throw new Error("list_id is required for task_list_detail");
        result = await sevenShiftsFetch(`/company/${companyId}/task_lists/${params.list_id}`, token);
        break;
      }
      case "shift_feedback": {
        // Returns shift feedback ratings and comments
        const qs = new URLSearchParams();
        if (params?.location_id) qs.set("location_id", params.location_id);
        if (params?.start_date) qs.set("start_date", params.start_date);
        if (params?.end_date) qs.set("end_date", params.end_date);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(`/company/${companyId}/shift_feedback${query}`, token);
        break;
      }
      case "engage_overview": {
        const locId = params?.location_id;
        if (!locId) throw new Error("location_id is required for engage_overview");
        const qs = new URLSearchParams();
        if (params?.date) qs.set("date", params.date);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        result = await sevenShiftsFetch(
          `/company/${companyId}/locations/${locId}/engage_overview${query}`,
          token
        );
        break;
      }
      case "daily_sales_and_labor": {
        // Pre-aggregated daily sales & labor report (projected vs actual hours)
        const qs = new URLSearchParams();
        qs.set("company_id", String(companyId));
        if (params?.location_id) qs.set("location_id", params.location_id);
        if (params?.from) qs.set("start_date", params.from);
        if (params?.to) qs.set("end_date", params.to);
        // Note: this is a /v2/reports/ endpoint, not company-scoped
        result = await sevenShiftsFetch(`/reports/daily_sales_and_labor?${qs.toString()}`, token);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("seven-shifts-proxy error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
