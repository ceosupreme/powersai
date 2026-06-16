import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  let payload: { run_id?: string };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const runId = payload?.run_id;
  if (!runId) return json({ error: "run_id required" }, 400);

  // Verify caller identity + project access via their JWT
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

  // Service client for the deletes/updates (after authorization check below)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: run, error: runErr } = await admin
    .from("content_automation_runs")
    .select("id, content_item_id, project_id, task_ids, status")
    .eq("id", runId)
    .maybeSingle();
  if (runErr) return json({ error: runErr.message }, 500);
  if (!run) return json({ error: "run not found" }, 404);
  if (run.status !== "completed") return json({ error: `cannot undo run in status ${run.status}` }, 400);

  // Authorization: caller must have access to this project
  const { data: canAccess } = await userClient.rpc("user_can_access_project", { _project_id: run.project_id });
  if (!canAccess) return json({ error: "Forbidden" }, 403);

  const taskIds = (run.task_ids ?? []) as string[];
  let deleted = 0;
  if (taskIds.length) {
    const { data: del, error: delErr } = await admin
      .from("tasks")
      .delete()
      .in("id", taskIds)
      .eq("content_item_id", run.content_item_id)
      .select("id");
    if (delErr) return json({ error: delErr.message }, 500);
    deleted = del?.length ?? 0;
  }

  await admin
    .from("content_automation_runs")
    .update({ status: "undone", undone_at: new Date().toISOString() })
    .eq("id", runId);

  await admin
    .from("content_items")
    .update({ automation_fired_at: null })
    .eq("id", run.content_item_id);

  return json({ deleted });
});