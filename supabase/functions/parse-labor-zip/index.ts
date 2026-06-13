import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCsvRows(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const headers = headerLine.split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function num(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseFloat(val.replace(/[$,%\s"]/g, ""));
  return isNaN(n) ? null : n;
}

function r2(n: number | null): number | null {
  return n !== null ? Math.round(n * 100) / 100 : null;
}

function findFile(files: Record<string, JSZip.JSZipObject>, name: string): JSZip.JSZipObject | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[_ ]/g, "");
  const target = normalize(name);
  for (const [path, file] of Object.entries(files)) {
    const fname = path.split("/").pop() || "";
    if (normalize(fname) === target && !file.dir) {
      return file;
    }
  }
  return null;
}

function parseDate(yyyymmdd: string): string | null {
  if (!yyyymmdd) return null;
  const s = yyyymmdd.trim().replace(/['"]/g, "");
  // YYYYMMDD
  const m1 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  return null;
}

function getMonday(dateStr: string): string {
  const dt = new Date(dateStr + "T00:00:00Z");
  const day = dt.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { zip_base64, venue_id, conflict_mode, confirm } = body;

    if (!zip_base64) {
      return new Response(JSON.stringify({ error: "Missing zip_base64" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!venue_id) {
      return new Response(JSON.stringify({ error: "Missing venue_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up venue
    const { data: venue } = await supabase
      .from("venues")
      .select("id, name, bar_code")
      .eq("id", venue_id)
      .single();

    if (!venue) {
      return new Response(JSON.stringify({ error: "Venue not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract ZIP
    const zipBytes = Uint8Array.from(atob(zip_base64), (c) => c.charCodeAt(0));
    const zip = await JSZip.loadAsync(zipBytes);

    // Find Labor_cost_by_day.csv (case-insensitive, ignoring folder path)
    const dailyFile = findFile(zip.files, "Labor_cost_by_day.csv");
    if (!dailyFile) {
      // List available files for debugging
      const fileList = Object.keys(zip.files).filter(f => !zip.files[f].dir);
      return new Response(JSON.stringify({
        error: "Could not find 'Labor_cost_by_day.csv' in the ZIP",
        files_found: fileList,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyText = await dailyFile.async("text");
    const dailyRows = parseCsvRows(dailyText);
    console.log(`Parsed ${dailyRows.length} rows from Labor_cost_by_day.csv`);
    if (dailyRows.length > 0) {
      console.log("Headers:", Object.keys(dailyRows[0]).join(", "));
    }

    const warnings: string[] = [];

    // Map rows
    interface LaborRow {
      date: string;
      regular_hours: number | null;
      overtime_hours: number | null;
      total_hours: number | null;
      regular_cost: number | null;
      overtime_cost: number | null;
      total_cost: number | null;
      labor_pct: number | null;
      splh: number | null;
    }

    const parsed: LaborRow[] = [];

    for (let i = 0; i < dailyRows.length; i++) {
      const row = dailyRows[i];
      const date = parseDate(row["Day"] || row["day"] || row["Date"] || row["date"] || "");
      if (!date) {
        if (Object.values(row).some(v => v.trim())) {
          warnings.push(`Row ${i + 2}: could not parse date "${row["Day"] || row["day"] || ""}""`);
        }
        continue;
      }

      parsed.push({
        date,
        regular_hours: r2(num(row["Regular hours"])),
        overtime_hours: r2(num(row["Overtime hours"])),
        total_hours: r2(num(row["Total hours"])),
        regular_cost: r2(num(row["Regular cost"])),
        overtime_cost: r2(num(row["Overtime cost"])),
        total_cost: r2(num(row["Total cost"])),
        labor_pct: r2(num(row["Labor % (net)"])),
        splh: r2(num(row["SPLH (net)"])),
      });
    }

    if (parsed.length === 0) {
      return new Response(JSON.stringify({ error: "No valid rows found in Labor_cost_by_day.csv" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sort by date
    parsed.sort((a, b) => a.date.localeCompare(b.date));

    // Compute summary
    const totalHours = parsed.reduce((s, r) => s + (r.total_hours || 0), 0);
    const totalCost = parsed.reduce((s, r) => s + (r.total_cost || 0), 0);
    const totalOT = parsed.reduce((s, r) => s + (r.overtime_hours || 0), 0);
    const laborPcts = parsed.filter(r => r.labor_pct !== null).map(r => r.labor_pct!);
    const splhs = parsed.filter(r => r.splh !== null).map(r => r.splh!);
    const avgLaborPct = laborPcts.length > 0 ? r2(laborPcts.reduce((s, v) => s + v, 0) / laborPcts.length) : null;
    const avgSplh = splhs.length > 0 ? r2(splhs.reduce((s, v) => s + v, 0) / splhs.length) : null;

    const summary = {
      total_hours: r2(totalHours),
      total_cost: r2(totalCost),
      total_ot_hours: r2(totalOT),
      avg_labor_pct: avgLaborPct,
      avg_splh: avgSplh,
      row_count: parsed.length,
      date_range: { start: parsed[0].date, end: parsed[parsed.length - 1].date },
    };

    // === PREVIEW MODE ===
    if (!confirm) {
      return new Response(JSON.stringify({
        preview: true,
        summary,
        daily_rows: parsed,
        warnings,
        venue_name: venue.name,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === COMMIT MODE ===
    // Fetch existing rows for snapshot
    const dates = parsed.map(r => r.date);
    const { data: existingRows } = await supabase
      .from("daily_metrics")
      .select("*")
      .eq("bar_id", venue.bar_code)
      .in("date", dates);

    const existingMap = new Map<string, any>();
    for (const row of (existingRows || [])) {
      existingMap.set(row.date, row);
    }

    const previousValues: any[] = [];
    let upsertedCount = 0;
    let skippedCount = 0;

    for (const row of parsed) {
      const existing = existingMap.get(row.date);

      if (existing && conflict_mode === "skip") {
        skippedCount++;
        continue;
      }

      if (existing) {
        previousValues.push(existing);
      }

      // Labor-only upsert — does NOT touch sales columns
      const payload: Record<string, unknown> = {
        bar_id: venue.bar_code,
        date: row.date,
        venue_id: venue.id,
        source: "manual_upload_labor_zip",
        labor_hours: row.total_hours,
        labor_cost: row.total_cost,
        labor_pct: row.labor_pct,
        splh: row.splh,
        overtime_hours: row.overtime_hours,
      };

      const { error } = await supabase
        .from("daily_metrics")
        .upsert(payload as any, { onConflict: "bar_id,date" });

      if (error) {
        console.error(`Upsert error for ${row.date}:`, error.message);
        warnings.push(`Failed to upsert ${row.date}: ${error.message}`);
      } else {
        upsertedCount++;
      }
    }

    // Record upload history
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    await supabase.from("manual_upload_history").insert({
      uploaded_by: userId,
      venue_id: venue.id,
      bar_id: venue.bar_code,
      date_range_start: dates[0],
      date_range_end: dates[dates.length - 1],
      data_type: "labor",
      method: "labor_zip_upload",
      record_count: upsertedCount,
      file_name: body.file_name || null,
      previous_values: previousValues.length > 0 ? previousValues : null,
    });

    // Trigger weekly score recompute for all affected Monday-start weeks
    try {
      const weekStarts = [...new Set(dates.map(d => getMonday(d)))];
      console.log(`Recomputing scores for ${weekStarts.length} weeks: ${weekStarts.join(", ")}`);
      for (const ws of weekStarts) {
        await supabase.functions.invoke("compute-weekly-scores", {
          body: { bar_id: venue.id, week_start: ws },
        });
      }
    } catch (e) {
      console.error("Score recompute error:", e);
      warnings.push("Data imported but weekly score recompute failed — scores may be stale");
    }

    return new Response(JSON.stringify({
      success: true,
      upserted: upsertedCount,
      skipped: skippedCount,
      warnings,
      date_range_start: dates[0],
      date_range_end: dates[dates.length - 1],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("parse-labor-zip error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
