// Batch-applies an automation bundle to a project. Writes project_automation_enrollments rows.
// Non-destructive by default (skip existing); overwrite='replace' updates configs.
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

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "missing_auth" }, 401);

  let payload: { project_id?: string; bundle_id?: string; overwrite?: "skip" | "replace" } = {};
  try { payload = await req.json(); } catch { /* noop */ }
  const projectId = payload.project_id;
  const bundleId = payload.bundle_id;
  const overwrite = payload.overwrite === "replace" ? "replace" : "skip";
  if (!projectId || !bundleId) return json({ error: "project_id and bundle_id required" }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify the caller and gate on user_can_access_project.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "invalid_token" }, 401);

  const { data: canAccess, error: accessErr } = await userClient.rpc("user_can_access_project", {
    _project_id: projectId,
  });
  if (accessErr) return json({ error: accessErr.message }, 500);
  if (!canAccess) return json({ error: "forbidden" }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: items, error: itemsErr } = await admin
    .from("automation_bundle_items")
    .select("automation_key, default_config")
    .eq("bundle_id", bundleId);
  if (itemsErr) return json({ error: itemsErr.message }, 500);
  if (!items?.length) return json({ created: [], skipped: [], replaced: [] });

  const { data: existing, error: existErr } = await admin
    .from("project_automation_enrollments")
    .select("automation_key")
    .eq("project_id", projectId);
  if (existErr) return json({ error: existErr.message }, 500);

  const existingKeys = new Set((existing ?? []).map((r) => r.automation_key));
  const created: string[] = [];
  const skipped: string[] = [];
  const replaced: string[] = [];

  for (const item of items) {
    const key = item.automation_key as string;
    const config = item.default_config ?? {};
    if (existingKeys.has(key)) {
      if (overwrite === "skip") { skipped.push(key); continue; }
      const { error } = await admin
        .from("project_automation_enrollments")
        .update({ enabled: true, config })
        .eq("project_id", projectId)
        .eq("automation_key", key);
      if (error) return json({ error: error.message }, 500);
      replaced.push(key);
    } else {
      const { error } = await admin
        .from("project_automation_enrollments")
        .insert({ project_id: projectId, automation_key: key, enabled: true, config });
      if (error) return json({ error: error.message }, 500);
      created.push(key);
    }
  }

  return json({ created, skipped, replaced });
});