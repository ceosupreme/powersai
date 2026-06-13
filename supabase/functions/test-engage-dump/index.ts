const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEVEN_SHIFTS_BASE = "https://api.7shifts.com/v2";

async function getCompanyId(token: string): Promise<number> {
  const res = await fetch(`${SEVEN_SHIFTS_BASE}/whoami`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json();
  const activeUser = data.data?.users?.find((u: any) => u.active);
  return activeUser?.company_id ?? data.data?.company_id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("SEVEN_SHIFTS_ACCESS_TOKEN");
    if (!token) throw new Error("SEVEN_SHIFTS_ACCESS_TOKEN not set");

    const url = new URL(req.url);
    const locationId = url.searchParams.get("location_id") || "275442";
    const date = url.searchParams.get("date") || "2026-03-29";

    const companyId = await getCompanyId(token);

    // Call 1: default (no frequency param)
    const url1 = `${SEVEN_SHIFTS_BASE}/company/${companyId}/locations/${locationId}/engage_overview?date=${date}`;
    const res1 = await fetch(url1, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const raw1 = await res1.text();

    // Call 2: frequency=month
    const url2 = `${SEVEN_SHIFTS_BASE}/company/${companyId}/locations/${locationId}/engage_overview?date=${date}&frequency=month`;
    const res2 = await fetch(url2, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const raw2 = await res2.text();

    // Call 3: frequency=week
    const url3 = `${SEVEN_SHIFTS_BASE}/company/${companyId}/locations/${locationId}/engage_overview?date=${date}&frequency=week`;
    const res3 = await fetch(url3, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const raw3 = await res3.text();

    // Call 4: shifts API to count total scheduled shifts for the week
    const weekStart = "2026-03-23";
    const shiftsUrl = `${SEVEN_SHIFTS_BASE}/company/${companyId}/shifts?location_id=${locationId}&start%5Bgte%5D=${weekStart}T00:00:00Z&start%5Blte%5D=${date}T23:59:59Z&limit=250`;
    const res4 = await fetch(shiftsUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const raw4 = await res4.text();
    const shifts4 = JSON.parse(raw4);
    
    // Count unique location_ids and unique user_ids
    const shiftLocations: Record<string, number> = {};
    const uniqueUsers = new Set<number>();
    if (shifts4.data) {
      for (const s of shifts4.data) {
        const loc = String(s.location_id);
        shiftLocations[loc] = (shiftLocations[loc] || 0) + 1;
        if (s.user_id) uniqueUsers.add(s.user_id);
      }
    }

    return new Response(JSON.stringify({
      location_id: locationId,
      date,
      company_id: companyId,
      call_1_default: { url: url1, status: res1.status, body: JSON.parse(raw1) },
      call_2_monthly: { url: url2, status: res2.status, body: JSON.parse(raw2) },
      call_3_weekly: { url: url3, status: res3.status, body: JSON.parse(raw3) },
      call_4_shifts: { 
        url: shiftsUrl, 
        status: res4.status, 
        total_shifts: shifts4.data?.length ?? 0,
        unique_employees: uniqueUsers.size,
        location_breakdown: shiftLocations,
        meta: shifts4.meta,
      },
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
