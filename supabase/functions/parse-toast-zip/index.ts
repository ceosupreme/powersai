import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCsvRows(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Strip BOM
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
  // Match by exact filename (ignoring folder path)
  for (const [path, file] of Object.entries(files)) {
    const fname = path.split("/").pop() || "";
    if (fname.toLowerCase() === name.toLowerCase() && !file.dir) {
      return file;
    }
  }
  return null;
}

function parseDate(yyyymmdd: string): string | null {
  if (!yyyymmdd || yyyymmdd.length < 8) return null;
  const clean = yyyymmdd.replace(/[^0-9]/g, "");
  if (clean.length !== 8) return null;
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const { zip_base64, venue_id, conflict_mode = "overwrite", confirm = false, file_name = null } = await req.json();

    if (!zip_base64) {
      return new Response(JSON.stringify({ error: "No ZIP data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!venue_id) {
      return new Response(JSON.stringify({ error: "venue_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode and extract ZIP
    const zipData = Uint8Array.from(atob(zip_base64), (c) => c.charCodeAt(0));
    const zip = await JSZip.loadAsync(zipData);
    const warnings: string[] = [];

    // === 1. Sales by day.csv (REQUIRED) ===
    const salesByDayFile = findFile(zip.files, "Sales by day.csv");
    if (!salesByDayFile) {
      return new Response(
        JSON.stringify({
          error: "This doesn't appear to be a Toast Sales Summary export. Expected file 'Sales by day.csv' not found.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const salesByDayText = await salesByDayFile.async("string");
    const salesByDayRows = parseCsvRows(salesByDayText);

    // Validate headers
    const requiredSalesCols = ["yyyyMMdd", "Net sales", "Total orders", "Total guests"];
    const salesHeaders = Object.keys(salesByDayRows[0] || {});
    const missingSalesCols = requiredSalesCols.filter((c) => !salesHeaders.includes(c));
    if (missingSalesCols.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Sales by day.csv has unexpected headers. Expected: ${requiredSalesCols.join(", ")}. Found: ${salesHeaders.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse daily rows
    interface DailyRow {
      date: string;
      net_sales: number | null;
      orders_count: number | null;
      guests: number | null;
      avg_check: number | null;
      // To be enriched
      tips: number | null;
      tip_pct: number | null;
      voids: number | null;
      void_pct: number | null;
      gross_sales: number | null;
      discounts: number | null;
      discounts_pct: number | null;
      refunds: number | null;
      refund_pct: number | null;
      food_sales: number | null;
      bev_sales: number | null;
      avg_turn_time_mins: number | null;
      unpaid_amount: number | null;
    }

    const dailyRows: DailyRow[] = [];
    for (const row of salesByDayRows) {
      const date = parseDate(row["yyyyMMdd"]);
      if (!date) continue;
      const ns = num(row["Net sales"]);
      const orders = num(row["Total orders"]);
      const guests = num(row["Total guests"]);
      const avgCheck = ns !== null && orders !== null && orders > 0 ? r2(ns / orders) : null;
      dailyRows.push({
        date,
        net_sales: r2(ns),
        orders_count: orders,
        guests: guests,
        avg_check: avgCheck,
        tips: null,
        tip_pct: null,
        voids: null,
        void_pct: null,
        gross_sales: null,
        discounts: null,
        discounts_pct: null,
        refunds: null,
        refund_pct: null,
        food_sales: null,
        bev_sales: null,
        avg_turn_time_mins: null,
        unpaid_amount: null,
      });
    }

    if (dailyRows.length === 0) {
      return new Response(JSON.stringify({ error: "No valid daily rows found in Sales by day.csv" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate daily net_sales proportions for distributing weekly totals
    const totalNetSales = dailyRows.reduce((s, r) => s + (r.net_sales || 0), 0);
    const proportions = dailyRows.map((r) =>
      totalNetSales > 0 && r.net_sales ? r.net_sales / totalNetSales : 1 / dailyRows.length
    );

    // Weekly summary for preview
    const weeklySummary: Record<string, number | null> = {
      gross_sales: null,
      discounts: null,
      refunds: null,
      net_sales_weekly: null,
      tips: null,
      tips_refunded: null,
      voids_amount: null,
      void_pct: null,
      void_order_count: null,
      total_guests: null,
      avg_per_guest: null,
      avg_per_order: null,
      turn_time_mins: null,
      total_discounts_combined: null,
      food_sales: null,
      bev_sales: null,
      tax_amount: null,
    };

    // === 2. Net sales summary.csv ===
    const netSalesFile = findFile(zip.files, "Net sales summary.csv");
    if (netSalesFile) {
      const text = await netSalesFile.async("string");
      const rows = parseCsvRows(text);
      if (rows.length > 0) {
        const r = rows[0];
        weeklySummary.gross_sales = num(r["Gross sales"]);
        weeklySummary.discounts = num(r["Sales discounts"]); // negative
        weeklySummary.refunds = num(r["Sales refunds"]); // negative
        weeklySummary.net_sales_weekly = num(r["Net sales"]);

        // Validate: Gross + Sales discounts + Sales refunds ≈ Net sales
        if (
          weeklySummary.gross_sales !== null &&
          weeklySummary.discounts !== null &&
          weeklySummary.refunds !== null &&
          weeklySummary.net_sales_weekly !== null
        ) {
          const expectedNet = weeklySummary.gross_sales + weeklySummary.discounts + weeklySummary.refunds;
          const balanceDiff = Math.abs(expectedNet - weeklySummary.net_sales_weekly);
          if (balanceDiff > 1) {
            warnings.push(
              `Net sales summary doesn't balance: Gross ($${weeklySummary.gross_sales.toFixed(2)}) + Discounts ($${weeklySummary.discounts.toFixed(2)}) + Refunds ($${weeklySummary.refunds.toFixed(2)}) = $${expectedNet.toFixed(2)}, but Net sales = $${weeklySummary.net_sales_weekly.toFixed(2)} (diff: $${balanceDiff.toFixed(2)})`
            );
          }
        }

        // Distribute to daily rows
        const absDiscounts = weeklySummary.discounts !== null ? Math.abs(weeklySummary.discounts) : null;
        const absRefunds = weeklySummary.refunds !== null ? Math.abs(weeklySummary.refunds) : null;

        for (let i = 0; i < dailyRows.length; i++) {
          if (weeklySummary.gross_sales !== null) {
            dailyRows[i].gross_sales = r2(weeklySummary.gross_sales * proportions[i]);
          }
          if (absDiscounts !== null) {
            dailyRows[i].discounts = r2(absDiscounts * proportions[i]);
            dailyRows[i].discounts_pct =
              dailyRows[i].net_sales && dailyRows[i].discounts
                ? r2((dailyRows[i].discounts! / dailyRows[i].net_sales!) * 100)
                : null;
          }
          if (absRefunds !== null) {
            dailyRows[i].refunds = r2(absRefunds * proportions[i]);
            dailyRows[i].refund_pct =
              dailyRows[i].net_sales !== null && dailyRows[i].net_sales! > 0 && dailyRows[i].refunds !== null
                ? r2((dailyRows[i].refunds! / dailyRows[i].net_sales!) * 100)
                : null;
          }
        }
      }
    }

    // === 3. Tips from Tip summary.csv (Total tips = all guest tipping behavior) ===
    let tipsParsed = false;
    const tipFile = findFile(zip.files, "Tip summary.csv");
    if (tipFile) {
      const text = await tipFile.async("string");
      const rows = parseCsvRows(text);
      if (rows.length > 0) {
        const totalTips = num(rows[0]["Total tips"]) ?? num(rows[0]["Tips collected"]);
        weeklySummary.tips = totalTips;
        weeklySummary.tips_refunded = num(rows[0]["Tips refunded"]);

        if (totalTips !== null) {
          tipsParsed = true;
          for (let i = 0; i < dailyRows.length; i++) {
            dailyRows[i].tips = r2(totalTips * proportions[i]);
            dailyRows[i].tip_pct =
              dailyRows[i].net_sales !== null && dailyRows[i].net_sales! > 0
                ? r2((dailyRows[i].tips! / dailyRows[i].net_sales!) * 100)
                : null;
          }
        }
      }
    }

    // === 4. Revenue summary.csv (cross-validation) ===
    const revFile = findFile(zip.files, "Revenue summary.csv");
    if (revFile) {
      const text = await revFile.async("string");
      const rows = parseCsvRows(text);
      if (rows.length > 0) {
        weeklySummary.tax_amount = num(rows[0]["Tax amount"]);
        // If tips weren't found from Tip summary, use Revenue summary
        if (weeklySummary.tips === null) {
          const revTips = num(rows[0]["Tips"]);
          if (revTips !== null) {
            weeklySummary.tips = revTips;
            for (let i = 0; i < dailyRows.length; i++) {
              dailyRows[i].tips = r2(revTips * proportions[i]);
              dailyRows[i].tip_pct =
                dailyRows[i].net_sales && dailyRows[i].tips
                  ? r2((dailyRows[i].tips! / dailyRows[i].net_sales!) * 100)
                  : null;
            }
          }
        }
      }
    }

    // === 5. Void summary.csv ===
    const voidFile = findFile(zip.files, "Void summary.csv");
    if (voidFile) {
      const text = await voidFile.async("string");
      const rows = parseCsvRows(text);
      if (rows.length > 0) {
        weeklySummary.voids_amount = num(rows[0]["Void amount"]);
        weeklySummary.void_pct = num(rows[0]["Void amount %"]);
        weeklySummary.void_order_count = num(rows[0]["Void order count"]);

        if (weeklySummary.voids_amount !== null) {
          for (let i = 0; i < dailyRows.length; i++) {
            dailyRows[i].voids = r2(weeklySummary.voids_amount! * proportions[i]);
            dailyRows[i].void_pct =
              dailyRows[i].net_sales && dailyRows[i].voids
                ? r2((dailyRows[i].voids! / dailyRows[i].net_sales!) * 100)
                : null;
          }
        }
      }
    }

    // === 6. Service mode summary.csv ===
    const svcFile = findFile(zip.files, "Service mode summary.csv");
    if (svcFile) {
      const text = await svcFile.async("string");
      const rows = parseCsvRows(text);
      // Find "Total" row or use single/last row
      const totalRow = rows.find((r) => (r["Service mode"] || "").toLowerCase() === "total") || rows[rows.length - 1];
      if (totalRow) {
        weeklySummary.total_guests = num(totalRow["Total guests"]);
        weeklySummary.avg_per_guest = num(totalRow["Avg/Guest"]);
        weeklySummary.avg_per_order = num(totalRow["Avg/Order"]);
        const turnTime = num(totalRow["Turn time (minutes)"]);
        weeklySummary.turn_time_mins = turnTime;

        if (turnTime !== null) {
          for (let i = 0; i < dailyRows.length; i++) {
            dailyRows[i].avg_turn_time_mins = r2(turnTime);
          }
        }
      }
    }

    // === 7. Menu Item Discounts.csv + Check Discounts.csv ===
    let combinedDiscountTotal = 0;
    for (const fname of ["Menu Item Discounts.csv", "Check Discounts.csv"]) {
      const f = findFile(zip.files, fname);
      if (f) {
        const text = await f.async("string");
        const rows = parseCsvRows(text);
        const totalRow = rows.find((r) => (r["Discount"] || "").toLowerCase() === "total");
        if (totalRow) {
          const amt = num(totalRow["Amount"]);
          if (amt !== null) combinedDiscountTotal += Math.abs(amt);
        }
      }
    }
    weeklySummary.total_discounts_combined = combinedDiscountTotal > 0 ? combinedDiscountTotal : null;

    // === 8. Sales category summary.csv ===
    const catFile = findFile(zip.files, "Sales category summary.csv");
    if (catFile) {
      const text = await catFile.async("string");
      const rows = parseCsvRows(text);

      const foodCategories = ["food"];
      const bevCategories = [
        "beer", "bottled beer", "bottle beer", "draft beer",
        "liquor", "wine", "cocktails", "shots", "spirits",
        "mixed drinks", "cider", "hard seltzer", "seltzer",
        "na beverage", "non-alcoholic", "mead", "sake",
      ];
      const retailCategories = ["retail", "merchandise", "merch"];
      const excludedCategories = ["no sales category assigned"];

      let foodTotal = 0;
      let bevTotal = 0;
      let retailTotal = 0;
      const unmatchedCategories: string[] = [];

      for (const row of rows) {
        const cat = (row["Sales category"] || "").trim();
        const catLower = cat.toLowerCase();
        if (catLower === "total" || catLower === "") continue;
        const ns = num(row["Net sales"]);
        if (ns === null) continue;

        if (excludedCategories.includes(catLower)) {
          // Skip from food/bev totals
          continue;
        } else if (foodCategories.includes(catLower)) {
          foodTotal += ns;
        } else if (retailCategories.includes(catLower)) {
          retailTotal += ns;
        } else if (bevCategories.includes(catLower)) {
          bevTotal += ns;
        } else {
          // Default: classify unknown categories as BEVERAGE (bars are beverage-primary)
          bevTotal += ns;
          unmatchedCategories.push(cat);
        }
      }

      if (unmatchedCategories.length > 0) {
        warnings.push(
          `Unrecognized sales categories defaulted to Beverage: ${unmatchedCategories.join(", ")}`
        );
      }

      weeklySummary.food_sales = foodTotal;
      weeklySummary.bev_sales = bevTotal;

      for (let i = 0; i < dailyRows.length; i++) {
        dailyRows[i].food_sales = r2(weeklySummary.food_sales * proportions[i]);
        dailyRows[i].bev_sales = r2(weeklySummary.bev_sales * proportions[i]);
      }
    }

    // === 9. Unpaid orders summary.csv ===
    const unpaidFile = findFile(zip.files, "Unpaid orders summary.csv");
    if (unpaidFile) {
      const text = await unpaidFile.async("string");
      const rows = parseCsvRows(text);
      // Look for a total/summary row with unpaid amount
      let unpaidTotal: number | null = null;
      if (rows.length > 0) {
        // Try "Total" row first, then first row
        const totalRow = rows.find((r) => (r[""] || r["Order"] || "").toLowerCase() === "total");
        const sourceRow = totalRow || rows[0];
        unpaidTotal = num(sourceRow["Amount due"]) ?? num(sourceRow["Unpaid amount"]) ?? num(sourceRow["Balance"]);
      }
      // If no unpaid data found or file is empty, treat as $0
      const unpaidAmt = unpaidTotal !== null ? Math.abs(unpaidTotal) : 0;
      for (let i = 0; i < dailyRows.length; i++) {
        dailyRows[i].unpaid_amount = r2(unpaidAmt * proportions[i]);
      }
    } else {
      // No unpaid file in ZIP = $0 unpaid — explicitly zero out
      for (let i = 0; i < dailyRows.length; i++) {
        dailyRows[i].unpaid_amount = 0;
      }
    }

    // === Validation ===
    const dailyNetSum = dailyRows.reduce((s, r) => s + (r.net_sales || 0), 0);
    if (weeklySummary.net_sales_weekly !== null) {
      const diff = Math.abs(dailyNetSum - weeklySummary.net_sales_weekly);
      if (diff > 10) {
        warnings.push(
          `Daily net sales sum ($${dailyNetSum.toFixed(2)}) differs from weekly total ($${weeklySummary.net_sales_weekly.toFixed(2)}) by $${diff.toFixed(2)}`
        );
      }
    }

    // Date range
    const dates = dailyRows.map((r) => r.date).sort();
    const dateRangeStart = dates[0];
    const dateRangeEnd = dates[dates.length - 1];

    // === PREVIEW MODE ===
    if (!confirm) {
      return new Response(
        JSON.stringify({
          preview: true,
          daily_rows: dailyRows,
          weekly_summary: weeklySummary,
          date_range: { start: dateRangeStart, end: dateRangeEnd },
          warnings,
          row_count: dailyRows.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === COMMIT MODE ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Get venue details
    const { data: venue } = await sb.from("venues").select("id, bar_code, name").eq("id", venue_id).single();
    if (!venue) {
      return new Response(JSON.stringify({ error: "Venue not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Snapshot existing data for history
    const { data: existingRows } = await sb
      .from("daily_metrics")
      .select("*")
      .eq("bar_id", venue.bar_code)
      .gte("date", dateRangeStart)
      .lte("date", dateRangeEnd);

    let upserted = 0;
    let skipped = 0;

    for (const day of dailyRows) {
      // Check for conflict
      if (conflict_mode === "skip") {
        const exists = existingRows?.find((e: any) => e.date === day.date);
        if (exists && exists.source && exists.source !== "manual_upload_toast_zip") {
          skipped++;
          continue;
        }
      }

      const record: Record<string, unknown> = {
        bar_id: venue.bar_code,
        date: day.date,
        venue_id: venue_id,
        source: "manual_upload_toast_zip",
        net_sales: day.net_sales,
        orders_count: day.orders_count,
        guests: day.guests,
        avg_check: day.avg_check,
        tips: day.tips,
        tip_pct: day.tip_pct,
        voids: day.voids,
        void_pct: day.void_pct,
        gross_sales: day.gross_sales,
        discounts: day.discounts,
        discounts_pct: day.discounts_pct,
        refunds: day.refunds,
        refund_pct: day.refund_pct,
        food_sales: day.food_sales,
        bev_sales: day.bev_sales,
        avg_turn_time_mins: day.avg_turn_time_mins,
        unpaid_amount: day.unpaid_amount,
        comps: 0,
      };

      const { error } = await sb.from("daily_metrics").upsert(record as any, { onConflict: "bar_id,date" });
      if (error) {
        warnings.push(`Failed to upsert ${day.date}: ${error.message}`);
      } else {
        upserted++;
      }
    }

    // Record history
    await sb.from("manual_upload_history").insert({
      venue_id,
      bar_id: venue.bar_code,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      data_type: "toast_zip_sales",
      method: "toast_zip_upload",
      record_count: upserted,
      previous_values: existingRows || [],
      file_name,
    });

    // Trigger score recompute
    const weekStart = getMonday(dateRangeStart);
    try {
      await fetch(`${supabaseUrl}/functions/v1/compute-weekly-scores`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          venue_id,
          bar_id: venue_id,
          week_start: weekStart,
        }),
      });
    } catch {
      warnings.push("Score recompute triggered but may have failed — check manually.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        upserted,
        skipped,
        warnings,
        week_start: weekStart,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
