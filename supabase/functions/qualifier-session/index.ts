// Public endpoint that returns the qualifier field list + ready_definition
// for a given project_type. Used by the landing page to render the chat /
// form fallbacks (the realtime voice agent loads context server-side).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { loadQualifierContext } from "../_shared/qualifier-prompt.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

async function resolveProjectType(req: URL): Promise<string> {
  const direct = req.searchParams.get("project_type");
  if (direct) return direct;
  const slug = req.searchParams.get("slug");
  if (!slug) return "home_services";
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await admin.from("project_types").select("id").eq("slug", slug).maybeSingle();
  return ((data as any)?.id as string | undefined) ?? "home_services";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  try {
    const projectType = await resolveProjectType(url);
    const ctx = await loadQualifierContext(projectType);
    return new Response(JSON.stringify(ctx), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[qualifier-session]", e);
    return new Response(JSON.stringify({ error: "Failed to load qualifier" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});