import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RULE_KEY = "long_form_published_v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: { content_item_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const id = payload?.content_item_id;
  if (!id || typeof id !== "string") return json({ error: "content_item_id required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ATOMIC check-and-set: only matches if not yet fired AND still long_form+published.
  // Concurrent invocations serialize on the row lock; only the first sees a returned row.
  const { data: claimed, error: claimErr } = await supabase
    .from("content_items")
    .update({ automation_fired_at: new Date().toISOString() })
    .eq("id", id)
    .eq("stage", "published")
    .eq("format", "long_form")
    .is("automation_fired_at", null)
    .select("id, project_id, title, created_by")
    .maybeSingle();

  if (claimErr) {
    console.error("[automation] claim error", claimErr);
    return json({ error: claimErr.message }, 500);
  }
  if (!claimed) {
    return json({ skipped: true, reason: "already_fired_or_not_eligible" });
  }

  const title = claimed.title ?? "(untitled)";
  const projectId = claimed.project_id as string;

  const taskTitles = [
    `Create Short #1 from "${title}"`,
    `Create Short #2 from "${title}"`,
    `Create Short #3 from "${title}"`,
    `Create Short #4 from "${title}"`,
    `Create Short #5 from "${title}"`,
    `Write blog post from "${title}"`,
    `Write email featuring "${title}"`,
    `Review/add affiliate CTA for "${title}"`,
  ];

  const taskRows = taskTitles.map((t) => ({
    bar_id: String(projectId),
    title: t,
    priority: "Medium",
    status: "Todo",
    content_item_id: id,
    created_by: claimed.created_by ?? null,
  }));

  const { data: created, error: insertErr } = await supabase
    .from("tasks")
    .insert(taskRows)
    .select("id");

  if (insertErr || !created || created.length !== 8) {
    console.error("[automation] task insert failed", insertErr);
    // Roll back: delete any created tasks + reset flag so user can retry.
    if (created && created.length) {
      await supabase.from("tasks").delete().in("id", created.map((t: any) => t.id));
    }
    await supabase
      .from("content_items")
      .update({ automation_fired_at: null })
      .eq("id", id);
    await supabase.from("content_automation_runs").insert({
      content_item_id: id,
      project_id: projectId,
      rule_key: RULE_KEY,
      task_ids: [],
      tasks_created: 0,
      status: "failed",
      error: insertErr?.message ?? "task insert returned unexpected row count",
      triggered_by: claimed.created_by,
    });
    return json({ error: "task_insert_failed" }, 500);
  }

  const taskIds = created.map((t: any) => t.id as string);

  const { data: run, error: runErr } = await supabase
    .from("content_automation_runs")
    .insert({
      content_item_id: id,
      project_id: projectId,
      rule_key: RULE_KEY,
      task_ids: taskIds,
      tasks_created: taskIds.length,
      status: "completed",
      triggered_by: claimed.created_by,
    })
    .select("id")
    .single();

  if (runErr) {
    console.error("[automation] run log insert failed", runErr);
  }

  return json({ run_id: run?.id ?? null, task_ids: taskIds });
});